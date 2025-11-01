import { readIniFile, iniToStandardConfig } from '../../../shared/utils/iniParser.js';
import { uploadPictureAndLinkToMedia } from './core.js';
import { PictureUploadError } from '../utils/errorHandler.js';
import { sanitizePath } from '../utils/fileUtils.js';

/**
 * Function C: Upload picture and link to media (config from INI)
 *
 * @param {string} picturePath - Absolute path to picture file
 * @param {string} pictureFormat - Format enum (e.g., '1920_1080')
 * @param {string} mediaDescriptionId - Media description UUID
 * @param {string} iniPath - Path to INI configuration file
 * @returns {Promise<MediaLinkResult>}
 */
export async function uploadPictureAndLinkToMediaWithIni(
  picturePath,
  pictureFormat,
  mediaDescriptionId,
  iniPath
) {
  try {
    // Sanitize file paths to remove invisible Unicode control characters
    const cleanPicturePath = sanitizePath(picturePath);
    const cleanIniPath = sanitizePath(iniPath);

    // Read and parse INI file
    const iniConfig = await readIniFile(cleanIniPath);
    const config = iniToStandardConfig(iniConfig);

    // Map backend → api for compatibility (INI uses 'backend', code uses 'api')
    if (config.backend && !config.api) {
      config.api = config.backend;
    }

    // Call Function B with parsed config (using sanitized path)
    return await uploadPictureAndLinkToMedia(
      cleanPicturePath,
      pictureFormat,
      mediaDescriptionId,
      config,
      { verbose: config.verbose || false }
    );

  } catch (error) {
    if (error instanceof PictureUploadError) {
      throw error;
    }
    throw new PictureUploadError(
      `Upload with INI failed: ${error.message}`,
      'INI_UPLOAD_FAILED',
      error
    );
  }
}

/**
 * Function F: Auto-detect format, upload and link (config from INI)
 *
 * @param {string} picturePath - Absolute path to picture file
 * @param {string} mediaDescriptionId - Media description UUID
 * @param {string} iniPath - Path to INI configuration file
 * @returns {Promise<MediaLinkResult>}
 */
export async function uploadPictureAndLinkToMediaWithFormatDetectionWithIni(
  picturePath,
  mediaDescriptionId,
  iniPath
) {
  try {
    // Import Function E dynamically to avoid circular dependency
    const { uploadPictureAndLinkToMediaWithFormatDetection } = await import('./withFormatDetection.js');

    // Read and parse INI file
    const iniConfig = await readIniFile(iniPath);
    const config = iniToStandardConfig(iniConfig);

    // Map backend → api for compatibility (INI uses 'backend', code uses 'api')
    if (config.backend && !config.api) {
      config.api = config.backend;
    }

    // Call Function E with parsed config
    return await uploadPictureAndLinkToMediaWithFormatDetection(
      picturePath,
      mediaDescriptionId,
      config,
      { verbose: config.verbose || false }
    );

  } catch (error) {
    if (error instanceof PictureUploadError) {
      throw error;
    }
    throw new PictureUploadError(
      `Upload with format detection (INI) failed: ${error.message}`,
      'INI_FORMAT_DETECTION_UPLOAD_FAILED',
      error
    );
  }
}
