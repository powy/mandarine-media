/**
 * Resend Subtitles Batch Function V2
 * Reads Excel file and resends all subtitle files
 * Continues processing even if individual subtitles fail
 */

import fs from 'fs-extra';
import path from 'path';
import { resendSubtitleSingle } from './resendSubtitles2Core.js';
import { ExcelService } from '../one-media-complete-upload/services/excelService.js';

/**
 * Resend all subtitles for a folder based on Excel associations
 *
 * @param {Object} config - Configuration object
 * @param {string} config.folderPath - Path to folder containing Excel file and subtitle files
 * @param {Object} config.mux - Mux configuration {tokenId, tokenSecret}
 * @param {Object} config.s3 - S3 configuration {accessKeyId, secretAccessKey, region, bucket, keyPrefix}
 * @param {Object} config.backend - Backend API configuration {baseUrl, username, password}
 * @param {Object} [config.options] - Upload options
 * @param {boolean} [config.dryRun=false] - Dry run mode (preview only)
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @returns {Promise<Object>} Resend results with summary
 */
export async function resendSubtitles2(config) {
  const logger = {
    info: (msg) => config.verbose && console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg)
  };

  logger.info('📝 Subtitle Resend V2 - Starting...');
  logger.info(`Folder: ${config.folderPath}`);

  // Step 1: Validate folder exists
  if (!await fs.pathExists(config.folderPath)) {
    throw new Error(`Folder does not exist: ${config.folderPath}`);
  }

  // Step 2: Find Excel file in folder
  logger.info('\n🔍 Step 1: Finding Excel file...');
  const excelService = new ExcelService(config.folderPath, logger);
  const excelPath = await excelService.findExistingExcelFile();

  if (!excelPath) {
    throw new Error(`No Excel file (0_desc_*.xlsx) found in folder: ${config.folderPath}`);
  }

  logger.info(`✓ Found Excel: ${path.basename(excelPath)}`);

  // Step 3: Read Excel data
  logger.info('\n📖 Step 2: Reading Excel data...');
  const excelData = await excelService.readExcelFile(excelPath);

  // Debug: Log the description object
  logger.info(`Debug - excelData.description keys: ${Object.keys(excelData.description || {}).join(', ')}`);
  logger.info(`Debug - excelData.description.id value: "${excelData.description?.id}"`);
  logger.info(`Debug - excelData.description.id type: ${typeof excelData.description?.id}`);

  // Get media description ID
  const mediaDescriptionId = excelData.description.id;
  if (!mediaDescriptionId) {
    throw new Error('No media description ID found in Excel file');
  }

  logger.info(`✓ Media Description ID: ${mediaDescriptionId}`);

  // Step 4: Extract subtitle associations from Files sheet
  logger.info('\n📋 Step 3: Extracting subtitle associations...');
  const subtitles = [];

  for (const file of excelData.files) {
    const rowType = file.type || 'Unknown';

    // Check each subtitle column (frSubtitle, enSubtitle, koSubtitle, krSubtitle)
    if (file.frSubtitle) {
      subtitles.push({
        fileName: file.frSubtitle,
        language: 'fr',
        languageName: 'Français',
        rowType: rowType,
        isDefault: true
      });
    }

    if (file.enSubtitle) {
      subtitles.push({
        fileName: file.enSubtitle,
        language: 'en',
        languageName: 'English',
        rowType: rowType,
        isDefault: false
      });
    }

    if (file.koSubtitle) {
      subtitles.push({
        fileName: file.koSubtitle,
        language: 'ko',
        languageName: '한국어',
        rowType: rowType,
        isDefault: false
      });
    }

    // Handle legacy kr files as Korean
    if (file.krSubtitle) {
      subtitles.push({
        fileName: file.krSubtitle,
        language: 'ko',
        languageName: '한국어',
        rowType: rowType,
        isDefault: false
      });
    }
  }

  if (subtitles.length === 0) {
    logger.info('✓ No subtitles found in Excel file');
    return {
      success: true,
      folder: config.folderPath,
      mediaDescriptionId,
      totalSubtitles: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: [],
      message: 'No subtitles to process'
    };
  }

  logger.info(`✓ Found ${subtitles.length} subtitle(s) in Excel:`);
  subtitles.forEach(sub => {
    logger.info(`  - ${sub.fileName} (${sub.language}) [${sub.rowType}]`);
  });

  // Handle dry run
  if (config.dryRun) {
    logger.info('\n🔍 Dry run mode - Stopping before upload');
    return {
      success: true,
      dryRun: true,
      folder: config.folderPath,
      mediaDescriptionId,
      totalSubtitles: subtitles.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: subtitles.map(sub => ({
        ...sub,
        success: true,
        dryRun: true
      })),
      message: 'Dry run completed - no upload performed'
    };
  }

  // Step 5: Process each subtitle
  logger.info('\n🚀 Step 4: Processing subtitles...\n');

  const results = [];
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < subtitles.length; i++) {
    const subtitle = subtitles[i];
    const subtitlePath = path.join(config.folderPath, subtitle.fileName);

    try {
      logger.info(`[${i + 1}/${subtitles.length}] Processing: ${subtitle.fileName} (${subtitle.language})`);

      // Check if file exists
      if (!await fs.pathExists(subtitlePath)) {
        logger.warn(`  ⚠️  File not found, skipping: ${subtitle.fileName}`);
        results.push({
          ...subtitle,
          success: false,
          skipped: true,
          error: 'File not found'
        });
        skippedCount++;
        continue;
      }

      // Build config for this subtitle
      const subtitleConfig = {
        subtitlePath: subtitlePath,
        language: subtitle.language,
        mediaDescriptionId: mediaDescriptionId,
        mux: config.mux,
        s3: config.s3,
        backend: config.backend,
        options: {
          ...config.options,
          closedCaptions: subtitle.isDefault,
          name: `${subtitle.languageName} (${subtitle.rowType})`
        },
        verbose: config.verbose
      };

      // Upload subtitle using core function
      const result = await resendSubtitleSingle(subtitleConfig);

      logger.info(`  ✅ Success: ${subtitle.fileName} -> Track ID: ${result.mux.trackId}`);
      results.push({
        ...subtitle,
        success: true,
        ...result
      });
      successCount++;

    } catch (error) {
      // Log error but continue processing
      const errorMessage = error.message || String(error);
      logger.error(`  ❌ Failed: ${subtitle.fileName} - ${errorMessage}`);

      results.push({
        ...subtitle,
        success: false,
        error: errorMessage
      });
      failedCount++;
    }

    logger.info(''); // Empty line between subtitles
  }

  // Step 6: Summary
  logger.info('📊 Resend Summary:');
  logger.info(`  Total: ${subtitles.length}`);
  logger.info(`  Successful: ${successCount}`);
  logger.info(`  Failed: ${failedCount}`);
  logger.info(`  Skipped: ${skippedCount}`);

  return {
    success: failedCount === 0 && skippedCount === 0,
    folder: config.folderPath,
    mediaDescriptionId,
    totalSubtitles: subtitles.length,
    successful: successCount,
    failed: failedCount,
    skipped: skippedCount,
    results
  };
}

export default {
  resendSubtitles2
};
