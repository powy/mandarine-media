/**
 * Picture Upload Core Function
 * Pure function interface that accepts JSON configuration
 */

import { validateConfig } from './schemas/inputSchema.js';
import { checkFileExists, getImageMetadata, loadConfigFile } from './utils/fileUtils.js';
import { uploadToS3 } from './services/s3Service.js';
import { createPictureRecord } from './services/apiService.js';
import { PictureUploadError, ErrorCodes } from './utils/errorHandler.js';

/**
 * Core picture upload function
 * @param {Object} config - Configuration object
 * @param {string} config.picturePath - Path to picture file
 * @param {Object} config.s3 - S3 configuration
 * @param {string} config.s3.accessKeyId - S3 access key ID
 * @param {string} config.s3.secretAccessKey - S3 secret access key
 * @param {string} config.s3.region - S3 region
 * @param {string} config.s3.bucketName - S3 bucket name
 * @param {string} [config.s3.keyPrefix] - S3 key prefix
 * @param {Object} config.api - API configuration
 * @param {string} config.api.baseUrl - API base URL
 * @param {string} config.api.username - API username
 * @param {string} config.api.password - API password
 * @param {Object} [config.metadata] - Custom metadata
 * @param {string} [config.metadata.fileName] - Custom file name
 * @param {string} [config.metadata.altText] - Alt text for accessibility
 * @param {boolean} [config.dryRun=false] - Dry run mode
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @param {boolean} [config.debug=false] - Debug logging
 * @returns {Promise<Object>} Upload result
 */
export async function pictureUploadCore(config) {
  try {
    // Validate configuration first
    const validatedConfig = await prepareConfig(config);

    // Check if picture file exists
    const fileExists = await checkFileExists(validatedConfig.picturePath);
    if (!fileExists) {
      throw new PictureUploadError(
        `Picture file not found or not readable: ${validatedConfig.picturePath}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Get image metadata
    const metadata = await getMetadata(validatedConfig);

    // Handle dry run
    if (validatedConfig.dryRun) {
      return {
        success: true,
        dryRun: true,
        message: 'Dry run completed successfully - configuration is valid and picture file is accessible',
        config: validatedConfig,
        metadata,
        picturePath: validatedConfig.picturePath
      };
    }

    // Upload to S3
    const s3Url = await uploadToS3(validatedConfig.picturePath, validatedConfig.s3);

    // Create API record
    const pictureRecord = await createPictureRecord(s3Url, metadata, validatedConfig.api);

    return {
      success: true,
      result: {
        s3Url,
        pictureRecord,
        metadata
      },
      message: 'Picture upload completed successfully'
    };

  } catch (error) {
    throw new Error(`Picture upload failed: ${error.message}`);
  }
}

/**
 * Prepare and validate configuration
 * @param {Object} config - Raw configuration
 * @returns {Promise<Object>} Prepared configuration
 */
async function prepareConfig(config) {
  let finalConfig = { ...config };

  // If a config file path is provided, load it first
  if (config.configFile) {
    const fileConfig = await loadConfigFile(config.configFile);
    // File config as base, provided config overrides
    finalConfig = { ...fileConfig, ...config };
  }

  // Validate the final configuration
  const validatedConfig = validateConfig(finalConfig);

  return validatedConfig;
}

/**
 * Get image metadata with custom metadata merge
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Image metadata
 */
async function getMetadata(config) {
  try {
    const metadata = await getImageMetadata(config.picturePath);

    // Add custom metadata if provided
    if (config.metadata) {
      if (config.metadata.fileName) {
        metadata.fileName = config.metadata.fileName;
      }
      if (config.metadata.altText) {
        metadata.altText = config.metadata.altText;
      }
    }

    return metadata;

  } catch (error) {
    throw new PictureUploadError(
      `Failed to read image metadata: ${error.message}`,
      ErrorCodes.METADATA_READ_FAILED,
      error
    );
  }
}