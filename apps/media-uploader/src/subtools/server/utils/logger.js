/**
 * Logger utility
 * Configures Winston logger for the media uploader server
 */

import winston from 'winston';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}] ${message}`;

    // Add metadata if present
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      const metaStr = JSON.stringify(meta, null, 2);
      log += `\n${metaStr}`;
    }

    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger configuration
const createLogger = () => {
  const logDir = join(__dirname, '..', 'logs');
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  // Generate timestamp for log file names
  const startupTime = new Date();
  const timestamp = startupTime.toISOString()
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .substring(0, 19); // Format: YYYY-MM-DDTHH-mm-ss

  const transports = [
    // Console transport
    new winston.transports.Console({
      level: logLevel,
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  ];

  // Ensure logs directory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  // Add file transports in production, development with LOG_FILE, or always for debugging
  const enableFileLogging = !isDevelopment || process.env.LOG_FILE || true; // Always enabled for debugging
  if (enableFileLogging) {
    transports.push(
      // Combined log file with timestamp
      new winston.transports.File({
        filename: join(logDir, `combined_${timestamp}.log`),
        level: 'info',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      }),

      // Error log file with timestamp
      new winston.transports.File({
        filename: join(logDir, `error_${timestamp}.log`),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      }),

      // Task-specific log file with timestamp - excludes health checks and routine operations
      new winston.transports.File({
        filename: join(logDir, `tasks_${timestamp}.log`),
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          // Filter out unwanted messages first
          winston.format((info) => {
            // Filter out health checks and routine polling
            if (info.message && typeof info.message === 'string') {
              if (info.message.includes('GET /health') ||
                  (info.message.includes('GET /api/v1/tasks') && !info.taskId) ||
                  (info.message.includes('Listed') && info.message.includes('tasks') && !info.taskId) ||
                  info.message.includes('keep alive') ||
                  info.message.includes('polling') ||
                  info.message.includes('health check')) {
                return false; // Completely filter out this log entry
              }
            }
            return info; // Keep this log entry
          })(),
          winston.format.printf(({ timestamp, level, message, taskId, event, ...meta }) => {
            // Format task-related logs with context
            let log = `${timestamp} [${level.toUpperCase()}]`;

            if (taskId) {
              log += ` [Task:${taskId}]`;
            }

            if (event) {
              log += ` [${event}]`;
            }

            log += ` ${message}`;

            // Add metadata if present
            const metaKeys = Object.keys(meta);
            if (metaKeys.length > 0) {
              const filteredMeta = { ...meta };
              // Remove common noise from metadata
              delete filteredMeta.ip;
              delete filteredMeta.userAgent;

              const remainingKeys = Object.keys(filteredMeta);
              if (remainingKeys.length > 0) {
                log += `\n${JSON.stringify(filteredMeta, null, 2)}`;
              }
            }

            return log;
          })
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    );
  }

  return winston.createLogger({
    levels: LOG_LEVELS,
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ),
    transports,
    exitOnError: false
  });
};

const logger = createLogger();

// Add request logging helper
logger.logRequest = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    logger.http(`${method} ${originalUrl}`, {
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.get('User-Agent')
    });
  });

  if (next) next();
};

// Add task logging helpers
logger.logTaskEvent = (event, taskId, data = {}) => {
  logger.info(`Task ${event}`, {
    event,
    taskId,
    ...data
  });
};

logger.logWorkerEvent = (event, taskId, data = {}) => {
  logger.debug(`Worker ${event}`, {
    event,
    taskId,
    ...data
  });
};

// Add error logging helper
logger.logError = (error, context = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    ...context
  };

  if (error.name) errorData.name = error.name;
  if (error.code) errorData.code = error.code;

  logger.error('Error occurred', errorData);
};

// Add task-specific logging helper that includes task context
logger.logTask = (level, message, taskId, event, data = {}) => {
  logger.log(level, message, {
    taskId,
    event,
    ...data
  });
};

// Convenience methods for task logging
logger.logTaskInfo = (message, taskId, event, data = {}) => {
  logger.logTask('info', message, taskId, event, data);
};

logger.logTaskError = (message, taskId, event, error, data = {}) => {
  const errorData = {
    ...data,
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined
  };
  logger.logTask('error', message, taskId, event, errorData);
};

logger.logTaskDebug = (message, taskId, event, data = {}) => {
  logger.logTask('debug', message, taskId, event, data);
};

// Stream for morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

export default logger;