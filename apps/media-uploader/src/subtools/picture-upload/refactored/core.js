import { S3Service } from '../services/s3Service.js';
import { ApiService } from '../services/apiService.js';
import { checkFileExists, getImageMetadata } from '../utils/fileUtils.js';
import { PictureUploadError, ErrorCodes } from '../utils/errorHandler.js';
import { validateConfig, generateRandomId, getMediaDescriptionFieldName, validatePictureFormat } from './utils.js';
import axios from 'axios';

/**
 * Function A: Upload picture to S3 and create backend entity
 *
 * This is the core upload function that handles the 4-step process:
 * 1. Create placeholder record in backend
 * 2. Upload file to S3
 * 3. Verify URL accessibility
 * 4. Update backend record with real URL
 *
 * @param {string} picturePath - Absolute path to picture file
 * @param {UploadConfig} config - Upload configuration (S3, API, CloudFront)
 * @param {Object} [options={}] - Optional settings
 * @param {boolean} [options.verbose=false] - Enable verbose logging
 * @param {Object} [options.metadata={}] - Additional metadata for picture record
 * @returns {Promise<PictureUploadResult>}
 * @throws {PictureUploadError}
 */
export async function uploadPictureToS3AndCreateEntity(picturePath, config, options = {}) {
  const { verbose = false, metadata: customMetadata = {} } = options;

  const log = (msg) => {
    if (verbose) console.log(`[Function A] ${msg}`);
  };

  try {
    // Validate config
    validateConfig(config);

    // Step 0: Check file exists
    log(`Checking if file exists: ${picturePath}`);
    if (!await checkFileExists(picturePath)) {
      throw new PictureUploadError(
        `Picture file not found: ${picturePath}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Step 0.5: Get image metadata
    log('Reading image metadata...');
    const metadata = await getImageMetadata(picturePath);
    log(`Image dimensions: ${metadata.width}x${metadata.height}, size: ${metadata.fileSizeBytes} bytes`);

    // Initialize services
    const apiService = new ApiService({
      baseUrl: config.api.baseUrl,
      username: config.api.username,
      password: config.api.password
    });

    const s3Service = new S3Service({
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
      region: config.s3.region,
      bucket: config.s3.pictures.bucket,
      keyPrefix: config.s3.pictures.keyPrefix || 'pictures/',
      cloudfrontDomain: config.cloudfront?.domain || 'www.kyool.eu'
    });

    // Step 1: Create placeholder record
    log('Step 1: Creating placeholder record in backend...');
    const randomId = generateRandomId();
    const placeholderUrl = `placeholder_${randomId}`;

    const pictureData = {
      image_url: placeholderUrl,
      file_name: customMetadata.fileName || metadata.fileName,
      width: metadata.width,
      height: metadata.height,
      alt_text: customMetadata.altText || null
    };

    if (metadata.fileSizeBytes) {
      pictureData.file_size_bytes = metadata.fileSizeBytes;
    }

    const pictureRecord = await apiService.createPicture(pictureData);
    log(`Created picture record with ID: ${pictureRecord.id}`);

    // Step 2: Upload to S3
    log(`Step 2: Uploading to S3 with record ID: ${pictureRecord.id}...`);
    const s3Result = await s3Service.uploadPicture(picturePath, pictureRecord.id);
    log(`Uploaded to S3: ${s3Result.url}`);

    // Step 3: Verify URL accessibility
    log('Step 3: Verifying URL accessibility...');
    const isAccessible = await checkUrlAccessibility(s3Result.url, verbose);

    if (!isAccessible) {
      throw new PictureUploadError(
        `Uploaded URL is not accessible: ${s3Result.url}`,
        'URL_NOT_ACCESSIBLE'
      );
    }
    log('URL is accessible');

    // Step 4: Update backend record with real URL
    log('Step 4: Updating backend record with real URL...');
    const updatedRecord = await apiService.updatePicture(pictureRecord.id, {
      image_url: s3Result.url
    });
    log('Backend record updated successfully');

    // Return result
    return {
      pictureId: updatedRecord.id,
      s3Url: s3Result.url,
      s3Key: s3Result.key,
      bucket: s3Result.bucket
    };

  } catch (error) {
    if (error instanceof PictureUploadError) {
      throw error;
    }
    throw new PictureUploadError(
      `Upload failed: ${error.message}`,
      'UPLOAD_FAILED',
      error
    );
  }
}

/**
 * Function B: Upload picture and link to media description by format
 *
 * @param {string} picturePath - Absolute path to picture file
 * @param {string} pictureFormat - Format enum (e.g., '1920_1080')
 * @param {string} mediaDescriptionId - Media description UUID to link to
 * @param {UploadConfig} config - Upload configuration
 * @param {Object} [options={}] - Optional settings
 * @returns {Promise<MediaLinkResult>}
 * @throws {PictureUploadError}
 */
export async function uploadPictureAndLinkToMedia(
  picturePath,
  pictureFormat,
  mediaDescriptionId,
  config,
  options = {}
) {
  const { verbose = false } = options;

  const log = (msg) => {
    if (verbose) console.log(`[Function B] ${msg}`);
  };

  try {
    // Validate format
    log(`Validating format: ${pictureFormat}`);
    validatePictureFormat(pictureFormat);

    // Get field name for this format
    const fieldName = getMediaDescriptionFieldName(pictureFormat);
    log(`Media description field: ${fieldName}`);

    // Step 1: Upload picture using Function A
    log('Uploading picture...');
    const uploadResult = await uploadPictureToS3AndCreateEntity(picturePath, config, options);
    log(`Picture uploaded with ID: ${uploadResult.pictureId}`);

    // Step 2: Link to media description
    log(`Linking picture to media description ${mediaDescriptionId}...`);
    const apiService = new ApiService({
      baseUrl: config.api.baseUrl,
      username: config.api.username,
      password: config.api.password
    });

    // PATCH media description with picture ID
    const updateData = { [fieldName]: uploadResult.pictureId };
    await apiService.updateMediaDescription(mediaDescriptionId, updateData);
    log(`Media description updated: ${fieldName} = ${uploadResult.pictureId}`);

    // Step 3: Optimize picture (create WebP variants)
    // This runs automatically after upload and is non-blocking (errors don't fail the upload)
    try {
      log('Optimizing picture (creating WebP variants)...');
      const { optimizePictureCore, formatToResolution } = await import('../../optimize-picture/optimizeCore.js');

      // Convert format from underscore notation (1920_1080) to colon notation (1920x1080)
      const resolution = formatToResolution(pictureFormat);

      const optimizeResult = await optimizePictureCore(
        uploadResult.pictureId,
        resolution,
        config,
        { verbose, logger: log }
      );

      if (optimizeResult.skipped) {
        log(`Optimization skipped: ${optimizeResult.reason}`);
      } else {
        log(`Optimization successful: large=${optimizeResult.largeUrl}, small=${optimizeResult.smallUrl}`);
      }
    } catch (optimizeError) {
      // Non-blocking: log warning but don't fail the upload
      log(`⚠️  Warning: Optimization failed but upload succeeded: ${optimizeError.message}`);
    }

    // Return result
    return {
      pictureId: uploadResult.pictureId,
      s3Url: uploadResult.s3Url,
      mediaDescriptionId: mediaDescriptionId,
      format: pictureFormat,
      fieldUpdated: fieldName
    };

  } catch (error) {
    if (error instanceof PictureUploadError) {
      throw error;
    }
    throw new PictureUploadError(
      `Upload and link failed: ${error.message}`,
      'UPLOAD_AND_LINK_FAILED',
      error
    );
  }
}

/**
 * Helper: Check if URL is accessible
 * @param {string} url - URL to check
 * @param {boolean} verbose - Log output
 * @returns {Promise<boolean>}
 */
async function checkUrlAccessibility(url, verbose = false) {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 300
    });
    return true;
  } catch (error) {
    if (verbose) {
      console.log(`URL accessibility check failed: ${error.message}`);
    }
    return false;
  }
}
