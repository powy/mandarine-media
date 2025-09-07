// Function wrapper for mux-upload tool
import dotenv from 'dotenv';
import { validateConfig, validateEnvironment } from './schemas/inputSchema.js';
import { createLogger } from './config/logger.js';
import { loadConfigFile } from './utils/fileUtils.js';
import { MuxUploadError, ErrorCodes } from './utils/errorHandler.js';
import UploadService from './services/uploadService.js';

// Load environment variables
dotenv.config();

/**
 * Mux Upload Function Wrapper
 * @param {Object} options - Upload options
 * @param {string} options.config - Configuration file path
 * @param {boolean} options.debug - Enable debug logging
 * @param {number} options.timeout - Upload timeout in seconds (default: 3600)
 * @param {number} options.retry - Number of retry attempts (default: 3)
 * @param {boolean} options.dryRun - Validate configuration without uploading
 * @param {boolean} options.progress - Show upload progress bar (default: true)
 * @param {boolean} options.verbose - Verbose output
 * @param {boolean} options.quiet - Quiet mode (errors only)
 * @returns {Promise<Object>} Upload results
 */
export async function uploadToMux(options) {
  let logger = null;
  
  try {
    // Load and validate configuration
    const { config, configPath } = await loadConfigFile(options.config);
    
    // Override config with environment variables
    mergeEnvironmentVariables(config);
    
    // Override config with options
    mergeCLIOptions(config, options);
    
    // Validate configuration
    const validatedConfig = validateConfig(config);
    
    // Initialize logger
    logger = createLogger(validatedConfig);
    logger.info('Upload process started', { configPath });
    
    // Display startup information
    if (!validatedConfig._cli?.quiet) {
      console.log('🎬 Mux Video Upload Tool v1.0.0\n');
      console.log(`Configuration: ${configPath}`);
      console.log(`Video file: ${validatedConfig.video.filepath}`);
      console.log('');
    }
    
    // Handle dry run
    if (validatedConfig._cli?.dryRun) {
      console.log('✓ Dry run - Configuration is valid, no upload performed\n');
      logger.info('Dry run completed successfully');
      return { dryRun: true, success: true };
    }
    
    // Initialize upload service
    const uploadService = new UploadService(validatedConfig, logger);
    
    // Perform upload
    const result = await performUpload(uploadService, validatedConfig);
    
    // Display results
    if (!validatedConfig._cli?.quiet) {
      displayResults(result, validatedConfig);
    }
    
    logger.info('Upload completed successfully', { result });
    
    return result;
    
  } catch (error) {
    if (logger) {
      logger.error('Upload failed', { error: error.message, stack: error.stack });
    }
    
    console.error('❌ Mux upload failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    throw error;
  }
}

function mergeEnvironmentVariables(config) {
  const env = validateEnvironment(process.env);
  
  // Merge auth from environment
  if (env.MUX_TOKEN_ID) {
    config.auth = config.auth || {};
    config.auth.mux_token_id = env.MUX_TOKEN_ID;
  }
  
  if (env.MUX_TOKEN_SECRET) {
    config.auth = config.auth || {};
    config.auth.mux_token_secret = env.MUX_TOKEN_SECRET;
  }
  
  // Merge database from environment
  if (env.DB_TYPE) {
    config.database = config.database || {};
    config.database.type = env.DB_TYPE;
    config.database.connection = config.database.connection || {};
    
    if (env.DB_HOST) config.database.connection.host = env.DB_HOST;
    if (env.DB_PORT) config.database.connection.port = parseInt(env.DB_PORT);
    if (env.DB_NAME) config.database.connection.database = env.DB_NAME;
    if (env.DB_USER) config.database.connection.user = env.DB_USER;
    if (env.DB_PASSWORD) config.database.connection.password = env.DB_PASSWORD;
  }
}

function mergeCLIOptions(config, cliOptions) {
  config._cli = {
    debug: cliOptions.debug || false,
    timeout: cliOptions.timeout || 3600,
    retry: cliOptions.retry || 3,
    dryRun: cliOptions.dryRun || false,
    progress: cliOptions.progress !== false,
    verbose: cliOptions.verbose || false,
    quiet: cliOptions.quiet || false
  };
}

async function performUpload(uploadService, config) {
  const spinner = null; // We'll handle spinner in the main tool
  
  try {
    // Call the main uploadVideo method which handles everything
    const result = await uploadService.uploadVideo();
    
    return result;
    
  } catch (error) {
    throw error;
  }
}

function displayResults(result, config) {
  console.log('✅ Upload completed successfully!\n');
  
  console.log('📊 Results:');
  console.log(`  Asset ID: ${result.asset.id}`);
  console.log(`  Playback ID: ${result.asset.playback_ids?.[0]?.id || 'N/A'}`);
  console.log(`  Duration: ${result.asset.duration || 'N/A'} seconds`);
  console.log(`  Status: ${result.asset.status}`);
  
  if (result.backend_record) {
    console.log(`  Backend Record UUID: ${result.backend_record.uuid}`);
    console.log(`  Upload Status: ${result.backend_record.upload_status}`);
  }
  
  if (result.subtitles && result.subtitles.total > 0) {
    console.log(`  Subtitles: ${result.subtitles.successful}/${result.subtitles.total} uploaded`);
  }
  
  console.log('');
}

export default { uploadToMux };