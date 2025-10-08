/**
 * Mux Upload Core Function
 * Pure function interface that accepts JSON configuration
 */

import dotenv from 'dotenv';
import { validateConfig, validateEnvironment } from './schemas/inputSchema.js';
import { createLogger } from './config/logger.js';
import { loadConfigFile } from './utils/fileUtils.js';
import UploadService from './services/uploadService.js';

// Load environment variables
dotenv.config();

/**
 * Core mux upload function
 * @param {Object} config - Configuration object
 * @param {Object} config.video - Video configuration
 * @param {string} config.video.filepath - Path to video file
 * @param {Object} config.auth - Authentication credentials
 * @param {string} config.auth.mux_token_id - Mux token ID
 * @param {string} config.auth.mux_token_secret - Mux token secret
 * @param {Object} [config.database] - Database configuration
 * @param {Object} [config.backend] - Backend API configuration
 * @param {Object} [config.options] - Upload options
 * @param {number} [config.options.timeout] - Upload timeout in milliseconds
 * @param {number} [config.options.retry_attempts] - Number of retry attempts
 * @param {string} [config.options.upload_method] - Upload method (auto, upchunk, custom)
 * @param {number} [config.options.chunk_size_mb] - Chunk size in MB
 * @param {number} [config.options.memory_threshold_mb] - Memory threshold in MB
 * @param {boolean} [config.options.enable_resume] - Enable upload resume
 * @param {number} [config.options.max_chunk_retries] - Per-chunk retry attempts
 * @param {number} [config.options.chunk_timeout] - Per-chunk timeout in milliseconds
 * @param {boolean} [config.options.adaptive_retry_delay] - Enable adaptive retry delays
 * @param {boolean} [config.options.dynamic_chunk_size] - Enable dynamic chunk sizing
 * @param {boolean} [config.options.validate_before_upload] - Validate before upload
 * @param {Object} [config.logging] - Logging configuration
 * @param {string} [config.logging.level] - Log level
 * @param {boolean} [config.logging.console] - Enable console logging
 * @param {string} [config.logging.file] - Log file path
 * @param {Object} [config.webhook] - Webhook configuration
 * @param {boolean} [config.dryRun=false] - Dry run mode
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @param {boolean} [config.debug=false] - Debug logging
 * @param {boolean} [config.quiet=false] - Quiet mode
 * @returns {Promise<Object>} Upload result
 */
export async function muxUploadCore(config) {
  try {
    // Validate and prepare configuration
    const finalConfig = await prepareConfig(config);

    // Create logger
    const logger = createLogger(finalConfig);

    // Log start
    logger.info('Mux Upload started', {
      video: finalConfig.video.filepath,
      timestamp: new Date().toISOString()
    });

    // Handle dry run
    if (finalConfig.dryRun) {
      logger.info('Dry run mode - configuration validated, no upload performed');
      return {
        success: true,
        dryRun: true,
        message: 'Configuration is valid, no upload performed',
        config: finalConfig
      };
    }

    // Initialize upload service
    const uploadService = new UploadService(finalConfig, logger);

    try {
      // Validate upload if enabled
      if (finalConfig.options?.validate_before_upload !== false) {
        logger.info('Validating upload requirements...');
        await uploadService.validateUpload();
        logger.info('Upload validation completed');
      }

      // Perform the upload
      logger.info('Starting video upload...');
      const result = await uploadService.uploadVideo();

      logger.info('Upload completed successfully', {
        assetId: result.asset.id,
        duration: result.asset.duration,
        playbackIds: result.asset.playback_ids?.length || 0,
        subtitles: result.subtitles?.successful || 0
      });

      return {
        success: true,
        result,
        message: 'Upload completed successfully'
      };

    } finally {
      // Cleanup
      await uploadService.cleanup();
    }

  } catch (error) {
    throw new Error(`Mux upload failed: ${error.message}`);
  }
}

/**
 * Prepare and validate configuration
 * @param {Object} config - Raw configuration
 * @returns {Promise<Object>} Prepared configuration
 */
async function prepareConfig(config) {
  // Start with provided config
  let finalConfig = { ...config };

  // If a config file path is provided, load it first
  if (config.configFile) {
    const { config: fileConfig } = await loadConfigFile(config.configFile);
    // File config as base, CLI config overrides
    finalConfig = { ...fileConfig, ...config };
  }

  // Merge environment variables
  mergeEnvironmentVariables(finalConfig);

  // Apply CLI-style options if provided
  applyCLIOptions(finalConfig);

  // Validate the final configuration
  const validatedConfig = validateConfig(finalConfig);

  return validatedConfig;
}

/**
 * Merge environment variables into config
 * @param {Object} config - Configuration object to modify
 */
function mergeEnvironmentVariables(config) {
  const env = validateEnvironment(process.env);

  // Merge auth from environment
  if (env.MUX_TOKEN_ID || env.MUX_TOKEN_SECRET) {
    config.auth = config.auth || {};
    if (env.MUX_TOKEN_ID) config.auth.mux_token_id = env.MUX_TOKEN_ID;
    if (env.MUX_TOKEN_SECRET) config.auth.mux_token_secret = env.MUX_TOKEN_SECRET;
  }

  // Merge database from environment
  if (env.DB_TYPE) {
    config.database = config.database || {};
    config.database.type = env.DB_TYPE;
    config.database.connection = config.database.connection || {};

    if (env.DB_HOST) config.database.connection.host = env.DB_HOST;
    if (env.DB_PORT) config.database.connection.port = env.DB_PORT;
    if (env.DB_NAME) config.database.connection.database = env.DB_NAME;
    if (env.DB_USER) config.database.connection.user = env.DB_USER;
    if (env.DB_PASSWORD) config.database.connection.password = env.DB_PASSWORD;
  }

  // Merge backend from environment
  if (env.BACKEND_SERVER_ADDRESS || env.BACKEND_USER || env.BACKEND_PASSWORD) {
    config.backend = config.backend || {};
    if (env.BACKEND_SERVER_ADDRESS) config.backend.server_address = env.BACKEND_SERVER_ADDRESS;
    if (env.BACKEND_USER) config.backend.user = env.BACKEND_USER;
    if (env.BACKEND_PASSWORD) config.backend.password = env.BACKEND_PASSWORD;
  }

  // Merge logging from environment
  if (env.LOG_LEVEL || env.LOG_FILE) {
    config.logging = config.logging || {};
    if (env.LOG_LEVEL) config.logging.level = env.LOG_LEVEL;
    if (env.LOG_FILE) config.logging.file = env.LOG_FILE;
  }

  // Merge options from environment
  if (env.UPLOAD_TIMEOUT || env.RETRY_ATTEMPTS || env.RETRY_DELAY || env.CHUNK_SIZE) {
    config.options = config.options || {};
    if (env.UPLOAD_TIMEOUT) config.options.timeout = env.UPLOAD_TIMEOUT;
    if (env.RETRY_ATTEMPTS) config.options.retry_attempts = env.RETRY_ATTEMPTS;
    if (env.RETRY_DELAY) config.options.retry_delay = env.RETRY_DELAY;
    if (env.CHUNK_SIZE) config.options.chunk_size = env.CHUNK_SIZE;
  }

  // Merge webhook from environment
  if (env.WEBHOOK_URL) {
    config.webhook = config.webhook || {};
    config.webhook.enabled = true;
    config.webhook.url = env.WEBHOOK_URL;
    if (env.WEBHOOK_EVENTS) {
      config.webhook.events = env.WEBHOOK_EVENTS.split(',').map(e => e.trim());
    }
  }
}

/**
 * Apply CLI-style options to config
 * @param {Object} config - Configuration object to modify
 */
function applyCLIOptions(config) {
  // Setup logging based on CLI flags
  config.logging = config.logging || {};

  if (config.debug) {
    config.logging.level = 'debug';
  } else if (config.quiet) {
    config.logging.level = 'error';
    config.logging.console = false;
  } else if (config.verbose) {
    config.logging.level = 'debug';
  }

  // Setup options
  config.options = config.options || {};

  if (config.timeout) {
    config.options.timeout = typeof config.timeout === 'number'
      ? config.timeout * 1000 // Convert seconds to milliseconds
      : config.timeout;
  }

  if (config.retry !== undefined) {
    config.options.retry_attempts = config.retry;
  }

  // Enhanced chunked upload options
  if (config.uploadMethod) {
    config.options.upload_method = config.uploadMethod;
  }

  if (config.chunkSize) {
    config.options.chunk_size_mb = config.chunkSize;
  }

  if (config.memoryThreshold) {
    config.options.memory_threshold_mb = config.memoryThreshold;
  }

  if (config.noResume) {
    config.options.enable_resume = false;
  }

  if (config.chunkRetries) {
    config.options.max_chunk_retries = config.chunkRetries;
  }

  if (config.chunkTimeout) {
    config.options.chunk_timeout = typeof config.chunkTimeout === 'number'
      ? config.chunkTimeout * 1000 // Convert seconds to milliseconds
      : config.chunkTimeout;
  }

  if (config.noAdaptiveRetry) {
    config.options.adaptive_retry_delay = false;
  } else if (config.adaptiveRetry) {
    config.options.adaptive_retry_delay = true;
  }

  if (config.dynamicChunks) {
    config.options.dynamic_chunk_size = true;
  }

  if (config.noValidateUpload) {
    config.options.validate_before_upload = false;
  } else if (config.validateUpload) {
    config.options.validate_before_upload = true;
  }
}