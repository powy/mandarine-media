/**
 * Batch Picture Upload Worker
 * Uploads a picture once then associates it to all subfolder media_descriptions
 */

import BaseWorker from './baseWorker.js';
import { formatDetector } from '../utils/formatDetector.js';
import { PictureAssociator } from '../utils/pictureAssociator.js';
import { getImageMetadata } from '../../picture-upload/utils/fileUtils.js';
import { uploadPicture } from '../../picture-upload/wrapper.js';
import { ExcelService } from '../../one-media-complete-upload/services/excelService.js';
import { ExcelBatchService } from '../../excel-batch-editor/services/excelBatchService.js';
import fs from 'fs-extra';
import path from 'path';

class BatchPictureUploadWorker extends BaseWorker {
  constructor() {
    super();
    this.logInfo('Batch Picture Upload Worker initialized');
  }

  async execute(taskData) {
    this.validateTaskData(taskData, ['picturePath', 'parentFolderPath']);

    const { picturePath, parentFolderPath, config, options = {} } = taskData;

    this.logInfo('Starting batch picture upload with subfolder association', {
      picturePath,
      parentFolderPath,
      options
    });

    const results = {
      phase1: null, // Initial upload
      phase2: {     // Batch association
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

    // PHASE 1: Initial Picture Upload (reuse single picture logic)
    this.updateProgress(5, 'Phase 1: Starting initial picture upload...');

    try {
      results.phase1 = await this.executeInitialUpload(picturePath, parentFolderPath, config, options);
      results.summary.uploadSuccess = true;
      this.logInfo('Phase 1 completed successfully', results.phase1);
    } catch (error) {
      throw new Error(`Phase 1 failed: ${error.message}`);
    }

    this.updateProgress(30, 'Phase 1 complete. Starting Phase 2: Subfolder association...');

    // PHASE 2: Batch Association to Subfolders
    try {
      results.phase2 = await this.executeBatchAssociation(
        parentFolderPath,
        results.phase1.uploadResult.api.id,
        results.phase1.format.format,
        options
      );

      results.summary.associationsSuccess = results.phase2.successes.length;
      results.summary.associationsFailure = results.phase2.failures.length;
      results.summary.totalSubfolders = results.phase2.total;

      this.logInfo('Phase 2 completed', {
        successes: results.summary.associationsSuccess,
        failures: results.summary.associationsFailure,
        total: results.summary.totalSubfolders
      });
    } catch (error) {
      this.logError('Phase 2 failed but phase 1 succeeded', error);
      // Don't throw - phase 1 succeeded, so we have partial success
      results.phase2.error = error.message;
    }

    this.updateProgress(100, `Batch upload completed: ${results.summary.associationsSuccess}/${results.summary.totalSubfolders} associations successful`);

    return {
      success: true,
      picturePath,
      parentFolderPath,
      results,
      metadata: {
        uploadTime: Date.now() - this.startTime,
        format: results.phase1?.format,
        pictureId: results.phase1?.uploadResult?.api?.id
      }
    };
  }

  /**
   * Phase 1: Execute initial picture upload (reuse single picture logic)
   */
  async executeInitialUpload(picturePath, parentFolderPath, config, options) {
    this.updateProgress(10, 'Validating picture file...');

    if (!(await this.isFile(picturePath))) {
      throw new Error(`Picture file does not exist: ${picturePath}`);
    }

    this.updateProgress(15, 'Extracting image metadata...');

    // Extract image metadata using Sharp
    let metadata;
    try {
      metadata = await getImageMetadata(picturePath);
      this.logInfo('Image metadata extracted', metadata);
    } catch (error) {
      throw new Error(`Failed to extract image metadata: ${error.message}`);
    }

    this.updateProgress(20, 'Detecting format...');

    // Detect format from dimensions
    const formatResult = formatDetector.detectFormat(metadata.width, metadata.height);

    if (!formatResult.success) {
      throw new Error(formatResult.error);
    }

    this.logInfo('Format detected successfully', formatResult);

    this.updateProgress(25, 'Finding media description ID from parent folder...');

    // Find media description ID from parent folder Excel
    let mediaDescriptionId;
    try {
      const excelService = new ExcelService(parentFolderPath, this);
      mediaDescriptionId = await excelService.findMediaDescriptionId();

      if (!mediaDescriptionId) {
        throw new Error('No media description ID found in parent folder Excel file. Please ensure the Excel file exists and contains a valid ID in the Description sheet.');
      }

      this.logInfo('Media description ID found', { mediaDescriptionId });
    } catch (error) {
      throw new Error(`Failed to find media description ID: ${error.message}`);
    }

    this.updateProgress(28, 'Uploading picture to S3...');

    // Upload picture using existing wrapper
    let uploadResult;
    try {
      let uploadConfig;
      if (config && config.configPath) {
        uploadConfig = {
          config: config.configPath,
          verbose: options.verbose || false
        };
      } else if (config) {
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
        throw new Error('Configuration is required');
      }

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

    return {
      picturePath,
      parentFolderPath,
      format: formatResult,
      mediaDescriptionId,
      uploadResult,
      metadata
    };
  }

  /**
   * Phase 2: Execute batch association to subfolders
   */
  async executeBatchAssociation(parentFolderPath, pictureId, format, options) {
    this.updateProgress(35, 'Scanning subfolders for Excel files...');

    // Scan subfolders using ExcelBatchService
    const excelBatchService = new ExcelBatchService(this);
    const pattern = options.pattern || '0_desc';

    let excelFiles;
    try {
      excelFiles = await excelBatchService.findExcelFiles(parentFolderPath, pattern);

      // Filter to only episode-level (subfolder) Excel files
      const subfolderExcelFiles = excelFiles.filter(file => !file.isSeasonLevel);

      this.logInfo(`Found ${subfolderExcelFiles.length} subfolder Excel files to process`);

      if (subfolderExcelFiles.length === 0) {
        return {
          successes: [],
          failures: [],
          total: 0,
          message: 'No subfolder Excel files found to associate'
        };
      }

      this.updateProgress(40, `Found ${subfolderExcelFiles.length} subfolders to process...`);

      // Extract media description IDs from each subfolder
      const associations = [];
      let progressStep = 40;
      const progressIncrement = 20 / subfolderExcelFiles.length; // 20% for ID extraction

      for (const excelFile of subfolderExcelFiles) {
        try {
          progressStep += progressIncrement;
          this.updateProgress(Math.floor(progressStep), `Extracting media ID from ${excelFile.folderName}...`);

          const excelService = new ExcelService(excelFile.folder, this);
          const mediaDescriptionId = await excelService.findMediaDescriptionId();

          if (mediaDescriptionId) {
            associations.push({
              mediaDescriptionId,
              folderName: excelFile.folderName,
              excelPath: excelFile.filePath
            });
            this.logInfo(`✓ Found media ID in ${excelFile.folderName}: ${mediaDescriptionId}`);
          } else {
            this.logWarn(`⚠ No media ID found in ${excelFile.folderName}`);
          }
        } catch (error) {
          this.logError(`✗ Error processing ${excelFile.folderName}: ${error.message}`);
          // Continue to next folder (continueOnError behavior)
        }
      }

      this.logInfo(`Prepared ${associations.length} associations for batch processing`);

      if (associations.length === 0) {
        return {
          successes: [],
          failures: [],
          total: subfolderExcelFiles.length,
          message: 'No valid media description IDs found in subfolders'
        };
      }

      this.updateProgress(60, `Associating picture to ${associations.length} media descriptions...`);

      // Batch associate using PictureAssociator
      const pictureAssociator = new PictureAssociator(this.getConfigForAssociator(), this);
      const batchResults = await pictureAssociator.batchAssociatePicture(associations, pictureId, format);

      this.updateProgress(90, 'Batch association completed');

      return {
        ...batchResults,
        processed: subfolderExcelFiles.length,
        associations: associations.length
      };

    } catch (error) {
      throw new Error(`Subfolder scanning failed: ${error.message}`);
    }
  }

  /**
   * Get configuration object for PictureAssociator from task config
   */
  getConfigForAssociator() {
    // Extract backend config from the main config
    // This should be available from the original task config
    return {
      backend: {
        baseUrl: process.env.BACKEND_BASE_URL || 'http://localhost:8000',
        username: process.env.BACKEND_USERNAME || 'admin',
        password: process.env.BACKEND_PASSWORD || 'admin'
      }
    };
  }

  /**
   * Create temporary config file for picture upload
   */
  createTempConfigFile(configData) {
    const tempDir = path.join(process.cwd(), '.temp-configs');
    fs.ensureDirSync(tempDir);

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const tempConfigPath = path.join(tempDir, `batch-picture-${timestamp}-${randomId}.json`);

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
      new BatchPictureUploadWorker();
    } catch (error) {
      console.error('Failed to initialize BatchPictureUploadWorker:', error.message);
      process.exit(1);
    }
  }, 10);
}

export default BatchPictureUploadWorker;