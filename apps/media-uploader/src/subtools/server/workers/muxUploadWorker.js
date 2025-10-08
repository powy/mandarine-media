/**
 * Mux Upload Worker
 * Worker process for Mux video upload tasks
 */

import BaseWorker from './baseWorker.js';
import { MuxUploadInterface } from '../../../interfaces/index.js';

class MuxUploadWorker extends BaseWorker {
  constructor() {
    super();
    this.logInfo('Mux Upload Worker initialized');
  }

  async execute(taskData) {
    this.validateTaskData(taskData, ['videoPath']);

    const { videoPath, config, options = {} } = taskData;

    this.logInfo('Starting Mux upload', { videoPath, options });
    this.updateProgress(5, 'Initializing Mux upload...');

    // Validate video file
    if (!(await this.isFile(videoPath))) {
      throw new Error(`Video file does not exist: ${videoPath}`);
    }

    this.updateProgress(10, 'Video file validated, preparing upload...');

    try {
      let result;

      // Choose the appropriate interface method
      if (config) {
        // Use configuration-based upload
        this.updateProgress(20, 'Using configuration-based upload...');

        const uploadConfig = {
          videoPath,
          ...config,
          ...options
        };

        result = await this.runTool(MuxUploadInterface, 'core', uploadConfig);
      } else {
        // Use direct core interface
        this.updateProgress(20, 'Using direct core upload...');

        const coreOptions = {
          videoPath,
          timeout: options.timeout,
          retry: options.retry || 0,
          chunkSize: options.chunkSize,
          uploadMethod: options.uploadMethod || 'auto',
          validateUpload: options.validateUpload !== false,
          ...options
        };

        result = await this.runTool(MuxUploadInterface, 'core', coreOptions);
      }

      this.updateProgress(90, 'Upload completed, processing results...');

      if (!result || !result.success) {
        throw new Error(result?.error || 'Upload failed with unknown error');
      }

      this.updateProgress(100, 'Mux upload completed successfully');

      return {
        success: true,
        videoPath,
        uploadResult: result,
        muxAssetId: result.assetId,
        muxPlaybackId: result.playbackId,
        metadata: {
          videoPath,
          fileSize: result.fileSize || 0,
          duration: result.duration || 0,
          uploadMethod: options.uploadMethod || 'auto',
          chunkSize: options.chunkSize,
          uploadTime: Date.now() - this.startTime
        }
      };

    } catch (error) {
      this.logError('Mux upload failed', {
        videoPath,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`Mux upload failed: ${error.message}`);
    }
  }

  async cleanup() {
    this.logInfo('Cleaning up Mux upload worker');
    // Add any specific cleanup logic here
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
      new MuxUploadWorker();
    } catch (error) {
      console.error('Failed to initialize MuxUploadWorker:', error.message);
      process.exit(1);
    }
  }, 10);
}

export default MuxUploadWorker;