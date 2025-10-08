/**
 * Subtitle-Specific Upload Wrapper
 * JSON config file wrapper for subtitle-specific upload
 */

import { subtitleSpecificUploadCore } from './core.js';
import { loadConfigFile } from '../picture-upload/utils/fileUtils.js';
import chalk from 'chalk';

/**
 * Subtitle-specific upload from JSON config file
 * @param {Object} options - Upload options
 * @param {string} options.config - JSON configuration file path
 * @param {boolean} [options.verbose] - Verbose output
 * @param {boolean} [options.dryRun] - Dry run mode
 * @returns {Promise<Object>} Upload results
 */
export async function uploadSubtitleSpecific(options) {
  try {
    console.log(chalk.blue.bold('📝 Subtitle-Specific Upload Tool v1.0.0'));
    console.log(chalk.blue.bold('==========================================\n'));

    // Load and validate configuration
    console.log(chalk.gray(`📄 Loading configuration from: ${options.config}`));

    const config = await loadConfigFile(options.config);

    console.log(chalk.green('✅ Configuration loaded successfully\n'));

    if (options.verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Subtitle: ${config.subtitlePath}`));
      console.log(chalk.gray(`  Language: ${config.language || 'auto-detect'}`));
      console.log(chalk.gray(`  Media ID: ${config.mediaDescriptionId || 'auto-lookup'}`));
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

    // Execute subtitle upload
    console.log(chalk.cyan('🚀 Starting subtitle upload...\n'));

    const result = await subtitleSpecificUploadCore(mergedConfig);

    // Display results
    displayResults(result, mergedConfig);

    return result;

  } catch (error) {
    console.error(chalk.red(`\n❌ Subtitle upload failed: ${error.message}`));
    if (options.verbose) {
      console.error(chalk.gray(error.stack));
    }
    throw error;
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
    console.log(chalk.gray('No upload performed'));
  } else if (result.success) {
    console.log(chalk.green.bold('✅ SUBTITLE UPLOAD COMPLETED'));
  } else {
    console.log(chalk.red.bold('❌ SUBTITLE UPLOAD FAILED'));
  }

  console.log(chalk.bold('='.repeat(60)));

  if (result.success && !result.dryRun) {
    console.log(chalk.cyan('\n📋 Upload Details:'));
    console.log(chalk.gray(`  Subtitle File: ${result.subtitlePath}`));
    console.log(chalk.gray(`  Language: ${result.languageDisplayName} (${result.language})`));
    console.log(chalk.gray(`  Media Description ID: ${result.mediaDescriptionId}`));
    console.log(chalk.gray(`  Mux Asset ID: ${result.assetId}`));

    console.log(chalk.cyan('\n☁️  S3 Upload:'));
    console.log(chalk.green(`  ✓ S3 URL: ${result.s3.s3Url}`));
    console.log(chalk.gray(`  S3 Key: ${result.s3.s3Key}`));

    console.log(chalk.cyan('\n🎬 Mux Integration:'));
    console.log(chalk.green(`  ✓ Track ID: ${result.mux.trackId}`));
    console.log(chalk.gray(`  Asset ID: ${result.mux.assetId}`));

    console.log(chalk.cyan('\n💾 Backend Update:'));
    console.log(chalk.green(`  ✓ Backend updated successfully`));
    if (result.backend.fallback) {
      console.log(chalk.yellow(`  ⚠ Used fallback endpoint`));
    }
  } else if (result.dryRun) {
    console.log(chalk.cyan('\n📋 Dry Run Details:'));
    console.log(chalk.gray(`  Subtitle File: ${result.subtitlePath}`));
    console.log(chalk.gray(`  Language: ${result.language}`));
    console.log(chalk.gray(`  Media Description ID: ${result.mediaDescriptionId}`));
    console.log(chalk.yellow('\n  Would upload to S3 and add to Mux asset'));
  }

  console.log('');
}

export default {
  uploadSubtitleSpecific
};
