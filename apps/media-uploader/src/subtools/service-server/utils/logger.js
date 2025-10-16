/**
 * Logger Utility for Service-Server
 * Simple logger with file and console output
 */

import fs from 'fs-extra';
import path from 'path';
import { CONFIG } from '../config/constants.js';

class Logger {
  constructor(logDir = CONFIG.PATHS.LOGS_DIR) {
    this.logDir = logDir;
    fs.ensureDirSync(this.logDir);
  }

  /**
   * Get timestamp string
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = this.getTimestamp();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  /**
   * Write to console and file
   */
  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);

    // Console output
    const consoleMethod = {
      error: 'error',
      warn: 'warn',
      info: 'info',
      debug: 'log'
    }[level] || 'log';

    console[consoleMethod](formattedMessage);

    // File output - daily log file
    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `server-${dateStr}.log`);

    try {
      fs.appendFileSync(logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  error(message, meta) {
    this.log('error', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  debug(message, meta) {
    this.log('debug', message, meta);
  }

  /**
   * Create task-specific logger
   */
  createTaskLogger(taskId) {
    const taskLogFile = path.join(this.logDir, `task-${taskId}.log`);

    return {
      taskId,
      logFile: taskLogFile,
      write(message) {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] ${message}\n`;
        try {
          fs.appendFileSync(taskLogFile, formatted);
        } catch (error) {
          console.error(`Failed to write to task log ${taskId}:`, error.message);
        }
      },
      error(message) {
        this.write(`[ERROR] ${message}`);
      },
      warn(message) {
        this.write(`[WARN] ${message}`);
      },
      info(message) {
        this.write(`[INFO] ${message}`);
      },
      debug(message) {
        this.write(`[DEBUG] ${message}`);
      }
    };
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
export { Logger };
