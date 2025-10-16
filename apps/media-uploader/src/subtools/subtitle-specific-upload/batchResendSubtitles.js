/**
 * Batch Resend Subtitles Core Function
 * Processes multiple subfolders, resending subtitles from each folder's Excel
 * Continues processing even if individual folders fail
 */

import fs from 'fs-extra';
import path from 'path';
import { resendSubtitles } from './resendSubtitles.js';
import { ExcelService } from '../one-media-complete-upload/services/excelService.js';

/**
 * Batch resend subtitles for multiple subfolders
 * Each subfolder should contain its own Excel file with subtitle associations
 *
 * @param {Object} config - Configuration object
 * @param {string} config.parentFolderPath - Path to parent folder containing subfolders
 * @param {Object} config.mux - Mux configuration
 * @param {Object} config.s3 - S3 configuration
 * @param {Object} config.backend - Backend API configuration
 * @param {Object} [config.options] - Upload options
 * @param {number} [config.maxConcurrent=1] - Max concurrent folders to process
 * @param {boolean} [config.dryRun=false] - Dry run mode
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @returns {Promise<Object>} Batch resend results with aggregated summary
 */
export async function batchResendSubtitles(config) {
  const logger = {
    info: (msg) => config.verbose && console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg)
  };

  logger.info('📝 Batch Subtitle Resend - Starting...');
  logger.info(`Parent Folder: ${config.parentFolderPath}`);

  // Step 1: Validate parent folder exists
  if (!await fs.pathExists(config.parentFolderPath)) {
    throw new Error(`Parent folder does not exist: ${config.parentFolderPath}`);
  }

  // Step 2: Scan for subfolders with Excel files
  logger.info('\n🔍 Step 1: Scanning for subfolders with Excel files...');

  const allEntries = await fs.readdir(config.parentFolderPath, { withFileTypes: true });
  const subfolders = allEntries.filter(entry => entry.isDirectory());

  logger.info(`✓ Found ${subfolders.length} subfolder(s)`);

  // Check which subfolders have Excel files
  const foldersWithExcel = [];

  for (const subfolder of subfolders) {
    const subfolderPath = path.join(config.parentFolderPath, subfolder.name);
    const excelService = new ExcelService(subfolderPath, {
      info: () => {},
      warn: () => {},
      error: () => {}
    });

    try {
      const excelPath = await excelService.findExistingExcelFile();
      if (excelPath) {
        foldersWithExcel.push({
          name: subfolder.name,
          path: subfolderPath,
          excelPath
        });
        logger.info(`  ✓ ${subfolder.name} - Has Excel`);
      } else {
        logger.info(`  ⊘ ${subfolder.name} - No Excel file`);
      }
    } catch (error) {
      logger.warn(`  ⚠️  ${subfolder.name} - Error checking for Excel: ${error.message}`);
    }
  }

  if (foldersWithExcel.length === 0) {
    logger.info('\n✓ No folders with Excel files found');
    return {
      success: true,
      parentFolder: config.parentFolderPath,
      totalFolders: subfolders.length,
      processedFolders: 0,
      successfulFolders: 0,
      failedFolders: 0,
      totalSubtitles: 0,
      successfulSubtitles: 0,
      failedSubtitles: 0,
      folderResults: [],
      message: 'No folders with Excel files to process'
    };
  }

  logger.info(`\n✓ Found ${foldersWithExcel.length} folder(s) with Excel files to process`);

  // Handle dry run
  if (config.dryRun) {
    logger.info('\n🔍 Dry run mode - Stopping before processing');
    return {
      success: true,
      dryRun: true,
      parentFolder: config.parentFolderPath,
      totalFolders: subfolders.length,
      processedFolders: 0,
      successfulFolders: 0,
      failedFolders: 0,
      totalSubtitles: 0,
      successfulSubtitles: 0,
      failedSubtitles: 0,
      folderResults: foldersWithExcel.map(folder => ({
        folder: folder.path,
        folderName: folder.name,
        dryRun: true
      })),
      message: 'Dry run completed - no processing performed'
    };
  }

  // Step 3: Process each folder
  logger.info('\n🚀 Step 2: Processing folders...\n');

  const folderResults = [];
  let successfulFolders = 0;
  let failedFolders = 0;
  let totalSubtitles = 0;
  let successfulSubtitles = 0;
  let failedSubtitles = 0;

  for (let i = 0; i < foldersWithExcel.length; i++) {
    const folder = foldersWithExcel[i];

    try {
      logger.info(`[${i + 1}/${foldersWithExcel.length}] Processing: ${folder.name}`);
      logger.info(`  Folder: ${folder.path}`);

      // Build config for this folder
      const folderConfig = {
        folderPath: folder.path,
        mux: config.mux,
        s3: config.s3,
        backend: config.backend,
        options: config.options,
        dryRun: false,
        verbose: config.verbose
      };

      // Process folder
      const result = await resendSubtitles(folderConfig);

      // Aggregate results
      totalSubtitles += result.totalSubtitles;
      successfulSubtitles += result.successful;
      failedSubtitles += result.failed;

      if (result.success) {
        successfulFolders++;
        logger.info(`  ✅ Success: ${result.successful}/${result.totalSubtitles} subtitles uploaded`);
      } else {
        failedFolders++;
        logger.warn(`  ⚠️  Completed with errors: ${result.successful}/${result.totalSubtitles} subtitles uploaded`);
      }

      folderResults.push({
        folder: folder.path,
        folderName: folder.name,
        success: result.success,
        ...result
      });

    } catch (error) {
      // Log error but continue processing other folders
      const errorMessage = error.message || String(error);
      logger.error(`  ❌ Failed: ${folder.name} - ${errorMessage}`);

      failedFolders++;
      folderResults.push({
        folder: folder.path,
        folderName: folder.name,
        success: false,
        error: errorMessage,
        totalSubtitles: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        results: []
      });
    }

    logger.info(''); // Empty line between folders
  }

  // Step 4: Summary
  logger.info('📊 Batch Resend Summary:');
  logger.info(`  Total Folders: ${foldersWithExcel.length}`);
  logger.info(`  Successful Folders: ${successfulFolders}`);
  logger.info(`  Failed Folders: ${failedFolders}`);
  logger.info(`  Total Subtitles: ${totalSubtitles}`);
  logger.info(`  Successful Subtitles: ${successfulSubtitles}`);
  logger.info(`  Failed Subtitles: ${failedSubtitles}`);

  return {
    success: failedFolders === 0,
    parentFolder: config.parentFolderPath,
    totalFolders: subfolders.length,
    processedFolders: foldersWithExcel.length,
    successfulFolders,
    failedFolders,
    totalSubtitles,
    successfulSubtitles,
    failedSubtitles,
    folderResults
  };
}

export default {
  batchResendSubtitles
};
