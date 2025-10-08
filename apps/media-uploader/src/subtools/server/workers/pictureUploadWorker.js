/**
 * Picture Upload Worker
 */

import BaseWorker from './baseWorker.js';
import { PictureUploadInterface } from '../../../interfaces/index.js';

class PictureUploadWorker extends BaseWorker {
  constructor() {
    super();
    this.logInfo('Picture Upload Worker initialized');
  }

  async execute(taskData) {
    this.validateTaskData(taskData, ['imagePath']);

    const { imagePath, config, options = {} } = taskData;

    this.logInfo('Starting picture upload', { imagePath, options });
    this.updateProgress(5, 'Initializing picture upload...');

    if (!(await this.isFile(imagePath))) {
      throw new Error(`Image file does not exist: ${imagePath}`);
    }

    this.updateProgress(10, 'Image file validated, preparing upload...');

    try {
      let result;

      if (config) {
        const uploadConfig = {
          imagePath,
          ...config,
          ...options
        };
        result = await this.runTool(PictureUploadInterface, 'core', uploadConfig);
      } else {
        const coreOptions = {
          imagePath,
          quality: options.quality,
          maxWidth: options.maxWidth,
          maxHeight: options.maxHeight,
          ...options
        };
        result = await this.runTool(PictureUploadInterface, 'core', coreOptions);
      }

      if (!result || !result.success) {
        throw new Error(result?.error || 'Picture upload failed with unknown error');
      }

      this.updateProgress(100, 'Picture upload completed successfully');

      return {
        success: true,
        imagePath,
        uploadResult: result,
        s3Url: result.s3Url,
        pictureId: result.pictureId,
        metadata: {
          imagePath,
          fileSize: result.fileSize || 0,
          dimensions: result.dimensions || null,
          uploadTime: Date.now() - this.startTime
        }
      };

    } catch (error) {
      throw new Error(`Picture upload failed: ${error.message}`);
    }
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
      new PictureUploadWorker();
    } catch (error) {
      console.error('Failed to initialize PictureUploadWorker:', error.message);
      process.exit(1);
    }
  }, 10);
}

export default PictureUploadWorker;