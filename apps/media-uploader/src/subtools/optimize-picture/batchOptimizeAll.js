#!/usr/bin/env node

/**
 * Batch Optimize All Media Descriptions
 *
 * This script fetches all media descriptions from the backend and optimizes
 * their pictures (creates WebP variants). Pictures that are already optimized
 * are automatically skipped.
 *
 * Usage:
 *   node batchOptimizeAll.js --config U:/newconfig.ini --verbose
 *   node batchOptimizeAll.js --config U:/newconfig.ini --dry-run
 *   node batchOptimizeAll.js --config U:/newconfig.ini --limit 10
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';
import { optimizeMediaDescriptionPicturesWithIni } from './iniWrapper.js';
import axios from 'axios';

/**
 * Authenticate with backend API and get JWT token
 * @param {Object} apiConfig - API configuration
 * @returns {Promise<string>} - JWT token
 */
async function authenticate(apiConfig) {
  const formData = new URLSearchParams();
  formData.append('username', apiConfig.username);
  formData.append('password', apiConfig.password);

  const response = await axios.post(`${apiConfig.baseUrl}/api/v1/auth/login`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return response.data.access_token;
}

/**
 * Fetch all media descriptions with pagination
 * @param {string} baseUrl - Backend base URL
 * @param {string} token - JWT token
 * @param {number} maxLimit - Maximum number to fetch (for testing)
 * @returns {Promise<Array>} - Array of all media descriptions
 */
async function fetchAllMediaDescriptions(baseUrl, token, maxLimit = null) {
  const allMediaDescriptions = [];
  let skip = 0;
  const limit = 100; // Maximum allowed by API

  console.log(chalk.blue('📥 Fetching media descriptions from backend...'));

  while (true) {
    const response = await axios.get(`${baseUrl}/api/v1/media-descriptions`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { skip, limit }
    });

    const mediaDescBatch = Array.isArray(response.data)
      ? response.data
      : (response.data.data || response.data);

    allMediaDescriptions.push(...mediaDescBatch);

    console.log(chalk.gray(`  Fetched ${allMediaDescriptions.length} media descriptions...`));

    // Check if we've reached the limit
    if (maxLimit && allMediaDescriptions.length >= maxLimit) {
      console.log(chalk.yellow(`  Reached limit of ${maxLimit} media descriptions`));
      return allMediaDescriptions.slice(0, maxLimit);
    }

    // Stop if we got fewer items than the limit (last page)
    if (mediaDescBatch.length < limit) {
      break;
    }

    skip += limit;

    // Safety limit to prevent infinite loops
    if (skip > 50000) {
      console.log(chalk.yellow('  ⚠️  Reached safety limit of 50,000 media descriptions'));
      break;
    }
  }

  console.log(chalk.green(`✅ Fetched ${allMediaDescriptions.length} media descriptions total\n`));
  return allMediaDescriptions;
}

/**
 * Main batch optimization function
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Results summary
 */
async function batchOptimizeAllMediaDescriptions(iniFilePath, options = {}) {
  const { verbose = false, dryRun = false, limit = null } = options;
  const startTime = Date.now();

  // Results tracking
  const results = {
    success: true,
    totalMediaDescriptions: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    picturesProcessed: 0,
    picturesSkipped: 0,
    details: {
      processedList: [],
      skippedList: [],
      errorList: []
    }
  };

  try {
    console.log(chalk.blue.bold('🖼️  Batch Optimize All Media Descriptions'));
    console.log(chalk.blue.bold('==========================================\n'));

    // Load INI configuration
    console.log(`📄 Loading configuration from: ${iniFilePath}`);
    const iniConfig = await readIniFile(iniFilePath);
    const standardConfig = iniToStandardConfig(iniConfig);
    console.log(chalk.green('✅ Configuration loaded\n'));

    if (dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN MODE - No actual processing will occur\n'));
    }

    // Authenticate with backend
    console.log('🔐 Authenticating with backend...');
    const token = await authenticate(standardConfig.backend);
    console.log(chalk.green('✅ Authenticated\n'));

    // Fetch all media descriptions
    const mediaDescriptions = await fetchAllMediaDescriptions(
      standardConfig.backend.baseUrl,
      token,
      limit
    );

    results.totalMediaDescriptions = mediaDescriptions.length;

    if (mediaDescriptions.length === 0) {
      console.log(chalk.yellow('⚠️  No media descriptions found'));
      return results;
    }

    // Process each media description sequentially
    console.log(chalk.blue.bold(`🔄 Processing ${mediaDescriptions.length} media descriptions...\n`));

    for (let i = 0; i < mediaDescriptions.length; i++) {
      const mediaDesc = mediaDescriptions[i];
      const progress = `[${i + 1}/${mediaDescriptions.length}]`;

      console.log(chalk.cyan(`${progress} Processing: ${mediaDesc.episode_title || mediaDesc.id}`));

      try {
        const result = await optimizeMediaDescriptionPicturesWithIni(
          mediaDesc.id,
          iniFilePath,
          { verbose, dryRun }
        );

        // Track results
        if (result.processed && result.processed.length > 0) {
          results.processed++;
          results.picturesProcessed += result.processed.length;
          results.details.processedList.push({
            mediaDescriptionId: mediaDesc.id,
            title: mediaDesc.episode_title,
            picturesProcessed: result.processed.length
          });
          console.log(chalk.green(`  ✅ Processed ${result.processed.length} picture(s)`));
        }

        if (result.skipped && result.skipped.length > 0) {
          results.picturesSkipped += result.skipped.length;
          console.log(chalk.gray(`  ⏭️  Skipped ${result.skipped.length} picture(s)`));
        }

        if (result.warnings && result.warnings.length > 0) {
          console.log(chalk.yellow(`  ⚠️  ${result.warnings.length} warning(s)`));
        }

        if (result.errors && result.errors.length > 0) {
          results.errors++;
          results.details.errorList.push({
            mediaDescriptionId: mediaDesc.id,
            title: mediaDesc.episode_title,
            errors: result.errors
          });
          console.log(chalk.red(`  ❌ ${result.errors.length} error(s)`));
        }

        // Check if nothing was processed (all skipped or no pictures)
        if ((!result.processed || result.processed.length === 0) &&
            (!result.errors || result.errors.length === 0)) {
          results.skipped++;
          results.details.skippedList.push({
            mediaDescriptionId: mediaDesc.id,
            title: mediaDesc.episode_title,
            reason: 'No pictures to process or all already optimized'
          });
        }

      } catch (error) {
        results.errors++;
        results.details.errorList.push({
          mediaDescriptionId: mediaDesc.id,
          title: mediaDesc.episode_title,
          error: error.message
        });
        console.log(chalk.red(`  ❌ Error: ${error.message}`));

        if (verbose) {
          console.log(chalk.red(`  ${error.stack}`));
        }
      }

      console.log(''); // Empty line for readability
    }

    // Calculate duration
    const duration = Date.now() - startTime;
    const durationSeconds = Math.round(duration / 1000);
    const durationMinutes = Math.floor(durationSeconds / 60);
    const remainderSeconds = durationSeconds % 60;

    // Final summary
    console.log(chalk.blue.bold('=========================================='));
    console.log(chalk.blue.bold('📊 Batch Optimization Summary'));
    console.log(chalk.blue.bold('=========================================='));
    console.log(`Total media descriptions: ${chalk.bold(results.totalMediaDescriptions)}`);
    console.log(`Media descriptions with processed pictures: ${chalk.green(results.processed)}`);
    console.log(`Media descriptions skipped: ${chalk.gray(results.skipped)}`);
    console.log(`Media descriptions with errors: ${chalk.red(results.errors)}`);
    console.log('');
    console.log(`Total pictures processed: ${chalk.green(results.picturesProcessed)}`);
    console.log(`Total pictures skipped: ${chalk.gray(results.picturesSkipped)}`);
    console.log('');
    console.log(`Duration: ${durationMinutes}m ${remainderSeconds}s`);
    console.log('');

    if (dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN COMPLETED - No actual changes were made\n'));
    } else if (results.errors > 0) {
      console.log(chalk.yellow('⚠️  COMPLETED WITH ERRORS\n'));
      results.success = false;
    } else {
      console.log(chalk.green('✅ BATCH OPTIMIZATION COMPLETED SUCCESSFULLY\n'));
    }

    return results;

  } catch (error) {
    console.error(chalk.red(`\n❌ Batch optimization failed: ${error.message}`));
    if (verbose) {
      console.error(chalk.red(error.stack));
    }
    results.success = false;
    throw error;
  }
}

// CLI Interface
const program = new Command();

program
  .name('batch-optimize-all')
  .description('Batch optimize pictures for all media descriptions')
  .requiredOption('-c, --config <path>', 'INI configuration file path')
  .option('-v, --verbose', 'Verbose output')
  .option('--dry-run', 'Preview without processing')
  .option('--limit <number>', 'Limit number of media descriptions (for testing)', parseInt)
  .action(async (options) => {
    try {
      const result = await batchOptimizeAllMediaDescriptions(options.config, {
        verbose: options.verbose,
        dryRun: options.dryRun,
        limit: options.limit
      });

      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(chalk.red(`\n❌ Fatal error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();

export { batchOptimizeAllMediaDescriptions };
