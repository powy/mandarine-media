/**
 * Batch Picture Upload Wrapper
 * JSON config file wrapper for batch picture upload
 */

import { batchPictureUploadCore } from './core.js';
import { loadConfigFile } from '../picture-upload/utils/fileUtils.js';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';
import chalk from 'chalk';

/**
 * Batch picture upload from JSON config file
 * @param {Object} options - Upload options
 * @param {string} options.config - JSON configuration file path
 * @param {boolean} [options.verbose] - Verbose output
 * @param {boolean} [options.dryRun] - Dry run mode
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Upload results
 */
export async function batchPictureUpload(options) {
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
    console.log(chalk.blue.bold('🖼️  Batch Picture Upload Tool v1.0.0'));
    console.log(chalk.blue.bold('========================================\n'));

    // Load and validate configuration
    console.log(chalk.gray(`📄 Loading configuration from: ${options.config}`));

    const config = await loadConfigFile(options.config);

    console.log(chalk.green('✅ Configuration loaded successfully\n'));

    if (options.verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Picture: ${config.picturePath}`));
      console.log(chalk.gray(`  Parent Folder: ${config.parentFolderPath}`));
      console.log(chalk.gray(`  S3 Bucket: ${config.s3?.bucket}`));
      console.log(chalk.gray(`  API: ${config.api?.baseUrl}`));
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
      console.log(chalk.yellow('⚠️  DRY RUN MODE - No associations will be made\n'));
    }

    // Execute batch upload
    console.log(chalk.cyan('🚀 Starting batch picture upload...\n'));

    const result = await batchPictureUploadCore(mergedConfig);

    // Display results
    displayResults(result, mergedConfig);

    return result;

  } catch (error) {
    console.error(chalk.red(`\n❌ Batch picture upload failed: ${error.message}`));
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
 * Display upload results
 * @private
 */
function displayResults(result, config) {
  console.log(chalk.bold('\n' + '='.repeat(60)));

  if (result.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN COMPLETED'));
    console.log(chalk.gray('Picture uploaded but no associations made'));
  } else if (result.success) {
    console.log(chalk.green.bold('✅ BATCH PICTURE UPLOAD COMPLETED'));
  } else {
    console.log(chalk.red.bold('❌ BATCH PICTURE UPLOAD FAILED'));
  }

  console.log(chalk.bold('='.repeat(60)));

  // Phase 1 results
  if (result.results?.phase1) {
    console.log(chalk.cyan('\n📤 Phase 1: Initial Upload'));
    console.log(chalk.green(`  ✓ Picture uploaded successfully`));
    console.log(chalk.gray(`  Picture ID: ${result.metadata.pictureId}`));
    console.log(chalk.gray(`  Format: ${result.metadata.format?.displayFormat}`));
    console.log(chalk.gray(`  Field: ${result.metadata.format?.mediaDescriptionField}`));
  }

  // Phase 2 results
  if (result.results?.phase2 && !result.dryRun) {
    console.log(chalk.cyan('\n🔗 Phase 2: Batch Association'));
    console.log(chalk.gray(`  Total subfolders: ${result.metadata.totalSubfolders}`));
    console.log(chalk.green(`  Successful: ${result.metadata.associationsSuccess}`));

    if (result.metadata.associationsFailure > 0) {
      console.log(chalk.red(`  Failed: ${result.metadata.associationsFailure}`));

      if (config.verbose && result.results.phase2.failures.length > 0) {
        console.log(chalk.red('\n  Failed associations:'));
        result.results.phase2.failures.forEach(failure => {
          console.log(chalk.red(`    • ${failure.folderName}: ${failure.error}`));
        });
      }
    }
  }

  console.log('');
}

export default {
  batchPictureUpload
};
