/**
 * Batch Resend Subtitles V2
 * Process multiple folders, each containing an Excel file and subtitle files
 * Continues processing even if individual folders fail
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { resendSubtitles2 } from './resendSubtitles2.js';

/**
 * Resend subtitles for all subfolders in a parent folder
 * Each subfolder should contain:
 * - An Excel file (0_desc_*.xlsx)
 * - Subtitle files referenced in the Excel
 *
 * @param {Object} config - Configuration object
 * @param {string} config.parentFolder - Path to parent folder containing subfolders
 * @param {Object} config.mux - Mux configuration {tokenId, tokenSecret}
 * @param {Object} config.s3 - S3 configuration
 * @param {Object} config.backend - Backend API configuration
 * @param {Object} [config.options] - Upload options
 * @param {boolean} [config.dryRun=false] - Dry run mode
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @returns {Promise<Object>} Batch processing results
 */
export async function batchResendSubtitles2(config) {
  console.log(chalk.blue.bold('📦 Batch Subtitle Resend V2\n'));
  console.log(chalk.gray(`Parent Folder: ${config.parentFolder}\n`));

  // Validate parent folder exists
  if (!await fs.pathExists(config.parentFolder)) {
    throw new Error(`Parent folder does not exist: ${config.parentFolder}`);
  }

  // Get all subdirectories
  const entries = await fs.readdir(config.parentFolder, { withFileTypes: true });
  const subfolders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  if (subfolders.length === 0) {
    console.log(chalk.yellow('⚠️  No subfolders found'));
    return {
      success: true,
      processed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalSkipped: 0,
      folders: []
    };
  }

  console.log(chalk.cyan(`Found ${subfolders.length} subfolder(s)\n`));

  const results = {
    processed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    totalSkipped: 0,
    folders: []
  };

  // Process each subfolder
  for (const subfolder of subfolders) {
    const subfolderPath = path.join(config.parentFolder, subfolder);

    console.log(chalk.blue.bold(`\n📁 Processing folder: ${subfolder}`));
    console.log(chalk.gray('─'.repeat(60)));

    try {
      // Build config for this folder
      const folderConfig = {
        folderPath: subfolderPath,
        mux: config.mux,
        s3: config.s3,
        backend: config.backend,
        options: config.options,
        dryRun: config.dryRun,
        verbose: config.verbose
      };

      // Process folder
      const result = await resendSubtitles2(folderConfig);

      results.processed++;
      results.totalSuccessful += result.successful || 0;
      results.totalFailed += result.failed || 0;
      results.totalSkipped += result.skipped || 0;

      results.folders.push({
        folder: subfolder,
        ...result
      });

      if (result.success) {
        console.log(chalk.green(`✅ Completed: ${result.successful}/${result.totalSubtitles} subtitles`));
      } else {
        console.log(chalk.yellow(`⚠️  Completed with errors: ${result.successful}/${result.totalSubtitles} successful`));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Failed to process folder ${subfolder}: ${error.message}`));

      results.processed++;
      results.folders.push({
        folder: subfolder,
        success: false,
        error: error.message
      });
    }
  }

  // Final Summary
  console.log(chalk.blue.bold('\n\n📊 Batch Processing Summary:'));
  console.log(chalk.cyan(`  Folders Processed: ${results.processed}`));
  console.log(chalk.green(`  Total Successful: ${results.totalSuccessful} subtitle(s)`));
  if (results.totalFailed > 0) {
    console.log(chalk.red(`  Total Failed: ${results.totalFailed} subtitle(s)`));
  }
  if (results.totalSkipped > 0) {
    console.log(chalk.yellow(`  Total Skipped: ${results.totalSkipped} subtitle(s)`));
  }

  return {
    success: results.totalFailed === 0,
    ...results
  };
}

export default {
  batchResendSubtitles2
};
