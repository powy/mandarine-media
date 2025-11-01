/**
 * Resend Subtitles from INI Configuration
 * Reads Excel file in folder and uploads all associated subtitles using INI config
 *
 * This is the new unified implementation for subtitle batch resend operations
 */

import fs from 'fs-extra';
import path from 'path';
import { uploadFromMediaDescriptionIdWithIni } from './uploadFromMediaDescriptionIdWithIni.js';
import { ExcelService } from '../../one-media-complete-upload/services/excelService.js';

/**
 * Resend all subtitles for a folder based on Excel associations
 *
 * @param {string} folderPath - Path to folder containing Excel file (0_desc_*.xlsx) and subtitle files
 * @param {string} iniPath - Full path to INI configuration file
 * @param {Object} [options] - Optional settings
 * @param {boolean} [options.dryRun] - Validate configuration without uploading
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @param {Object} [options.logger] - Custom logger
 *
 * @returns {Promise<Object>} Resend results
 * @returns {boolean} result.success - Overall success status
 * @returns {string} result.folder - Folder path processed
 * @returns {string} result.mediaDescriptionId - Media description ID from Excel
 * @returns {number} result.totalSubtitles - Total number of subtitles found
 * @returns {number} result.successful - Number of successful uploads
 * @returns {number} result.failed - Number of failed uploads
 * @returns {number} result.skipped - Number of skipped files (not found)
 * @returns {Array} result.results - Array of individual subtitle results
 *
 * @throws {Error} If folder not found
 * @throws {Error} If Excel file not found
 * @throws {Error} If media description ID not found in Excel
 * @throws {Error} If INI file invalid
 *
 * @example
 * const result = await resendSubtitlesFromIni(
 *   '/path/to/episode/folder',
 *   '/path/to/config.ini',
 *   { verbose: true }
 * );
 */
export async function resendSubtitlesFromIni(folderPath, iniPath, options = {}) {
  const logger = options.logger || console;

  logger.info?.('[resendSubtitlesFromIni] Starting subtitle resend...');
  logger.info?.(`[resendSubtitlesFromIni] Folder: ${folderPath}`);

  // Step 1: Validate folder exists
  if (!await fs.pathExists(folderPath)) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }

  // Step 2: Find Excel file in folder
  logger.info?.('[resendSubtitlesFromIni] Finding Excel file...');
  const excelService = new ExcelService(folderPath, logger);
  const excelPath = await excelService.findExistingExcelFile();

  if (!excelPath) {
    throw new Error(`No Excel file (0_desc_*.xlsx) found in folder: ${folderPath}`);
  }

  logger.info?.(`[resendSubtitlesFromIni] Found Excel: ${path.basename(excelPath)}`);

  // Step 3: Read Excel data
  logger.info?.('[resendSubtitlesFromIni] Reading Excel data...');
  const excelData = await excelService.readExcelFile(excelPath);

  // Get media description ID
  const mediaDescriptionId = excelData.description.id;
  if (!mediaDescriptionId) {
    throw new Error('No media description ID found in Excel file');
  }

  logger.info?.(`[resendSubtitlesFromIni] Media Description ID: ${mediaDescriptionId}`);

  // Step 4: Extract subtitle associations from Files sheet
  logger.info?.('[resendSubtitlesFromIni] Extracting subtitle associations...');
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
    logger.info?.('[resendSubtitlesFromIni] No subtitles found in Excel file');
    return {
      success: true,
      folder: folderPath,
      mediaDescriptionId,
      totalSubtitles: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: [],
      message: 'No subtitles to process'
    };
  }

  logger.info?.(`[resendSubtitlesFromIni] Found ${subtitles.length} subtitle(s) in Excel:`);
  subtitles.forEach(sub => {
    logger.info?.(`  - ${sub.fileName} (${sub.language}) [${sub.rowType}]`);
  });

  // Handle dry run
  if (options.dryRun) {
    logger.info?.('[resendSubtitlesFromIni] DRY RUN - Stopping before upload');
    return {
      success: true,
      dryRun: true,
      folder: folderPath,
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
  logger.info?.('[resendSubtitlesFromIni] Processing subtitles...\n');

  const results = [];
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < subtitles.length; i++) {
    const subtitle = subtitles[i];
    const subtitlePath = path.join(folderPath, subtitle.fileName);

    try {
      logger.info?.(`[${i + 1}/${subtitles.length}] Processing: ${subtitle.fileName} (${subtitle.language})`);

      // Check if file exists
      if (!await fs.pathExists(subtitlePath)) {
        logger.warn?.(`  File not found, skipping: ${subtitle.fileName}`);
        results.push({
          ...subtitle,
          success: false,
          skipped: true,
          error: 'File not found'
        });
        skippedCount++;
        continue;
      }

      // Build options for this subtitle
      const uploadOptions = {
        subtitleName: `${subtitle.languageName} (${subtitle.rowType})`,
        isDefault: subtitle.isDefault,
        closedCaptions: subtitle.isDefault,
        textType: 'subtitles',
        logger,
        ...options // Allow override from parent options
      };

      // Upload subtitle using unified INI wrapper
      const result = await uploadFromMediaDescriptionIdWithIni(
        mediaDescriptionId,
        subtitlePath,
        subtitle.language,
        iniPath,
        uploadOptions
      );

      logger.info?.(`  Success: ${subtitle.fileName} -> Track ID: ${result.trackId}`);
      results.push({
        ...subtitle,
        success: true,
        ...result
      });
      successCount++;

    } catch (error) {
      // Log error but continue processing
      const errorMessage = error.message || String(error);
      logger.error?.(`  Failed: ${subtitle.fileName} - ${errorMessage}`);

      results.push({
        ...subtitle,
        success: false,
        error: errorMessage
      });
      failedCount++;
    }
  }

  // Step 6: Summary
  logger.info?.('\n[resendSubtitlesFromIni] Summary:');
  logger.info?.(`  Total: ${subtitles.length}`);
  logger.info?.(`  Successful: ${successCount}`);
  logger.info?.(`  Failed: ${failedCount}`);
  logger.info?.(`  Skipped: ${skippedCount}`);

  return {
    success: failedCount === 0 && skippedCount === 0,
    folder: folderPath,
    mediaDescriptionId,
    totalSubtitles: subtitles.length,
    successful: successCount,
    failed: failedCount,
    skipped: skippedCount,
    results
  };
}

export default { resendSubtitlesFromIni };
