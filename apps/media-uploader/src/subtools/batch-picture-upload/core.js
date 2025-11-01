/**
 * Batch Picture Upload Core Function
 * Pure function interface that accepts JSON configuration
 */

import fs from 'fs-extra';
import path from 'path';
import { validateConfig } from './schemas/inputSchema.js';
import { pictureUploadCore } from '../picture-upload/core.js';
import { getImageMetadata } from '../picture-upload/utils/fileUtils.js';
import { formatDetector } from '../server/utils/formatDetector.js';
import { ExcelService } from '../one-media-complete-upload/services/excelService.js';
import { ExcelBatchService } from '../excel-batch-editor/services/excelBatchService.js';
import { PictureAssociator } from './services/associator.js';

/**
 * Batch picture upload core function (DEPRECATED - use batchPictureUploadFromExcel instead)
 * Uploads a picture once, then associates it to all subfolder media descriptions
 *
 * @deprecated Use batchPictureUploadFromExcel for explicit Excel-based workflow,
 *             or batchPictureUploadFromId for ID-based workflow without Excel
 * @param {Object} config - Configuration object
 * @param {string} config.picturePath - Path to picture file
 * @param {string} config.parentFolderPath - Parent folder containing subfolders
 * @param {Object} config.s3 - S3 configuration
 * @param {Object} config.cloudfront - CloudFront configuration
 * @param {Object} config.api - Backend API configuration
 * @param {Object} [config.metadata] - Custom metadata
 * @param {Object} [config.options] - Upload options
 * @param {string} [config.options.pattern='0_desc'] - Excel file pattern
 * @param {boolean} [config.options.continueOnError=true] - Continue on association errors
 * @param {boolean} [config.dryRun=false] - Dry run mode
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @returns {Promise<Object>} Upload result with association details
 */
export async function batchPictureUploadCore(config) {
  // Validate configuration
  const validatedConfig = validateConfig(config);

  const logger = {
    info: (msg) => validatedConfig.verbose && console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg)
  };

  logger.info('🖼️  Batch Picture Upload - Starting...');
  logger.info(`Picture: ${validatedConfig.picturePath}`);
  logger.info(`Parent Folder: ${validatedConfig.parentFolderPath}`);

  const results = {
    phase1: null,  // Initial upload
    phase2: {      // Batch association
      successes: [],
      failures: [],
      total: 0
    },
    summary: {
      uploadSuccess: false,
      associationsSuccess: 0,
      associationsFailure: 0,
      totalSubfolders: 0
    }
  };

  // PHASE 1: Initial Picture Upload
  logger.info('\n📤 Phase 1: Initial picture upload...');

  try {
    results.phase1 = await executeInitialUploadFromExcel(validatedConfig, logger);
    results.summary.uploadSuccess = true;
    logger.info('✅ Phase 1 completed successfully');
  } catch (error) {
    throw new Error(`Phase 1 failed: ${error.message}`);
  }

  // Handle dry run
  if (validatedConfig.dryRun) {
    logger.info('\n🔍 Dry run mode - Stopping before Phase 2');
    return {
      success: true,
      dryRun: true,
      phase1: results.phase1,
      message: 'Dry run completed - picture uploaded but no associations made'
    };
  }

  // PHASE 2: Batch Association to Subfolders
  logger.info('\n🔗 Phase 2: Batch association to subfolders...');

  try {
    results.phase2 = await executeBatchAssociationFromExcel(
      validatedConfig,
      results.phase1.uploadResult.api.id,
      results.phase1.format.format,
      logger
    );

    results.summary.associationsSuccess = results.phase2.successes.length;
    results.summary.associationsFailure = results.phase2.failures.length;
    results.summary.totalSubfolders = results.phase2.total;

    logger.info(`✅ Phase 2 completed: ${results.summary.associationsSuccess}/${results.summary.totalSubfolders} successful`);
  } catch (error) {
    logger.error(`❌ Phase 2 failed but phase 1 succeeded: ${error.message}`);
    // Don't throw - phase 1 succeeded, so we have partial success
    results.phase2.error = error.message;
  }

  return {
    success: true,
    picturePath: validatedConfig.picturePath,
    parentFolderPath: validatedConfig.parentFolderPath,
    results,
    metadata: {
      format: results.phase1?.format,
      pictureId: results.phase1?.uploadResult?.api?.id,
      associationsSuccess: results.summary.associationsSuccess,
      associationsFailure: results.summary.associationsFailure,
      totalSubfolders: results.summary.totalSubfolders
    }
  };
}

/**
 * Phase 1: Execute initial picture upload FROM MEDIA DESCRIPTION ID
 * Bypasses Excel extraction - ID is provided directly
 * @param {Object} config - Configuration object
 * @param {string} config.picturePath - Path to picture file
 * @param {Object} config.s3 - S3 configuration
 * @param {Object} config.api - API configuration
 * @param {Object} [config.metadata] - Custom metadata
 * @param {boolean} [config.verbose] - Verbose logging
 * @param {string} [config.parentFolderPath] - Parent folder path (optional, for return value)
 * @param {string} mediaDescriptionId - The media description ID (provided directly)
 * @param {Object} formatResult - Format detection result
 * @param {boolean} formatResult.success - Format detection succeeded
 * @param {string} formatResult.format - Format string (e.g., '1920_1080')
 * @param {string} formatResult.displayFormat - Display format (e.g., '1920x1080')
 * @param {string} formatResult.mediaDescriptionField - Field name for media description
 * @param {Object} metadata - Image metadata
 * @param {number} metadata.width - Image width
 * @param {number} metadata.height - Image height
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Upload result
 * @private
 */
async function executeInitialUploadFromId(config, mediaDescriptionId, formatResult, metadata, logger) {
  // Validate inputs
  if (!mediaDescriptionId) {
    throw new Error('mediaDescriptionId is required for executeInitialUploadFromId');
  }

  if (!formatResult || !formatResult.success) {
    throw new Error('Valid formatResult is required for executeInitialUploadFromId');
  }

  if (!metadata) {
    throw new Error('Image metadata is required for executeInitialUploadFromId');
  }

  logger.info('  Uploading picture to S3...');
  logger.info(`  Media description ID: ${mediaDescriptionId}`);
  logger.info(`  Format: ${formatResult.displayFormat} (${formatResult.format})`);
  logger.info(`  Media description field: ${formatResult.mediaDescriptionField}`);

  // Upload picture using picture-upload subtool
  const uploadResult = await pictureUploadCore({
    picturePath: config.picturePath,
    s3: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
      region: config.s3.region,
      bucketName: config.s3.bucket,
      keyPrefix: config.s3.keyPrefix
    },
    api: config.api,
    metadata: {
      ...config.metadata,
      format: formatResult.format,
      mediaDescriptionId
    },
    verbose: config.verbose
  });

  if (!uploadResult || !uploadResult.success) {
    throw new Error(uploadResult?.error || 'Picture upload failed');
  }

  logger.info(`  Picture uploaded successfully`);
  logger.info(`  S3 URL: ${uploadResult.result.s3Url}`);
  logger.info(`  Picture ID: ${uploadResult.result.pictureRecord.id}`);

  return {
    picturePath: config.picturePath,
    parentFolderPath: config.parentFolderPath,
    format: formatResult,
    mediaDescriptionId,
    uploadResult,
    metadata
  };
}

/**
 * Phase 1: Execute initial picture upload FROM EXCEL
 * Extracts media description ID from Excel, then delegates to executeInitialUploadFromId
 * @param {Object} config - Configuration object (must contain parentFolderPath)
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Upload result
 * @private
 */
async function executeInitialUploadFromExcel(config, logger) {
  // 1. Validate picture file exists
  logger.info('  Validating picture file...');
  if (!await fs.pathExists(config.picturePath)) {
    throw new Error(`Picture file does not exist: ${config.picturePath}`);
  }

  // 2. Extract image metadata
  logger.info('  Extracting image metadata...');
  const metadata = await getImageMetadata(config.picturePath);
  logger.info(`  Dimensions: ${metadata.width}x${metadata.height}`);

  // 3. Detect format from dimensions
  logger.info('  Detecting format...');
  const formatResult = formatDetector.detectFormat(metadata.width, metadata.height);

  if (!formatResult.success) {
    throw new Error(formatResult.error);
  }

  logger.info(`  Format detected: ${formatResult.displayFormat} (${formatResult.format})`);
  logger.info(`  Media description field: ${formatResult.mediaDescriptionField}`);

  // 4. Find media description ID from parent folder Excel
  logger.info('  Finding media description ID from parent folder...');

  let mediaDescriptionId;
  try {
    const excelService = new ExcelService(config.parentFolderPath);
    mediaDescriptionId = await excelService.findMediaDescriptionId();

    if (!mediaDescriptionId) {
      throw new Error('No media description ID found in parent folder Excel file');
    }

    logger.info(`  Media description ID: ${mediaDescriptionId}`);
  } catch (error) {
    throw new Error(`Failed to find media description ID: ${error.message}`);
  }

  // 5. Delegate to executeInitialUploadFromId
  return await executeInitialUploadFromId(config, mediaDescriptionId, formatResult, metadata, logger);
}

/**
 * Phase 1: Execute initial picture upload (DEPRECATED)
 * @deprecated Use executeInitialUploadFromExcel instead - this wrapper maintained for backward compatibility
 * @private
 */
async function executeInitialUpload(config, logger) {
  return await executeInitialUploadFromExcel(config, logger);
}

/**
 * Phase 2: Execute batch association FROM LIST OF IDs
 * Bypasses Excel scanning - IDs are provided directly
 * @param {Object} config - Configuration object
 * @param {Object} config.api - API configuration for PictureAssociator
 * @param {Array<Object|string>} mediaDescriptionIds - Array of media description IDs
 *   Can be: ['id1', 'id2', ...] OR [{mediaDescriptionId: 'id1', folderName: 'ep1', excelPath: '...'}, ...]
 * @param {number} pictureId - The uploaded picture ID
 * @param {string} format - Format string (e.g., '1920_1080')
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Association results
 * @private
 */
async function executeBatchAssociationFromIds(config, mediaDescriptionIds, pictureId, format, logger) {
  // Validate inputs
  if (!Array.isArray(mediaDescriptionIds) || mediaDescriptionIds.length === 0) {
    logger.warn('  No media description IDs provided for association');
    return {
      successes: [],
      failures: [],
      total: 0,
      processed: 0,
      associations: 0,
      message: 'No media description IDs provided for association'
    };
  }

  logger.info(`  Received ${mediaDescriptionIds.length} media description IDs for association`);

  // Normalize input: handle both string[] and object[] formats
  const associations = [];

  for (let i = 0; i < mediaDescriptionIds.length; i++) {
    const item = mediaDescriptionIds[i];

    if (typeof item === 'string') {
      // Simple string ID
      associations.push({
        mediaDescriptionId: item,
        folderName: `Item ${i + 1}`,
        excelPath: null
      });
    } else if (item && typeof item === 'object' && item.mediaDescriptionId) {
      // Object with mediaDescriptionId
      associations.push({
        mediaDescriptionId: item.mediaDescriptionId,
        folderName: item.folderName || `Item ${i + 1}`,
        excelPath: item.excelPath || null
      });
    } else {
      throw new Error(`Invalid item at index ${i}: must be string or object with mediaDescriptionId property. Got: ${JSON.stringify(item)}`);
    }
  }

  logger.info(`  Prepared ${associations.length} associations`);

  // Log each association
  associations.forEach(assoc => {
    logger.info(`  → ${assoc.folderName}: ${assoc.mediaDescriptionId}`);
  });

  // Batch associate using PictureAssociator
  logger.info('  Associating picture to media descriptions...');

  const pictureAssociator = new PictureAssociator({
    backend: config.api
  }, logger);

  const batchResults = await pictureAssociator.batchAssociatePicture(
    associations,
    pictureId,
    format
  );

  return {
    ...batchResults,
    processed: mediaDescriptionIds.length,
    associations: associations.length
  };
}

/**
 * Phase 2: Execute batch association FROM EXCEL FILES
 * Scans subfolders for Excel files, extracts IDs, then delegates to executeBatchAssociationFromIds
 * @param {Object} config - Configuration object (must contain parentFolderPath)
 * @param {number} pictureId - The uploaded picture ID
 * @param {string} format - Format string
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Association results
 * @private
 */
async function executeBatchAssociationFromExcel(config, pictureId, format, logger) {
  // 1. Scan subfolders for Excel files
  logger.info('  Scanning subfolders for Excel files...');

  const excelBatchService = new ExcelBatchService(logger);
  const pattern = config.options?.pattern || '0_desc';

  const excelFiles = await excelBatchService.findExcelFiles(config.parentFolderPath, pattern);

  // Filter to only episode-level (subfolder) Excel files
  const subfolderExcelFiles = excelFiles.filter(file => !file.isSeasonLevel);

  logger.info(`  Found ${subfolderExcelFiles.length} subfolder Excel files`);

  if (subfolderExcelFiles.length === 0) {
    return {
      successes: [],
      failures: [],
      total: 0,
      processed: 0,
      associations: 0,
      message: 'No subfolder Excel files found to associate'
    };
  }

  // 2. Extract media description IDs from each subfolder
  logger.info('  Extracting media description IDs...');

  const associations = [];

  for (const excelFile of subfolderExcelFiles) {
    try {
      const excelService = new ExcelService(excelFile.folder);
      const mediaDescriptionId = await excelService.findMediaDescriptionId();

      if (mediaDescriptionId) {
        associations.push({
          mediaDescriptionId,
          folderName: excelFile.folderName,
          excelPath: excelFile.filePath
        });
        logger.info(`  ✓ ${excelFile.folderName}: ${mediaDescriptionId}`);
      } else {
        logger.warn(`  ⚠ ${excelFile.folderName}: No media ID found`);
      }
    } catch (error) {
      logger.error(`  ✗ ${excelFile.folderName}: ${error.message}`);
      // Continue to next folder (continueOnError behavior)
    }
  }

  logger.info(`  Prepared ${associations.length} associations`);

  if (associations.length === 0) {
    return {
      successes: [],
      failures: [],
      total: subfolderExcelFiles.length,
      processed: subfolderExcelFiles.length,
      associations: 0,
      message: 'No valid media description IDs found in subfolders'
    };
  }

  // 3. Delegate to executeBatchAssociationFromIds
  const result = await executeBatchAssociationFromIds(config, associations, pictureId, format, logger);

  // Add processed count from Excel scanning
  return {
    ...result,
    processed: subfolderExcelFiles.length
  };
}

/**
 * Phase 2: Execute batch association to subfolders (DEPRECATED)
 * @deprecated Use executeBatchAssociationFromExcel instead - this wrapper maintained for backward compatibility
 * @private
 */
async function executeBatchAssociation(config, pictureId, format, logger) {
  return await executeBatchAssociationFromExcel(config, pictureId, format, logger);
}

/**
 * Batch picture upload FROM EXCEL (explicit name)
 * Uploads a picture once, then associates it to all subfolder media descriptions
 * Extracts media description IDs from Excel files in parent and subfolders
 *
 * @param {Object} config - Configuration object
 * @param {string} config.picturePath - Path to picture file
 * @param {string} config.parentFolderPath - Parent folder containing subfolders with Excel files
 * @param {Object} config.s3 - S3 configuration
 * @param {Object} config.cloudfront - CloudFront configuration
 * @param {Object} config.api - Backend API configuration
 * @param {Object} [config.metadata] - Custom metadata
 * @param {Object} [config.options] - Upload options
 * @param {string} [config.options.pattern='0_desc'] - Excel file pattern
 * @param {boolean} [config.options.continueOnError=true] - Continue on association errors
 * @param {boolean} [config.dryRun=false] - Dry run mode
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @returns {Promise<Object>} Upload result with association details
 */
export async function batchPictureUploadFromExcel(config) {
  return await batchPictureUploadCore(config);
}

/**
 * Batch picture upload FROM MEDIA DESCRIPTION IDs (no Excel required)
 * Uploads a picture once, then associates it to provided media description IDs
 * Bypasses Excel extraction - all IDs are provided directly
 *
 * @param {Object} config - Configuration object
 * @param {string} config.picturePath - Path to picture file
 * @param {string} config.mediaDescriptionId - Media description ID for initial upload
 * @param {Array<string|Object>} config.subfolderMediaDescriptionIds - Array of media description IDs for batch association
 *   Can be string array: ['id1', 'id2', ...]
 *   Or object array: [{mediaDescriptionId: 'id1', folderName: 'ep1'}, ...]
 * @param {Object} config.s3 - S3 configuration
 * @param {Object} config.cloudfront - CloudFront configuration
 * @param {Object} config.api - Backend API configuration
 * @param {Object} [config.metadata] - Custom metadata
 * @param {boolean} [config.dryRun=false] - Dry run mode
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @returns {Promise<Object>} Upload result with association details
 */
export async function batchPictureUploadFromId(config) {
  // Validate configuration
  const validatedConfig = validateConfig(config);

  // Validate required fields for ID-based workflow
  if (!validatedConfig.mediaDescriptionId) {
    throw new Error('mediaDescriptionId is required for batchPictureUploadFromId. This is the media description ID for the initial picture upload.');
  }

  if (!validatedConfig.subfolderMediaDescriptionIds) {
    throw new Error('subfolderMediaDescriptionIds is required for batchPictureUploadFromId. This should be an array of media description IDs for batch association.');
  }

  if (!Array.isArray(validatedConfig.subfolderMediaDescriptionIds)) {
    throw new Error('subfolderMediaDescriptionIds must be an array. Got: ' + typeof validatedConfig.subfolderMediaDescriptionIds);
  }

  const logger = {
    info: (msg) => validatedConfig.verbose && console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg)
  };

  logger.info('🖼️  Batch Picture Upload FROM ID - Starting...');
  logger.info(`Picture: ${validatedConfig.picturePath}`);
  logger.info(`Media Description ID: ${validatedConfig.mediaDescriptionId}`);
  logger.info(`Subfolder IDs: ${validatedConfig.subfolderMediaDescriptionIds.length} items`);

  const results = {
    phase1: null,
    phase2: {
      successes: [],
      failures: [],
      total: 0
    },
    summary: {
      uploadSuccess: false,
      associationsSuccess: 0,
      associationsFailure: 0,
      totalSubfolders: 0
    }
  };

  // PHASE 1: Initial Picture Upload FROM ID
  logger.info('\n📤 Phase 1: Initial picture upload FROM ID...');

  try {
    // Step 1: Validate picture file exists
    logger.info('  Validating picture file...');
    if (!await fs.pathExists(validatedConfig.picturePath)) {
      throw new Error(`Picture file does not exist: ${validatedConfig.picturePath}`);
    }

    // Step 2: Extract image metadata
    logger.info('  Extracting image metadata...');
    const metadata = await getImageMetadata(validatedConfig.picturePath);
    logger.info(`  Dimensions: ${metadata.width}x${metadata.height}`);

    // Step 3: Detect format from dimensions
    logger.info('  Detecting format...');
    const formatResult = formatDetector.detectFormat(metadata.width, metadata.height);

    if (!formatResult.success) {
      throw new Error(formatResult.error);
    }

    logger.info(`  Format detected: ${formatResult.displayFormat} (${formatResult.format})`);
    logger.info(`  Media description field: ${formatResult.mediaDescriptionField}`);

    // Step 4: Call executeInitialUploadFromId
    results.phase1 = await executeInitialUploadFromId(
      validatedConfig,
      validatedConfig.mediaDescriptionId,
      formatResult,
      metadata,
      logger
    );

    results.summary.uploadSuccess = true;
    logger.info('✅ Phase 1 completed successfully');
  } catch (error) {
    throw new Error(`Phase 1 failed: ${error.message}`);
  }

  // Handle dry run
  if (validatedConfig.dryRun) {
    logger.info('\n🔍 Dry run mode - Stopping before Phase 2');
    return {
      success: true,
      dryRun: true,
      phase1: results.phase1,
      message: 'Dry run completed - picture uploaded but no associations made'
    };
  }

  // PHASE 2: Batch Association FROM IDs
  logger.info('\n🔗 Phase 2: Batch association FROM IDs...');

  try {
    results.phase2 = await executeBatchAssociationFromIds(
      validatedConfig,
      validatedConfig.subfolderMediaDescriptionIds,
      results.phase1.uploadResult.result.pictureRecord.id,
      results.phase1.format.format,
      logger
    );

    results.summary.associationsSuccess = results.phase2.successes.length;
    results.summary.associationsFailure = results.phase2.failures.length;
    results.summary.totalSubfolders = results.phase2.total;

    logger.info(`✅ Phase 2 completed: ${results.summary.associationsSuccess}/${results.summary.totalSubfolders} successful`);
  } catch (error) {
    logger.error(`❌ Phase 2 failed but phase 1 succeeded: ${error.message}`);
    // Don't throw - phase 1 succeeded, so we have partial success
    results.phase2.error = error.message;
  }

  return {
    success: true,
    picturePath: validatedConfig.picturePath,
    results,
    metadata: {
      format: results.phase1?.format,
      pictureId: results.phase1?.uploadResult?.result.pictureRecord.id,
      associationsSuccess: results.summary.associationsSuccess,
      associationsFailure: results.summary.associationsFailure,
      totalSubfolders: results.summary.totalSubfolders
    }
  };
}

export default {
  batchPictureUploadCore,
  batchPictureUploadFromExcel,
  batchPictureUploadFromId
};
