#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dynamically import executeUpload with path resolution for production builds
 */
async function importExecuteUpload() {
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
        console.log(`🔍 Worker using one-media-complete-upload wrapper from: ${testPath}`);
        resolvedPath = testPath;
        break;
      }
    }
  }

  try {
    // Use pathToFileURL for proper Windows compatibility with dynamic imports
    const moduleURL = pathToFileURL(resolvedPath).href;
    console.log(`🔍 Worker importing wrapper from URL: ${moduleURL}`);
    const module = await import(moduleURL);
    return module.executeUpload;
  } catch (error) {
    console.error(`❌ Worker failed to import wrapper from ${resolvedPath}:`, error.message);
    console.error(`❌ Module URL attempted: ${pathToFileURL(resolvedPath).href}`);
    throw error;
  }
}

// Import executeUpload function
let executeUpload;
const executeUploadPromise = importExecuteUpload().then(fn => {
  executeUpload = fn;
});

// Early logging for startup debugging
const startupLog = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] WORKER STARTUP: ${message}`);
};

startupLog('Worker process starting...');
startupLog(`Node version: ${process.version}`);
startupLog(`Arguments: ${process.argv.join(' ')}`);
startupLog('ES module imports completed!');

/**
 * Upload Worker - Independent process for handling individual uploads
 * This script runs as a detached process and can survive GUI closure
 */
class UploadWorker {
  constructor(args) {
    this.taskId = args.taskId;
    this.folderPath = args.folderPath;
    this.configPath = args.configPath;
    this.progressDir = args.progressDir;
    this.logsDir = args.logsDir;

    this.progressFile = path.join(this.progressDir, `${this.taskId}.json`);
    this.logFile = path.join(this.logsDir, `${this.taskId}.log`);

    this.shouldExit = false;
    this.currentProgress = null;

    this.setupSignalHandlers();
    this.startHeartbeat();
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      await this.log('info', `🚀 Starting upload worker for: ${path.basename(this.folderPath)}`);
      await this.updateProgress({
        status: 'initializing',
        phase: 'worker-startup',
        percentage: 0,
        message: 'Worker starting up...'
      });

      // Validate inputs
      await this.validateInputs();

      // Initialize progress reporting
      await this.updateProgress({
        status: 'running',
        phase: 'validation',
        percentage: 5,
        message: 'Validating configuration and files...'
      });

      // Execute the upload using the existing one-media-complete-upload system
      await this.executeUploadProcess();

      // Success
      await this.updateProgress({
        status: 'completed',
        phase: 'finished',
        percentage: 100,
        message: 'Upload completed successfully'
      });

      await this.log('success', `✅ Upload completed successfully for: ${path.basename(this.folderPath)}`);
      process.exit(0);

    } catch (error) {
      await this.handleError(error);
      process.exit(1);
    }
  }

  /**
   * Validate inputs before starting
   */
  async validateInputs() {
    await this.log('info', 'Validating inputs...');
    await this.log('info', `📁 Target folder: ${this.folderPath}`);
    await this.log('info', `⚙️ Config file: ${this.configPath}`);
    await this.log('info', `📊 Progress dir: ${this.progressDir}`);
    await this.log('info', `📝 Logs dir: ${this.logsDir}`);

    // Check folder exists
    if (!await fs.pathExists(this.folderPath)) {
      throw new Error(`Folder does not exist: ${this.folderPath}`);
    }
    await this.log('info', '✅ Target folder exists');

    // Check config exists
    if (!await fs.pathExists(this.configPath)) {
      throw new Error(`Config file does not exist: ${this.configPath}`);
    }
    await this.log('info', '✅ Config file exists');

    // Ensure progress and log directories exist
    await fs.ensureDir(this.progressDir);
    await fs.ensureDir(this.logsDir);
    await this.log('info', '✅ Progress and log directories ensured');

    // Check for Excel files in the folder
    await this.checkExcelFiles();

    await this.log('info', '✅ Input validation completed');
  }

  /**
   * Check for Excel files in the target folder
   */
  async checkExcelFiles() {
    try {
      await this.log('info', '🔍 Checking for Excel files...');

      const files = await fs.readdir(this.folderPath);
      const excelFiles = files.filter(file =>
        file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls')
      );

      await this.log('info', `📋 Found ${excelFiles.length} Excel file(s): ${excelFiles.join(', ')}`);

      if (excelFiles.length === 0) {
        await this.log('warning', '⚠️ No Excel files found in target folder');
        await this.log('info', `📁 Folder contents: ${files.join(', ')}`);
      } else {
        for (const excelFile of excelFiles) {
          const fullPath = path.join(this.folderPath, excelFile);
          const stats = await fs.stat(fullPath);
          await this.log('info', `📊 Excel file: ${excelFile} (${Math.round(stats.size / 1024)}KB, modified: ${stats.mtime.toISOString()})`);
        }
      }
    } catch (error) {
      await this.log('error', `❌ Error checking Excel files: ${error.message}`);
    }
  }

  /**
   * Execute the actual upload process
   */
  async executeUploadProcess() {
    await this.log('info', '🚀 Starting upload execution...');

    const startTime = Date.now();
    const options = {
      folder: this.folderPath,
      config: this.configPath,
      verbose: true,
      mode: 'upload'
    };

    await this.log('info', `📋 Upload options: ${JSON.stringify(options, null, 2)}`);

    // Wrap the upload function to intercept progress
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    // Intercept console output to extract progress information
    console.log = (...args) => {
      this.interceptLogMessage('info', args.join(' '));
      originalConsoleLog(...args);
    };

    console.error = (...args) => {
      this.interceptLogMessage('error', args.join(' '));
      originalConsoleError(...args);
    };

    try {
      await this.updateProgress({
        phase: 'upload-execution',
        percentage: 10,
        message: 'Executing upload process...'
      });

      await this.log('info', '🔄 Ensuring executeUpload is loaded...');
      await executeUploadPromise;

      await this.log('info', '🔄 Calling executeUpload function...');
      const result = await executeUpload(options);
      const duration = Date.now() - startTime;

      // Restore console
      console.log = originalConsoleLog;
      console.error = originalConsoleError;

      await this.log('info', `⏱️ Upload execution completed in ${duration}ms`);
      await this.log('info', `📊 Upload result: ${JSON.stringify(result, null, 2)}`);

      if (!result.success) {
        await this.log('error', `❌ Upload failed: ${result.error}`);
        if (result.phase) {
          await this.log('error', `📍 Failed at phase: ${result.phase}`);
        }
        if (result.context) {
          await this.log('error', `🔍 Error context: ${JSON.stringify(result.context, null, 2)}`);
        }
        throw new Error(result.error || 'Upload execution failed');
      }

      await this.log('info', '✅ Upload execution successful');
      await this.updateProgress({
        phase: 'upload-completed',
        percentage: 95,
        message: 'Upload process completed',
        mediaDescriptionId: result.mediaDescriptionId
      });

      return result;

    } catch (error) {
      // Restore console
      console.log = originalConsoleLog;
      console.error = originalConsoleError;

      const duration = Date.now() - startTime;
      await this.log('error', `❌ Upload execution failed after ${duration}ms: ${error.message}`);

      if (error.stack) {
        await this.log('error', `📚 Stack trace: ${error.stack}`);
      }

      throw error;
    }
  }

  /**
   * Intercept log messages to extract progress information
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  async interceptLogMessage(level, message) {
    await this.log(level, message);

    // Try to extract progress information from log messages
    try {
      // Look for progress indicators in the messages
      if (message.includes('Excel preparation')) {
        await this.updateProgress({
          phase: 'excel-preparation',
          percentage: 15,
          message: 'Preparing Excel file...'
        });
      } else if (message.includes('Validating data')) {
        await this.updateProgress({
          phase: 'validation',
          percentage: 25,
          message: 'Validating data and files...'
        });
      } else if (message.includes('Creating media description')) {
        await this.updateProgress({
          phase: 'creating-media-description',
          percentage: 35,
          message: 'Creating media description...'
        });
      } else if (message.includes('Uploading video')) {
        await this.updateProgress({
          phase: 'uploading-video',
          percentage: 50,
          message: 'Uploading video file...'
        });
      } else if (message.includes('Uploading subtitles')) {
        await this.updateProgress({
          phase: 'uploading-subtitles',
          percentage: 70,
          message: 'Uploading subtitle files...'
        });
      } else if (message.includes('Uploading images')) {
        await this.updateProgress({
          phase: 'uploading-images',
          percentage: 85,
          message: 'Uploading image files...'
        });
      } else if (message.includes('Media Description ID')) {
        // Extract media description ID from success message
        const match = message.match(/Media Description ID[:\s]+([^\s]+)/);
        if (match) {
          await this.updateProgress({
            mediaDescriptionId: match[1]
          });
        }
      }
    } catch (error) {
      // Don't let progress extraction errors affect the main process
      console.error('Progress extraction error:', error.message);
    }
  }

  /**
   * Update progress information
   * @param {Object} progressData - Progress data to update
   */
  async updateProgress(progressData = {}) {
    try {
      const now = new Date();

      this.currentProgress = {
        ...this.currentProgress,
        ...progressData,
        taskId: this.taskId,
        folderPath: this.folderPath,
        lastUpdate: now.toISOString(),
        heartbeat: now.toISOString()
      };

      // Write progress atomically using temp file
      const tempFile = `${this.progressFile}.tmp`;
      await fs.writeJson(tempFile, this.currentProgress, { spaces: 2 });
      await fs.move(tempFile, this.progressFile, { overwrite: true });

    } catch (error) {
      console.error('Failed to update progress:', error.message);
    }
  }

  /**
   * Log a message to the log file
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  async log(level, message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }
  }

  /**
   * Handle errors
   * @param {Error} error - Error object
   */
  async handleError(error) {
    await this.log('error', `❌ Worker error: ${error.message}`);

    if (error.stack) {
      await this.log('error', `Stack trace: ${error.stack}`);
    }

    await this.updateProgress({
      status: 'failed',
      phase: 'error',
      percentage: 0,
      message: `Error: ${error.message}`,
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    const handleShutdown = async (signal) => {
      await this.log('warning', `📴 Received ${signal}, shutting down gracefully...`);

      await this.updateProgress({
        status: 'cancelled',
        phase: 'shutdown',
        message: `Worker stopped by ${signal}`
      });

      this.shouldExit = true;

      // Give some time for cleanup
      setTimeout(() => {
        process.exit(signal === 'SIGTERM' ? 0 : 1);
      }, 1000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    process.on('uncaughtException', async (error) => {
      await this.log('error', `💥 Uncaught exception: ${error.message}`);
      await this.handleError(error);
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      await this.log('error', `💥 Unhandled rejection at: ${promise}, reason: ${reason}`);
      await this.handleError(new Error(`Unhandled rejection: ${reason}`));
      process.exit(1);
    });
  }

  /**
   * Start heartbeat to indicate worker is alive
   */
  startHeartbeat() {
    const heartbeatInterval = 5000; // 5 seconds

    const heartbeat = async () => {
      if (this.shouldExit) return;

      try {
        if (this.currentProgress) {
          await this.updateProgress({
            heartbeat: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Heartbeat error:', error.message);
      }

      if (!this.shouldExit) {
        setTimeout(heartbeat, heartbeatInterval);
      }
    };

    // Start heartbeat
    setTimeout(heartbeat, heartbeatInterval);
  }
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--task-id' && i + 1 < args.length) {
      options.taskId = args[++i];
    } else if (arg === '--folder-path' && i + 1 < args.length) {
      options.folderPath = args[++i];
    } else if (arg === '--config-path' && i + 1 < args.length) {
      options.configPath = args[++i];
    } else if (arg === '--progress-dir' && i + 1 < args.length) {
      options.progressDir = args[++i];
    } else if (arg === '--logs-dir' && i + 1 < args.length) {
      options.logsDir = args[++i];
    }
  }

  return options;
}

/**
 * Validate required arguments
 */
function validateArguments(args) {
  const required = ['taskId', 'folderPath', 'configPath', 'progressDir', 'logsDir'];
  const missing = required.filter(key => !args[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required arguments:', missing.join(', '));
    console.error('Usage: node uploadWorker.js --task-id <id> --folder-path <path> --config-path <path> --progress-dir <dir> --logs-dir <dir>');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const args = parseArguments();
    validateArguments(args);

    console.log('🎬 Upload Worker Starting...');
    console.log(`Task ID: ${args.taskId}`);
    console.log(`Folder: ${args.folderPath}`);
    console.log(`Config: ${args.configPath}`);

    const worker = new UploadWorker(args);
    await worker.run();

  } catch (error) {
    console.error('💥 Worker startup failed:', error.message);
    process.exit(1);
  }
}

// Execute if this is the main module
// Fix path comparison issue for Windows
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (__filename === process.argv[1] ||
    __filename === process.argv[1].replace(/\\/g, '/') ||
    process.argv[1].endsWith('uploadWorker.js')) {
  console.log(`🎬 Upload Worker Starting main() execution...`);
  main();
}

export { UploadWorker };