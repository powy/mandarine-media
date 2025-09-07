// Function wrapper for mux-subtitle-upload tool
import dotenv from 'dotenv';
import { validateConfig, validateEnvironment } from './schemas/inputSchema.js';
import { createLogger } from './config/logger.js';
import { loadConfigFile } from './utils/fileUtils.js';
import { SubtitleUploadError, ErrorCodes, handleError, getErrorMessage, getErrorSuggestions } from './utils/errorHandler.js';
import SubtitleService from './services/subtitleService.js';

// Load environment variables
dotenv.config();

/**
 * Mux Subtitle Upload Function Wrapper
 * @param {Object} options - Upload options
 * @param {string} options.config - Configuration file path
 * @param {boolean} options.debug - Enable debug logging
 * @param {number} options.retry - Number of retry attempts (default: 3)
 * @param {boolean} options.dryRun - Validate configuration without uploading
 * @param {boolean} options.verbose - Verbose output
 * @param {boolean} options.quiet - Quiet mode (errors only)
 * @param {boolean} options.cleanup - Skip S3 file cleanup after upload (default: true)
 * @param {number} options.cleanupDelay - S3 cleanup delay in minutes (default: 120)
 * @returns {Promise<Object>} Upload results
 */
export async function uploadSubtitlesToMux(options) {
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
    logger.logStart('main-session', validatedConfig);
    
    // Display startup information
    if (!validatedConfig._cli?.quiet) {
      console.log('📝 Mux Subtitle Upload Tool v1.0.0\n');
      console.log(`Configuration: ${configPath}`);
      console.log(`Processing ${validatedConfig.subtitles.length} subtitle file(s)`);
      console.log('');
    }
    
    // Handle dry run
    if (validatedConfig._cli?.dryRun) {
      console.log('✓ Dry run - Configuration is valid, no upload performed\n');
      logger.info('Dry run completed successfully');
      return { dryRun: true, success: true };
    }
    
    // Initialize subtitle service
    const subtitleService = new SubtitleService(validatedConfig, logger);
    
    // Process subtitles
    const results = await processSubtitles(subtitleService, validatedConfig);
    
    // Display results
    if (!validatedConfig._cli?.quiet) {
      displayResults(results, validatedConfig);
    }
    
    logger.logSuccess('main-session', results.results);
    
    return results;
    
  } catch (error) {
    if (logger) {
      logger.logError('wrapper-session', error);
    }
    
    handleError(error, logger);
    throw error;
  }
}

function mergeEnvironmentVariables(config) {
  const env = validateEnvironment(process.env);
  
  // Merge Mux auth from environment
  if (env.MUX_TOKEN_ID) {
    config.auth = config.auth || {};
    config.auth.mux_token_id = env.MUX_TOKEN_ID;
  }
  
  if (env.MUX_TOKEN_SECRET) {
    config.auth = config.auth || {};
    config.auth.mux_token_secret = env.MUX_TOKEN_SECRET;
  }
  
  // Merge AWS auth from environment
  if (env.AWS_ACCESS_KEY_ID) {
    config.aws = config.aws || {};
    config.aws.accessKeyId = env.AWS_ACCESS_KEY_ID;
  }
  
  if (env.AWS_SECRET_ACCESS_KEY) {
    config.aws = config.aws || {};
    config.aws.secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  }
  
  if (env.AWS_REGION) {
    config.aws = config.aws || {};
    config.aws.region = env.AWS_REGION;
  }
  
  if (env.S3_BUCKET_NAME) {
    config.s3 = config.s3 || {};
    config.s3.bucket_name = env.S3_BUCKET_NAME;
  }
}

function mergeCLIOptions(config, cliOptions) {
  config._cli = {
    dryRun: cliOptions.dryRun || false,
    verbose: cliOptions.verbose || false,
    quiet: cliOptions.quiet || false,
    noCleanup: cliOptions.noCleanup || false
  };
  
  // Store other CLI options in the options section
  if (!config.options) {
    config.options = {};
  }
  if (cliOptions.retry) {
    config.options.max_retry_attempts = cliOptions.retry;
  }
  if (cliOptions.cleanupDelay) {
    config.options.cleanup_delay_minutes = cliOptions.cleanupDelay;
  }
}

async function processSubtitles(subtitleService, config) {
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let index = 0; index < config.subtitles.length; index++) {
    const subtitleConfig = config.subtitles[index];
    try {
      console.log(`Processing: ${subtitleConfig.language_code} - ${subtitleConfig.file_path}`);
      
      // Upload subtitle
      const result = await subtitleService.uploadSingleSubtitle(subtitleConfig, index);
      
      results.push({
        subtitle: subtitleConfig,
        success: true,
        result
      });
      
      successCount++;
      console.log(`✅ Success: ${subtitleConfig.language_code}`);
      
    } catch (error) {
      results.push({
        subtitle: subtitleConfig,
        success: false,
        error: error.message
      });
      
      errorCount++;
      console.error(`❌ Failed: ${subtitleConfig.language_code} - ${error.message}`);
    }
  }
  
  return {
    success: errorCount === 0,
    totalProcessed: results.length,
    successCount,
    errorCount,
    results
  };
}

function displayResults(results, config) {
  console.log('📊 Upload Results:');
  console.log(`  Total processed: ${results.totalProcessed}`);
  console.log(`  Successful: ${results.successCount}`);
  console.log(`  Failed: ${results.errorCount}`);
  
  if (results.errorCount > 0) {
    console.log('\n❌ Failed uploads:');
    results.results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.subtitle.language_code}: ${r.error}`);
      });
  }
  
  console.log('');
}

export default { uploadSubtitlesToMux };