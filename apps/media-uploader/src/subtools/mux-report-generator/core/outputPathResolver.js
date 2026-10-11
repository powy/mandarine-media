/**
 * Output Path Resolver
 * Determines the best output directory and filename for the report
 */

import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { REPORT_CONFIG } from '../config/constants.js';

export class OutputPathResolver {
  /**
   * Create a new Output Path Resolver
   * @param {Object} logger - Logger instance
   */
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Format timestamp as YYYYMMDDHHmm
   * @param {Date} date - Date object
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}`;
  }

  /**
   * Generate filename with timestamp
   * @returns {string} Filename
   */
  generateFilename() {
    const timestamp = this.formatTimestamp();
    return `${timestamp}${REPORT_CONFIG.OUTPUT.FILENAME_SUFFIX}`;
  }

  /**
   * Try to create directory and verify write access
   * @param {string} dirPath - Directory path to test
   * @returns {Promise<boolean>} True if directory is usable
   */
  async tryCreateDirectory(dirPath) {
    try {
      // Ensure directory exists
      await fs.ensureDir(dirPath);

      // Test write access
      await fs.access(dirPath, fs.constants.W_OK);

      this.logger.info(`✓ Using output directory: ${dirPath}`);
      return true;
    } catch (error) {
      this.logger.warn(`✗ Cannot use directory ${dirPath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Resolve the best output path with fallback logic
   * @returns {Promise<string>} Full path to output file
   */
  async resolve() {
    this.logger.info('Resolving output path with fallback logic...');

    const filename = this.generateFilename();
    const dirName = REPORT_CONFIG.OUTPUT.DIRECTORY_NAME;

    // Priority 1: Windows Desktop\mux_reports (Windows only)
    if (os.platform() === 'win32') {
      const desktopPath = path.join(os.homedir(), 'Desktop', dirName);
      if (await this.tryCreateDirectory(desktopPath)) {
        return path.join(desktopPath, filename);
      }
    }

    // Priority 2: User Home\mux_reports
    const homePath = path.join(os.homedir(), dirName);
    if (await this.tryCreateDirectory(homePath)) {
      return path.join(homePath, filename);
    }

    // Priority 3: Current working directory\mux_reports (fallback)
    const cwdPath = path.join(process.cwd(), dirName);
    this.logger.info(`Using fallback: Current working directory`);
    await fs.ensureDir(cwdPath);
    return path.join(cwdPath, filename);
  }

  /**
   * Get directory name that will be created
   * @returns {string} Directory name
   */
  static getDirectoryName() {
    return REPORT_CONFIG.OUTPUT.DIRECTORY_NAME;
  }
}

export default OutputPathResolver;
