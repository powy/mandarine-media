/**
 * File Logger Utility
 * Provides unified logging to both console and file
 *
 * Usage:
 *   const logger = createFileLogger({ logFile: '/path/to/log.txt', verbose: true });
 *   logger.info('message');
 *   logger.error('error message');
 */

import winston from 'winston';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

/**
 * Create a logger that outputs to both console and optional file
 * @param {Object} options - Logger options
 * @param {string} [options.logFile] - Optional path to log file
 * @param {boolean} [options.verbose=false] - Enable verbose/debug logging
 * @param {boolean} [options.quiet=false] - Suppress console output (file only)
 * @returns {Object} Logger instance
 */
export function createFileLogger(options = {}) {
  const { logFile, verbose = false, quiet = false } = options;

  // Determine log level
  const level = verbose ? 'debug' : 'info';

  // Create transports array
  const transports = [];

  // Console transport (unless quiet mode)
  if (!quiet) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ level, message, timestamp }) => {
            // Color-coded console output
            const coloredLevel = {
              error: chalk.red('ERROR'),
              warn: chalk.yellow('WARN'),
              info: chalk.blue('INFO'),
              debug: chalk.gray('DEBUG'),
              verbose: chalk.gray('VERBOSE')
            }[level] || level.toUpperCase();

            return `${chalk.gray(`[${timestamp}]`)} ${coloredLevel}: ${message}`;
          })
        )
      })
    );
  }

  // File transport (if logFile is provided)
  if (logFile) {
    try {
      // Ensure log directory exists
      const logDir = path.dirname(logFile);
      fs.ensureDirSync(logDir);

      transports.push(
        new winston.transports.File({
          filename: logFile,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp }) => {
              // Plain text for file (no colors)
              return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
            })
          )
        })
      );

      // Log initialization message
      if (!quiet) {
        console.log(chalk.gray(`📝 Logging to file: ${logFile}`));
      }
    } catch (error) {
      console.error(chalk.red(`Failed to create log file: ${error.message}`));
    }
  }

  // Create winston logger
  const logger = winston.createLogger({
    level,
    transports
  });

  // Add convenience methods
  return {
    info: (message) => logger.info(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message),
    debug: (message) => logger.debug(message),
    verbose: (message) => logger.verbose(message),

    // Log start of operation
    logStart: (operation, config = null) => {
      logger.info(`Starting ${operation}`);
      if (config && verbose) {
        logger.debug(`Config: ${JSON.stringify(config, null, 2)}`);
      }
    },

    // Log success
    logSuccess: (operation, result = null) => {
      logger.info(`Successfully completed ${operation}`);
      if (result && verbose) {
        logger.debug(`Result: ${JSON.stringify(result, null, 2)}`);
      }
    },

    // Log error with details
    logError: (operation, error) => {
      logger.error(`Failed ${operation}: ${error.message}`);
      if (error.stack && verbose) {
        logger.debug(`Stack trace: ${error.stack}`);
      }
    }
  };
}

/**
 * Redirect console.log/error to logger
 * Useful for capturing all output including from third-party libraries
 * @param {Object} logger - Logger instance from createFileLogger
 * @returns {Function} Restore function to undo the redirect
 */
export function redirectConsoleToLogger(logger) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => {
    const message = args.join(' ');
    logger.info(message);
  };

  console.error = (...args) => {
    const message = args.join(' ');
    logger.error(message);
  };

  console.warn = (...args) => {
    const message = args.join(' ');
    logger.warn(message);
  };

  // Return restore function
  return () => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  };
}

export default {
  createFileLogger,
  redirectConsoleToLogger
};
