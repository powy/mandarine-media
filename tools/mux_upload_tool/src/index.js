#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

import { validateConfig, validateEnvironment } from './schemas/inputSchema.js';
import { createLogger } from './config/logger.js';
import { loadConfigFile } from './utils/fileUtils.js';
import { MuxUploadError, ErrorCodes } from './utils/errorHandler.js';
import UploadService from './services/uploadService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

class MuxUploadCLI {
  constructor() {
    this.program = new Command();
    this.logger = null;
    this.config = null;
    this.uploadService = null;
    this.spinner = null;
  }
  
  setupCLI() {
    this.program
      .name('mux-upload')
      .description('A comprehensive Node.js CLI tool for uploading videos to Mux')
      .version('1.0.0')
      .requiredOption('-c, --config <path>', 'Configuration JSON file path')
      .option('-d, --debug', 'Enable debug logging')
      .option('-t, --timeout <seconds>', 'Upload timeout in seconds', parseInt, 3600)
      .option('-r, --retry <count>', 'Number of retry attempts', parseInt, 3)
      .option('--dry-run', 'Validate configuration without uploading')
      .option('--progress', 'Show upload progress bar', true)
      .option('--no-progress', 'Disable upload progress bar')
      .option('-v, --verbose', 'Verbose output')
      .option('-q, --quiet', 'Quiet mode (errors only)')
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
      throw error;
    }
  }
  
  mergeEnvironmentVariables(config) {
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
    
    // Override timeout and retry options
    config.options = config.options || {};
    
    if (cliOptions.timeout) {
      config.options.timeout = cliOptions.timeout * 1000; // Convert to milliseconds
    }
    
    if (cliOptions.retry) {
      config.options.retry_attempts = cliOptions.retry;
    }
    
    // Store CLI flags
    config._cli = {
      dryRun: cliOptions.dryRun || false,
      progress: cliOptions.progress,
      verbose: cliOptions.verbose || false,
      quiet: cliOptions.quiet || false
    };
  }
  
  initializeLogger(config) {
    this.logger = createLogger(config);
    
    // Add CLI-specific logging methods
    this.logger.logStart = (configPath) => {
      this.logger.info('Mux Upload Tool started', {
        version: '1.0.0',
        configPath: configPath,
        timestamp: new Date().toISOString()
      });
    };
    
    this.logger.logSuccess = (result) => {
      this.logger.info('Upload completed successfully', {
        assetId: result.asset.id,
        duration: result.asset.duration,
        playbackIds: result.asset.playback_ids?.length || 0,
        subtitles: result.subtitles.successful
      });
    };
    
    return this.logger;
  }
  
  async performUpload(config) {
    try {
      // Initialize upload service
      this.uploadService = new UploadService(config, this.logger);
      
      // Validate upload before proceeding
      if (config.options?.validate_before_upload !== false) {
        this.spinner = ora('Validating upload requirements...').start();
        await this.uploadService.validateUpload();
        this.spinner.succeed('Upload validation completed');
      }
      
      // Perform the upload
      this.spinner = ora('Starting video upload...').start();
      const result = await this.uploadService.uploadVideo();
      
      this.spinner.succeed('Upload completed successfully');
      return result;
      
    } catch (error) {
      if (this.spinner) this.spinner.fail('Upload failed');
      throw error;
    } finally {
      // Cleanup
      if (this.uploadService) {
        await this.uploadService.cleanup();
      }
    }
  }
  
  displayResults(result, config) {
    console.log('\n' + chalk.green.bold('✓ Upload Successful!') + '\n');
    
    // Asset information
    console.log(chalk.cyan.bold('Asset Information:'));
    console.log(`  Asset ID: ${chalk.white(result.asset.id)}`);
    console.log(`  Status: ${chalk.green(result.asset.status)}`);
    console.log(`  Duration: ${chalk.white(result.asset.duration ? `${result.asset.duration}s` : 'Processing...')}`);
    console.log(`  Quality: ${chalk.white(result.asset.video_quality)}`);
    console.log(`  Resolution: ${chalk.white(result.asset.resolution_tier)}`);
    console.log('');
    
    // File information
    console.log(chalk.cyan.bold('File Information:'));
    console.log(`  Filename: ${chalk.white(result.file.filename)}`);
    console.log(`  Size: ${chalk.white(result.file.size_formatted)}`);
    console.log('');
    
    // Playback URLs
    if (result.playback_urls && result.playback_urls.length > 0) {
      console.log(chalk.cyan.bold('Playback URLs:'));
      result.playback_urls.forEach((playback, index) => {
        console.log(`  ${chalk.yellow(`Playback ${index + 1}`)} (${playback.policy}):`);
        console.log(`    HLS: ${chalk.blue(playback.hls_url)}`);
        console.log(`    MP4: ${chalk.blue(playback.mp4_url)}`);
        if (index < result.playback_urls.length - 1) console.log('');
      });
      console.log('');
    }
    
    // Thumbnail URLs
    if (result.thumbnail_urls && result.thumbnail_urls.length > 0 && !config._cli?.quiet) {
      console.log(chalk.cyan.bold('Thumbnail URLs:'));
      result.thumbnail_urls.forEach((thumbnail, index) => {
        console.log(`  ${chalk.yellow(`Thumbnail ${index + 1}`)} (${thumbnail.policy}):`);
        console.log(`    JPG: ${chalk.blue(thumbnail.thumbnail_jpg)}`);
        console.log(`    PNG: ${chalk.blue(thumbnail.thumbnail_png)}`);
        if (index < result.thumbnail_urls.length - 1) console.log('');
      });
      console.log('');
    }
    
    // Subtitle information
    if (result.subtitles.total > 0) {
      console.log(chalk.cyan.bold('Subtitles:'));
      console.log(`  Total: ${result.subtitles.total}`);
      console.log(`  Successful: ${chalk.green(result.subtitles.successful)}`);
      if (result.subtitles.failed > 0) {
        console.log(`  Failed: ${chalk.red(result.subtitles.failed)}`);
      }
      console.log('');
    }
    
    // Webhook information
    if (result.webhook) {
      console.log(chalk.cyan.bold('Webhook:'));
      console.log(`  ID: ${result.webhook.id}`);
      console.log(`  URL: ${result.webhook.url}`);
      console.log(`  Events: ${result.webhook.events.join(', ')}`);
      console.log('');
    }
    
    // Database information
    if (config.database) {
      console.log(chalk.cyan.bold('Database:'));
      console.log(`  ✓ Asset metadata saved to ${config.database.table || 'mux_assets'}`);
      console.log('');
    }
    
    if (config._cli?.verbose) {
      console.log(chalk.gray('Full result object:'));
      console.log(chalk.gray(JSON.stringify(result, null, 2)));
    }
  }
  
  handleError(error, config) {
    console.error('\n' + chalk.red.bold('✗ Upload Failed!') + '\n');
    
    if (error instanceof MuxUploadError) {
      console.error(chalk.red(`Error: ${error.message}`));
      console.error(chalk.yellow(`Code: ${error.code}`));
      
      if (error.details && Object.keys(error.details).length > 0 && config?._cli?.verbose) {
        console.error(chalk.gray('Details:'));
        console.error(chalk.gray(JSON.stringify(error.details, null, 2)));
      }
      
      // Provide helpful suggestions based on error code
      this.provideSuggestions(error.code);
      
    } else {
      console.error(chalk.red(`Unexpected error: ${error.message}`));
      
      if (config?._cli?.debug || config?._cli?.verbose) {
        console.error(chalk.gray('Stack trace:'));
        console.error(chalk.gray(error.stack));
      }
    }
    
    console.error('');
  }
  
  provideSuggestions(errorCode) {
    const suggestions = {
      [ErrorCodes.AUTH_FAILED]: [
        'Check your Mux API credentials in the config file or environment variables',
        'Verify that MUX_TOKEN_ID and MUX_TOKEN_SECRET are correct',
        'Ensure your API key has the necessary permissions'
      ],
      [ErrorCodes.FILE_NOT_FOUND]: [
        'Verify the video file path in your configuration',
        'Ensure the file exists and is readable',
        'Use an absolute path for the video file'
      ],
      [ErrorCodes.VALIDATION_ERROR]: [
        'Check your configuration file syntax',
        'Review the configuration schema in the documentation',
        'Ensure all required fields are provided'
      ],
      [ErrorCodes.DATABASE_CONNECTION_FAILED]: [
        'Check your database connection settings',
        'Ensure the database server is running',
        'Verify database credentials and network connectivity'
      ],
      [ErrorCodes.UPLOAD_FAILED]: [
        'Check your internet connection',
        'Try with a smaller file first',
        'Increase timeout settings if uploading large files'
      ]
    };
    
    const errorSuggestions = suggestions[errorCode];
    if (errorSuggestions) {
      console.error(chalk.yellow('Suggestions:'));
      errorSuggestions.forEach(suggestion => {
        console.error(chalk.yellow(`  • ${suggestion}`));
      });
    }
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
        console.log(chalk.blue.bold('Mux Video Upload Tool v1.0.0\n'));
        console.log(`Configuration: ${chalk.white(configPath)}`);
        console.log(`Video file: ${chalk.white(config.video.filepath)}`);
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
      if (!config._cli?.quiet) {
        this.displayResults(result, config);
      }
      
      this.logger.logSuccess(result);
      
    } catch (error) {
      exitCode = 1;
      this.handleError(error, this.config);
      
      if (this.logger) {
        this.logger.error('Upload process failed', {
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
const cli = new MuxUploadCLI();
cli.run();