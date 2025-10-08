#!/usr/bin/env node

/**
 * Media Uploader HTTP Server
 * Accepts GUI commands via HTTP POST and manages them as child processes
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'process';

// Import our modules
import TaskManager from './taskManager.js';
import WorkerManager from './workerManager.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './utils/errorHandler.js';

// Import route handlers
import taskRoutes from './routes/tasks.js';
import mediaAnalyzerRoutes from './routes/mediaAnalyzer.js';
import uploadRoutes from './routes/uploads.js';
import excelRoutes from './routes/excel.js';
import commandRoutes from './routes/commands.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MediaUploaderServer {
  constructor() {
    console.log('Creating MediaUploaderServer instance...');
    this.app = express();
    this.port = process.env.PORT || 3039;
    this.host = process.env.HOST || 'localhost';
    console.log(`Server will run on ${this.host}:${this.port}`);

    // Initialize managers
    console.log('Initializing TaskManager...');
    this.taskManager = new TaskManager();
    console.log('Initializing WorkerManager...');
    this.workerManager = new WorkerManager(this.taskManager);

    // Set up WorkerManager event listeners for task logging
    this.setupWorkerEventLogging();

    console.log('Setting up middleware...');
    this.setupMiddleware();
    console.log('Setting up routes...');
    this.setupRoutes();
    console.log('Setting up error handling...');
    this.setupErrorHandling();
    console.log('MediaUploaderServer instance created successfully');
  }

  setupWorkerEventLogging() {
    // Listen to WorkerManager events for enhanced task logging
    this.workerManager.on('task:created', (task) => {
      logger.logTaskInfo('Task created by WorkerManager', task.id, 'TASK_CREATED', {
        taskType: task.type,
        status: task.status
      });
    });

    this.workerManager.on('worker:started', (taskId, worker) => {
      logger.logTaskInfo('Worker started for task', taskId, 'WORKER_STARTED', {
        processId: worker.process ? worker.process.pid : null
      });
    });

    this.workerManager.on('worker:finished', (taskId, success, data, error) => {
      if (success) {
        logger.logTaskInfo('Worker finished successfully', taskId, 'WORKER_FINISHED', {
          success: true,
          resultData: data
        });
      } else {
        logger.logTaskError('Worker finished with error', taskId, 'WORKER_FINISHED', error, {
          success: false
        });
      }
    });

    this.workerManager.on('worker:error', (taskId, error) => {
      logger.logTaskError('Worker encountered error', taskId, 'WORKER_ERROR', error);
    });

    this.workerManager.on('worker:cancelled', (taskId, reason) => {
      logger.logTaskInfo('Worker was cancelled', taskId, 'WORKER_CANCELLED', {
        reason
      });
    });

    this.workerManager.on('worker:exit', (taskId, { code, signal, killed }) => {
      logger.logTaskDebug('Worker process exited', taskId, 'WORKER_EXIT', {
        exitCode: code,
        signal,
        killed
      });
    });
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for local development
    }));

    // CORS - enable for local development
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? ['http://localhost:3039']
        : true,
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware with filtering
    this.app.use((req, res, next) => {
      // Skip logging for health check requests to reduce noise
      if (req.path === '/health') {
        return next();
      }

      // Log task-related requests with enhanced context
      if (req.path.startsWith('/api/v1/')) {
        logger.logTaskInfo(`${req.method} ${req.path}`, null, 'API_REQUEST', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          body: req.method === 'POST' ? req.body : undefined,
          query: Object.keys(req.query).length > 0 ? req.query : undefined
        });
      } else {
        // Regular logging for non-API requests
        logger.info(`${req.method} ${req.path}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
      next();
    });

    // Attach managers to request object for route handlers
    this.app.use((req, res, next) => {
      req.taskManager = this.taskManager;
      req.workerManager = this.workerManager;
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        tasks: {
          total: this.taskManager.getAllTasks().length,
          running: this.taskManager.getRunningTasks().length,
          pending: this.taskManager.getPendingTasks().length,
        }
      });
    });

    // API routes
    const apiRouter = express.Router();

    // Mount route handlers
    apiRouter.use('/tasks', taskRoutes);
    apiRouter.use('/media-analyzer', mediaAnalyzerRoutes);
    apiRouter.use('/uploads', uploadRoutes);
    apiRouter.use('/excel', excelRoutes);
    apiRouter.use('/commands', commandRoutes);

    // Mount API router
    this.app.use('/api/v1', apiRouter);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Media Uploader HTTP Server',
        version: '1.0.0',
        description: 'HTTP server for media uploader tool commands',
        endpoints: {
          health: '/health',
          api: '/api/v1',
          tasks: '/api/v1/tasks',
          mediaAnalyzer: '/api/v1/media-analyzer',
          uploads: '/api/v1/uploads',
          excel: '/api/v1/excel',
        }
      });
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    console.log('Starting server...');
    try {
      // Cleanup any existing workers on startup
      console.log('Cleaning up existing workers...');
      await this.workerManager.cleanup();
      console.log('Worker cleanup completed');

      // Start the server
      console.log(`Starting HTTP server on ${this.host}:${this.port}...`);
      this.server = this.app.listen(this.port, this.host, () => {
        console.log(`✅ Server started successfully on ${this.host}:${this.port}`);
        logger.info(`Media Uploader Server started`, {
          host: this.host,
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          pid: process.pid
        });
      });

      // Graceful shutdown handling
      console.log('Setting up signal handlers...');
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('SIGINT', () => this.shutdown('SIGINT'));
      process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        logger.error('Uncaught Exception:', error);
        this.shutdown('UNCAUGHT_EXCEPTION');
      });
      process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection:', reason);
        logger.error('Unhandled Rejection:', { reason, promise });
        this.shutdown('UNHANDLED_REJECTION');
      });

      console.log('Server startup completed successfully');

    } catch (error) {
      console.error('Failed to start server:', error);
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(signal) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Stop accepting new requests
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Cancel all running tasks and cleanup workers
      await this.workerManager.cancelAllTasks();
      await this.workerManager.cleanup();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server if this file is run directly
console.log('Server script loaded, checking if running directly...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

// Fix Windows path comparison by normalizing both paths
const currentFileUrl = import.meta.url;
const scriptPath = `file:///${process.argv[1].replace(/\\/g, '/')}`;
const isMainModule = currentFileUrl === scriptPath || currentFileUrl.endsWith(process.argv[1].replace(/\\/g, '/'));

console.log('Normalized script path:', scriptPath);
console.log('Is main module:', isMainModule);

if (isMainModule) {
  console.log('Starting server as main module...');
  try {
    const server = new MediaUploaderServer();
    server.start().catch(error => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Error creating server:', error);
    process.exit(1);
  }
} else {
  console.log('Server loaded as module, not starting automatically');
}

export default MediaUploaderServer;