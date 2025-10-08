/**
 * Single Picture Upload Worker
 * Handles single picture upload with format detection and Excel integration
 */

import BaseWorker from './baseWorker.js';
import { formatDetector } from '../utils/formatDetector.js';
import { getImageMetadata } from '../../picture-upload/utils/fileUtils.js';
import { uploadPicture } from '../../picture-upload/wrapper.js';
import { ExcelService } from '../../one-media-complete-upload/services/excelService.js';
import fs from 'fs-extra';
import path from 'path';

class SinglePictureUploadWorker extends BaseWorker {
  constructor() {
    super();
    this.logInfo('Single Picture Upload Worker initialized');
  }

  async execute(taskData) {
    this.validateTaskData(taskData, ['picturePath', 'folderPath']);

    const { picturePath, folderPath, config, options = {} } = taskData;

    this.logInfo('Starting single picture upload with format detection', {
      picturePath,
      folderPath,
      options
    });
    this.updateProgress(5, 'Initializing single picture upload...');

    // Step 1: Validate picture file exists
    if (!(await this.isFile(picturePath))) {
      throw new Error(`Picture file does not exist: ${picturePath}`);
    }

    this.updateProgress(10, 'Picture file validated, extracting metadata...');

    // Step 2: Extract image metadata using Sharp
    let metadata;
    try {
      metadata = await getImageMetadata(picturePath);
      this.logInfo('Image metadata extracted', metadata);
    } catch (error) {
      throw new Error(`Failed to extract image metadata: ${error.message}`);
    }

    this.updateProgress(20, 'Metadata extracted, detecting format...');

    // Step 3: Detect format from dimensions
    const formatResult = formatDetector.detectFormat(metadata.width, metadata.height);

    if (!formatResult.success) {
      throw new Error(formatResult.error);
    }

    this.logInfo('Format detected successfully', formatResult);
    this.updateProgress(30, `Format detected: ${formatResult.displayFormat}`);

    // Step 4: Find media description ID from Excel
    let mediaDescriptionId;
    try {
      const excelService = new ExcelService(folderPath, this);
      mediaDescriptionId = await excelService.findMediaDescriptionId();

      if (!mediaDescriptionId) {
        throw new Error('No media description ID found in Excel file. Please ensure the Excel file exists and contains a valid ID in the Description sheet.');
      }

      this.logInfo('Media description ID found', { mediaDescriptionId });
    } catch (error) {
      throw new Error(`Failed to find media description ID: ${error.message}`);
    }

    this.updateProgress(40, 'Excel integration validated, preparing upload...');

    // Step 5: Prepare configuration for picture upload
    let uploadConfig;
    if (config && config.configPath) {
      // Use provided config file
      uploadConfig = {
        config: config.configPath,
        verbose: options.verbose || false
      };
    } else if (config) {
      // Use inline config
      uploadConfig = {
        config: this.createTempConfigFile({
          picturePath,
          s3: config.s3 || {},
          cloudfront: config.cloudfront || {},
          api: config.api || {},
          metadata: {
            altText: options.altText || `Image in ${formatResult.displayFormat} format`,
            format: formatResult.format,
            mediaDescriptionId,
            mediaDescriptionField: formatResult.mediaDescriptionField
          }
        }),
        verbose: options.verbose || false
      };
    } else {
      throw new Error('Configuration is required (either config.configPath or inline config object)');
    }

    this.updateProgress(50, 'Configuration prepared, starting upload...');

    // Step 6: Upload picture using existing wrapper
    let uploadResult;
    try {
      uploadResult = await uploadPicture(uploadConfig);

      if (!uploadResult || !uploadResult.success) {
        throw new Error(uploadResult?.error || 'Picture upload failed with unknown error');
      }

      this.logInfo('Picture upload completed', {
        s3Url: uploadResult.s3?.url,
        pictureId: uploadResult.api?.id
      });
    } catch (error) {
      throw new Error(`Picture upload failed: ${error.message}`);
    }

    this.updateProgress(80, 'Upload completed, preparing result...');

    // Step 7: Prepare final result
    const result = {
      success: true,
      picturePath,
      folderPath,
      format: formatResult,
      mediaDescriptionId,
      mediaDescriptionField: formatResult.mediaDescriptionField,
      uploadResult,
      metadata: {
        ...metadata,
        formatDetected: formatResult.format,
        displayFormat: formatResult.displayFormat,
        uploadTime: Date.now() - this.startTime
      }
    };

    this.updateProgress(100, `Upload completed successfully - ${formatResult.displayFormat} format`);

    this.logInfo('Single picture upload completed successfully', {
      format: formatResult.format,
      s3Url: uploadResult.s3?.url,
      pictureId: uploadResult.api?.id,
      mediaDescriptionField: formatResult.mediaDescriptionField
    });

    return result;
  }

  /**
   * Create temporary config file for picture upload
   * @param {Object} configData - Configuration data
   * @returns {string} - Path to temporary config file
   */
  createTempConfigFile(configData) {
    const tempDir = path.join(process.cwd(), '.temp-configs');
    fs.ensureDirSync(tempDir);

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const tempConfigPath = path.join(tempDir, `single-picture-${timestamp}-${randomId}.json`);

    const config = {
      picturePath: configData.picturePath,
      s3: configData.s3,
      cloudfront: configData.cloudfront,
      api: configData.api,
      metadata: configData.metadata
    };

    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));

    // Schedule cleanup of temp file
    setTimeout(() => {
      try {
        fs.removeSync(tempConfigPath);
      } catch (error) {
        this.logError('Failed to cleanup temp config file', error);
      }
    }, 300000); // 5 minutes

    return tempConfigPath;
  }
}

// Check if this module is being run directly (as main module in child process)
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = resolve(process.argv[1]) === __filename;

if (isMainModule) {
  // Small delay to ensure IPC is fully established in forked process
  setTimeout(() => {
    try {
      new SinglePictureUploadWorker();
    } catch (error) {
      console.error('Failed to initialize SinglePictureUploadWorker:', error.message);
      process.exit(1);
    }
  }, 10);
}

export default SinglePictureUploadWorker;