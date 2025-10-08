/**
 * Error handling utilities
 * Express error handlers and error response utilities
 */

import logger from './logger.js';

// Custom error classes
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskId) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
    this.statusCode = 404;
    this.taskId = taskId;
  }
}

export class WorkerError extends Error {
  constructor(message, taskId = null) {
    super(message);
    this.name = 'WorkerError';
    this.statusCode = 500;
    this.taskId = taskId;
  }
}

export class TimeoutError extends Error {
  constructor(message, timeout) {
    super(message);
    this.name = 'TimeoutError';
    this.statusCode = 408;
    this.timeout = timeout;
  }
}

export class ConfigurationError extends Error {
  constructor(message, configPath = null) {
    super(message);
    this.name = 'ConfigurationError';
    this.statusCode = 400;
    this.configPath = configPath;
  }
}

// Error response formatter
export function formatErrorResponse(error, req = null) {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const response = {
    error: error.name || 'Error',
    message: error.message || 'An error occurred',
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString()
  };

  // Add request context in development
  if (isDevelopment && req) {
    response.path = req.path;
    response.method = req.method;
  }

  // Add additional error details
  if (error.details) response.details = error.details;
  if (error.taskId) response.taskId = error.taskId;
  if (error.timeout) response.timeout = error.timeout;
  if (error.configPath) response.configPath = error.configPath;

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.stack = error.stack.split('\n');
  }

  return response;
}

// Main error handler middleware
export function errorHandler(error, req, res, next) {
  // Log the error
  logger.logError(error, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });

  // Handle different error types
  let statusCode = 500;
  let errorResponse;

  if (error.statusCode) {
    statusCode = error.statusCode;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    error.message = 'Invalid parameter format';
  } else if (error.code === 'ENOENT') {
    statusCode = 404;
    error.message = 'File or directory not found';
  } else if (error.code === 'EACCES') {
    statusCode = 403;
    error.message = 'Permission denied';
  } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
    statusCode = 503;
    error.message = 'Too many open files';
  }

  errorResponse = formatErrorResponse(error, req);

  // Send error response
  res.status(statusCode).json(errorResponse);
}

// 404 handler middleware
export function notFoundHandler(req, res) {
  const error = {
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json(error);
}

// Async error wrapper utility
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Response helpers
export class ResponseHelper {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  static created(res, data, message = 'Created successfully') {
    return ResponseHelper.success(res, data, message, 201);
  }

  static accepted(res, data = null, message = 'Request accepted') {
    return ResponseHelper.success(res, data, message, 202);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static error(res, error, statusCode = 500) {
    const errorResponse = formatErrorResponse(error);
    return res.status(statusCode).json(errorResponse);
  }

  static validationError(res, details, message = 'Validation failed') {
    const error = new ValidationError(message, details);
    return ResponseHelper.error(res, error, 400);
  }

  static notFound(res, resource = 'Resource') {
    const error = {
      name: 'Not Found',
      message: `${resource} not found`
    };
    return ResponseHelper.error(res, error, 404);
  }

  static unauthorized(res, message = 'Unauthorized') {
    const error = {
      name: 'Unauthorized',
      message
    };
    return ResponseHelper.error(res, error, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    const error = {
      name: 'Forbidden',
      message
    };
    return ResponseHelper.error(res, error, 403);
  }

  static conflict(res, message = 'Conflict') {
    const error = {
      name: 'Conflict',
      message
    };
    return ResponseHelper.error(res, error, 409);
  }

  static tooManyRequests(res, message = 'Too many requests') {
    const error = {
      name: 'Too Many Requests',
      message
    };
    return ResponseHelper.error(res, error, 429);
  }

  static serviceUnavailable(res, message = 'Service temporarily unavailable') {
    const error = {
      name: 'Service Unavailable',
      message
    };
    return ResponseHelper.error(res, error, 503);
  }

  // Paginated response helper
  static paginated(res, data, pagination, message = 'Success') {
    const response = {
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(response);
  }

  // Task response helper
  static task(res, task, message = 'Task created') {
    return ResponseHelper.success(res, {
      taskId: task.id,
      status: task.status,
      type: task.type,
      createdAt: task.createdAt,
      progress: task.progress,
      message: task.message
    }, message, task.status === 'pending' ? 202 : 200);
  }

  // Multiple tasks response helper
  static tasks(res, tasks, message = 'Tasks retrieved') {
    const data = tasks.map(task => ({
      taskId: task.id,
      status: task.status,
      type: task.type,
      progress: task.progress,
      message: task.message,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt
    }));

    return ResponseHelper.success(res, data, message);
  }
}

export default {
  ValidationError,
  TaskNotFoundError,
  WorkerError,
  TimeoutError,
  ConfigurationError,
  formatErrorResponse,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ResponseHelper
};