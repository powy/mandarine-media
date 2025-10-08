/**
 * Worker Manager
 * Manages child processes for executing media uploader tasks
 */

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { EventEmitter } from 'events';
import { TASK_STATES, TASK_TYPES } from './taskManager.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WorkerProcess extends EventEmitter {
  constructor(taskId, workerScript, options = {}) {
    super();
    this.taskId = taskId;
    this.workerScript = workerScript;
    this.options = options;
    this.process = null;
    this.isKilled = false;
    this.isWorkerReady = false;
    this.startTime = null;
    this.timeout = options.timeout || 86400000; // 24 hours default
    this.timeoutHandle = null;
  }

  start(taskData) {
    if (this.process) {
      throw new Error('Worker process already started');
    }

    try {
      this.startTime = Date.now();
      this.taskData = taskData; // Store task data to send after worker is ready

      // Fork the worker script
      this.process = fork(this.workerScript, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env, ...this.options.env },
        cwd: this.options.cwd || process.cwd(),
      });

      // Set up timeout
      if (this.timeout > 0) {
        this.timeoutHandle = setTimeout(() => {
          this.kill('TIMEOUT');
        }, this.timeout);
      }

      // Handle process events
      this.process.on('message', (message) => {
        this.handleMessage(message);
      });

      this.process.on('error', (error) => {
        this.emit('error', error);
      });

      this.process.on('exit', (code, signal) => {
        this.cleanup();
        this.emit('exit', { code, signal, killed: this.isKilled });
      });

      this.process.on('disconnect', () => {
        this.emit('disconnect');
      });

      // Wait for worker ready signal before sending task
      this.once('ready', (readyInfo) => {
        // Worker is ready, now send the task
        this.send({ type: 'START_TASK', taskId: this.taskId, data: this.taskData });
      });

      // Set up a timeout for worker readiness
      const readinessTimeout = setTimeout(() => {
        if (!this.isWorkerReady) {
          this.emit('error', new Error('Worker failed to become ready within timeout'));
          this.kill('READINESS_TIMEOUT');
        }
      }, 5000); // 5 second timeout for worker readiness

      this.once('ready', () => {
        clearTimeout(readinessTimeout);
      });

      this.emit('started', this.process.pid);
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  handleMessage(message) {
    if (!message || typeof message !== 'object') {
      return;
    }

    switch (message.type) {
      case 'WORKER_READY':
        this.isWorkerReady = true;
        this.emit('ready', {
          pid: message.pid,
          workerType: message.workerType,
          timestamp: message.timestamp
        });
        break;

      case 'PING':
        // Respond to worker ping with pong
        this.send({ type: 'PONG', timestamp: Date.now() });
        break;

      case 'PROGRESS':
        this.emit('progress', message.progress, message.message);
        break;

      case 'LOG':
        this.emit('log', message.level, message.message, message.data);
        break;

      case 'RESULT':
        this.emit('result', message.success, message.data, message.error);
        break;

      case 'ERROR':
        this.emit('error', new Error(message.error));
        break;

      default:
        this.emit('message', message);
        break;
    }
  }

  send(message) {
    if (this.process && this.process.connected) {
      this.process.send(message);
      return true;
    }
    return false;
  }

  kill(reason = 'MANUAL') {
    if (!this.process || this.isKilled) {
      return false;
    }

    this.isKilled = true;
    this.emit('killing', reason);

    try {
      // Send graceful shutdown signal first
      this.send({ type: 'SHUTDOWN', reason });

      // Wait a bit for graceful shutdown, then force kill
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGTERM');

          // Force kill after another delay
          setTimeout(() => {
            if (this.process && !this.process.killed) {
              this.process.kill('SIGKILL');
            }
          }, 2000);
        }
      }, 3000);

      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  cleanup() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  getDuration() {
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  isRunning() {
    return this.process && !this.process.killed && this.process.connected;
  }
}

class WorkerManager extends EventEmitter {
  constructor(taskManager) {
    super();
    this.taskManager = taskManager;
    this.workers = new Map(); // taskId -> WorkerProcess
    this.workerScripts = this.getWorkerScripts();

    // Listen to task manager events
    this.taskManager.on('task:created', this.handleTaskCreated.bind(this));
  }

  getWorkerScripts() {
    const workersDir = join(__dirname, 'workers');

    return {
      [TASK_TYPES.MEDIA_ANALYZER]: join(workersDir, 'mediaAnalyzerWorker.js'),
      [TASK_TYPES.MUX_UPLOAD]: join(workersDir, 'muxUploadWorker.js'),
      [TASK_TYPES.PICTURE_UPLOAD]: join(workersDir, 'pictureUploadWorker.js'),
      [TASK_TYPES.SINGLE_PICTURE_UPLOAD]: join(workersDir, 'singlePictureUploadWorker.js'),
      [TASK_TYPES.BATCH_PICTURE_UPLOAD]: join(workersDir, 'batchPictureUploadWorker.js'),
      [TASK_TYPES.EXCEL_PREPARATION]: join(workersDir, 'excelPreparationWorker.js'),
      [TASK_TYPES.BATCH_EXCEL_PREPARATION]: join(workersDir, 'batchExcelPreparationWorker.js'),
      [TASK_TYPES.SINGLE_UPLOAD]: join(workersDir, 'singleUploadWorker.js'),
      [TASK_TYPES.BATCH_UPLOAD]: join(workersDir, 'batchUploadWorker.js'),
      [TASK_TYPES.PARALLEL_UPLOAD]: join(workersDir, 'parallelUploadWorker.js'),
      [TASK_TYPES.EXCEL_BULK_EDIT]: join(workersDir, 'excelBulkEditWorker.js'),
      [TASK_TYPES.MUX_SUBTITLE_UPLOAD]: join(workersDir, 'muxSubtitleUploadWorker.js'),
      [TASK_TYPES.SUBTITLE_SPECIFIC_UPLOAD]: join(workersDir, 'subtitleSpecificWorker.js'),
      [TASK_TYPES.PROPAGATE_SEASON_DATA]: join(workersDir, 'propagateSeasonDataWorker.js')
    };
  }

  handleTaskCreated(task) {
    // Tasks are not automatically started - they need to be explicitly started
    this.emit('task:created', task);
  }

  async startTask(taskId, options = {}) {
    const task = this.taskManager.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (this.workers.has(taskId)) {
      throw new Error(`Worker already exists for task: ${taskId}`);
    }

    const workerScript = this.workerScripts[task.type];
    if (!workerScript) {
      throw new Error(`No worker script found for task type: ${task.type}`);
    }

    // Log task creation with detailed context
    logger.logTaskInfo('Starting task worker', taskId, 'WORKER_START', {
      taskType: task.type,
      workerScript: workerScript.split(/[/\\]/).pop(), // Just filename
      request: task.request,
      timeout: task.timeout
    });

    const worker = new WorkerProcess(taskId, workerScript, {
      timeout: task.timeout,
      ...options
    });

    // Set up worker event handlers
    this.setupWorkerEvents(worker, task);

    // Add to workers map
    this.workers.set(taskId, worker);

    try {
      // Start the worker process
      worker.start(task.request);

      // Update task status
      this.taskManager.startTask(taskId);

      logger.logTaskInfo('Worker process started successfully', taskId, 'WORKER_STARTED', {
        processId: worker.process.pid
      });

      this.emit('worker:started', taskId, worker);
      return worker;
    } catch (error) {
      // Clean up on failure
      this.workers.delete(taskId);
      this.taskManager.failTask(taskId, error, 'Failed to start worker process');

      logger.logTaskError('Failed to start worker process', taskId, 'WORKER_START_FAILED', error, {
        workerScript: workerScript.split(/[/\\]/).pop()
      });

      throw error;
    }
  }

  setupWorkerEvents(worker, task) {
    worker.on('started', (pid) => {
      this.taskManager.updateTask(task.id, {
        processId: pid,
        message: 'Worker process started'
      });

      logger.logTaskInfo('Worker process initialized', task.id, 'WORKER_INIT', {
        processId: pid,
        taskType: task.type
      });
    });

    worker.on('progress', (progress, message) => {
      this.taskManager.updateTaskProgress(task.id, progress, message);

      logger.logTaskDebug('Task progress update', task.id, 'PROGRESS', {
        progress,
        message
      });
    });

    worker.on('log', (level, message, data) => {
      // Forward worker logs to our task logging system
      logger.logTask(level, `Worker: ${message}`, task.id, 'WORKER_LOG', data);
      this.emit('worker:log', task.id, level, message, data);
    });

    worker.on('result', (success, data, error) => {
      if (success) {
        this.taskManager.completeTask(task.id, data, 'Task completed successfully');
        logger.logTaskInfo('Task completed successfully', task.id, 'TASK_COMPLETED', {
          duration: worker.getDuration(),
          resultData: data
        });
      } else {
        this.taskManager.failTask(task.id, error, 'Task failed');
        logger.logTaskError('Task execution failed', task.id, 'TASK_FAILED', error, {
          duration: worker.getDuration()
        });
      }

      // Clean up worker
      this.workers.delete(task.id);
      this.emit('worker:finished', task.id, success, data, error);
    });

    worker.on('error', (error) => {
      this.taskManager.failTask(task.id, error, 'Worker process error');
      this.workers.delete(task.id);

      logger.logTaskError('Worker process error', task.id, 'WORKER_ERROR', error, {
        duration: worker.getDuration()
      });

      this.emit('worker:error', task.id, error);
    });

    worker.on('exit', ({ code, signal, killed }) => {
      const taskFromManager = this.taskManager.getTask(task.id);

      if (taskFromManager && taskFromManager.status === TASK_STATES.RUNNING) {
        if (killed) {
          this.taskManager.cancelTask(task.id, 'Worker process was killed');
          logger.logTaskInfo('Worker process was killed', task.id, 'WORKER_KILLED', {
            signal,
            reason: 'killed'
          });
        } else if (code !== 0) {
          this.taskManager.failTask(task.id, `Worker exited with code ${code}`, 'Worker process failed');
          logger.logTaskError('Worker exited with non-zero code', task.id, 'WORKER_EXIT_ERROR',
            `Exit code: ${code}`, {
            exitCode: code,
            signal,
            duration: worker.getDuration()
          });
        }
      } else {
        logger.logTaskDebug('Worker process exited', task.id, 'WORKER_EXIT', {
          exitCode: code,
          signal,
          killed,
          duration: worker.getDuration()
        });
      }

      this.workers.delete(task.id);
      this.emit('worker:exit', task.id, { code, signal, killed });
    });

    worker.on('killing', (reason) => {
      this.taskManager.updateTask(task.id, {
        message: `Worker process being killed: ${reason}`
      });

      logger.logTaskInfo('Worker process being terminated', task.id, 'WORKER_KILLING', {
        reason
      });
    });

    worker.on('disconnect', () => {
      logger.logTaskInfo('Worker process disconnected', task.id, 'WORKER_DISCONNECT');
      this.emit('worker:disconnect', task.id);
    });
  }

  async cancelTask(taskId, reason = 'Cancelled by user') {
    const worker = this.workers.get(taskId);
    if (!worker) {
      // Task might not have a worker yet, just cancel in task manager
      this.taskManager.cancelTask(taskId, reason);
      return true;
    }

    // Cancel the task in task manager first
    this.taskManager.cancelTask(taskId, reason);

    // Kill the worker process
    const killed = worker.kill('CANCELLATION');

    if (killed) {
      this.emit('worker:cancelled', taskId, reason);
    }

    return killed;
  }

  async cancelAllTasks(reason = 'Bulk cancellation') {
    const activeTasks = this.taskManager.getActiveTasks();
    const results = [];

    for (const task of activeTasks) {
      try {
        const cancelled = await this.cancelTask(task.id, reason);
        results.push({ taskId: task.id, cancelled, error: null });
      } catch (error) {
        results.push({ taskId: task.id, cancelled: false, error: error.message });
      }
    }

    return results;
  }

  getWorker(taskId) {
    return this.workers.get(taskId);
  }

  getAllWorkers() {
    return Array.from(this.workers.values());
  }

  getRunningWorkers() {
    return this.getAllWorkers().filter(worker => worker.isRunning());
  }

  getWorkerCount() {
    return this.workers.size;
  }

  getWorkerStatistics() {
    const workers = this.getAllWorkers();
    const running = workers.filter(w => w.isRunning());

    return {
      total: workers.length,
      running: running.length,
      avgDuration: workers.length > 0
        ? Math.round(workers.reduce((sum, w) => sum + w.getDuration(), 0) / workers.length)
        : 0,
      byType: this.getWorkersByType()
    };
  }

  getWorkersByType() {
    const byType = {};

    for (const [taskId, worker] of this.workers) {
      const task = this.taskManager.getTask(taskId);
      if (task) {
        if (!byType[task.type]) {
          byType[task.type] = { count: 0, running: 0 };
        }
        byType[task.type].count++;
        if (worker.isRunning()) {
          byType[task.type].running++;
        }
      }
    }

    return byType;
  }

  async cleanup() {
    // Cancel all running tasks
    await this.cancelAllTasks('Server shutdown');

    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Force kill any remaining workers
    for (const [taskId, worker] of this.workers) {
      if (worker.isRunning()) {
        worker.kill('FORCE_SHUTDOWN');
      }
    }

    // Clear workers map
    this.workers.clear();

    this.emit('cleanup:complete');
  }

  async healthCheck() {
    const stats = this.getWorkerStatistics();
    const taskStats = this.taskManager.getStatistics();

    return {
      workers: stats,
      tasks: taskStats,
      timestamp: new Date().toISOString()
    };
  }
}

export default WorkerManager;