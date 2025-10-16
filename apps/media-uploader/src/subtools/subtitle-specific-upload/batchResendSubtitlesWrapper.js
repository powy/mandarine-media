/**
 * Batch Resend Subtitles Wrapper
 * JSON config file wrapper for batch subtitle resending
 */

import { batchResendSubtitles } from './batchResendSubtitles.js';
import { loadConfigFile } from '../picture-upload/utils/fileUtils.js';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';
import chalk from 'chalk';

/**
 * Batch resend subtitles from JSON config file
 * @param {Object} options - Upload options
 * @param {string} options.config - JSON configuration file path
 * @param {boolean} [options.verbose] - Verbose output
 * @param {boolean} [options.dryRun] - Dry run mode
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Batch resend results
 */
export async function batchResendSubtitlesFromConfig(options) {
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
    console.log(chalk.blue.bold('📝 Batch Subtitle Resend Tool v1.0.0'));
    console.log(chalk.blue.bold('==========================================\n'));

    // Load and validate configuration
    console.log(chalk.gray(`📄 Loading configuration from: ${options.config}`));

    const config = await loadConfigFile(options.config);

    console.log(chalk.green('✅ Configuration loaded successfully\n'));

    if (options.verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Parent Folder: ${config.parentFolderPath}`));
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

    // Execute batch subtitle resend
    console.log(chalk.cyan('🚀 Starting batch subtitle resend...\n'));

    const result = await batchResendSubtitles(mergedConfig);

    // Display results
    displayResults(result, mergedConfig);

    return result;

  } catch (error) {
    console.error(chalk.red(`\n❌ Batch subtitle resend failed: ${error.message}`));
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
 * Display batch resend results
 * @private
 */
function displayResults(result, config) {
  console.log(chalk.bold('\n' + '='.repeat(60)));

  if (result.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN COMPLETED'));
    console.log(chalk.gray('No upload performed'));
  } else if (result.success) {
    console.log(chalk.green.bold('✅ BATCH SUBTITLE RESEND COMPLETED'));
  } else {
    console.log(chalk.yellow.bold('⚠️  BATCH SUBTITLE RESEND COMPLETED WITH ERRORS'));
  }

  console.log(chalk.bold('='.repeat(60)));

  // Summary
  console.log(chalk.cyan('\n📊 Overall Summary:'));
  console.log(chalk.gray(`  Parent Folder: ${result.parentFolder}`));
  console.log(chalk.gray(`  Total Folders Scanned: ${result.totalFolders}`));
  console.log(chalk.gray(`  Folders Processed: ${result.processedFolders}`));
  console.log(chalk.green(`  Successful Folders: ${result.successfulFolders}`));
  if (result.failedFolders > 0) {
    console.log(chalk.red(`  Failed Folders: ${result.failedFolders}`));
  }
  console.log(chalk.gray(`  Total Subtitles: ${result.totalSubtitles}`));
  console.log(chalk.green(`  Successful Subtitles: ${result.successfulSubtitles}`));
  if (result.failedSubtitles > 0) {
    console.log(chalk.red(`  Failed Subtitles: ${result.failedSubtitles}`));
  }

  // Detailed folder results
  if (config.verbose || result.failedFolders > 0) {
    console.log(chalk.cyan('\n📋 Folder Results:'));
    result.folderResults.forEach((folderResult, index) => {
      if (folderResult.dryRun) {
        console.log(chalk.gray(`  ○ ${folderResult.folderName} [DRY RUN]`));
      } else if (folderResult.success) {
        console.log(chalk.green(`  ✓ ${folderResult.folderName}`));
        console.log(chalk.gray(`    Subtitles: ${folderResult.successful}/${folderResult.totalSubtitles} uploaded`));
        console.log(chalk.gray(`    Media ID: ${folderResult.mediaDescriptionId}`));
      } else if (folderResult.error) {
        console.log(chalk.red(`  ✗ ${folderResult.folderName}`));
        console.log(chalk.red(`    Error: ${folderResult.error}`));
      } else {
        console.log(chalk.yellow(`  ⚠ ${folderResult.folderName}`));
        console.log(chalk.gray(`    Subtitles: ${folderResult.successful}/${folderResult.totalSubtitles} uploaded`));
        console.log(chalk.yellow(`    Errors: ${folderResult.failed} failed, ${folderResult.skipped} skipped`));
      }

      if (index < result.folderResults.length - 1) console.log('');
    });
  }

  // Show failed folders summary if not verbose
  if (!config.verbose && result.failedFolders > 0) {
    console.log(chalk.cyan('\n❌ Failed Folders:'));
    result.folderResults
      .filter(fr => !fr.success)
      .forEach(fr => {
        console.log(chalk.red(`  - ${fr.folderName}: ${fr.error || 'Multiple errors'}`));
      });
  }

  console.log('');
}

export default {
  batchResendSubtitlesFromConfig
};
