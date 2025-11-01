/**
 * Batch Resend Subtitles from INI Configuration
 * Process multiple folders, each containing an Excel file and subtitle files
 *
 * This is the new unified implementation for batch subtitle resend operations
 */

import fs from 'fs-extra';
import path from 'path';
import { resendSubtitlesFromIni } from './resendSubtitlesFromIni.js';

/**
 * Resend subtitles for all subfolders in a parent folder
 * Each subfolder should contain:
 * - An Excel file (0_desc_*.xlsx)
 * - Subtitle files referenced in the Excel
 *
 * @param {string} parentFolder - Path to parent folder containing subfolders
 * @param {string} iniPath - Full path to INI configuration file
 * @param {Object} [options] - Optional settings
 * @param {boolean} [options.dryRun] - Validate configuration without uploading
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @param {Object} [options.logger] - Custom logger
 *
 * @returns {Promise<Object>} Batch processing results
 * @returns {boolean} result.success - Overall success status
 * @returns {number} result.processed - Number of folders processed
 * @returns {number} result.totalSuccessful - Total successful subtitle uploads
 * @returns {number} result.totalFailed - Total failed subtitle uploads
 * @returns {number} result.totalSkipped - Total skipped subtitle files
 * @returns {Array} result.folders - Array of folder processing results
 *
 * @throws {Error} If parent folder not found
 * @throws {Error} If INI file invalid
 *
 * @example
 * const result = await batchResendSubtitlesFromIni(
 *   '/path/to/parent/folder',
 *   '/path/to/config.ini',
 *   { verbose: true }
 * );
 */
export async function batchResendSubtitlesFromIni(parentFolder, iniPath, options = {}) {
  const logger = options.logger || console;

  logger.info?.('[batchResendSubtitlesFromIni] Starting batch subtitle resend...');
  logger.info?.(`[batchResendSubtitlesFromIni] Parent Folder: ${parentFolder}\n`);

  // Validate parent folder exists
  if (!await fs.pathExists(parentFolder)) {
    throw new Error(`Parent folder does not exist: ${parentFolder}`);
  }

  // Get all subdirectories
  const entries = await fs.readdir(parentFolder, { withFileTypes: true });
  const subfolders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  if (subfolders.length === 0) {
    logger.info?.('[batchResendSubtitlesFromIni] No subfolders found');
    return {
      success: true,
      processed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalSkipped: 0,
      folders: []
    };
  }

  logger.info?.(`[batchResendSubtitlesFromIni] Found ${subfolders.length} subfolder(s)\n`);

  const results = {
    processed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    totalSkipped: 0,
    folders: []
  };

  // Process each subfolder
  for (const subfolder of subfolders) {
    const subfolderPath = path.join(parentFolder, subfolder);

    logger.info?.(`\n[batchResendSubtitlesFromIni] Processing folder: ${subfolder}`);
    logger.info?.('─'.repeat(60));

    try {
      // Process folder using single folder resend function
      const result = await resendSubtitlesFromIni(subfolderPath, iniPath, options);

      results.processed++;
      results.totalSuccessful += result.successful || 0;
      results.totalFailed += result.failed || 0;
      results.totalSkipped += result.skipped || 0;

      results.folders.push({
        folder: subfolder,
        ...result
      });

      if (result.success) {
        logger.info?.(`[batchResendSubtitlesFromIni] Completed: ${result.successful}/${result.totalSubtitles} subtitles`);
      } else {
        logger.warn?.(`[batchResendSubtitlesFromIni] Completed with errors: ${result.successful}/${result.totalSubtitles} successful`);
      }

    } catch (error) {
      logger.error?.(`[batchResendSubtitlesFromIni] Failed to process folder ${subfolder}: ${error.message}`);

      results.processed++;
      results.folders.push({
        folder: subfolder,
        success: false,
        error: error.message
      });
    }
  }

  // Final Summary
  logger.info?.('\n\n[batchResendSubtitlesFromIni] Batch Processing Summary:');
  logger.info?.(`  Folders Processed: ${results.processed}`);
  logger.info?.(`  Total Successful: ${results.totalSuccessful} subtitle(s)`);
  if (results.totalFailed > 0) {
    logger.warn?.(`  Total Failed: ${results.totalFailed} subtitle(s)`);
  }
  if (results.totalSkipped > 0) {
    logger.warn?.(`  Total Skipped: ${results.totalSkipped} subtitle(s)`);
  }

  return {
    success: results.totalFailed === 0,
    ...results
  };
}

export default { batchResendSubtitlesFromIni };
