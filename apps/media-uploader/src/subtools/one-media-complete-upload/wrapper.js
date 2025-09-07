import { OneMediaCompleteUpload } from './index.js';

/**
 * One Media Complete Upload Function Wrapper
 * @param {Object} options - Upload options
 * @param {string} options.config - Configuration file path
 * @param {string} options.folder - Folder path containing media files
 * @param {boolean} options.verbose - Verbose output
 * @param {boolean} options.dryRun - Validate configuration without uploading
 * @returns {Promise<Object>} Upload results with detailed context
 */
export async function oneMediaCompleteUpload(options) {
  try {
    const uploader = new OneMediaCompleteUpload(options);
    const result = await uploader.run();
    
    return result;
    
  } catch (error) {
    console.error('❌ Complete upload failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    
    // Return comprehensive error context instead of throwing
    return {
      success: false,
      error: error.message,
      phase: 'wrapper-error',
      context: {
        options,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        },
        summary: {
          phase: 'wrapper-execution-failed',
          configProvided: !!options.config,
          folderProvided: !!options.folder
        }
      }
    };
  }
}