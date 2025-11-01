import { FormatDetector } from '../../server/utils/formatDetector.js';
import { getImageMetadata } from '../utils/fileUtils.js';
import { uploadPictureAndLinkToMedia } from './core.js';
import { scanFolderForImages, validateConfig } from './utils.js';
import { readIniFile, iniToStandardConfig } from '../../../shared/utils/iniParser.js';
import { PictureUploadError } from '../utils/errorHandler.js';
import path from 'path';

/**
 * Function E: Auto-detect format from image, upload and link
 *
 * @param {string} picturePath - Absolute path to picture file
 * @param {string} mediaDescriptionId - Media description UUID
 * @param {UploadConfig} config - Upload configuration
 * @param {Object} [options={}] - Optional settings
 * @returns {Promise<MediaLinkResult>}
 */
export async function uploadPictureAndLinkToMediaWithFormatDetection(
  picturePath,
  mediaDescriptionId,
  config,
  options = {}
) {
  const { verbose = false } = options;

  const log = (msg) => {
    if (verbose) console.log(`[Function E] ${msg}`);
  };

  try {
    // Step 1: Get image dimensions
    log(`Reading image metadata from: ${picturePath}`);
    const metadata = await getImageMetadata(picturePath);
    log(`Detected dimensions: ${metadata.width}x${metadata.height}`);

    // Step 2: Detect format using FormatDetector
    const detector = new FormatDetector();
    const detection = detector.detectFormat(metadata.width, metadata.height);

    if (!detection.success) {
      throw new PictureUploadError(
        `Unsupported image dimensions: ${metadata.width}x${metadata.height}. ${detection.error}`,
        'FORMAT_NOT_SUPPORTED',
        { dimensions: { width: metadata.width, height: metadata.height } }
      );
    }

    log(`Detected format: ${detection.format} (field: ${detection.mediaDescriptionField})`);

    // Step 3: Upload and link using Function B
    return await uploadPictureAndLinkToMedia(
      picturePath,
      detection.format,
      mediaDescriptionId,
      config,
      options
    );

  } catch (error) {
    if (error instanceof PictureUploadError) {
      throw error;
    }
    throw new PictureUploadError(
      `Upload with format detection failed: ${error.message}`,
      'FORMAT_DETECTION_UPLOAD_FAILED',
      error
    );
  }
}

/**
 * Function G: Batch upload all images in folder with auto-format detection
 *
 * @param {string} folderPath - Path to folder containing images
 * @param {string} mediaDescriptionId - Media description UUID
 * @param {UploadConfig} config - Upload configuration
 * @param {Object} [options={}] - Optional settings
 * @returns {Promise<BatchUploadResult>}
 */
export async function uploadPicturesInFolderWithFormatDetection(
  folderPath,
  mediaDescriptionId,
  config,
  options = {}
) {
  const { verbose = false } = options;

  const log = (msg) => {
    if (verbose) console.log(`[Function G] ${msg}`);
  };

  try {
    validateConfig(config);

    // Step 1: Scan folder for images
    log(`Scanning folder for images: ${folderPath}`);
    const imagePaths = await scanFolderForImages(folderPath);
    log(`Found ${imagePaths.length} image files`);

    if (imagePaths.length === 0) {
      return {
        uploaded: [],
        failed: [],
        summary: { total: 0, succeeded: 0, failed: 0 }
      };
    }

    const uploaded = [];
    const failed = [];

    // Step 2: Process each image
    for (const imagePath of imagePaths) {
      const fileName = path.basename(imagePath);
      log(`\nProcessing: ${fileName}`);

      try {
        // Call Function E for each image
        const result = await uploadPictureAndLinkToMediaWithFormatDetection(
          imagePath,
          mediaDescriptionId,
          config,
          { verbose }
        );

        uploaded.push(result);
        log(`✓ Success: ${fileName} -> ${result.format}`);

      } catch (error) {
        failed.push({
          file: imagePath,
          fileName: fileName,
          reason: error.message
        });
        log(`✗ Failed: ${fileName} - ${error.message}`);
      }
    }

    // Step 3: Generate summary
    const summary = {
      total: imagePaths.length,
      succeeded: uploaded.length,
      failed: failed.length
    };

    log(`\n=== Upload Summary ===`);
    log(`Total: ${summary.total}`);
    log(`Succeeded: ${summary.succeeded}`);
    log(`Failed: ${summary.failed}`);

    if (failed.length > 0) {
      log(`\nFailed uploads:`);
      failed.forEach(f => log(`  - ${f.fileName}: ${f.reason}`));
    }

    return { uploaded, failed, summary };

  } catch (error) {
    throw new PictureUploadError(
      `Batch upload failed: ${error.message}`,
      'BATCH_UPLOAD_FAILED',
      error
    );
  }
}

/**
 * Function H: Batch upload folder images with auto-format (config from INI)
 *
 * @param {string} folderPath - Path to folder containing images
 * @param {string} mediaDescriptionId - Media description UUID
 * @param {string} iniPath - Path to INI configuration file
 * @returns {Promise<BatchUploadResult>}
 */
export async function uploadPicturesInFolderWithFormatDetectionWithIni(
  folderPath,
  mediaDescriptionId,
  iniPath
) {
  try {
    // Read and parse INI file
    const iniConfig = await readIniFile(iniPath);
    const config = iniToStandardConfig(iniConfig);

    // Map backend → api for compatibility (INI uses 'backend', code uses 'api')
    if (config.backend && !config.api) {
      config.api = config.backend;
    }

    // Call Function G with parsed config
    return await uploadPicturesInFolderWithFormatDetection(
      folderPath,
      mediaDescriptionId,
      config,
      { verbose: config.verbose || false }
    );

  } catch (error) {
    if (error instanceof PictureUploadError) {
      throw error;
    }
    throw new PictureUploadError(
      `Batch upload with INI failed: ${error.message}`,
      'BATCH_INI_UPLOAD_FAILED',
      error
    );
  }
}
