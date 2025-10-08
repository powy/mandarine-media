/**
 * Picture Upload - All Three Interfaces
 * Provides core, INI, and CLI interfaces for the picture upload tool
 */

// Import core function
import { pictureUploadCore } from './core.js';

// Import INI interface
import {
  pictureUploadFromIni,
  pictureUploadFromIniWithPath,
  pictureUploadFromIniWithMetadata,
} from './iniInterface.js';

// Import existing tool class for legacy support
import { PictureUploadTool } from './index.js';

/**
 * Execute picture upload from CLI options object
 * @param {Object} cliOptions - CLI options object
 * @param {string} cliOptions.config - Configuration JSON file path
 * @param {boolean} [cliOptions.verbose] - Verbose output
 * @param {boolean} [cliOptions.dryRun] - Validate configuration without uploading
 * @returns {Promise<Object>} Upload result
 */
async function pictureUploadFromCli(cliOptions) {
  try {
    // Validate required config file
    if (!cliOptions.config) {
      throw new Error('Configuration file path (-c, --config) is required');
    }

    // Build core configuration
    const coreConfig = {
      configFile: cliOptions.config,

      // CLI options
      dryRun: cliOptions.dryRun || false,
      verbose: cliOptions.verbose || false,
      debug: false, // Picture upload doesn't have debug flag, use verbose instead
    };

    // Execute core function
    return await pictureUploadCore(coreConfig);

  } catch (error) {
    throw new Error(`Picture Upload CLI execution failed: ${error.message}`);
  }
}

/**
 * Picture Upload Interface Object
 * Provides all three interfaces in a single object
 */
export const PictureUploadInterface = {
  // Core interface - pure function accepting JSON config
  core: pictureUploadCore,

  // INI interface - reads INI file and converts to JSON for core
  fromIni: pictureUploadFromIni,
  fromIniWithPath: pictureUploadFromIniWithPath,
  fromIniWithMetadata: pictureUploadFromIniWithMetadata,

  // CLI interface - accepts CLI options object
  fromCli: pictureUploadFromCli,

  // Legacy interface for backward compatibility
  legacy: {
    PictureUploadTool,
  },
};

// Export individual functions for convenience
export {
  // Core interface
  pictureUploadCore,

  // INI interfaces
  pictureUploadFromIni,
  pictureUploadFromIniWithPath,
  pictureUploadFromIniWithMetadata,

  // CLI interface
  pictureUploadFromCli,

  // Legacy class
  PictureUploadTool,
};

// Default export
export default PictureUploadInterface;