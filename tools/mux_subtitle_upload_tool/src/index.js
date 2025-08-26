#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';

import { validateConfig, validateEnvironment } from './schemas/inputSchema.js';
import { createLogger } from './config/logger.js';
import { loadConfigFile } from './utils/fileUtils.js';
import { SubtitleUploadError, ErrorCodes, handleError, getErrorMessage, getErrorSuggestions } from './utils/errorHandler.js';
import SubtitleService from './services/subtitleService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

class MuxSubtitleUploadCLI {
  constructor() {
    this.program = new Command();
    this.logger = null;
    this.config = null;
    this.subtitleService = null;
    this.spinner = null;
  }
  
  setupCLI() {
    this.program
      .name('mux-subtitle-upload')
      .description('Upload subtitle files to existing Mux assets via S3')
      .version('1.0.0')
      .requiredOption('-c, --config <path>', 'Configuration JSON file path')
      .option('-d, --debug', 'Enable debug logging')
      .option('-r, --retry <count>', 'Number of retry attempts', parseInt, 3)
      .option('--dry-run', 'Validate configuration without uploading')
      .option('-v, --verbose', 'Verbose output')
      .option('-q, --quiet', 'Quiet mode (errors only)')
      .option('--no-cleanup', 'Skip S3 file cleanup after upload')
      .option('--cleanup-delay <minutes>', 'S3 cleanup delay in minutes', parseInt, 120)
      .helpOption('-h, --help', 'Display help for command');
    
    this.program.parse();
    return this.program.opts();
  }
  
  async loadAndValidateConfig(configPath, cliOptions) {
    try {
      this.spinner = ora('Loading configuration...').start();
      
      // Load configuration file
      const { config, configPath: resolvedConfigPath } = await loadConfigFile(configPath);
      
      // Override config with environment variables
      this.mergeEnvironmentVariables(config);
      
      // Override config with CLI options
      this.mergeCLIOptions(config, cliOptions);
      
      // Validate configuration
      const validatedConfig = validateConfig(config);
      
      this.spinner.succeed('Configuration loaded and validated');
      
      return {
        config: validatedConfig,
        configPath: resolvedConfigPath
      };
      
    } catch (error) {
      if (this.spinner) this.spinner.fail('Configuration validation failed');
      throw handleError(error, console, { step: 'configuration' });
    }
  }
  
  mergeEnvironmentVariables(config) {
    const env = validateEnvironment(process.env);
    
    // Merge auth from environment
    if (env.MUX_TOKEN_ID || env.MUX_TOKEN_SECRET) {
      config.auth = config.auth || {};
      if (env.MUX_TOKEN_ID) config.auth.mux_token_id = env.MUX_TOKEN_ID;
      if (env.MUX_TOKEN_SECRET) config.auth.mux_token_secret = env.MUX_TOKEN_SECRET;
    }
    
    // Merge S3 from environment
    if (env.AWS_ACCESS_KEY_ID || env.AWS_SECRET_ACCESS_KEY || env.AWS_REGION || env.S3_BUCKET_NAME) {
      config.s3 = config.s3 || {};
      if (env.AWS_ACCESS_KEY_ID) config.s3.access_key_id = env.AWS_ACCESS_KEY_ID;
      if (env.AWS_SECRET_ACCESS_KEY) config.s3.secret_access_key = env.AWS_SECRET_ACCESS_KEY;
      if (env.AWS_REGION) config.s3.region = env.AWS_REGION;
      if (env.S3_BUCKET_NAME) config.s3.bucket_name = env.S3_BUCKET_NAME;
    }
    
    // Merge logging from environment
    if (env.LOG_LEVEL || env.LOG_FILE) {
      config.logging = config.logging || {};
      if (env.LOG_LEVEL) config.logging.level = env.LOG_LEVEL;
      if (env.LOG_FILE) config.logging.file = env.LOG_FILE;
    }
    
    // Merge options from environment
    const optionOverrides = {};
    if (env.CLEANUP_DELAY_MINUTES) optionOverrides.cleanup_delay_minutes = env.CLEANUP_DELAY_MINUTES;
    if (env.MAX_RETRY_ATTEMPTS) optionOverrides.max_retry_attempts = env.MAX_RETRY_ATTEMPTS;
    if (env.RETRY_DELAY) optionOverrides.retry_delay = env.RETRY_DELAY;
    if (env.PRESIGNED_URL_EXPIRY) optionOverrides.presigned_url_expiry = env.PRESIGNED_URL_EXPIRY;
    
    if (Object.keys(optionOverrides).length > 0) {
      config.options = { ...config.options, ...optionOverrides };
    }
  }
  
  mergeCLIOptions(config, cliOptions) {
    // Override logging level
    config.logging = config.logging || {};
    
    if (cliOptions.debug) {
      config.logging.level = 'debug';
    } else if (cliOptions.quiet) {
      config.logging.level = 'error';
      config.logging.console = false;
    } else if (cliOptions.verbose) {
      config.logging.level = 'debug';
    }
    
    // Override retry options
    if (cliOptions.retry) {
      config.options = config.options || {};
      config.options.max_retry_attempts = cliOptions.retry;
    }
    
    // Override cleanup options
    if (cliOptions.cleanupDelay) {
      config.options = config.options || {};
      config.options.cleanup_delay_minutes = cliOptions.cleanupDelay;
    }
    
    // Store CLI flags
    config._cli = {
      dryRun: cliOptions.dryRun || false,
      verbose: cliOptions.verbose || false,
      quiet: cliOptions.quiet || false,
      noCleanup: cliOptions.cleanup === false
    };
  }
  
  initializeLogger(config) {
    this.logger = createLogger(config);
    
    // Add CLI-specific logging methods
    this.logger.logStart = (configPath) => {
      this.logger.info('Mux Subtitle Upload Tool started', {
        version: '1.0.0',
        configPath: configPath,
        timestamp: new Date().toISOString()
      });
    };
    
    return this.logger;
  }
  
  async performUpload(config) {
    try {
      // Initialize subtitle service
      this.subtitleService = new SubtitleService(config, this.logger);
      
      this.spinner = ora('Starting subtitle upload...').start();
      const result = await this.subtitleService.uploadSubtitles();
      
      if (result.success) {
        this.spinner.succeed('All subtitle uploads completed successfully');
      } else {
        this.spinner.warn(`Subtitle uploads completed with ${result.failed} failures`);
      }
      
      return result;
      
    } catch (error) {
      if (this.spinner) this.spinner.fail('Subtitle upload failed');
      throw handleError(error, this.logger, { step: 'upload' });
    }
  }
  
  displayResults(result, config) {
    if (config._cli?.quiet) return;
    
    console.log('\n' + chalk.blue.bold('=== Subtitle Upload Results ===') + '\n');
    
    // Session information
    console.log(chalk.cyan.bold('Session Information:'));
    console.log(`  Session ID: ${chalk.white(result.sessionId)}`);
    console.log(`  Asset ID: ${chalk.white(config.mux_asset_id)}`);
    console.log(`  Total Time: ${chalk.white((result.totalTimeMs / 1000).toFixed(2))}s`);
    console.log('');
    
    // Summary
    console.log(chalk.cyan.bold('Summary:'));
    console.log(`  Total Subtitles: ${chalk.white(result.totalSubtitles)}`);
    console.log(`  Successful: ${chalk.green(result.successful)}`);
    if (result.failed > 0) {
      console.log(`  Failed: ${chalk.red(result.failed)}`);
    }
    console.log('');
    
    // Individual results
    if (config._cli?.verbose || result.failed > 0) {
      console.log(chalk.cyan.bold('Individual Results:'));
      result.results.forEach((res, index) => {
        const status = res.success ? chalk.green('✓') : chalk.red('✗');
        const language = res.subtitle.language_code.toUpperCase();
        const name = res.subtitle.name;
        
        if (res.success) {
          console.log(`  ${status} ${chalk.white(language)} (${name})`);
          console.log(`    Track ID: ${chalk.gray(res.trackId)}`);
          console.log(`    Upload: ${chalk.gray((res.uploadTimeMs / 1000).toFixed(2))}s`);
          console.log(`    Processing: ${chalk.gray((res.processingTimeMs / 1000).toFixed(2))}s`);
        } else {
          console.log(`  ${status} ${chalk.white(language)} (${name})`);
          console.log(`    Error: ${chalk.red(res.error)}`);
        }
        
        if (index < result.results.length - 1) console.log('');
      });
      console.log('');
    }
    
    // Success tracks
    const successfulTracks = result.results.filter(r => r.success);
    if (successfulTracks.length > 0) {
      console.log(chalk.cyan.bold('Successful Track IDs:'));
      successfulTracks.forEach(res => {
        console.log(`  ${res.subtitle.language_code.toUpperCase()}: ${chalk.blue(res.trackId)}`);
      });
      console.log('');
    }
    
    // Log files
    console.log(chalk.cyan.bold('Log Files:'));
    console.log(`  Main: ${chalk.gray('./logs/subtitle-uploads.log')}`);
    console.log(`  Errors: ${chalk.gray('./logs/errors.log')}`);
    console.log('');
  }
  
  handleError(error, config) {
    console.error('\n' + chalk.red.bold('✗ Subtitle Upload Failed!') + '\n');
    
    if (error instanceof SubtitleUploadError) {
      console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      console.error(chalk.yellow(`Code: ${error.code}`));
      
      if (error.details && Object.keys(error.details).length > 0 && config?._cli?.verbose) {
        console.error(chalk.gray('Details:'));
        console.error(chalk.gray(JSON.stringify(error.details, null, 2)));
      }
      
      // Provide helpful suggestions
      const suggestions = getErrorSuggestions(error);
      if (suggestions.length > 0) {
        console.error(chalk.yellow('\nSuggestions:'));
        suggestions.forEach(suggestion => {
          console.error(chalk.yellow(`  • ${suggestion}`));
        });
      }
      
    } else {
      console.error(chalk.red(`Unexpected error: ${error.message}`));
      
      if (config?._cli?.debug || config?._cli?.verbose) {
        console.error(chalk.gray('\nStack trace:'));
        console.error(chalk.gray(error.stack));
      }
    }
    
    console.error('');
  }
  
  async run() {
    let exitCode = 0;
    
    try {
      // Setup CLI
      const cliOptions = this.setupCLI();
      
      // Load and validate configuration
      const { config, configPath } = await this.loadAndValidateConfig(cliOptions.config, cliOptions);
      this.config = config;
      
      // Initialize logger
      this.initializeLogger(config);
      this.logger.logStart(configPath);
      
      // Display startup information
      if (!config._cli?.quiet) {
        console.log(chalk.blue.bold('Mux Subtitle Upload Tool v1.0.0\n'));
        console.log(`Configuration: ${chalk.white(configPath)}`);
        console.log(`Asset ID: ${chalk.white(config.mux_asset_id)}`);
        console.log(`Subtitles: ${chalk.white(config.subtitles.length)} files`);
        console.log('');
      }
      
      // Handle dry run
      if (config._cli?.dryRun) {
        console.log(chalk.yellow('✓ Dry run - Configuration is valid, no upload performed\n'));
        this.logger.info('Dry run completed successfully');
        return;
      }
      
      // Perform upload
      const result = await this.performUpload(config);
      
      // Display results
      this.displayResults(result, config);
      
      // Set exit code based on results
      if (!result.success) {
        exitCode = 1;
      }
      
    } catch (error) {
      exitCode = 1;
      this.handleError(error, this.config);
      
      if (this.logger) {
        this.logger.error('Subtitle upload process failed', {
          error: error.message,
          code: error.code,
          stack: error.stack
        });
      }
    }
    
    process.exit(exitCode);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Run the CLI
const cli = new MuxSubtitleUploadCLI();
cli.run();