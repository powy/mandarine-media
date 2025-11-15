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
  },
  debug(message) {
    this.write(`[DEBUG] ${message}`);
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
          mode: 'prepare',
          logFile: LOG_FILE
        });
        return await uploader.prepareExcel();
      },

      oneMediaCompleteUpload: async () => {
        const { OneMediaCompleteUpload } = await import('../one-media-complete-upload/index.js');
        const uploader = new OneMediaCompleteUpload({
          folder: PARAMS.folder,
          config: PARAMS.config,
          verbose: true,
          mode: 'upload',
          logFile: LOG_FILE
        });
        return await uploader.executeUpload();
      },

      uploadPicture: async () => {
        // UPDATED: Now uses refactored Function D (Excel-based)
        const { uploadPictureAndLinkToMediaWithExcel } = await import('../picture-upload/refactored/index.js');
        return await uploadPictureAndLinkToMediaWithExcel(
          PARAMS.picture,      // picturePath
          PARAMS.format,       // pictureFormat (e.g., '1920_1080')
          PARAMS.excelPath,    // excelPath (folder containing 0_desc*.xlsx)
          PARAMS.config        // iniPath
        );
      },

      uploadPictureWithIni: async () => {
        // NEW: Function C - Upload with INI (known format, known media ID)
        const { uploadPictureAndLinkToMediaWithIni } = await import('../picture-upload/refactored/index.js');
        return await uploadPictureAndLinkToMediaWithIni(
          PARAMS.picture,           // picturePath
          PARAMS.format,            // pictureFormat (e.g., '1920_1080')
          PARAMS.mediaDescriptionId, // mediaDescriptionId (UUID)
          PARAMS.config             // iniPath
        );
      },

      uploadPictureWithFormatDetection: async () => {
        // NEW: Function E - Upload with format detection (known media ID)
        const { uploadPictureAndLinkToMediaWithFormatDetection } = await import('../picture-upload/refactored/index.js');
        const { readIniFile, iniToStandardConfig } = await import('../../shared/utils/iniParser.js');

        // Read INI to get config
        const iniConfig = await readIniFile(PARAMS.config);
        const config = iniToStandardConfig(iniConfig);

        // Map backend → api for compatibility (INI uses 'backend', code uses 'api')
        if (config.backend && !config.api) {
          config.api = config.backend;
        }

        return await uploadPictureAndLinkToMediaWithFormatDetection(
          PARAMS.picture,           // picturePath
          PARAMS.mediaDescriptionId, // mediaDescriptionId (UUID)
          config,                   // config object
          { verbose: true }
        );
      },

      uploadPicturesInFolderWithIni: async () => {
        // NEW: Function H - Batch upload folder with format detection
        const { uploadPicturesInFolderWithFormatDetectionWithIni } = await import('../picture-upload/refactored/index.js');
        return await uploadPicturesInFolderWithFormatDetectionWithIni(
          PARAMS.folderPath,        // folderPath
          PARAMS.mediaDescriptionId, // mediaDescriptionId (UUID)
          PARAMS.config             // iniPath
        );
      },

      uploadSubtitleSpecific: async () => {
        // MIGRATED: Now uses unified mux-subtitle-upload system
        const { uploadFromExcelWithIni } = await import('../mux-subtitle-upload/iniWrappers/uploadFromExcelWithIni.js');

        // Find Excel file in folder (pattern: 0_desc*.xlsx)
        const fsModule = await import('fs/promises');
        const pathModule = await import('path');
        const files = await fsModule.default.readdir(PARAMS.folder);
        const excelFile = files.find(file => file.startsWith('0_desc') && file.endsWith('.xlsx'));

        if (!excelFile) {
          throw new Error(`No Excel file found matching pattern 0_desc*.xlsx in folder: ${PARAMS.folder}`);
        }

        const excelPath = pathModule.default.join(PARAMS.folder, excelFile);

        return await uploadFromExcelWithIni(
          excelPath,          // Excel file path
          PARAMS.subtitle,    // subtitle file path
          PARAMS.language,    // language code
          PARAMS.config,      // INI config file path
          {
            verbose: true,
            logger: logWriter
          }
        );
      },

      uploadSubtitlesToMux: async () => {
        const { uploadSubtitlesToMux } = await import('../mux-subtitle-upload/wrapper.js');
        return await uploadSubtitlesToMux({
          config: PARAMS.config,
          folder: PARAMS.folder,
          verbose: true
        });
      },

      resendSubtitles2: async () => {
        // MIGRATED: Now uses unified mux-subtitle-upload system
        const { resendSubtitlesFromIni } = await import('../mux-subtitle-upload/iniWrappers/resendSubtitlesFromIni.js');
        return await resendSubtitlesFromIni(
          PARAMS.folder,      // folder path containing Excel and subtitles
          PARAMS.config,      // INI config file path
          {
            verbose: true,
            dryRun: PARAMS.dryRun || false,
            logger: logWriter
          }
        );
      },

      uploadSubtitleByMediaDescriptionId: async () => {
        // Uses unified mux-subtitle-upload system (Phase 4 migration)
        const { uploadFromMediaDescriptionIdWithIni } = await import('../mux-subtitle-upload/iniWrappers/uploadFromMediaDescriptionIdWithIni.js');

        logWriter.info(`Uploading subtitle by media description ID: ${PARAMS.mediaDescriptionId}`);

        return await uploadFromMediaDescriptionIdWithIni(
          PARAMS.mediaDescriptionId,  // Media description UUID from backend
          PARAMS.subtitle,             // Subtitle file path
          PARAMS.language,             // Language code (fr, en, ko)
          PARAMS.config,               // INI config file path
          {
            verbose: true,
            logger: logWriter
          }
        );
      },

      uploadSubtitleByMuxAssetId: async () => {
        // Uses unified mux-subtitle-upload system (Phase 4 migration)
        const { uploadFromAssetIdWithIni } = await import('../mux-subtitle-upload/iniWrappers/uploadFromAssetIdWithIni.js');

        logWriter.info(`Uploading subtitle by Mux asset ID: ${PARAMS.muxAssetId}`);

        return await uploadFromAssetIdWithIni(
          PARAMS.muxAssetId,           // Mux asset ID (direct from Mux platform)
          PARAMS.subtitle,             // Subtitle file path
          PARAMS.language,             // Language code (fr, en, ko)
          PARAMS.config,               // INI config file path
          {
            verbose: true,
            logger: logWriter
          }
        );
      },

      uploadSubtitlesFromFolderByIdWithIni: async () => {
        // Upload subtitles from folder using prepare-excel matching logic
        const { uploadSubtitlesFromFolderByIdWithIni } = await import('../mux-subtitle-upload/iniWrappers/uploadSubtitlesFromFolderByIdWithIni.js');

        logWriter.info(`Uploading subtitles from folder by media description ID`);
        logWriter.info(`  Media Description ID: ${PARAMS.mediaDescriptionId}`);
        logWriter.info(`  Folder: ${PARAMS.folder}`);

        return await uploadSubtitlesFromFolderByIdWithIni(
          PARAMS.mediaDescriptionId,   // Media description UUID from backend
          PARAMS.folder,               // Folder path to scan for subtitles
          PARAMS.config,               // INI config file path
          {
            verbose: true,
            logger: logWriter,
            delayBetweenUploadsMs: 2000  // 2-second delay for Mux rate limiting
          }
        );
      },

      uploadSubtitlesBySeasonFolder: async () => {
        // Upload subtitles for all episodes in a season from numbered folders (v2 batch)
        const { uploadSubtitlesFromSeasonFolderWithIni } = await import('../mux-subtitle-upload/iniWrappers/uploadSubtitlesFromSeasonFolderWithIni.js');

        logWriter.info(`Uploading subtitles by season folder (batch operation)`);
        logWriter.info(`  Season Media Description ID: ${PARAMS.mediaDescriptionId}`);
        logWriter.info(`  Parent Folder: ${PARAMS.parentFolder}`);

        return await uploadSubtitlesFromSeasonFolderWithIni(
          PARAMS.mediaDescriptionId,        // Season's general media description UUID
          PARAMS.parentFolder,              // Parent folder containing numbered episode folders
          PARAMS.config,                    // INI config file path
          {
            verbose: true,
            logger: logWriter,
            delayBetweenUploadsMs: 2000  // 2-second delay for Mux rate limiting
          }
        );
      },

      deleteSubtitleByMediaDescriptionId: async () => {
        // Uses mux-subtitle-delete tool (Layer 4: INI config wrapper)
        const { deleteWithIniConfig } = await import('../mux-subtitle-delete/core/deleteWithIniConfig.js');

        logWriter.info(`Deleting subtitle by media description ID: ${PARAMS.mediaDescriptionId}`);
        logWriter.info(`Language: ${PARAMS.language}`);

        return await deleteWithIniConfig({
          mediaDescriptionId: PARAMS.mediaDescriptionId,  // Media description UUID from backend
          language: PARAMS.language,                       // Language code (fr, en, ko)
          iniFilePath: PARAMS.config,                      // INI config file path
          dryRun: false,
          logger: logWriter
        });
      },

      // Batch operations
      prepareExcelBatch: async () => {
        const { batchPrepareExcelFromIni } = await import('../one-media-complete-upload/iniInterface.js');
        return await batchPrepareExcelFromIni(
          PARAMS.config,
          PARAMS.parentFolder,
          { verbose: true, logFile: LOG_FILE }
        );
      },

      cliMultiUpload: async () => {
        const { multiUploadFromParent } = await import('../cli-multi-upload/multiUpload.js');
        return await multiUploadFromParent(
          PARAMS.config,
          PARAMS.parentFolder,
          {
            verbose: true,
            delay: 10,
            logFile: LOG_FILE
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

      resendSubtitles2Batch: async () => {
        // MIGRATED: Now uses unified mux-subtitle-upload system
        const { batchResendSubtitlesFromIni } = await import('../mux-subtitle-upload/iniWrappers/batchResendSubtitlesFromIni.js');
        return await batchResendSubtitlesFromIni(
          PARAMS.parentFolder,   // parent folder containing subfolders
          PARAMS.config,         // INI config file path
          {
            verbose: true,
            dryRun: PARAMS.dryRun || false,
            logger: logWriter
          }
        );
      },

      propagateSeasonDataBatch: async () => {
        const { processExcelFileForPropagation } = await import('../propagate-data/serverIntegration.js');
        const fsModule = await import('fs/promises');
        const pathModule = await import('path');

        // Find Excel file in folder (pattern: 0_desc*.xlsx)
        const files = await fsModule.default.readdir(PARAMS.parentFolder);
        const excelFile = files.find(file => file.startsWith('0_desc') && file.endsWith('.xlsx'));

        if (!excelFile) {
          throw new Error('No Excel file found matching pattern 0_desc*.xlsx in folder');
        }

        const excelPath = pathModule.default.join(PARAMS.parentFolder, excelFile);
        logWriter.info(`Found Excel file: ${excelFile}`);

        return await processExcelFileForPropagation(
          excelPath,
          PARAMS.config,
          { verbose: true, dryRun: false, logFile: LOG_FILE }
        );
      },

      propagateSeasonDataFromMediaDescriptionWithIni: async () => {
        const { propagateSeasonDataFromMediaDescriptionWithIni } = await import('../propagate-data/wrapper.js');

        logWriter.info(`Propagating season data by media description ID: ${PARAMS.mediaDescriptionId}`);
        logWriter.info(`Using INI config: ${PARAMS.config}`);

        return await propagateSeasonDataFromMediaDescriptionWithIni(
          PARAMS.mediaDescriptionId,  // Media description ID
          PARAMS.config,               // INI file path
          {
            verbose: true,
            dryRun: false,
            logFile: LOG_FILE
          }
        );
      },

      propagateSeasonDataFromSeasonIdWithIni: async () => {
        const { propagateSeasonDataFromSeasonIdWithIni } = await import('../propagate-data/wrapper.js');

        logWriter.info(`Propagating season data by season entity ID: ${PARAMS.seasonEntityId}`);
        logWriter.info(`Using INI config: ${PARAMS.config}`);

        return await propagateSeasonDataFromSeasonIdWithIni(
          PARAMS.seasonEntityId,  // Season entity ID
          PARAMS.config,          // INI file path
          {
            verbose: true,
            dryRun: false,
            logFile: LOG_FILE
          }
        );
      },

      // Excel edition by Column A description
      editExcelSingleByDescription: async () => {
        const { updateSingleExcelByDescriptionFromIni } = await import('../excel-batch-editor/iniInterface.js');

        logWriter.info(`Editing single Excel file by description`);
        logWriter.info(`Folder: ${PARAMS.folder}`);
        logWriter.info(`Description: ${PARAMS.descriptionText}`);
        logWriter.info(`New Value: ${PARAMS.newValue}`);

        // Validate required parameters
        if (!PARAMS.config) {
          throw new Error('Missing config file path');
        }
        if (!PARAMS.folder) {
          throw new Error('Missing folder path');
        }
        if (!PARAMS.descriptionText) {
          throw new Error('Missing description text');
        }
        if (PARAMS.newValue === undefined || PARAMS.newValue === null) {
          throw new Error('Missing new value');
        }

        return await updateSingleExcelByDescriptionFromIni(
          PARAMS.config,           // INI config file
          PARAMS.folder,           // Treated folder path
          PARAMS.descriptionText,  // Column A description
          PARAMS.newValue,         // New value for Column C
          {
            verbose: true,
            logFile: LOG_FILE,
            dryRun: PARAMS.dryRun || false
          }
        );
      },

      editExcelBatchByDescription: async () => {
        const { updateAllExcelsByDescriptionRecursiveFromIni } = await import('../excel-batch-editor/iniInterface.js');

        logWriter.info(`Editing batch Excel files by description`);
        logWriter.info(`Parent Folder: ${PARAMS.parentFolder}`);
        logWriter.info(`Description: ${PARAMS.descriptionText}`);
        logWriter.info(`New Value: ${PARAMS.newValue}`);

        // Validate required parameters
        if (!PARAMS.config) {
          throw new Error('Missing config file path');
        }
        if (!PARAMS.parentFolder) {
          throw new Error('Missing parent folder path');
        }
        if (!PARAMS.descriptionText) {
          throw new Error('Missing description text');
        }
        if (PARAMS.newValue === undefined || PARAMS.newValue === null) {
          throw new Error('Missing new value');
        }

        return await updateAllExcelsByDescriptionRecursiveFromIni(
          PARAMS.config,
          PARAMS.parentFolder,     // Parent folder path
          PARAMS.descriptionText,
          PARAMS.newValue,
          {
            verbose: true,
            logFile: LOG_FILE,
            dryRun: PARAMS.dryRun || false
          }
        );
      },

      // Regenerate episode names from season name
      regenerateEpisodeNames: async () => {
        const { regenerateEpisodeNamesFromSeasonWithIni } = await import('../excel-batch-editor/iniInterface.js');

        logWriter.info(`Regenerating episode names from season`);
        logWriter.info(`Parent Folder: ${PARAMS.parentFolder}`);

        // Validate required parameters
        if (!PARAMS.config) {
          throw new Error('Missing config file path');
        }
        if (!PARAMS.parentFolder) {
          throw new Error('Missing parent folder path');
        }

        return await regenerateEpisodeNamesFromSeasonWithIni(
          PARAMS.config,
          PARAMS.parentFolder,
          {
            verbose: true,
            logFile: LOG_FILE,
            dryRun: PARAMS.dryRun || false
          }
        );
      }
    };

    const executeFn = functionMap[FUNCTION_NAME];
    if (!executeFn) {
      throw new Error(`Unknown function: ${FUNCTION_NAME}`);
    }

    logWriter.info('Executing function...');
    const result = await executeFn();

    // Handle both old format (result.success) and new format (presence of data fields)
    const hasError = result.success === false || result.error;
    const hasSuccessData = result.pictureId || result.uploaded || result.success === true;

    if (hasError) {
      logWriter.warn('Task completed with errors');
      if (result.error) {
        logWriter.error(`Error: ${result.error}`);
      }
    } else if (hasSuccessData) {
      logWriter.info('Task completed successfully');
    } else {
      logWriter.warn('Task completed with uncertain status');
    }
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
