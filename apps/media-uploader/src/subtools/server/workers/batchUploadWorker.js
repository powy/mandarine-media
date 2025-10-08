/**
 * Batch Upload Worker
 * Worker process for batch folder upload tasks (corresponds to execute_upload_batch in GUI)
 *
 * Spawns each subfolder upload as a separate process with configurable concurrency limit.
 * Supports up to maxConcurrency concurrent uploads (default: 1000).
 * This avoids state/resource issues from sequential processing while maximizing throughput.
 */

import BaseWorker from './baseWorker.js';
import { execFileStreaming } from '../utils/processUtils.js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Delay between spawning each upload process (in milliseconds)
// This prevents overwhelming the system when starting many concurrent uploads
// Default: 10 seconds - can be overridden via options.processSpawnDelay
const PROCESS_SPAWN_DELAY_MS = 10000;

class BatchUploadWorker extends BaseWorker {
  constructor() {
    super();
    this.logInfo('Batch Upload Worker initialized');
  }

  async execute(taskData) {
    this.validateTaskData(taskData, ['parentFolderPath']);

    const { parentFolderPath, config, options = {} } = taskData;

    // Get maxConcurrency from task metadata (set by route handler)
    const maxConcurrency = this.task?.metadata?.maxConcurrency || options.maxConcurrency || 1000;

    this.logInfo('Starting batch upload', { parentFolderPath, maxConcurrency, options });
    this.updateProgress(5, 'Initializing batch upload...');

    // Validate parent folder path
    if (!(await this.isDirectory(parentFolderPath))) {
      throw new Error(`Parent folder path does not exist or is not a directory: ${parentFolderPath}`);
    }

    this.updateProgress(10, 'Reading subfolders...');

    try {
      // Get all subfolders
      const items = readdirSync(parentFolderPath);
      const subfolders = items.filter(item => {
        const itemPath = join(parentFolderPath, item);
        try {
          return statSync(itemPath).isDirectory();
        } catch {
          return false;
        }
      });

      if (subfolders.length === 0) {
        throw new Error('No subfolders found in parent directory');
      }

      this.logInfo(`Found ${subfolders.length} subfolders to upload with maxConcurrency: ${maxConcurrency}`);
      this.updateProgress(15, `Found ${subfolders.length} subfolders`);

      // Get script path
      const scriptPath = this.getToolPath('subtools/one-media-complete-upload/wrapper.js');
      if (!(await this.fileExists(scriptPath))) {
        throw new Error(`Upload script not found: ${scriptPath}`);
      }

      // Process uploads concurrently with limit
      const results = await this.processUploadsWithConcurrency(
        subfolders,
        scriptPath,
        parentFolderPath,
        config,
        options,
        maxConcurrency
      );

      // Collect statistics
      const processedCount = results.filter(r => r.success).length;
      const failedFolders = results.filter(r => !r.success).map(r => r.folder);
      const successRate = subfolders.length > 0 ? (processedCount / subfolders.length) * 100 : 0;

      this.updateProgress(100, 'Batch upload completed');

      return {
        success: processedCount > 0,
        parentFolderPath,
        uploadResult: {
          success: processedCount > 0,
          processedCount,
          totalSubfolders: subfolders.length,
          failedFolders: failedFolders.length > 0 ? failedFolders : null,
          successRate,
          results
        },
        metadata: {
          parentFolderPath,
          maxConcurrency,
          uploadTime: Date.now() - this.startTime,
          processedCount,
          totalSubfolders: subfolders.length,
          failedFolders,
          successRate
        }
      };

    } catch (error) {
      this.logError('Batch upload failed', {
        parentFolderPath,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`Batch upload failed: ${error.message}`);
    }
  }

  /**
   * Process uploads with concurrency limit
   * @param {string[]} subfolders - Array of subfolder names
   * @param {string} scriptPath - Path to upload script
   * @param {string} parentFolderPath - Parent folder path
   * @param {Object} config - Configuration
   * @param {Object} options - Upload options
   * @param {number} maxConcurrency - Maximum concurrent uploads
   * @returns {Promise<Array>} Results array
   */
  async processUploadsWithConcurrency(subfolders, scriptPath, parentFolderPath, config, options, maxConcurrency) {
    const results = [];
    const running = new Set();
    let completedCount = 0;
    let index = 0;

    // Get configurable spawn delay (default to PROCESS_SPAWN_DELAY_MS)
    const spawnDelay = options.processSpawnDelay ?? PROCESS_SPAWN_DELAY_MS;

    // NOTE: maxConcurrency parameter is not enforced in this implementation.
    // Instead, we spawn processes one at a time with a delay between each spawn,
    // but allow unlimited concurrent processes to run (like maxConcurrency=infinity).
    // This prevents overwhelming the system at startup while still allowing full parallelism.
    this.logInfo(`Process spawn delay set to ${spawnDelay}ms between uploads (maxConcurrency ignored - spawning 1 at a time)`);

    // Create upload task for a single subfolder
    const createUploadTask = async (subfolder, taskIndex) => {
      const subfolderPath = join(parentFolderPath, subfolder);

      this.logInfo(`Starting upload ${taskIndex + 1}/${subfolders.length}: ${subfolder}`);

      // Build args for single folder upload
      const args = ['--folder', subfolderPath];

      if (config && config.configPath) {
        args.push('--config', config.configPath);
      }

      if (options.skipValidation) {
        args.push('--skip-validation');
      }

      try {
        // Spawn separate process for this folder
        const result = await execFileStreaming('node', [scriptPath, ...args], {
          timeout: options.timeout || 86400000, // 24 hours per folder
          env: {
            ...process.env,
            UPLOAD_TASK_ID: `${this.taskId}-${subfolder}`,
            UPLOAD_EXECUTION_MODE: 'batch-concurrent-worker'
          },
          onStdout: (chunk) => {
            const lines = chunk.trim().split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                this.logInfo(`[${subfolder}] ${line}`);
              }
            });
          },
          onStderr: (chunk) => {
            const lines = chunk.trim().split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                this.logWarn(`[${subfolder} stderr] ${line}`);
              }
            });
          }
        });

        // Parse result
        let uploadResult = { success: result.exitCode === 0 };
        try {
          const jsonMatch = result.stdout.match(/\{[\s\S]*\}$/m);
          if (jsonMatch) {
            uploadResult = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          this.logWarn(`Failed to parse result for ${subfolder}`, { parseError: parseError.message });
        }

        if (uploadResult.success) {
          this.logInfo(`✓ Successfully uploaded: ${subfolder}`);
          return { folder: subfolder, success: true, result: uploadResult };
        } else {
          this.logWarn(`✗ Failed to upload: ${subfolder}`);
          return { folder: subfolder, success: false, error: uploadResult.error || 'Upload failed' };
        }

      } catch (error) {
        this.logError(`Error uploading ${subfolder}`, { error: error.message });
        return { folder: subfolder, success: false, error: error.message };
      } finally {
        completedCount++;
        const progress = 20 + Math.floor((completedCount / subfolders.length) * 75);
        this.updateProgress(progress, `Completed ${completedCount}/${subfolders.length} uploads`);
      }
    };

    // Process uploads with concurrency limit and staggered spawning
    return new Promise(async (resolve, reject) => {
      // Spawn process function with completion tracking
      const spawnProcess = (currentIndex, subfolder) => {
        const task = createUploadTask(subfolder, currentIndex)
          .then(result => {
            results[currentIndex] = result;
            running.delete(task);

            // Check if all tasks complete
            if (running.size === 0 && index >= subfolders.length) {
              resolve(results);
            }
          })
          .catch(error => {
            this.logError('Upload task failed', { subfolder, error: error.message });
            results[currentIndex] = { folder: subfolder, success: false, error: error.message };
            running.delete(task);

            // Check if all tasks complete
            if (running.size === 0 && index >= subfolders.length) {
              resolve(results);
            }
          });

        running.add(task);
      };

      // Spawn first process without delay (maxConcurrency is ignored, we spawn 1 at a time)
      if (subfolders.length > 0) {
        this.logInfo(`Spawning first process without delay`);
        const currentIndex = index;
        const subfolder = subfolders[currentIndex];
        index++;
        spawnProcess(currentIndex, subfolder);
      }

      // Spawn remaining processes with delay between each spawn
      while (index < subfolders.length) {
        // Wait for the spawn delay
        await new Promise(resolve => setTimeout(resolve, spawnDelay));

        // Spawn next process (even if others are still running)
        const currentIndex = index;
        const subfolder = subfolders[currentIndex];
        index++;

        this.logInfo(`Spawning process ${currentIndex + 1}/${subfolders.length} after ${spawnDelay}ms delay: ${subfolder}`);
        spawnProcess(currentIndex, subfolder);
      }

      // Note: The promise will resolve when all tasks complete (handled in spawnProcess callbacks)
    });
  }

  async cleanup() {
    this.logInfo('Cleaning up batch upload worker');
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
      new BatchUploadWorker();
    } catch (error) {
      console.error('Failed to initialize BatchUploadWorker:', error.message);
      process.exit(1);
    }
  }, 10);
}

export default BatchUploadWorker;