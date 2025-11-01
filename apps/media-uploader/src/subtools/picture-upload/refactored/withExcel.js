import { ExcelService } from '../../one-media-complete-upload/services/excelService.js';
import { readIniFile, iniToStandardConfig } from '../../../shared/utils/iniParser.js';
import { uploadPictureAndLinkToMedia } from './core.js';
import { PictureUploadError } from '../utils/errorHandler.js';

/**
 * Function D: Upload picture with media ID from Excel
 *
 * @param {string} picturePath - Absolute path to picture file
 * @param {string} pictureFormat - Format enum (e.g., '1920_1080')
 * @param {string} excelPath - Path to folder containing Excel file (0_desc*.xlsx)
 * @param {string} iniPath - Path to INI configuration file
 * @returns {Promise<MediaLinkResult>}
 */
export async function uploadPictureAndLinkToMediaWithExcel(
  picturePath,
  pictureFormat,
  excelPath,
  iniPath
) {
  try {
    // Step 1: Extract media description ID from Excel
    const excelService = new ExcelService(excelPath);
    const mediaDescriptionId = await excelService.findMediaDescriptionId();

    if (!mediaDescriptionId) {
      throw new PictureUploadError(
        `No media description ID found in Excel file in folder: ${excelPath}`,
        'MEDIA_DESCRIPTION_ID_NOT_FOUND'
      );
    }

    // Step 2: Read INI config
    const iniConfig = await readIniFile(iniPath);
    const config = iniToStandardConfig(iniConfig);

    // Step 3: Call Function B
    return await uploadPictureAndLinkToMedia(
      picturePath,
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
      `Upload with Excel failed: ${error.message}`,
      'EXCEL_UPLOAD_FAILED',
      error
    );
  }
}
