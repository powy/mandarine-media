#!/usr/bin/env node

/**
 * Service-Server - Main Express Server
 * Backend service handling task execution and management
 * Port: 3011
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs-extra';
import TaskManager from './task-manager.js';
import healthRouter from './routes/health.js';
import { createTaskRoutes } from './routes/tasks.js';
import logger from './utils/logger.js';
import { CONFIG } from './config/constants.js';

const app = express();
const PORT = CONFIG.SERVER.PORT;
const HOST = CONFIG.SERVER.HOST;

// Ensure all required directories exist
logger.info('Ensuring data directories exist...');
fs.ensureDirSync(CONFIG.PATHS.DATA_DIR);
fs.ensureDirSync(CONFIG.PATHS.LOGS_DIR);
fs.ensureDirSync(CONFIG.PATHS.TEMP_DIR);
logger.info(`Data directory: ${CONFIG.PATHS.DATA_DIR}`);
logger.info(`Logs directory: ${CONFIG.PATHS.LOGS_DIR}`);
logger.info(`Temp directory: ${CONFIG.PATHS.TEMP_DIR}`);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: CONFIG.SERVER.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  next();
});

// Initialize Task Manager
logger.info('Initializing TaskManager...');
const taskManager = new TaskManager();

// Routes
app.use('/api/health', healthRouter);
app.use('/api/task', createTaskRoutes(taskManager));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Model Uploader Service-Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      tasks: {
        create: 'POST /api/task/create',
        list: 'GET /api/task/list',
        status: 'GET /api/task/:id/status',
        log: 'GET /api/task/:id/log',
        stop: 'DELETE /api/task/:id',
        stats: 'GET /api/task/stats'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    taskManager.shutdown();
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    taskManager.shutdown();
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  logger.info('========================================');
  logger.info('Service-Server Started');
  logger.info('========================================');
  logger.info(`Server running at http://${HOST}:${PORT}`);
  logger.info(`Max concurrent tasks: ${CONFIG.TASKS.MAX_CONCURRENT}`);
  logger.info(`Logs directory: ${CONFIG.PATHS.LOGS_DIR}`);
  logger.info('========================================');
});

// Handle startup errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error('Server error', { error: error.message });
    process.exit(1);
  }
});

export default app;
export { taskManager };
