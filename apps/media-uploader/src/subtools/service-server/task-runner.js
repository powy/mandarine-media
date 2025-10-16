#!/usr/bin/env node

/**
 * Task Runner - Forked Process Worker
 * This script runs in a separate Node.js process via child_process.fork()
 * It executes media uploader functions and communicates via IPC
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Task execution environment
const TASK_ID = process.env.TASK_ID;
const FUNCTION_NAME = process.env.FUNCTION;
const PARAMS = JSON.parse(process.env.PARAMS || '{}');
const LOG_FILE = process.env.LOG_FILE;

// Create log writer
const logWriter = {
  write(message) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${message}\n`;
    try {
      fs.appendFileSync(LOG_FILE, formatted);
      console.log(formatted.trim());
    } catch (error) {
      console.error('Failed to write to log:', error.message);
    }
  },
  error(message) {
    this.write(`[ERROR] ${message}`);
  },
  info(message) {
    this.write(`[INFO] ${message}`);
  },
  warn(message) {
    this.write(`[WARN] ${message}`);
  }
};

// Heartbeat sender
let heartbeatInterval = null;

function startHeartbeat() {
  heartbeatInterval = setInterval(() => {
    if (process.send) {
      process.send({ type: 'heartbeat', taskId: TASK_ID });
    }
  }, 60000); // Every minute
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Progress reporter
function reportProgress(value) {
  if (process.send) {
    process.send({ type: 'progress', taskId: TASK_ID, value });
  }
}

// Error handlers
process.on('uncaughtException', (error) => {
  logWriter.error(`Uncaught Exception: ${error.message}`);
  logWriter.error(error.stack);
  if (process.send) {
    process.send({ type: 'error', taskId: TASK_ID, message: error.message });
  }
  stopHeartbeat();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logWriter.error(`Unhandled Rejection: ${reason}`);
  if (process.send) {
    process.send({ type: 'error', taskId: TASK_ID, message: String(reason) });
  }
  stopHeartbeat();
  process.exit(1);
});

// Main execution
async function executeTask() {
  logWriter.info(`Starting task ${TASK_ID}: ${FUNCTION_NAME}`);
  logWriter.info(`Parameters: ${JSON.stringify(PARAMS, null, 2)}`);

  startHeartbeat();

  try {
    // Map function names to their implementations
    const functionMap = {
      // Single media operations
      prepareExcel: async () => {
        const { OneMediaCompleteUpload } = await import('../one-media-complete-upload/index.js');
        const uploader = new OneMediaCompleteUpload({
          folder: PARAMS.folder,
          config: PARAMS.config,
          verbose: true,
          mode: 'prepare'
        });
        return await uploader.prepareExcel();
      },

      oneMediaCompleteUpload: async () => {
        const { OneMediaCompleteUpload } = await import('../one-media-complete-upload/index.js');
        const uploader = new OneMediaCompleteUpload({
          folder: PARAMS.folder,
          config: PARAMS.config,
          verbose: true,
          mode: 'upload'
        });
        return await uploader.executeUpload();
      },

      uploadPicture: async () => {
        const { pictureUploadCore } = await import('../picture-upload/core.js');
        // Load config from INI file
        const { parseIniFile } = await import('../../shared/utils/iniParser.js');
        const config = parseIniFile(PARAMS.config);

        return await pictureUploadCore({
          picturePath: PARAMS.picture,
          s3: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
            region: config.s3.region,
            bucketName: config.s3.bucket,
            keyPrefix: config.s3.keyPrefix
          },
          api: config.api,
          metadata: {
            format: PARAMS.resolution
          },
          verbose: true
        });
      },

      uploadSubtitleSpecific: async () => {
        const { uploadSubtitlesToMux } = await import('../mux-subtitle-upload/wrapper.js');
        return await uploadSubtitlesToMux({
          config: PARAMS.config,
          folder: PARAMS.folder,
          subtitle: PARAMS.subtitle,
          language: PARAMS.language,
          verbose: true
        });
      },

      uploadSubtitlesToMux: async () => {
        const { uploadSubtitlesToMux } = await import('../mux-subtitle-upload/wrapper.js');
        return await uploadSubtitlesToMux({
          config: PARAMS.config,
          folder: PARAMS.folder,
          verbose: true
        });
      },

      // Batch operations
      prepareExcelBatch: async () => {
        const { prepareExcelForAllSubfolders } = await import('../excel-batch-editor/wrapper.js');
        return await prepareExcelForAllSubfolders({
          parentFolder: PARAMS.parentFolder,
          config: PARAMS.config,
          verbose: true
        });
      },

      cliMultiUpload: async () => {
        const { multiUploadFromParent } = await import('../cli-multi-upload/multiUpload.js');
        return await multiUploadFromParent(
          PARAMS.config,
          PARAMS.parentFolder,
          {
            verbose: true,
            delay: 10
          }
        );
      },

      batchPictureUpload: async () => {
        const { batchPictureUploadCore } = await import('../batch-picture-upload/core.js');
        const { parseIniFile } = await import('../../shared/utils/iniParser.js');
        const config = parseIniFile(PARAMS.config);

        return await batchPictureUploadCore({
          picturePath: PARAMS.picture,
          parentFolderPath: PARAMS.parentFolder,
          s3: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
            region: config.s3.region,
            bucketName: config.s3.bucket,
            keyPrefix: config.s3.keyPrefix
          },
          cloudfront: config.cloudfront,
          api: config.api,
          metadata: {
            format: PARAMS.resolution
          },
          verbose: true
        });
      },

      uploadSubtitlesToMuxBatch: async () => {
        const { batchSubtitleUpload } = await import('../mux-subtitle-upload/wrapper.js');
        return await batchSubtitleUpload({
          config: PARAMS.config,
          parentFolder: PARAMS.parentFolder,
          verbose: true
        });
      }
    };

    const executeFn = functionMap[FUNCTION_NAME];
    if (!executeFn) {
      throw new Error(`Unknown function: ${FUNCTION_NAME}`);
    }

    logWriter.info('Executing function...');
    const result = await executeFn();

    logWriter.info('Task completed successfully');
    logWriter.info(`Result: ${JSON.stringify(result, null, 2)}`);

    stopHeartbeat();

    if (process.send) {
      process.send({ type: 'complete', taskId: TASK_ID, result });
    }

    process.exit(0);

  } catch (error) {
    logWriter.error(`Task failed: ${error.message}`);
    logWriter.error(error.stack);

    stopHeartbeat();

    if (process.send) {
      process.send({ type: 'error', taskId: TASK_ID, message: error.message, stack: error.stack });
    }

    process.exit(1);
  }
}

// Execute if run directly
if (TASK_ID && FUNCTION_NAME && LOG_FILE) {
  executeTask();
} else {
  console.error('Missing required environment variables: TASK_ID, FUNCTION, LOG_FILE');
  process.exit(1);
}
