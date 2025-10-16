/**
 * Resend Subtitles Wrapper
 * JSON config file wrapper for subtitle resending
 */

import { resendSubtitles } from './resendSubtitles.js';
import { loadConfigFile } from '../picture-upload/utils/fileUtils.js';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';
import chalk from 'chalk';

/**
 * Resend subtitles from JSON config file
 * @param {Object} options - Upload options
 * @param {string} options.config - JSON configuration file path
 * @param {boolean} [options.verbose] - Verbose output
 * @param {boolean} [options.dryRun] - Dry run mode
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Resend results
 */
export async function resendSubtitlesFromConfig(options) {
  let restoreConsole = null;

  if (options.logFile) {
    const logger = createFileLogger({
      logFile: options.logFile,
      verbose: options.verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  try {
    console.log(chalk.blue.bold('📝 Subtitle Resend Tool v1.0.0'));
    console.log(chalk.blue.bold('==========================================\n'));

    // Load and validate configuration
    console.log(chalk.gray(`📄 Loading configuration from: ${options.config}`));

    const config = await loadConfigFile(options.config);

    console.log(chalk.green('✅ Configuration loaded successfully\n'));

    if (options.verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Folder: ${config.folderPath}`));
      console.log(chalk.gray(`  Mux: ${config.mux?.tokenId ? 'configured' : 'not configured'}`));
      console.log(chalk.gray(`  S3 Bucket: ${config.s3?.bucket}`));
      console.log(chalk.gray(`  API: ${config.backend?.baseUrl}`));
      console.log('');
    }

    // Merge CLI options with config
    const mergedConfig = {
      ...config,
      verbose: options.verbose ?? config.verbose ?? false,
      dryRun: options.dryRun ?? config.dryRun ?? false
    };

    // Handle dry run message
    if (mergedConfig.dryRun) {
      console.log(chalk.yellow('⚠️  DRY RUN MODE - No upload will be performed\n'));
    }

    // Execute subtitle resend
    console.log(chalk.cyan('🚀 Starting subtitle resend...\n'));

    const result = await resendSubtitles(mergedConfig);

    // Display results
    displayResults(result, mergedConfig);

    return result;

  } catch (error) {
    console.error(chalk.red(`\n❌ Subtitle resend failed: ${error.message}`));
    if (options.verbose) {
      console.error(chalk.gray(error.stack));
    }
    throw error;
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

/**
 * Display resend results
 * @private
 */
function displayResults(result, config) {
  console.log(chalk.bold('\n' + '='.repeat(60)));

  if (result.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN COMPLETED'));
    console.log(chalk.gray('No upload performed'));
  } else if (result.success) {
    console.log(chalk.green.bold('✅ SUBTITLE RESEND COMPLETED'));
  } else {
    console.log(chalk.yellow.bold('⚠️  SUBTITLE RESEND COMPLETED WITH ERRORS'));
  }

  console.log(chalk.bold('='.repeat(60)));

  // Summary
  console.log(chalk.cyan('\n📊 Summary:'));
  console.log(chalk.gray(`  Folder: ${result.folder}`));
  console.log(chalk.gray(`  Media Description ID: ${result.mediaDescriptionId}`));
  console.log(chalk.gray(`  Total Subtitles: ${result.totalSubtitles}`));
  console.log(chalk.green(`  Successful: ${result.successful}`));
  if (result.failed > 0) {
    console.log(chalk.red(`  Failed: ${result.failed}`));
  }
  if (result.skipped > 0) {
    console.log(chalk.yellow(`  Skipped: ${result.skipped}`));
  }

  // Detailed results
  if (config.verbose || result.failed > 0 || result.skipped > 0) {
    console.log(chalk.cyan('\n📋 Detailed Results:'));
    result.results.forEach((res, index) => {
      if (res.success && !res.dryRun) {
        console.log(chalk.green(`  ✓ ${res.fileName} (${res.language})`));
        console.log(chalk.gray(`    Track ID: ${res.mux.trackId}`));
        console.log(chalk.gray(`    Row Type: ${res.rowType}`));
      } else if (res.skipped) {
        console.log(chalk.yellow(`  ⊘ ${res.fileName} (${res.language}) - Skipped`));
        console.log(chalk.gray(`    Reason: ${res.error}`));
      } else if (!res.success) {
        console.log(chalk.red(`  ✗ ${res.fileName} (${res.language})`));
        console.log(chalk.red(`    Error: ${res.error}`));
      } else if (res.dryRun) {
        console.log(chalk.gray(`  ○ ${res.fileName} (${res.language}) [DRY RUN]`));
      }

      if (index < result.results.length - 1) console.log('');
    });
  }

  console.log('');
}

export default {
  resendSubtitlesFromConfig
};
