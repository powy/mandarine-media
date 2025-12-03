#!/usr/bin/env node

/**
 * CLI Interface for Media Diagnostic Tool
 * Command-line interface using Commander.js
 */

import { Command } from 'commander';
import {
  verifyMediaDescriptionDirect,
  verifySeasonDirect,
  verifyBatchNonReady
} from './core.js';
import {
  verifyMediaDescriptionFromIni,
  verifySeasonFromIni,
  verifyBatchNonReadyFromIni
} from './iniInterface.js';

const program = new Command();

program
  .name('media-diagnostic')
  .description('Run diagnostics on MediaDescriptions')
  .version('1.0.0');

// Function 1: Verify single MediaDescription with direct credentials
program
  .command('verify')
  .description('Verify single MediaDescription with direct credentials')
  .requiredOption('--url <url>', 'Backend base URL')
  .requiredOption('--username <username>', 'Username')
  .requiredOption('--password <password>', 'Password')
  .requiredOption('--id <uuid>', 'MediaDescription UUID')
  .option('--verbose', 'Verbose logging')
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt, 30000)
  .action(async (options) => {
    try {
      console.log('Verifying MediaDescription...\n');

      const result = await verifyMediaDescriptionDirect({
        baseUrl: options.url,
        username: options.username,
        password: options.password,
        mediaDescriptionId: options.id,
        verbose: options.verbose || false,
        timeout: options.timeout
      });

      console.log('\nResult:');
      console.log(JSON.stringify(result, null, 2));

      if (result.is_ready) {
        console.log('\n✅ MediaDescription is ready');
        process.exit(0);
      } else {
        console.log('\n❌ MediaDescription has errors:');
        result.errors.forEach(err => console.log(`  - ${err}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Function 2: Verify single MediaDescription from INI
program
  .command('verify-ini')
  .description('Verify single MediaDescription from INI config')
  .requiredOption('-c, --config <path>', 'INI config file path')
  .requiredOption('--id <uuid>', 'MediaDescription UUID')
  .option('--verbose', 'Verbose logging')
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .action(async (options) => {
    try {
      console.log('Verifying MediaDescription from INI config...\n');

      const result = await verifyMediaDescriptionFromIni(
        options.config,
        options.id,
        {
          verbose: options.verbose,
          timeout: options.timeout
        }
      );

      console.log('\nResult:');
      console.log(JSON.stringify(result, null, 2));

      if (result.is_ready) {
        console.log('\n✅ MediaDescription is ready');
        process.exit(0);
      } else {
        console.log('\n❌ MediaDescription has errors:');
        result.errors.forEach(err => console.log(`  - ${err}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Function 3: Verify season with direct credentials
program
  .command('verify-season')
  .description('Verify season (general description + all episodes) with direct credentials')
  .requiredOption('--url <url>', 'Backend base URL')
  .requiredOption('--username <username>', 'Username')
  .requiredOption('--password <password>', 'Password')
  .requiredOption('--season-id <uuid>', 'Season UUID')
  .option('--verbose', 'Verbose logging')
  .option('--no-continue-on-error', 'Stop on first error')
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt, 30000)
  .action(async (options) => {
    try {
      console.log('Verifying Season...\n');

      const result = await verifySeasonDirect({
        baseUrl: options.url,
        username: options.username,
        password: options.password,
        seasonId: options.seasonId,
        verbose: options.verbose || false,
        continueOnError: options.continueOnError !== false,
        timeout: options.timeout
      });

      console.log('\nResult:');
      console.log(JSON.stringify(result, null, 2));

      console.log('\n📊 Summary:');
      console.log(`  Season ID: ${result.seasonId}`);
      if (result.generalResult) {
        console.log(`  General MediaDescription: ${result.generalResult.is_ready ? '✅ Ready' : '❌ Errors'}`);
      } else {
        console.log('  General MediaDescription: N/A');
      }
      console.log(`  Total Episodes: ${result.summary.totalEpisodes}`);
      console.log(`  Ready Episodes: ${result.summary.readyEpisodes}`);
      console.log(`  Episodes with Errors: ${result.summary.errorEpisodes}`);

      if (result.summary.errorEpisodes === 0 && (result.generalResult?.is_ready !== false)) {
        console.log('\n✅ Season is fully ready');
        process.exit(0);
      } else {
        console.log('\n⚠️  Season has errors');
        process.exit(1);
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Function 4: Verify season from INI
program
  .command('verify-season-ini')
  .description('Verify season from INI config')
  .requiredOption('-c, --config <path>', 'INI config file path')
  .requiredOption('--season-id <uuid>', 'Season UUID')
  .option('--verbose', 'Verbose logging')
  .option('--no-continue-on-error', 'Stop on first error')
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .action(async (options) => {
    try {
      console.log('Verifying Season from INI config...\n');

      const result = await verifySeasonFromIni(
        options.config,
        options.seasonId,
        {
          verbose: options.verbose,
          continueOnError: options.continueOnError !== false,
          timeout: options.timeout
        }
      );

      console.log('\nResult:');
      console.log(JSON.stringify(result, null, 2));

      console.log('\n📊 Summary:');
      console.log(`  Season ID: ${result.seasonId}`);
      if (result.generalResult) {
        console.log(`  General MediaDescription: ${result.generalResult.is_ready ? '✅ Ready' : '❌ Errors'}`);
      } else {
        console.log('  General MediaDescription: N/A');
      }
      console.log(`  Total Episodes: ${result.summary.totalEpisodes}`);
      console.log(`  Ready Episodes: ${result.summary.readyEpisodes}`);
      console.log(`  Episodes with Errors: ${result.summary.errorEpisodes}`);

      if (result.summary.errorEpisodes === 0 && (result.generalResult?.is_ready !== false)) {
        console.log('\n✅ Season is fully ready');
        process.exit(0);
      } else {
        console.log('\n⚠️  Season has errors');
        process.exit(1);
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Function 5: Batch verify non-ready MediaDescriptions
program
  .command('verify-batch')
  .description('Batch verify all non-ready MediaDescriptions')
  .requiredOption('--url <url>', 'Backend base URL')
  .requiredOption('--username <username>', 'Username')
  .requiredOption('--password <password>', 'Password')
  .option('--verbose', 'Verbose logging')
  .option('--no-continue-on-error', 'Stop on first error')
  .option('--limit <number>', 'Max items to process', parseInt, 1000)
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt, 30000)
  .action(async (options) => {
    try {
      console.log('Batch verifying non-ready MediaDescriptions...\n');

      const result = await verifyBatchNonReady({
        baseUrl: options.url,
        username: options.username,
        password: options.password,
        verbose: options.verbose || false,
        continueOnError: options.continueOnError !== false,
        limit: options.limit,
        timeout: options.timeout
      });

      console.log('\nResult:');
      console.log(JSON.stringify(result, null, 2));

      console.log('\n📊 Summary:');
      console.log(`  Total Non-Ready: ${result.summary.totalNonReady}`);
      console.log(`  Total Non-Ready-Pending: ${result.summary.totalNonReadyPending}`);
      console.log(`  Now Ready: ${result.summary.nowReady}`);
      console.log(`  Still Errors: ${result.summary.stillErrors}`);

      if (result.summary.stillErrors === 0) {
        console.log('\n✅ All MediaDescriptions are now ready');
        process.exit(0);
      } else {
        console.log('\n⚠️  Some MediaDescriptions still have errors');
        process.exit(1);
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Bonus: Batch verify from INI
program
  .command('verify-batch-ini')
  .description('Batch verify all non-ready MediaDescriptions from INI config')
  .requiredOption('-c, --config <path>', 'INI config file path')
  .option('--verbose', 'Verbose logging')
  .option('--no-continue-on-error', 'Stop on first error')
  .option('--limit <number>', 'Max items to process', parseInt)
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .action(async (options) => {
    try {
      console.log('Batch verifying non-ready MediaDescriptions from INI config...\n');

      const result = await verifyBatchNonReadyFromIni(
        options.config,
        {
          verbose: options.verbose,
          continueOnError: options.continueOnError !== false,
          limit: options.limit,
          timeout: options.timeout
        }
      );

      console.log('\nResult:');
      console.log(JSON.stringify(result, null, 2));

      console.log('\n📊 Summary:');
      console.log(`  Total Non-Ready: ${result.summary.totalNonReady}`);
      console.log(`  Total Non-Ready-Pending: ${result.summary.totalNonReadyPending}`);
      console.log(`  Now Ready: ${result.summary.nowReady}`);
      console.log(`  Still Errors: ${result.summary.stillErrors}`);

      if (result.summary.stillErrors === 0) {
        console.log('\n✅ All MediaDescriptions are now ready');
        process.exit(0);
      } else {
        console.log('\n⚠️  Some MediaDescriptions still have errors');
        process.exit(1);
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
