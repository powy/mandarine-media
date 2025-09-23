import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ProcessManager handles spawning and monitoring upload worker processes
 * Supports configurable concurrency and process persistence
 */
export class ProcessManager {
  constructor(config = {}) {
    this.maxConcurrent = config.maxConcurrentUploads || 10;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 5000;
    this.workerTimeout = config.workerTimeout || 3600000; // 1 hour
    this.heartbeatInterval = config.heartbeatInterval || 5000; // 5 seconds

    // Process tracking
    this.processes = new Map(); // processId -> ProcessInfo (serializable data)
    this.processRefs = new Map(); // processId -> ChildProcess (internal references)
    this.queue = []; // Queued upload tasks
    this.running = 0; // Current running count

    // Directories for process management
    this.progressDir = path.join(process.cwd(), '.upload-progress');
    this.logsDir = path.join(process.cwd(), '.upload-logs');
    this.pidFile = path.join(process.cwd(), '.upload-pids.json');

    // Worker script path - handle both dev and production environments
    this.workerScript = this.resolveWorkerScript();

    // Event callbacks
    this.onProcessUpdate = null;
    this.onQueueUpdate = null;

    this.initialize();
  }

  /**
   * Resolve worker script path for both development and production environments
   */
  resolveWorkerScript() {
    const workerScript = path.join(__dirname, '..', 'workers', 'uploadWorker.js');

    // Check if the resolved path exists
    if (fs.existsSync(workerScript)) {
      return workerScript;
    }

    // In production/bundled environment, try alternative paths
    const productionPaths = [
      // Tauri bundled path structure
      path.join(process.resourcesPath || process.cwd(), 'src', 'subtools', 'upload-gui', 'workers', 'uploadWorker.js'),
      // Alternative bundled path
      path.join(process.cwd(), '_up_', 'src', 'subtools', 'upload-gui', 'workers', 'uploadWorker.js'),
      // Current working directory relative path
      path.join(process.cwd(), 'src', 'subtools', 'upload-gui', 'workers', 'uploadWorker.js')
    ];

    for (const testPath of productionPaths) {
      if (fs.existsSync(testPath)) {
        console.log(`🔍 Using worker script from: ${testPath}`);
        return testPath;
      }
    }

    // Log available paths for debugging
    console.error(`❌ Worker script not found. Tried paths:
      - ${workerScript}
      ${productionPaths.map(p => `  - ${p}`).join('\n')}

      Current working directory: ${process.cwd()}
      __dirname: ${__dirname}
      process.resourcesPath: ${process.resourcesPath || 'undefined'}`);

    // Fallback to original path (will likely fail but provides clear error)
    return workerScript;
  }

  async initialize() {
    // Ensure directories exist
    await fs.ensureDir(this.progressDir);
    await fs.ensureDir(this.logsDir);

    // Recover existing processes
    await this.recoverProcesses();

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Queue an upload task
   * @param {string} folderPath - Path to folder to upload
   * @param {string} configPath - Path to configuration file
   * @returns {string} Task ID
   */
  async queueUpload(folderPath, configPath) {
    const taskId = uuid();
    const task = {
      id: taskId,
      folderPath,
      configPath,
      status: 'queued',
      queuedAt: new Date(),
      retryCount: 0,
      error: null
    };

    this.queue.push(task);
    this.processes.set(taskId, task);

    this.notifyQueueUpdate();

    // Start processing if we have capacity
    await this.processQueue();

    return taskId;
  }

  /**
   * Process the queue by starting workers up to concurrency limit
   */
  async processQueue() {
    console.log(`🔄 Processing queue: ${this.running}/${this.maxConcurrent} workers running, ${this.queue.length} tasks queued`);

    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task && task.status === 'queued') {
        console.log(`🚀 Starting new worker for: ${path.basename(task.folderPath)}`);
        await this.spawnWorker(task);
      } else if (task) {
        console.log(`⚠️ Skipping task with status: ${task.status} for: ${path.basename(task.folderPath)}`);
      }
    }

    console.log(`📊 Queue processing complete: ${this.running}/${this.maxConcurrent} workers running, ${this.queue.length} tasks remaining`);
  }

  /**
   * Spawn a worker process for an upload task
   * @param {Object} task - Upload task
   */
  async spawnWorker(task) {
    try {
      const { id: taskId, folderPath, configPath } = task;

      const args = [
        this.workerScript,
        '--task-id', taskId,
        '--folder-path', folderPath,
        '--config-path', configPath,
        '--progress-dir', this.progressDir,
        '--logs-dir', this.logsDir
      ];

      // Get the directory of the worker script for proper module resolution
      const workerDir = path.dirname(this.workerScript);

      console.log(`🔧 Spawning worker with args:
        Worker Script: ${this.workerScript}
        Worker Dir: ${workerDir}
        Task ID: ${taskId}
        Folder Path: ${folderPath}
        Config Path: ${configPath}
        Progress Dir: ${this.progressDir}
        Logs Dir: ${this.logsDir}
        Original CWD: ${process.cwd()}`);

      const worker = spawn('node', args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: workerDir,  // Set CWD to the worker's directory for proper module resolution
        env: {
          ...process.env,
          // Add NODE_PATH to help Node find modules in the bundled structure
          NODE_PATH: path.join(workerDir, '..', '..', '..')
        }
      });

      // Add immediate error capture for spawn failures
      worker.on('error', (error) => {
        console.error(`❌ Failed to spawn worker for ${path.basename(folderPath)}: ${error.message}`);
        this.handleWorkerError(taskId, error);
      });

      // Store process reference separately for internal use
      this.processRefs.set(taskId, worker);

      // Update task info (without the process object for serialization)
      const processInfo = {
        ...task,
        status: 'running',
        pid: worker.pid,
        startTime: new Date(),
        endTime: null
      };

      this.processes.set(taskId, processInfo);
      this.running++;

      // Handle process events
      worker.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`📤 Worker ${taskId} stdout: ${output.trim()}`);
        this.logWorkerOutput(taskId, 'stdout', output);
      });

      worker.stderr.on('data', (data) => {
        const output = data.toString();
        console.error(`📤 Worker ${taskId} stderr: ${output.trim()}`);
        this.logWorkerOutput(taskId, 'stderr', output);

        // If we see module-related errors, log them specially
        if (output.includes('SyntaxError') || output.includes('import') || output.includes('module')) {
          console.error(`🚨 Likely ES module error in worker ${taskId}: ${output.trim()}`);
        }
      });

      worker.on('close', (code) => {
        this.handleWorkerClose(taskId, code);
      });

      worker.on('error', (error) => {
        this.handleWorkerError(taskId, error);
      });

      // Allow process to continue running even if parent exits
      worker.unref();

      // Save PID for recovery
      await this.savePidInfo();

      this.notifyProcessUpdate(taskId, processInfo);

      console.log(`✅ Spawned worker for ${path.basename(folderPath)} (PID: ${worker.pid})`);

    } catch (error) {
      console.error(`❌ Failed to spawn worker for ${task.folderPath}:`, error.message);
      await this.handleWorkerError(task.id, error);
    }
  }

  /**
   * Handle worker process closure
   * @param {string} taskId - Task ID
   * @param {number} code - Exit code
   */
  async handleWorkerClose(taskId, code) {
    const processInfo = this.processes.get(taskId);
    if (!processInfo) {
      console.log(`⚠️ Worker close called for unknown task: ${taskId}`);
      return;
    }

    console.log(`🔚 Worker closed for ${path.basename(processInfo.folderPath)} (PID: ${processInfo.pid}, Code: ${code})`);

    this.running--;
    processInfo.endTime = new Date();

    if (code === 0) {
      processInfo.status = 'completed';
      console.log(`✅ Upload completed: ${path.basename(processInfo.folderPath)}`);
    } else {
      processInfo.status = 'failed';
      processInfo.error = `Process exited with code ${code}`;
      console.log(`❌ Upload failed: ${path.basename(processInfo.folderPath)} (code: ${code})`);

      // Attempt retry if under limit
      if (processInfo.retryCount < this.retryAttempts) {
        console.log(`🔄 Will retry ${path.basename(processInfo.folderPath)} (attempt ${processInfo.retryCount + 1}/${this.retryAttempts})`);
        await this.retryTask(taskId);
        return;
      } else {
        console.log(`❌ Max retries reached for ${path.basename(processInfo.folderPath)}`);
      }
    }

    // Clean up process reference
    this.processRefs.delete(taskId);

    this.processes.set(taskId, processInfo);
    this.notifyProcessUpdate(taskId, processInfo);

    console.log(`🔄 Worker completed, continuing queue processing...`);

    // Continue processing queue
    await this.processQueue();

    // Save updated state
    await this.savePidInfo();
  }

  /**
   * Handle worker process error
   * @param {string} taskId - Task ID
   * @param {Error} error - Error object
   */
  async handleWorkerError(taskId, error) {
    const processInfo = this.processes.get(taskId);
    if (!processInfo) {
      console.log(`⚠️ Worker error called for unknown task: ${taskId}`);
      return;
    }

    console.error(`💥 Worker error for ${path.basename(processInfo.folderPath)} (PID: ${processInfo.pid}):`, error.message);

    this.running--;
    processInfo.status = 'failed';
    processInfo.error = error.message;
    processInfo.endTime = new Date();

    // Clean up process reference
    this.processRefs.delete(taskId);

    // Attempt retry if under limit
    if (processInfo.retryCount < this.retryAttempts) {
      console.log(`🔄 Will retry ${path.basename(processInfo.folderPath)} after error (attempt ${processInfo.retryCount + 1}/${this.retryAttempts})`);
      await this.retryTask(taskId);
    } else {
      console.log(`❌ Max retries reached for ${path.basename(processInfo.folderPath)} after error`);
      this.processes.set(taskId, processInfo);
      this.notifyProcessUpdate(taskId, processInfo);
    }

    console.log(`🔄 Worker error handled, continuing queue processing...`);

    // Continue processing queue
    await this.processQueue();

    // Save updated state
    await this.savePidInfo();
  }

  /**
   * Retry a failed task
   * @param {string} taskId - Task ID
   */
  async retryTask(taskId) {
    const processInfo = this.processes.get(taskId);
    if (!processInfo) return;

    processInfo.retryCount++;
    processInfo.status = 'queued';
    processInfo.error = null;
    processInfo.pid = null;

    console.log(`🔄 Retrying upload: ${path.basename(processInfo.folderPath)} (attempt ${processInfo.retryCount}/${this.retryAttempts})`);

    // Add delay before retry
    setTimeout(async () => {
      this.queue.unshift(processInfo); // Add to front of queue
      this.notifyQueueUpdate();
      await this.processQueue();
    }, this.retryDelay * processInfo.retryCount); // Exponential backoff
  }

  /**
   * Cancel a specific process
   * @param {string} taskId - Task ID
   */
  async cancelProcess(taskId) {
    const processInfo = this.processes.get(taskId);
    if (!processInfo) return false;

    if (processInfo.status === 'running' && this.processRefs.has(taskId)) {
      try {
        process.kill(processInfo.pid, 'SIGTERM');
        processInfo.status = 'cancelled';
        processInfo.endTime = new Date();
        this.running--;

        console.log(`🛑 Cancelled upload: ${path.basename(processInfo.folderPath)}`);

        // Clean up process reference
        this.processRefs.delete(taskId);

        this.processes.set(taskId, processInfo);
        this.notifyProcessUpdate(taskId, processInfo);

        // Continue processing queue
        await this.processQueue();

        return true;
      } catch (error) {
        console.error(`Failed to cancel process ${taskId}:`, error.message);
        return false;
      }
    } else if (processInfo.status === 'queued') {
      // Remove from queue
      const queueIndex = this.queue.findIndex(task => task.id === taskId);
      if (queueIndex !== -1) {
        this.queue.splice(queueIndex, 1);
      }

      processInfo.status = 'cancelled';
      this.processes.set(taskId, processInfo);
      this.notifyProcessUpdate(taskId, processInfo);
      this.notifyQueueUpdate();

      return true;
    }

    return false;
  }

  /**
   * Cancel all processes
   */
  async cancelAllProcesses() {
    const taskIds = Array.from(this.processes.keys());
    const results = await Promise.all(
      taskIds.map(taskId => this.cancelProcess(taskId))
    );

    return results.filter(result => result).length;
  }

  /**
   * Get status of a specific process
   * @param {string} taskId - Task ID
   * @returns {Object|null} Process info
   */
  getProcessStatus(taskId) {
    return this.processes.get(taskId) || null;
  }

  /**
   * Get status of all processes
   * @returns {Object[]} Array of process info
   */
  getAllStatuses() {
    return Array.from(this.processes.values());
  }

  /**
   * Get queue information
   * @returns {Object} Queue stats
   */
  getQueueInfo() {
    const statuses = this.getAllStatuses();
    return {
      total: statuses.length,
      queued: statuses.filter(p => p.status === 'queued').length,
      running: statuses.filter(p => p.status === 'running').length,
      completed: statuses.filter(p => p.status === 'completed').length,
      failed: statuses.filter(p => p.status === 'failed').length,
      cancelled: statuses.filter(p => p.status === 'cancelled').length
    };
  }

  /**
   * Save PID information for process recovery
   */
  async savePidInfo() {
    try {
      const pidData = {
        timestamp: new Date().toISOString(),
        processes: Array.from(this.processes.entries()).map(([id, info]) => ({
          id,
          pid: info.pid,
          folderPath: info.folderPath,
          configPath: info.configPath,
          status: info.status,
          startTime: info.startTime,
          retryCount: info.retryCount
        }))
      };

      await fs.writeJson(this.pidFile, pidData, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save PID info:', error.message);
    }
  }

  /**
   * Recover processes from previous session
   */
  async recoverProcesses() {
    try {
      if (await fs.pathExists(this.pidFile)) {
        const pidData = await fs.readJson(this.pidFile);

        for (const processData of pidData.processes) {
          if (processData.status === 'running' && processData.pid) {
            // Check if process is still running
            try {
              process.kill(processData.pid, 0); // Check if process exists

              // Process still exists, mark as running
              const processInfo = {
                ...processData,
                startTime: new Date(processData.startTime),
                process: null // We can't recover the process object
              };

              this.processes.set(processData.id, processInfo);
              this.running++;

              console.log(`🔄 Recovered running process: ${path.basename(processData.folderPath)} (PID: ${processData.pid})`);
            } catch (error) {
              // Process no longer exists, mark as failed
              const processInfo = {
                ...processData,
                status: 'failed',
                error: 'Process not found after restart',
                endTime: new Date()
              };

              this.processes.set(processData.id, processInfo);
              console.log(`❌ Process not found after restart: ${path.basename(processData.folderPath)}`);
            }
          } else if (processData.status === 'queued') {
            // Re-queue the task
            this.queue.push(processData);
            this.processes.set(processData.id, processData);
            console.log(`📋 Re-queued task: ${path.basename(processData.folderPath)}`);
          }
        }

        // Start processing recovered queue
        await this.processQueue();
      }
    } catch (error) {
      console.error('Failed to recover processes:', error.message);
    }
  }

  /**
   * Start monitoring processes
   */
  startMonitoring() {
    setInterval(() => {
      this.checkProcessHealth();
    }, this.heartbeatInterval);
  }

  /**
   * Check health of running processes
   */
  checkProcessHealth() {
    for (const [taskId, processInfo] of this.processes.entries()) {
      if (processInfo.status === 'running' && processInfo.pid) {
        try {
          // Check if process is still alive
          process.kill(processInfo.pid, 0);

          // Check if process has been running too long
          const runTime = Date.now() - processInfo.startTime.getTime();
          if (runTime > this.workerTimeout) {
            console.warn(`⚠️ Process timeout: ${path.basename(processInfo.folderPath)}`);
            this.cancelProcess(taskId);
          }
        } catch (error) {
          // Process died unexpectedly
          console.error(`💀 Process died: ${path.basename(processInfo.folderPath)}`);
          this.handleWorkerClose(taskId, -1);
        }
      }
    }
  }

  /**
   * Log worker output
   * @param {string} taskId - Task ID
   * @param {string} type - Output type (stdout/stderr)
   * @param {string} data - Output data
   */
  logWorkerOutput(taskId, type, data) {
    const processInfo = this.processes.get(taskId);
    if (!processInfo) return;

    const logFile = path.join(this.logsDir, `${taskId}.log`);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${data}`;

    fs.appendFile(logFile, logEntry).catch(error => {
      console.error(`Failed to write log for ${taskId}:`, error.message);
    });
  }

  /**
   * Set callback for process updates
   * @param {Function} callback - Callback function
   */
  onProcessUpdateCallback(callback) {
    this.onProcessUpdate = callback;
  }

  /**
   * Set callback for queue updates
   * @param {Function} callback - Callback function
   */
  onQueueUpdateCallback(callback) {
    this.onQueueUpdate = callback;
  }

  /**
   * Create a sanitized version of processInfo for IPC serialization
   * Removes non-serializable objects like ChildProcess
   * @param {Object} processInfo - Original process information
   * @returns {Object} Sanitized process information
   */
  sanitizeProcessInfo(processInfo) {
    const sanitized = { ...processInfo };
    // Remove the process property which contains ChildProcess (non-serializable)
    delete sanitized.process;
    return sanitized;
  }

  /**
   * Notify listeners of process update
   * @param {string} taskId - Task ID
   * @param {Object} processInfo - Process information
   */
  notifyProcessUpdate(taskId, processInfo) {
    if (this.onProcessUpdate) {
      // Send sanitized version to avoid serialization errors
      this.onProcessUpdate(taskId, this.sanitizeProcessInfo(processInfo));
    }
  }

  /**
   * Notify listeners of queue update
   */
  notifyQueueUpdate() {
    if (this.onQueueUpdate) {
      this.onQueueUpdate(this.getQueueInfo());
    }
  }

  /**
   * Cleanup old logs and progress files
   * @param {number} maxAge - Maximum age in milliseconds
   */
  async cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    try {
      const now = Date.now();

      // Cleanup progress files
      const progressFiles = await fs.readdir(this.progressDir);
      for (const file of progressFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.progressDir, file);
          const stats = await fs.stat(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.remove(filePath);
          }
        }
      }

      // Cleanup log files
      const logFiles = await fs.readdir(this.logsDir);
      for (const file of logFiles) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file);
          const stats = await fs.stat(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.remove(filePath);
          }
        }
      }

      console.log('🧹 Cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup old files:', error.message);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down ProcessManager...');

    // Save current state
    await this.savePidInfo();

    // Send termination signal to all running processes
    for (const [taskId, processInfo] of this.processes.entries()) {
      if (processInfo.status === 'running' && processInfo.pid) {
        try {
          process.kill(processInfo.pid, 'SIGTERM');
        } catch (error) {
          console.error(`Failed to terminate process ${taskId}:`, error.message);
        }
      }
    }

    console.log('✅ ProcessManager shutdown complete');
  }
}