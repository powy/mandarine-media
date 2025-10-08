/**
 * Mux Upload INI Interface
 * Reads INI file and converts to JSON for core function
 */

import { muxUploadCore } from './core.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';
import fs from 'fs-extra';

/**
 * Execute mux upload from INI configuration
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} options - Upload options
 * @param {string} options.videoPath - Path to video file (required)
 * @param {Object} [options.video] - Video configuration object
 * @param {boolean} [options.dryRun=false] - Dry run mode
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {boolean} [options.debug=false] - Debug logging
 * @param {boolean} [options.quiet=false] - Quiet mode
 * @param {number} [options.timeout] - Upload timeout in seconds
 * @param {number} [options.retry] - Number of retry attempts
 * @param {string} [options.uploadMethod] - Upload method (auto, upchunk, custom)
 * @param {number} [options.chunkSize] - Chunk size in MB
 * @param {number} [options.memoryThreshold] - Memory threshold in MB
 * @param {boolean} [options.noResume] - Disable upload resume
 * @param {number} [options.chunkRetries] - Per-chunk retry attempts
 * @param {number} [options.chunkTimeout] - Per-chunk timeout in seconds
 * @param {boolean} [options.noAdaptiveRetry] - Disable adaptive retry delays
 * @param {boolean} [options.dynamicChunks] - Enable dynamic chunk sizing
 * @param {boolean} [options.noValidateUpload] - Skip upload validation
 * @returns {Promise<Object>} Upload result
 */
export async function muxUploadFromIni(iniFilePath, options = {}) {
  try {
    // Validate INI file exists
    if (!await fs.pathExists(iniFilePath)) {
      throw new Error(`INI configuration file not found: ${iniFilePath}`);
    }

    // Validate required video path
    if (!options.videoPath && !options.video) {
      throw new Error('videoPath option or video configuration is required when using INI interface');
    }

    // Read and parse INI file
    const iniConfig = await readIniFile(iniFilePath);

    // Convert to standard JSON format
    const standardConfig = iniToStandardConfig(iniConfig);

    // Build video configuration
    const videoConfig = options.video || {
      filepath: options.videoPath,
    };

    // Build authentication from standard config
    const auth = {
      mux_token_id: standardConfig.mux?.tokenId,
      mux_token_secret: standardConfig.mux?.tokenSecret,
    };

    // Validate authentication
    if (!auth.mux_token_id || !auth.mux_token_secret) {
      throw new Error('Mux authentication credentials (mux.tokenId and mux.tokenSecret) are required in INI file');
    }

    // Build final configuration for core function
    const coreConfig = {
      video: videoConfig,
      auth,

      // Database configuration if present
      ...(standardConfig.database && { database: standardConfig.database }),

      // Backend configuration
      backend: standardConfig.backend,

      // Upload options
      options: {
        timeout: options.timeout ? options.timeout * 1000 : standardConfig.options?.timeout,
        retry_attempts: options.retry || standardConfig.retryAttempts,
        upload_method: options.uploadMethod || 'auto',
        chunk_size_mb: options.chunkSize || 5,
        memory_threshold_mb: options.memoryThreshold || 100,
        enable_resume: !options.noResume,
        max_chunk_retries: options.chunkRetries || 5,
        chunk_timeout: options.chunkTimeout ? options.chunkTimeout * 1000 : 120000,
        adaptive_retry_delay: !options.noAdaptiveRetry,
        dynamic_chunk_size: options.dynamicChunks || false,
        validate_before_upload: !options.noValidateUpload,
        retry_delay: standardConfig.retryDelay,
      },

      // Logging configuration
      logging: {
        level: options.debug ? 'debug' : (options.verbose ? 'info' : (options.quiet ? 'error' : standardConfig.logging?.level || 'info')),
        console: !options.quiet && (standardConfig.logging?.console !== false),
        file: standardConfig.logging?.file,
      },

      // Webhook configuration if present
      ...(standardConfig.webhook && { webhook: standardConfig.webhook }),

      // CLI flags
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      debug: options.debug || false,
      quiet: options.quiet || false,

      // Preserve INI file path for reference
      _iniFilePath: iniFilePath,
    };

    // Execute core function
    return await muxUploadCore(coreConfig);

  } catch (error) {
    throw new Error(`Mux Upload INI execution failed: ${error.message}`);
  }
}

/**
 * Execute mux upload from INI with video file path
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} videoPath - Path to video file
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Upload result
 */
export async function muxUploadFromIniWithVideo(iniFilePath, videoPath, options = {}) {
  return muxUploadFromIni(iniFilePath, {
    ...options,
    videoPath,
  });
}

/**
 * Execute mux upload from INI with full video configuration
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} videoConfig - Video configuration object
 * @param {string} videoConfig.filepath - Path to video file
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Upload result
 */
export async function muxUploadFromIniWithVideoConfig(iniFilePath, videoConfig, options = {}) {
  return muxUploadFromIni(iniFilePath, {
    ...options,
    video: videoConfig,
  });
}