/**
 * Synchronous File Logger Utility
 *
 * Provides immediate file logging without buffering to ensure logs
 * are captured in real-time for frontend display.
 *
 * Uses fs.appendFileSync() for immediate writes, matching the pattern
 * used in task-runner.js which works reliably.
 */

import fs from 'fs-extra';
import chalk from 'chalk';

/**
 * Create a synchronous file logger that writes immediately
 * This ensures logs are captured in real-time for the frontend
 *
 * @param {string} logFile - Path to log file
 * @param {boolean} verbose - Enable verbose logging to console
 * @returns {Object} Logger instance with info/warn/error/debug methods
 *
 * @example
 * const logger = createSyncFileLogger('/path/to/task.log', true);
 * logger.info('Processing started');
 * logger.error('An error occurred');
 */
export function createSyncFileLogger(logFile, verbose = true) {
  // Ensure log file exists
  fs.ensureFileSync(logFile);

  /**
   * Write a log entry synchronously
   * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
   * @param {string} message - Log message
   */
  const write = (level, message) => {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] ${message}\n`;

    // Synchronous write - no buffering, immediate flush to disk
    // This matches the pattern in task-runner.js logWriter
    try {
      fs.appendFileSync(logFile, formatted, 'utf8');
    } catch (error) {
      // Fallback to console if file write fails
      console.error(`Failed to write to log file: ${error.message}`);
    }

    // Also log to console for debugging (when verbose)
    if (verbose) {
      const consoleMsg = formatted.trim();
      switch (level) {
        case 'ERROR':
          console.error(chalk.red(consoleMsg));
          break;
        case 'WARN':
          console.warn(chalk.yellow(consoleMsg));
          break;
        case 'DEBUG':
          console.log(chalk.blue(consoleMsg));
          break;
        default:
          console.log(chalk.gray(consoleMsg));
      }
    }
  };

  return {
    /**
     * Log an info message
     * @param {string} message - Message to log
     */
    info: (message) => write('INFO', message),

    /**
     * Log a warning message
     * @param {string} message - Message to log
     */
    warn: (message) => write('WARN', message),

    /**
     * Log an error message
     * @param {string} message - Message to log
     */
    error: (message) => write('ERROR', message),

    /**
     * Log a debug message
     * @param {string} message - Message to log
     */
    debug: (message) => write('DEBUG', message)
  };
}

/**
 * Create a simple console logger for ExcelBatchService
 * This logger only writes to console, not to file
 * File logging is handled by the sync file logger in the wrapper
 *
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Object} Logger instance with info/warn/error/debug methods
 *
 * @example
 * const logger = createConsoleLogger(true);
 * const service = new ExcelBatchService(logger);
 */
export function createConsoleLogger(verbose = true) {
  return {
    /**
     * Log an info message to console
     * @param {string} message - Message to log
     */
    info: (msg) => {
      if (verbose) {
        console.log(chalk.gray(msg));
      }
    },

    /**
     * Log a warning message to console
     * @param {string} message - Message to log
     */
    warn: (msg) => {
      console.log(chalk.yellow(msg));
    },

    /**
     * Log an error message to console
     * @param {string} message - Message to log
     */
    error: (msg) => {
      console.error(chalk.red(msg));
    },

    /**
     * Log a debug message to console
     * @param {string} message - Message to log
     */
    debug: (msg) => {
      if (verbose) {
        console.log(chalk.blue(msg));
      }
    }
  };
}

/**
 * Create a dual logger that writes to both file and console
 * Useful for wrapper functions that need to log operations
 *
 * @param {string|null} logFile - Path to log file (null to skip file logging)
 * @param {boolean} verbose - Enable verbose console logging
 * @returns {Object} Logger instance
 *
 * @example
 * const logger = createDualLogger('/path/to/task.log', true);
 * logger.info('Operation started');
 */
export function createDualLogger(logFile, verbose = true) {
  const fileLogger = logFile ? createSyncFileLogger(logFile, false) : null;

  return {
    info: (message) => {
      if (verbose) {
        console.log(chalk.gray(message));
      }
      if (fileLogger) {
        fileLogger.info(message);
      }
    },
    warn: (message) => {
      console.log(chalk.yellow(message));
      if (fileLogger) {
        fileLogger.warn(message);
      }
    },
    error: (message) => {
      console.error(chalk.red(message));
      if (fileLogger) {
        fileLogger.error(message);
      }
    },
    debug: (message) => {
      if (verbose) {
        console.log(chalk.blue(message));
      }
      if (fileLogger) {
        fileLogger.debug(message);
      }
    }
  };
}
