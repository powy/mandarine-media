/**
 * Base Worker
 * Abstract base class for all worker processes
 */

import { EventEmitter } from 'events';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class BaseWorker extends EventEmitter {
  constructor() {
    super();
    this.taskId = null;
    this.taskData = null;
    this.isShuttingDown = false;
    this.startTime = Date.now();
    this.isReady = false;
    this.initializationTimeout = null;

    // Enhanced debugging
    this.log('debug', 'BaseWorker constructor starting', {
      pid: process.pid,
      hasProcessSend: !!process.send,
      hasProcessConnected: !!process.connected,
      argv: process.argv,
      workerType: this.constructor.name
    });

    // Set up IPC communication with retry logic
    this.setupIPC();

    // Handle graceful shutdown
    this.setupShutdownHandlers();

    // Send ready signal after initialization
    this.initializeWorker();
  }

  setupIPC() {
    this.log('debug', 'Setting up IPC communication', {
      hasProcessSend: !!process.send,
      connected: !!process.connected,
      hasChannel: !!process.channel
    });

    if (!process.send) {
      const error = new Error('Worker must be started as a child process with IPC enabled');
      this.log('error', 'IPC setup failed - no process.send available', {
        pid: process.pid,
        hasChannel: !!process.channel,
        connected: !!process.connected,
        env: process.env.NODE_ENV
      });
      throw error;
    }

    // Set up message handler
    process.on('message', (message) => {
      this.log('debug', 'Received message from parent', {
        messageType: message?.type,
        hasTaskId: !!message?.taskId
      });
      this.handleMessage(message);
    });

    // Enhanced disconnect handler
    process.on('disconnect', () => {
      this.log('warn', 'Parent process disconnected, shutting down...', {
        isReady: this.isReady,
        hasTaskId: !!this.taskId,
        uptime: Date.now() - this.startTime
      });
      this.shutdown('DISCONNECT');
    });

    // Test IPC connectivity
    this.testIPCConnection();
  }

  setupShutdownHandlers() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      this.log('error', 'Uncaught Exception in worker', { error: error.message, stack: error.stack });
      this.sendError(error);
      this.shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.log('error', 'Unhandled Rejection in worker', { reason, promise });
      this.sendError(new Error(`Unhandled Rejection: ${reason}`));
      this.shutdown('UNHANDLED_REJECTION');
    });
  }

  handleMessage(message) {
    if (!message || typeof message !== 'object') {
      this.log('warn', 'Invalid message received', { message });
      return;
    }

    this.log('debug', 'Processing message', {
      type: message.type,
      hasTaskId: !!message.taskId
    });

    switch (message.type) {
      case 'START_TASK':
        // Clear initialization timeout when we receive the task
        if (this.initializationTimeout) {
          clearTimeout(this.initializationTimeout);
          this.initializationTimeout = null;
        }
        this.isReady = true;
        this.startTask(message.taskId, message.data);
        break;

      case 'PONG':
        this.log('debug', 'Received PONG from parent - IPC working');
        break;

      case 'SHUTDOWN':
        this.shutdown(message.reason || 'MANUAL');
        break;

      default:
        this.log('warn', 'Unknown message type received', {
          type: message.type,
          messageKeys: Object.keys(message)
        });
        break;
    }
  }

  async startTask(taskId, taskData) {
    try {
      this.taskId = taskId;
      this.taskData = taskData;

      this.log('info', 'Starting task', { taskId, taskType: this.constructor.name });

      // Call the abstract execute method
      const result = await this.execute(taskData);

      this.sendResult(true, result);
      this.log('info', 'Task completed successfully', { taskId });

    } catch (error) {
      this.log('error', 'Task execution failed', {
        taskId,
        error: error.message,
        stack: error.stack
      });
      this.sendResult(false, null, error.message);
    }
  }

  // Abstract method - must be implemented by subclasses
  async execute(taskData) {
    throw new Error('execute() method must be implemented by subclass');
  }

  // Communication methods
  send(message) {
    if (process.send && !this.isShuttingDown) {
      try {
        process.send(message);
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    }
    return false;
  }

  sendProgress(progress, message = null) {
    this.send({
      type: 'PROGRESS',
      progress: Math.max(0, Math.min(100, progress)),
      message
    });
  }

  sendLog(level, message, data = null) {
    this.send({
      type: 'LOG',
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      taskId: this.taskId
    });
  }

  sendResult(success, data = null, error = null) {
    this.send({
      type: 'RESULT',
      success,
      data,
      error,
      duration: Date.now() - this.startTime
    });
  }

  sendError(error) {
    this.send({
      type: 'ERROR',
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      taskId: this.taskId
    });
  }

  // Logging methods
  log(level, message, data = null) {
    console[level] ? console[level](message, data) : console.log(message, data);
    // Only send log via IPC if it's available and worker is initialized
    if (process.send && !this.isShuttingDown) {
      this.sendLog(level, message, data);
    }
  }

  logInfo(message, data = null) {
    this.log('info', message, data);
  }

  logWarn(message, data = null) {
    this.log('warn', message, data);
  }

  logError(message, data = null) {
    this.log('error', message, data);
  }

  logDebug(message, data = null) {
    this.log('debug', message, data);
  }

  // Utility methods
  updateProgress(progress, message = null) {
    this.sendProgress(progress, message);
    this.logInfo(`Progress: ${progress}%`, { message });
  }

  getToolPath(toolPath) {
    // Get path to the media uploader tools
    const mediaUploaderRoot = join(__dirname, '../../..');
    return join(mediaUploaderRoot, toolPath);
  }

  async runTool(toolInterface, method, ...args) {
    try {
      this.logDebug(`Running tool: ${toolInterface.constructor.name}.${method}`, { args });

      const result = await toolInterface[method](...args);

      this.logDebug(`Tool execution completed`, {
        tool: toolInterface.constructor.name,
        method,
        success: true
      });

      return result;
    } catch (error) {
      this.logError(`Tool execution failed`, {
        tool: toolInterface.constructor.name,
        method,
        error: error.message,
        args
      });
      throw error;
    }
  }

  // Graceful shutdown
  async shutdown(reason = 'UNKNOWN') {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.log('info', 'Worker shutting down', { reason, taskId: this.taskId });

    try {
      // Allow subclasses to perform cleanup
      if (typeof this.cleanup === 'function') {
        await this.cleanup();
      }

      // Give a moment for final messages to be sent
      setTimeout(() => {
        process.exit(reason === 'SIGTERM' || reason === 'SIGINT' ? 0 : 1);
      }, 100);

    } catch (error) {
      this.log('error', 'Error during worker shutdown', { error: error.message });
      process.exit(1);
    }
  }

  // Override this in subclasses if cleanup is needed
  async cleanup() {
    // Default: no cleanup needed
  }

  // IPC Connection Testing and Worker Initialization
  testIPCConnection() {
    this.log('debug', 'Testing IPC connection');

    if (!this.send({ type: 'PING', timestamp: Date.now() })) {
      this.log('error', 'Failed to send PING message - IPC may be broken');
      setTimeout(() => {
        if (!this.isReady) {
          this.log('error', 'Worker failed to establish IPC connection, shutting down');
          this.shutdown('IPC_FAILURE');
        }
      }, 1000);
    }
  }

  initializeWorker() {
    this.log('debug', 'Initializing worker');

    // Set a timeout for worker initialization
    this.initializationTimeout = setTimeout(() => {
      if (!this.isReady) {
        this.log('error', 'Worker initialization timeout - no START_TASK received');
        this.shutdown('INIT_TIMEOUT');
      }
    }, 10000); // 10 second timeout

    // Send ready signal to parent
    const readySent = this.send({
      type: 'WORKER_READY',
      pid: process.pid,
      workerType: this.constructor.name,
      timestamp: Date.now()
    });

    if (readySent) {
      this.log('info', 'Worker ready signal sent successfully');
    } else {
      this.log('error', 'Failed to send worker ready signal');
    }
  }

  // Validation helpers
  validateTaskData(taskData, requiredFields) {
    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(taskData, field)) {
        throw new Error(`Missing required field: ${field}`);
      }
      if (taskData[field] === null || taskData[field] === undefined || taskData[field] === '') {
        throw new Error(`Empty required field: ${field}`);
      }
    }
  }

  // File system helpers
  async fileExists(path) {
    try {
      const { access } = await import('fs/promises');
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  async isDirectory(path) {
    try {
      const { stat } = await import('fs/promises');
      const stats = await stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async isFile(path) {
    try {
      const { stat } = await import('fs/promises');
      const stats = await stat(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }
}

export default BaseWorker;