/**
 * Upload Worker Process
 * Subprocess worker that executes single folder upload using singleUploadFromIni
 */

import { singleUploadFromIni } from '../one-media-complete-upload/iniInterface.js';

// Handle messages from parent process
process.on('message', async (taskData) => {
  const { iniFilePath, folderPath, verbose } = taskData;

  try {
    // Send progress update
    if (process.send) {
      process.send({
        type: 'progress',
        message: 'Starting upload...'
      });
    }

    // Execute upload using existing function
    const result = await singleUploadFromIni(iniFilePath, folderPath, {
      verbose: verbose || false
    });

    // Send result back to parent
    if (process.send) {
      process.send({
        type: 'result',
        success: result.success,
        result: result,
        mediaDescriptionId: result.mediaDescriptionId || result.data?.mediaDescriptionId || null,
        error: result.error || null
      });
    }

    // Exit successfully
    process.exit(0);

  } catch (error) {
    // Send error result back to parent
    if (process.send) {
      process.send({
        type: 'result',
        success: false,
        error: error.message,
        result: {
          success: false,
          error: error.message,
          stack: error.stack
        }
      });
    }

    // Exit with error
    process.exit(1);
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  if (process.send) {
    process.send({
      type: 'result',
      success: false,
      error: `Uncaught exception: ${error.message}`,
      result: {
        success: false,
        error: error.message,
        stack: error.stack
      }
    });
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  if (process.send) {
    process.send({
      type: 'result',
      success: false,
      error: `Unhandled rejection: ${reason}`,
      result: {
        success: false,
        error: String(reason)
      }
    });
  }
  process.exit(1);
});
