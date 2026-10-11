/**
 * Function wrapper for mux-subtitle-upload tool
 *
 * REFACTORED: This is now a simple proxy to uploadFromJson
 * All core logic has been moved to modular core functions
 *
 * This wrapper maintains backward compatibility with existing code
 */

import { uploadFromJson } from './uploadFromJson.js';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';

/**
 * Mux Subtitle Upload Function Wrapper
 *
 * @param {Object} options - Upload options
 * @param {string} options.config - Configuration file path (JSON)
 * @param {boolean} [options.debug] - Enable debug logging
 * @param {number} [options.retry] - Number of retry attempts (default: 3)
 * @param {boolean} [options.dryRun] - Validate configuration without uploading
 * @param {boolean} [options.verbose] - Verbose output
 * @param {boolean} [options.quiet] - Quiet mode (errors only)
 * @param {boolean} [options.cleanup] - Skip S3 file cleanup after upload (default: true)
 * @param {number} [options.cleanupDelay] - S3 cleanup delay in minutes (default: 120)
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 *
 * @returns {Promise<Object>} Upload results
 * @returns {boolean} result.success - Whether all uploads succeeded
 * @returns {number} result.totalSubtitles - Total number of subtitles processed
 * @returns {number} result.successful - Number of successful uploads
 * @returns {number} result.failed - Number of failed uploads
 * @returns {Array} result.results - Individual upload results
 *
 * @throws {Error} If configuration file not found or invalid
 *
 * @example
 * const result = await uploadSubtitlesToMux({
 *   config: '/path/to/config.json',
 *   verbose: true
 * });
 */
export async function uploadSubtitlesToMux(options) {
  let restoreConsole = null;

  // Initialize file logger if logFile is provided
  if (options.logFile) {
    const fileLogger = createFileLogger({
      logFile: options.logFile,
      verbose: options.verbose || options.debug,
      quiet: options.quiet
    });
    restoreConsole = redirectConsoleToLogger(fileLogger);
  }

  try {
    // Validate required options
    if (!options.config) {
      throw new Error('Configuration file path is required (options.config)');
    }

    // Display startup information if not quiet
    if (!options.quiet) {
      console.log('📝 Mux Subtitle Upload Tool v2.0.0 (Refactored)\n');
      console.log(`Configuration: ${options.config}`);
    }

    // Call refactored uploadFromJson with all options
    const result = await uploadFromJson(options.config, {
      verbose: options.verbose || options.debug,
      quiet: options.quiet,
      dryRun: options.dryRun,
      logFile: options.logFile,
      logger: options.logger,
      noServer: options.noServer
    });

    // Display completion message if not quiet
    if (!options.quiet && !options.dryRun) {
      if (result.success) {
        console.log(`\n✅ All ${result.successful} subtitle(s) uploaded successfully`);
      } else {
        console.log(`\n⚠️  Completed with ${result.failed} failure(s) out of ${result.totalSubtitles} subtitle(s)`);
      }
    }

    return result;

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    throw error;
  } finally {
    // Restore console if redirected
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

// Export default for backward compatibility
export default { uploadSubtitlesToMux };