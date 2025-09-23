import path from 'path';
import fs from 'fs';
import { ProcessManager } from './processManager.js';
import { ProgressTracker } from './progressTracker.js';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dynamically import wrapper functions with path resolution for production builds
 */
async function importWrapperFunctions() {
  const wrapperPath = '../../one-media-complete-upload/wrapper.js';

  // Try the normal relative path first
  const normalPath = path.resolve(__dirname, wrapperPath);

  let resolvedPath = normalPath;
  if (!fs.existsSync(normalPath)) {
    // For production builds, try alternative path structures
    const productionPaths = [
      // Tauri bundled structure
      path.resolve(process.resourcesPath || process.cwd(), 'src', 'subtools', 'one-media-complete-upload', 'wrapper.js'),
      // Alternative bundled path - this is where Tauri actually puts files
      path.resolve(process.cwd(), '_up_', 'src', 'subtools', 'one-media-complete-upload', 'wrapper.js'),
      // Current working directory relative
      path.resolve(process.cwd(), 'src', 'subtools', 'one-media-complete-upload', 'wrapper.js'),
      // Fallback to development-style path in bundle
      path.resolve(process.cwd(), 'kyool-media', 'apps', 'media-uploader', 'src', 'subtools', 'one-media-complete-upload', 'wrapper.js')
    ];

    for (const testPath of productionPaths) {
      if (fs.existsSync(testPath)) {
        console.log(`🔍 Using one-media-complete-upload wrapper from: ${testPath}`);
        resolvedPath = testPath;
        break;
      }
    }
  }

  try {
    // Use pathToFileURL for proper Windows compatibility with dynamic imports
    const moduleURL = pathToFileURL(resolvedPath).href;
    console.log(`🔍 Importing wrapper from URL: ${moduleURL}`);
    const module = await import(moduleURL);
    return {
      prepareExcel: module.prepareExcel,
      executeUpload: module.executeUpload
    };
  } catch (error) {
    console.error(`❌ Failed to import wrapper from ${resolvedPath}:`, error.message);
    console.error(`❌ Module URL attempted: ${pathToFileURL(resolvedPath).href}`);
    throw error;
  }
}

// Import wrapper functions at module level
let prepareExcel, executeUpload;
const wrapperPromise = importWrapperFunctions().then(({ prepareExcel: pe, executeUpload: eu }) => {
  prepareExcel = pe;
  executeUpload = eu;
});

// DEBUG: Module loading verification
console.log('🔍 DEBUG: uploadService.js module is being loaded!');
console.log('🔍 DEBUG: Current timestamp:', new Date().toISOString());

/**
 * Upload service that bridges the GUI with the one-complete-upload functions
 */
export class UploadService {
  constructor(config, logCallback = null) {
    this.config = config;
    this.logCallback = logCallback;
    this.tempConfigDir = path.join(process.cwd(), '.temp-gui-configs');

    // Initialize parallel processing services
    this.processManager = new ProcessManager({
      maxConcurrentUploads: config.general?.maxConcurrentUploads || 10,
      retryAttempts: config.general?.retryAttempts || 3,
      retryDelay: config.general?.retryDelay || 5000,
      workerTimeout: config.process?.workerTimeout || 3600000,
      heartbeatInterval: config.process?.heartbeatInterval || 5000
    });

    this.progressTracker = new ProgressTracker(
      path.join(process.cwd(), '.upload-progress')
    );

    // Setup process manager callbacks
    this.processManager.onProcessUpdateCallback((taskId, processInfo) => {
      this.handleProcessUpdate(taskId, processInfo);
    });

    this.processManager.onQueueUpdateCallback((queueInfo) => {
      this.handleQueueUpdate(queueInfo);
    });

    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  ensureTempDirectory() {
    if (!fs.existsSync(this.tempConfigDir)) {
      fs.mkdirSync(this.tempConfigDir, { recursive: true });
    }
  }

  /**
   * Prepare Excel file for the given folder
   * @param {string} folderPath - Path to the media folder
   * @returns {Promise<Object>} Result from prepareExcel function
   */
  async prepareExcel(folderPath) {
    try {
      // Ensure wrapper functions are loaded
      await wrapperPromise;

      this.logMessage('info', `Starting Excel preparation for: ${folderPath}`);

      // Create temporary config file for one-complete-upload
      const configPath = await this.createTempConfig();

      // Call the prepareExcel function from one-complete-upload
      const options = {
        folder: folderPath,
        config: configPath,
        verbose: this.config.general?.verbose || true
      };

      this.logMessage('info', 'Calling prepareExcel with options:', JSON.stringify(options, null, 2));

      const result = await prepareExcel(options);

      if (result.success) {
        this.logMessage('success', 'Excel preparation completed successfully');
        if (result.excelPath) {
          this.logMessage('info', `Excel file created: ${result.excelPath}`);
        }
      } else {
        this.logMessage('error', `Excel preparation failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logMessage('error', `Excel preparation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Prepare Excel for a specific folder using an existing config file
   * @param {string} folderPath - Path to the folder to prepare Excel for
   * @param {string} configPath - Path to the config file to use
   * @returns {Promise<Object>} Result from prepareExcel function
   */
  async prepareExcelWithConfig(folderPath, configPath) {
    const folderName = path.basename(folderPath);
    const timeout = 60000; // 60 second timeout

    try {
      // Ensure wrapper functions are loaded
      await wrapperPromise;

      this.logMessage('info', `🚀 Starting Excel preparation for: ${folderName} using config: ${configPath}`);

      // Call the prepareExcel function from one-complete-upload
      const options = {
        folder: folderPath,
        config: configPath,
        verbose: this.config.general?.verbose || true
      };

      this.logMessage('info', `📋 Calling prepareExcel with options: ${JSON.stringify(options, null, 2)}`);

      // Add timeout protection
      const prepareExcelPromise = prepareExcel(options);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
      });

      this.logMessage('info', `⏰ Starting prepareExcel with ${timeout}ms timeout for: ${folderName}`);
      const result = await Promise.race([prepareExcelPromise, timeoutPromise]);
      this.logMessage('info', `📊 prepareExcel completed for ${folderName}: ${JSON.stringify(result, null, 2)}`);

      if (result.success) {
        this.logMessage('success', `✅ Excel preparation completed successfully for: ${folderName}`);
        if (result.excelPath) {
          this.logMessage('info', `📋 Excel file created: ${result.excelPath}`);
        }
      } else {
        this.logMessage('error', `❌ Excel preparation failed for ${folderName}: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logMessage('error', `❌ Excel preparation error for ${folderName}: ${error.message}`);
      this.logMessage('error', `❌ Error stack for ${folderName}: ${error.stack}`);

      return {
        success: false,
        error: error.message,
        phase: 'prepare-excel-with-config-error'
      };
    }
  }

  /**
   * Execute upload for the given folder
   * @param {string} folderPath - Path to the media folder
   * @returns {Promise<Object>} Result from executeUpload function
   */
  async executeUpload(folderPath) {
    try {
      // Ensure wrapper functions are loaded
      await wrapperPromise;

      this.logMessage('info', `Starting upload execution for: ${folderPath}`);

      // Create temporary config file for one-complete-upload
      const configPath = await this.createTempConfig();

      // Call the executeUpload function from one-complete-upload
      const options = {
        folder: folderPath,
        config: configPath,
        verbose: this.config.general?.verbose || true
      };

      this.logMessage('info', 'Calling executeUpload with options:', JSON.stringify(options, null, 2));

      const result = await executeUpload(options);

      if (result.success) {
        this.logMessage('success', 'Upload execution completed successfully');
        if (result.mediaDescriptionId) {
          this.logMessage('success', `Media Description ID: ${result.mediaDescriptionId}`);
        }
      } else {
        this.logMessage('error', `Upload execution failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logMessage('error', `Upload execution error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a temporary JSON configuration file for one-complete-upload
   * @returns {Promise<string>} Path to the temporary config file
   */
  async createTempConfig() {
    const timestamp = Date.now();
    const configPath = path.join(this.tempConfigDir, `gui-config-${timestamp}.json`);

    // Convert INI config to JSON format expected by one-complete-upload
    const jsonConfig = {
      backend: this.config.backend || {},
      mux: this.config.mux || {},
      s3: this.config.s3 || {},
      logging: this.config.logging || {}
    };

    // Validate required fields
    this.validateRequiredFields(jsonConfig);

    // Write temporary config file
    await fs.promises.writeFile(configPath, JSON.stringify(jsonConfig, null, 2));

    this.logMessage('debug', `Created temporary config file: ${configPath}`);

    // Schedule cleanup after 1 hour
    setTimeout(() => {
      fs.unlink(configPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.warn(`Failed to cleanup temp config: ${err.message}`);
        }
      });
    }, 60 * 60 * 1000); // 1 hour

    return configPath;
  }

  /**
   * Validate that required configuration fields are present
   * @param {Object} config - Configuration to validate
   * @throws {Error} If required fields are missing
   */
  validateRequiredFields(config) {
    const requiredFields = [
      'backend.baseUrl',
      'backend.username',
      'backend.password',
      'mux.tokenId',
      'mux.tokenSecret',
      's3.accessKeyId',
      's3.secretAccessKey'
    ];

    const missing = [];

    for (const field of requiredFields) {
      const value = this.getNestedValue(config, field);
      if (!value || value.toString().trim() === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot-separated path
   * @returns {*} Value or undefined
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Send log message through callback if available
   * @param {string} level - Log level (info, success, warning, error, debug)
   * @param {string} message - Log message
   * @param {*} data - Optional additional data
   */
  logMessage(level, message, data = null) {
    if (this.logCallback) {
      this.logCallback({
        timestamp: new Date().toLocaleTimeString(),
        level,
        message: data ? `${message} ${data}` : message
      });
    }

    // Also log to console for debugging
    const logMethod = level === 'error' ? 'error' :
                     level === 'warning' ? 'warn' : 'log';
    console[logMethod](`[${level.toUpperCase()}] ${message}`, data || '');
  }

  /**
   * Prepare Excel files for all immediate subfolders
   * @param {string} parentFolderPath - Path to the parent folder containing subfolders
   * @returns {Promise<Object>} Result with summary of batch operation
   */
  async prepareExcelBatch(parentFolderPath) {
    try {
      this.logMessage('info', `🚀 UploadService.prepareExcelBatch called with: ${parentFolderPath}`);
      this.logMessage('info', `🔧 Service instance: ${this.constructor.name}`);
      this.logMessage('info', `📍 About to call getImmediateSubfolders...`);

      // Get immediate subfolders only
      const subfolders = await this.getImmediateSubfolders(parentFolderPath);

      this.logMessage('info', `📂 getImmediateSubfolders returned: ${JSON.stringify(subfolders, null, 2)}`);

      if (subfolders.length === 0) {
        const errorMsg = `No subfolders found in the selected directory: ${parentFolderPath}`;
        this.logMessage('error', errorMsg);
        return {
          success: false,
          error: errorMsg,
          processedCount: 0,
          totalSubfolders: 0
        };
      }

      this.logMessage('info', `Found ${subfolders.length} subfolders to process`);
      this.logMessage('info', `📁 Subfolders list: ${subfolders.map(f => path.basename(f)).join(', ')}`);

      let processedCount = 0;
      const failedFolders = [];
      let iterationCount = 0;

      // Process each subfolder sequentially
      for (const subfolder of subfolders) {
        iterationCount++;
        this.logMessage('info', `🔄 Starting iteration ${iterationCount}/${subfolders.length} for: ${path.basename(subfolder)}`);

        let configPath = null;
        try {
          // Create separate temp config for each folder to prevent conflicts
          this.logMessage('info', `🔧 Creating individual temp config for: ${path.basename(subfolder)}`);
          configPath = await this.createTempConfig();
          this.logMessage('info', `✅ Individual config created: ${configPath}`);

          this.logMessage('info', `📋 Processing subfolder: ${path.basename(subfolder)} (${subfolder})`);

          const result = await this.prepareExcelWithConfig(subfolder, configPath);

          if (result.success) {
            processedCount++;
            this.logMessage('success', `✅ Excel prepared for: ${path.basename(subfolder)} (${processedCount}/${subfolders.length} completed)`);
          } else {
            failedFolders.push(path.basename(subfolder));
            this.logMessage('error', `❌ Failed to prepare Excel for: ${path.basename(subfolder)} - ${result.error}`);
          }
        } catch (error) {
          failedFolders.push(path.basename(subfolder));
          this.logMessage('error', `❌ Error processing ${path.basename(subfolder)}: ${error.message}`);
          this.logMessage('error', `❌ Error stack: ${error.stack}`);

          // Explicitly continue to the next iteration
          this.logMessage('info', `⏭️ Continuing to next subfolder despite error in ${path.basename(subfolder)}`);
        } finally {
          // Cleanup individual config file
          if (configPath) {
            try {
              const fs = await import('fs-extra');
              await fs.remove(configPath);
              this.logMessage('info', `🧹 Cleaned up temp config: ${configPath}`);
            } catch (cleanupError) {
              this.logMessage('warn', `⚠️ Failed to cleanup temp config: ${cleanupError.message}`);
            }
          }

          // Add a small delay between iterations to prevent resource conflicts
          this.logMessage('info', `⏳ Adding 100ms delay before next iteration...`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.logMessage('info', `✅ Completed iteration ${iterationCount}/${subfolders.length}. Current stats: ${processedCount} successful, ${failedFolders.length} failed`);
      }

      this.logMessage('info', `🏁 Loop completed! Processed ${iterationCount} iterations out of ${subfolders.length} subfolders`);

      // Fix success logic: only succeed if at least one folder succeeded AND we had folders to process
      const success = subfolders.length > 0 && processedCount > 0;
      const finalResult = {
        success,
        processedCount,
        totalSubfolders: subfolders.length,
        failedFolders,
        message: `Batch Excel preparation completed: ${processedCount}/${subfolders.length} successful`
      };

      this.logMessage('info', `📊 Final result being returned: ${JSON.stringify(finalResult, null, 2)}`);

      // Defensive check - prevent impossible success with 0/0
      if (success && processedCount === 0 && subfolders.length === 0) {
        this.logMessage('error', '🚨 CRITICAL: Preventing impossible success state with 0/0');
        finalResult.success = false;
        finalResult.error = 'No subfolders were found to process';
      }

      return finalResult;

    } catch (error) {
      this.logMessage('error', `Batch Excel preparation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute upload for all immediate subfolders
   * @param {string} parentFolderPath - Path to the parent folder containing subfolders
   * @returns {Promise<Object>} Result with summary of batch operation
   */
  async executeUploadBatch(parentFolderPath) {
    try {
      this.logMessage('info', `Starting batch upload execution for subfolders in: ${parentFolderPath}`);

      // Get immediate subfolders only
      const subfolders = await this.getImmediateSubfolders(parentFolderPath);

      if (subfolders.length === 0) {
        return {
          success: false,
          error: 'No subfolders found in the selected directory',
          processedCount: 0,
          totalSubfolders: 0
        };
      }

      this.logMessage('info', `Found ${subfolders.length} subfolders to upload`);

      let processedCount = 0;
      const failedFolders = [];

      // Process each subfolder sequentially
      for (const subfolder of subfolders) {
        try {
          this.logMessage('info', `🚀 Uploading subfolder: ${path.basename(subfolder)}`);

          const result = await this.executeUpload(subfolder);

          if (result.success) {
            processedCount++;
            this.logMessage('success', `✅ Upload completed for: ${path.basename(subfolder)}`);
            if (result.mediaDescriptionId) {
              this.logMessage('info', `📝 Media Description ID for ${path.basename(subfolder)}: ${result.mediaDescriptionId}`);
            }
          } else {
            failedFolders.push(path.basename(subfolder));
            this.logMessage('error', `❌ Failed to upload: ${path.basename(subfolder)} - ${result.error}`);
          }
        } catch (error) {
          failedFolders.push(path.basename(subfolder));
          this.logMessage('error', `❌ Error uploading ${path.basename(subfolder)}: ${error.message}`);
        }
      }

      const success = processedCount > 0;
      return {
        success,
        processedCount,
        totalSubfolders: subfolders.length,
        failedFolders,
        message: `Batch upload completed: ${processedCount}/${subfolders.length} successful`
      };

    } catch (error) {
      this.logMessage('error', `Batch upload execution error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get list of immediate subfolders (one level deep only)
   * @param {string} parentPath - Path to scan for subfolders
   * @returns {Promise<string[]>} Array of subfolder paths
   */
  async getImmediateSubfolders(parentPath) {
    try {
      // Normalize path for cross-platform compatibility
      const normalizedPath = path.resolve(parentPath);
      this.logMessage('info', `🔍 Searching for subfolders in: ${normalizedPath}`);

      // Check if parent path exists and is accessible
      const parentStats = await fs.promises.stat(normalizedPath);
      if (!parentStats.isDirectory()) {
        throw new Error(`Path is not a directory: ${normalizedPath}`);
      }

      const entries = await fs.promises.readdir(normalizedPath, { withFileTypes: true });
      this.logMessage('info', `Found ${entries.length} total entries in directory`);

      // Log each entry for debugging
      entries.forEach(entry => {
        this.logMessage('info', `  - ${entry.name} (${entry.isDirectory() ? 'directory' : 'file'})`);
      });

      const subfolders = entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(normalizedPath, entry.name));

      this.logMessage('info', `📁 Found ${subfolders.length} subfolders: ${subfolders.map(f => path.basename(f)).join(', ')}`);
      return subfolders;
    } catch (error) {
      this.logMessage('error', `Failed to read subfolders from ${parentPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a folder has Excel files (.xlsx or .xls)
   * @param {string} folderPath - Path to the folder to check
   * @returns {Promise<Object>} Result with Excel file information
   */
  async hasExcelFiles(folderPath) {
    try {
      const files = await fs.promises.readdir(folderPath);
      const excelFiles = files.filter(file =>
        file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls')
      );

      return {
        hasExcel: excelFiles.length > 0,
        excelFiles,
        count: excelFiles.length
      };
    } catch (error) {
      this.logMessage('error', `Failed to check Excel files in ${folderPath}: ${error.message}`);
      return {
        hasExcel: false,
        excelFiles: [],
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * Execute upload for all subfolders using parallel processing
   * @param {string} parentFolderPath - Path to the parent folder containing subfolders
   * @param {number} maxConcurrent - Maximum concurrent uploads (optional)
   * @returns {Promise<Object>} Result with summary of parallel batch operation
   */
  async executeUploadBatchParallel(parentFolderPath, maxConcurrent = null) {
    try {
      this.logMessage('info', `🚀 Starting parallel batch upload execution for subfolders in: ${parentFolderPath}`);

      // Update concurrency if specified
      if (maxConcurrent && maxConcurrent !== this.processManager.maxConcurrent) {
        this.processManager.maxConcurrent = maxConcurrent;
        this.logMessage('info', `Updated max concurrent uploads to: ${maxConcurrent}`);
      }

      // Get immediate subfolders only
      const subfolders = await this.getImmediateSubfolders(parentFolderPath);

      if (subfolders.length === 0) {
        return {
          success: false,
          error: 'No subfolders found in the selected directory',
          processedCount: 0,
          totalSubfolders: 0,
          taskIds: []
        };
      }

      this.logMessage('info', `Found ${subfolders.length} subfolders to upload in parallel`);

      // Validate Excel files in each subfolder before queueing
      const validFolders = [];
      const skippedFolders = [];

      for (const folder of subfolders) {
        const folderName = path.basename(folder);
        this.logMessage('info', `🔍 Checking Excel files in: ${folderName}`);

        const excelCheck = await this.hasExcelFiles(folder);
        if (excelCheck.hasExcel) {
          validFolders.push(folder);
          this.logMessage('info', `✅ ${folderName} has ${excelCheck.count} Excel file(s): ${excelCheck.excelFiles.join(', ')}`);
        } else {
          skippedFolders.push(folderName);
          this.logMessage('warning', `⚠️ Skipping ${folderName}: No Excel files found`);
        }
      }

      if (validFolders.length === 0) {
        return {
          success: false,
          error: `No folders with Excel files found. Skipped ${skippedFolders.length} folders: ${skippedFolders.join(', ')}`,
          processedCount: 0,
          totalSubfolders: subfolders.length,
          validFolders: 0,
          skippedFolders: skippedFolders.length,
          taskIds: []
        };
      }

      this.logMessage('info', `📋 Queueing ${validFolders.length} folders with Excel files for upload`);
      if (skippedFolders.length > 0) {
        this.logMessage('warning', `⚠️ Skipped ${skippedFolders.length} folders without Excel files: ${skippedFolders.join(', ')}`);
      }

      // Create temp config for workers
      const configPath = await this.createTempConfig();

      // Queue uploads for valid folders only
      const taskIds = [];
      for (const folder of validFolders) {
        try {
          this.logMessage('info', `📋 Queuing upload: ${path.basename(folder)}`);

          const taskId = await this.processManager.queueUpload(folder, configPath);
          taskIds.push(taskId);

          // Setup progress monitoring for this task
          this.progressTracker.watchProgress(taskId, (progressData, event) => {
            this.handleProgressUpdate(taskId, progressData, event);
          });

        } catch (error) {
          this.logMessage('error', `Failed to queue upload for ${path.basename(folder)}: ${error.message}`);
        }
      }

      if (taskIds.length === 0) {
        return {
          success: false,
          error: 'Failed to queue any uploads',
          processedCount: 0,
          totalSubfolders: subfolders.length,
          taskIds: []
        };
      }

      this.logMessage('info', `✅ Queued ${taskIds.length} uploads. Processing will start automatically.`);
      this.logMessage('info', `📊 Max concurrent: ${this.processManager.maxConcurrent}, Queue: ${taskIds.length}`);

      const successMessage = skippedFolders.length > 0
        ? `Parallel batch upload started: ${taskIds.length} uploads queued, ${skippedFolders.length} folders skipped (no Excel files)`
        : `Parallel batch upload started: ${taskIds.length} uploads queued`;

      // Return immediate success - monitoring happens via callbacks
      return {
        success: true,
        message: successMessage,
        processedCount: 0, // Will be updated via progress callbacks
        totalSubfolders: subfolders.length,
        validFolders: validFolders.length,
        skippedFolders: skippedFolders.length,
        skippedFolderNames: skippedFolders,
        queuedCount: taskIds.length,
        taskIds,
        mode: 'parallel'
      };

    } catch (error) {
      this.logMessage('error', `Parallel batch upload execution error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the status of all parallel uploads
   * @returns {Object} Status summary
   */
  getParallelUploadStatus() {
    const queueInfo = this.processManager.getQueueInfo();
    const overallProgress = this.progressTracker.getOverallProgress();
    const detailedStats = this.progressTracker.getDetailedStats();

    return {
      queue: queueInfo,
      progress: overallProgress,
      stats: detailedStats,
      processes: this.processManager.getAllStatuses()
    };
  }

  /**
   * Cancel all parallel uploads
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelAllParallelUploads() {
    try {
      this.logMessage('warning', '🛑 Cancelling all parallel uploads...');

      const cancelledCount = await this.processManager.cancelAllProcesses();

      this.logMessage('info', `🛑 Cancelled ${cancelledCount} processes`);

      return {
        success: true,
        cancelledCount,
        message: `Cancelled ${cancelledCount} parallel uploads`
      };

    } catch (error) {
      this.logMessage('error', `Failed to cancel parallel uploads: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a specific parallel upload
   * @param {string} taskId - Task ID to cancel
   * @returns {Promise<boolean>} Whether cancellation was successful
   */
  async cancelParallelUpload(taskId) {
    try {
      const result = await this.processManager.cancelProcess(taskId);

      if (result) {
        this.logMessage('info', `🛑 Cancelled upload task: ${taskId}`);
      } else {
        this.logMessage('warning', `Failed to cancel upload task: ${taskId}`);
      }

      return result;

    } catch (error) {
      this.logMessage('error', `Error cancelling upload task ${taskId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle process updates from ProcessManager
   * @param {string} taskId - Task ID
   * @param {Object} processInfo - Process information
   */
  handleProcessUpdate(taskId, processInfo) {
    const folderName = path.basename(processInfo.folderPath);

    switch (processInfo.status) {
      case 'running':
        this.logMessage('info', `▶️ Started upload: ${folderName} (PID: ${processInfo.pid})`);
        break;
      case 'completed':
        this.logMessage('success', `✅ Completed upload: ${folderName}`);
        break;
      case 'failed':
        this.logMessage('error', `❌ Failed upload: ${folderName} - ${processInfo.error}`);
        break;
      case 'cancelled':
        this.logMessage('warning', `🛑 Cancelled upload: ${folderName}`);
        break;
    }

    // Notify GUI about process update
    if (this.logCallback) {
      this.logCallback({
        timestamp: new Date().toLocaleTimeString(),
        level: 'process-update',
        taskId,
        processInfo
      });
    }
  }

  /**
   * Handle queue updates from ProcessManager
   * @param {Object} queueInfo - Queue information
   */
  handleQueueUpdate(queueInfo) {
    this.logMessage('info',
      `📊 Queue status: ${queueInfo.running} running, ${queueInfo.queued} queued, ` +
      `${queueInfo.completed} completed, ${queueInfo.failed} failed`
    );

    // Notify GUI about queue update
    if (this.logCallback) {
      this.logCallback({
        timestamp: new Date().toLocaleTimeString(),
        level: 'queue-update',
        queueInfo
      });
    }
  }

  /**
   * Handle progress updates from ProgressTracker
   * @param {string} taskId - Task ID
   * @param {Object|null} progressData - Progress data
   * @param {string} event - Event type
   */
  handleProgressUpdate(taskId, progressData, event) {
    if (!progressData) return;

    const folderName = path.basename(progressData.folderPath);

    // Log significant progress updates
    if (progressData.phase && progressData.percentage !== undefined) {
      this.logMessage('info',
        `📈 ${folderName}: ${progressData.phase} (${progressData.percentage}%)`
      );
    }

    // Notify GUI about progress update
    if (this.logCallback) {
      this.logCallback({
        timestamp: new Date().toLocaleTimeString(),
        level: 'progress-update',
        taskId,
        progressData,
        event
      });
    }
  }

  /**
   * Get configuration for parallel processing
   * @returns {Object} Parallel processing configuration
   */
  getParallelConfig() {
    return {
      maxConcurrentUploads: this.processManager.maxConcurrent,
      retryAttempts: this.processManager.retryAttempts,
      retryDelay: this.processManager.retryDelay,
      workerTimeout: this.processManager.workerTimeout,
      heartbeatInterval: this.processManager.heartbeatInterval
    };
  }

  /**
   * Update parallel processing configuration
   * @param {Object} config - New configuration
   */
  updateParallelConfig(config) {
    if (config.maxConcurrentUploads !== undefined) {
      this.processManager.maxConcurrent = config.maxConcurrentUploads;
      this.logMessage('info', `Updated max concurrent uploads: ${config.maxConcurrentUploads}`);
    }

    if (config.retryAttempts !== undefined) {
      this.processManager.retryAttempts = config.retryAttempts;
    }

    if (config.retryDelay !== undefined) {
      this.processManager.retryDelay = config.retryDelay;
    }
  }

  /**
   * Clean up temporary configuration files and parallel processing resources
   */
  async cleanup() {
    try {
      // Cleanup temp config files
      const files = await fs.promises.readdir(this.tempConfigDir);
      const configFiles = files.filter(file => file.startsWith('gui-config-') && file.endsWith('.json'));

      for (const file of configFiles) {
        const filePath = path.join(this.tempConfigDir, file);
        await fs.promises.unlink(filePath);
      }

      this.logMessage('debug', `Cleaned up ${configFiles.length} temporary config files`);

      // Cleanup parallel processing resources
      await this.processManager.cleanup();
      await this.progressTracker.cleanupOldProgress();

    } catch (error) {
      this.logMessage('warning', `Failed to cleanup: ${error.message}`);
    }
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown() {
    this.logMessage('info', '🛑 Shutting down UploadService...');

    try {
      await this.processManager.shutdown();
      await this.progressTracker.shutdown();
      await this.cleanup();

      this.logMessage('info', '✅ UploadService shutdown complete');
    } catch (error) {
      this.logMessage('error', `Shutdown error: ${error.message}`);
    }
  }
}