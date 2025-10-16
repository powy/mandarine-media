/**
 * Task Manager
 * Handles task spawning, process management, and heartbeat monitoring
 */

import { fork } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import TaskDatabase from './db/database.js';
import logger from './utils/logger.js';
import { CONFIG } from './config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TaskManager {
  constructor(dbPath = null) {
    this.db = new TaskDatabase(dbPath);
    this.processes = new Map(); // taskId -> child process
    this.heartbeats = new Map(); // taskId -> last heartbeat timestamp
    this.maxConcurrent = CONFIG.TASKS.MAX_CONCURRENT;

    // Ensure required directories exist
    fs.ensureDirSync(CONFIG.PATHS.LOGS_DIR);
    fs.ensureDirSync(CONFIG.PATHS.TEMP_DIR);
    fs.ensureDirSync(CONFIG.PATHS.DATA_DIR);

    // Monitor memory and heartbeats
    this.healthCheckInterval = setInterval(() => this.checkHealth(), 60000);

    // Cleanup orphaned tasks from previous sessions
    this.cleanupOnStart();

    logger.info('TaskManager initialized', {
      maxConcurrent: this.maxConcurrent,
      logsDir: CONFIG.PATHS.LOGS_DIR
    });
  }

  /**
   * Cleanup orphaned tasks on startup
   */
  async cleanupOnStart() {
    await this.db.initialize();
    const cleaned = await this.db.cleanupOrphanedTasks();
    if (cleaned > 0) {
      logger.warn(`Cleaned up ${cleaned} orphaned tasks from previous session`);
    }
  }

  /**
   * Create and spawn a new task
   * @param {string} type - Task type
   * @param {object} parameters - Task parameters
   * @returns {object} Created task
   */
  async createTask(type, parameters) {
    // Check concurrent limit
    const runningTasks = await this.db.getRunningTasks();
    if (runningTasks.length >= this.maxConcurrent) {
      throw new Error(`Maximum concurrent tasks limit reached (${this.maxConcurrent})`);
    }

    // Create log file path
    const logFile = path.join(CONFIG.PATHS.LOGS_DIR, `task-${Date.now()}.log`);

    // Create task in database
    const taskId = await this.db.createTask(type, parameters, logFile);

    logger.info(`Task created`, { taskId, type });

    // Get task config
    const taskConfig = CONFIG.TASK_TYPES[type];
    if (!taskConfig) {
      await this.db.updateTaskStatus(taskId, 'failed', { error_message: `Unknown task type: ${type}` });
      throw new Error(`Unknown task type: ${type}`);
    }

    // Spawn process
    try {
      await this.spawnTask(taskId, taskConfig.function, parameters, logFile);
      return await this.db.getTask(taskId);
    } catch (error) {
      await this.db.updateTaskStatus(taskId, 'failed', { error_message: error.message });
      logger.error(`Failed to spawn task ${taskId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Spawn a task process
   * @param {number} taskId - Task ID
   * @param {string} functionName - Function to execute
   * @param {object} parameters - Task parameters
   * @param {string} logFile - Log file path
   */
  async spawnTask(taskId, functionName, parameters, logFile) {
    logger.info(`Spawning task ${taskId}`, { function: functionName });

    const runnerPath = path.join(__dirname, 'task-runner.js');

    // Fork creates a new Node.js process
    const child = fork(runnerPath, [], {
      env: {
        ...process.env,
        TASK_ID: taskId,
        FUNCTION: functionName,
        PARAMS: JSON.stringify(parameters),
        LOG_FILE: logFile
      },
      // Increase memory for long tasks
      execArgv: [`--max-old-space-size=${CONFIG.PROCESS.MAX_OLD_SPACE_SIZE}`],
      silent: false // Let output go to console and be logged
    });

    // Store process reference
    this.processes.set(taskId, child);

    // Update task status to processing
    await this.db.updateTaskStatus(taskId, 'processing', { pid: child.pid });

    // Initialize heartbeat
    this.heartbeats.set(taskId, Date.now());

    // Handle IPC messages (heartbeat and progress)
    child.on('message', (msg) => {
      this.handleIPCMessage(taskId, msg);
    });

    // Handle process exit
    child.on('exit', (code, signal) => {
      this.handleTaskComplete(taskId, code, signal);
    });

    // Handle process error
    child.on('error', async (error) => {
      logger.error(`Task ${taskId} process error`, { error: error.message });
      await this.db.updateTaskStatus(taskId, 'failed', { error_message: error.message });
    });

    logger.info(`Task ${taskId} spawned with PID ${child.pid}`);
  }

  /**
   * Handle IPC messages from child process
   */
  handleIPCMessage(taskId, msg) {
    if (msg.type === 'heartbeat') {
      this.heartbeats.set(taskId, Date.now());
      logger.debug(`Heartbeat received from task ${taskId}`);
    } else if (msg.type === 'progress') {
      this.db.updateTaskStatus(taskId, 'processing', { progress: msg.value }).catch(err =>
        logger.error(`Failed to update progress for task ${taskId}`, { error: err.message })
      );
      logger.debug(`Progress update from task ${taskId}: ${msg.value}%`);
    } else if (msg.type === 'error') {
      logger.error(`Task ${taskId} reported error`, { message: msg.message });
    } else if (msg.type === 'complete') {
      logger.info(`Task ${taskId} reported completion`);
    }
  }

  /**
   * Handle task completion
   */
  async handleTaskComplete(taskId, code, signal) {
    logger.info(`Task ${taskId} exited`, { code, signal });

    // Remove from tracking
    this.processes.delete(taskId);
    this.heartbeats.delete(taskId);

    // Update database status
    const task = await this.db.getTask(taskId);
    if (!task) {
      logger.warn(`Task ${taskId} not found in database`);
      return;
    }

    // Don't update if already in a final state
    if (['success', 'failed', 'canceled', 'partial'].includes(task.status)) {
      return;
    }

    if (code === 0) {
      await this.db.updateTaskStatus(taskId, 'success');
      logger.info(`Task ${taskId} completed successfully`);
    } else if (signal) {
      await this.db.updateTaskStatus(taskId, 'canceled', {
        error_message: `Process killed with signal ${signal}`
      });
      logger.warn(`Task ${taskId} was killed with signal ${signal}`);
    } else {
      await this.db.updateTaskStatus(taskId, 'failed', {
        error_message: `Process exited with code ${code}`
      });
      logger.error(`Task ${taskId} failed with exit code ${code}`);
    }
  }

  /**
   * Stop a running task
   * @param {number} taskId - Task ID
   */
  async stopTask(taskId) {
    const child = this.processes.get(taskId);
    if (!child) {
      logger.warn(`Task ${taskId} is not running`);
      return false;
    }

    logger.info(`Stopping task ${taskId}`);

    // Try graceful shutdown first
    child.kill('SIGTERM');

    // Force kill after 5 seconds
    setTimeout(() => {
      if (this.processes.has(taskId)) {
        logger.warn(`Force killing task ${taskId}`);
        child.kill('SIGKILL');
      }
    }, 5000);

    await this.db.updateTaskStatus(taskId, 'canceled', {
      error_message: 'Task stopped by user'
    });

    return true;
  }

  /**
   * Get task status
   * @param {number} taskId - Task ID
   */
  getTaskStatus(taskId) {
    return this.db.getTask(taskId);
  }

  /**
   * List all tasks
   */
  listTasks(filters = {}) {
    return this.db.listTasks(filters);
  }

  /**
   * Get task log content
   * @param {number} taskId - Task ID
   * @param {number} offset - Byte offset to start reading from
   */
  async getTaskLog(taskId, offset = 0) {
    const task = await this.db.getTask(taskId);
    if (!task || !task.log_file) {
      throw new Error(`Task ${taskId} not found or has no log file`);
    }

    if (!fs.existsSync(task.log_file)) {
      return { content: '', size: 0, offset: 0 };
    }

    const stats = fs.statSync(task.log_file);
    const fileSize = stats.size;

    // Read from offset to end
    const stream = fs.createReadStream(task.log_file, {
      start: offset,
      encoding: 'utf8'
    });

    let content = '';
    for await (const chunk of stream) {
      content += chunk;
    }

    return {
      content,
      size: fileSize,
      offset: fileSize // Next read should start from current end
    };
  }

  /**
   * Health check for hung processes and memory usage
   */
  async checkHealth() {
    const now = Date.now();

    // Check for hung processes (no heartbeat for 10 minutes)
    this.heartbeats.forEach((lastBeat, taskId) => {
      if (now - lastBeat > CONFIG.TASKS.HEARTBEAT_TIMEOUT) {
        logger.warn(`Task ${taskId} appears hung, stopping...`);
        this.stopTask(taskId).catch(err =>
          logger.error(`Failed to stop hung task ${taskId}`, { error: err.message })
        );
      }
    });

    // Monitor memory usage
    const usage = process.memoryUsage();
    const usedGB = usage.heapUsed / 1024 / 1024 / 1024;
    if (usedGB > 8) {
      logger.warn(`High memory usage: ${usedGB.toFixed(2)}GB`);
    }

    // Log stats
    const stats = await this.db.getTaskStats();
    logger.debug('Task stats', stats);
  }

  /**
   * Shutdown task manager
   */
  shutdown() {
    logger.info('Shutting down TaskManager...');

    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Stop all running tasks
    this.processes.forEach((child, taskId) => {
      logger.info(`Stopping task ${taskId} on shutdown`);
      child.kill('SIGTERM');
    });

    // Give processes time to exit gracefully
    setTimeout(() => {
      this.processes.forEach((child, taskId) => {
        if (child.killed === false) {
          logger.warn(`Force killing task ${taskId} on shutdown`);
          child.kill('SIGKILL');
        }
      });

      // Close database
      this.db.close();
      logger.info('TaskManager shutdown complete');
    }, 3000);
  }
}

export default TaskManager;
