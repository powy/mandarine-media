/**
 * Mux Upload - All Three Interfaces
 * Provides core, INI, and CLI interfaces for the mux upload tool
 */

// Import core function
import { muxUploadCore } from './core.js';

// Import INI interface
import {
  muxUploadFromIni,
  muxUploadFromIniWithVideo,
  muxUploadFromIniWithVideoConfig,
} from './iniInterface.js';

// Import existing CLI class for legacy support
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Execute mux upload from CLI options object
 * @param {Object} cliOptions - CLI options object
 * @param {string} cliOptions.config - Configuration JSON file path
 * @param {boolean} [cliOptions.debug] - Enable debug logging
 * @param {number} [cliOptions.timeout] - Upload timeout in seconds
 * @param {number} [cliOptions.retry] - Number of retry attempts
 * @param {boolean} [cliOptions.dryRun] - Validate configuration without uploading
 * @param {boolean} [cliOptions.verbose] - Verbose output
 * @param {boolean} [cliOptions.quiet] - Quiet mode (errors only)
 * @param {string} [cliOptions.uploadMethod] - Upload method: auto, upchunk, or custom
 * @param {number} [cliOptions.chunkSize] - Chunk size in MB (1-50)
 * @param {number} [cliOptions.memoryThreshold] - Memory threshold in MB (50-1000)
 * @param {boolean} [cliOptions.noResume] - Disable upload resume capability
 * @param {number} [cliOptions.chunkRetries] - Per-chunk retry attempts (1-10)
 * @param {number} [cliOptions.chunkTimeout] - Per-chunk timeout in seconds (30-600)
 * @param {boolean} [cliOptions.noAdaptiveRetry] - Disable adaptive retry delays
 * @param {boolean} [cliOptions.dynamicChunks] - Enable dynamic chunk sizing
 * @param {boolean} [cliOptions.noValidateUpload] - Skip upload validation
 * @returns {Promise<Object>} Upload result
 */
async function muxUploadFromCli(cliOptions) {
  try {
    // Validate required config file
    if (!cliOptions.config) {
      throw new Error('Configuration file path (-c, --config) is required');
    }

    // Build core configuration
    const coreConfig = {
      configFile: cliOptions.config,

      // CLI options
      debug: cliOptions.debug || false,
      verbose: cliOptions.verbose || false,
      quiet: cliOptions.quiet || false,
      dryRun: cliOptions.dryRun || false,

      // Upload options
      timeout: cliOptions.timeout,
      retry: cliOptions.retry,
      uploadMethod: cliOptions.uploadMethod,
      chunkSize: cliOptions.chunkSize,
      memoryThreshold: cliOptions.memoryThreshold,
      noResume: cliOptions.noResume,
      chunkRetries: cliOptions.chunkRetries,
      chunkTimeout: cliOptions.chunkTimeout,
      noAdaptiveRetry: cliOptions.noAdaptiveRetry,
      adaptiveRetry: !cliOptions.noAdaptiveRetry,
      dynamicChunks: cliOptions.dynamicChunks,
      noValidateUpload: cliOptions.noValidateUpload,
      validateUpload: !cliOptions.noValidateUpload,
    };

    // Execute core function
    return await muxUploadCore(coreConfig);

  } catch (error) {
    throw new Error(`Mux Upload CLI execution failed: ${error.message}`);
  }
}

/**
 * Mux Upload Interface Object
 * Provides all three interfaces in a single object
 */
export const MuxUploadInterface = {
  // Core interface - pure function accepting JSON config
  core: muxUploadCore,

  // INI interface - reads INI file and converts to JSON for core
  fromIni: muxUploadFromIni,
  fromIniWithVideo: muxUploadFromIniWithVideo,
  fromIniWithVideoConfig: muxUploadFromIniWithVideoConfig,

  // CLI interface - accepts CLI options object
  fromCli: muxUploadFromCli,

  // Legacy interface for backward compatibility
  legacy: {
    // Can be used to import the original CLI class if needed
    // MuxUploadCLI: require('./index.js').default,
  },
};

// Export individual functions for convenience
export {
  // Core interface
  muxUploadCore,

  // INI interfaces
  muxUploadFromIni,
  muxUploadFromIniWithVideo,
  muxUploadFromIniWithVideoConfig,

  // CLI interface
  muxUploadFromCli,
};

// Default export
export default MuxUploadInterface;