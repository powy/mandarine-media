/**
 * Mux Subtitle Upload Worker
 */

import BaseWorker from './baseWorker.js';
import { execFilePromise } from '../utils/processUtils.js';

class MuxSubtitleUploadWorker extends BaseWorker {
  constructor() {
    super();
    this.logInfo('Mux Subtitle Upload Worker initialized');
  }

  async execute(taskData) {
    this.validateTaskData(taskData, ['subtitlePath', 'videoId']);

    const { subtitlePath, videoId, config, options = {} } = taskData;

    this.logInfo('Starting Mux subtitle upload', { subtitlePath, videoId, options });
    this.updateProgress(5, 'Initializing subtitle upload...');

    if (!(await this.isFile(subtitlePath))) {
      throw new Error(`Subtitle file does not exist: ${subtitlePath}`);
    }

    this.updateProgress(10, 'Subtitle file validated, starting upload...');

    try {
      const scriptPath = this.getToolPath('subtools/mux-subtitle-upload/wrapper.js');

      if (!(await this.fileExists(scriptPath))) {
        throw new Error(`Subtitle upload script not found: ${scriptPath}`);
      }

      const args = [
        '--subtitle-path', subtitlePath,
        '--video-id', videoId
      ];

      if (config && config.configPath) {
        args.push('--config', config.configPath);
      }

      if (options.language) {
        args.push('--language', options.language);
      }

      this.updateProgress(20, 'Starting subtitle upload process...');
      this.logInfo('Executing subtitle upload command', { scriptPath, args });

      const result = await execFilePromise('node', [scriptPath, ...args], {
        timeout: options.timeout || 300000, // 5 minutes default
        maxBuffer: 1024 * 1024 * 5, // 5MB buffer
        env: { ...process.env }
      });

      this.updateProgress(80, 'Subtitle upload completed, processing results...');

      let uploadResult;
      try {
        const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          uploadResult = JSON.parse(jsonMatch[0]);
        } else {
          uploadResult = {
            success: result.exitCode === 0,
            message: result.stdout,
            error: result.stderr
          };
        }
      } catch (parseError) {
        uploadResult = {
          success: result.exitCode === 0,
          message: result.stdout,
          error: result.stderr,
          parseError: parseError.message
        };
      }

      if (!uploadResult.success && result.exitCode !== 0) {
        throw new Error(`Subtitle upload failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`);
      }

      this.updateProgress(100, 'Mux subtitle upload completed successfully');

      return {
        success: true,
        subtitlePath,
        videoId,
        uploadResult,
        metadata: {
          subtitlePath,
          videoId,
          language: options.language || null,
          exitCode: result.exitCode,
          uploadTime: Date.now() - this.startTime
        }
      };

    } catch (error) {
      this.logError('Mux subtitle upload failed', {
        subtitlePath,
        videoId,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`Mux subtitle upload failed: ${error.message}`);
    }
  }

  async cleanup() {
    this.logInfo('Cleaning up Mux subtitle upload worker');
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
      new MuxSubtitleUploadWorker();
    } catch (error) {
      console.error('Failed to initialize MuxSubtitleUploadWorker:', error.message);
      process.exit(1);
    }
  }, 10);
}

export default MuxSubtitleUploadWorker;