#!/usr/bin/env node

/**
 * Command Line Test Script for resendSubtitles2
 * Usage: node cli-test-resendSubtitles2.js <iniPath> <folderPath> [--dry-run]
 */

import { resendSubtitles2FromIni } from './resendSubtitles2IniInterface.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(chalk.red('Error: Missing required arguments'));
    console.log(chalk.yellow('\nUsage:'));
    console.log(chalk.cyan('  node cli-test-resendSubtitles2.js <iniPath> <folderPath> [--dry-run] [--verbose]'));
    console.log(chalk.gray('\nExample:'));
    console.log(chalk.gray('  node cli-test-resendSubtitles2.js U:\\goodconfig.ini "U:\\drive-kyool2\\Programme Kyool\\SBS\\My little Old Boy\\2025\\436" --verbose'));
    process.exit(1);
  }

  const iniPath = args[0];
  const folderPath = args[1];
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  console.log(chalk.blue.bold('\n📝 Resend Subtitles V2 - Command Line Test'));
  console.log(chalk.blue.bold('='.repeat(60)));
  console.log(chalk.gray(`\nINI File:     ${iniPath}`));
  console.log(chalk.gray(`Folder:       ${folderPath}`));
  console.log(chalk.gray(`Dry Run:      ${dryRun ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`Verbose:      ${verbose ? 'Yes' : 'No'}`));
  console.log('');

  try {
    const startTime = Date.now();

    const result = await resendSubtitles2FromIni(
      iniPath,
      folderPath,
      {
        dryRun,
        verbose
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display results
    console.log(chalk.blue.bold('\n' + '='.repeat(60)));
    if (result.dryRun) {
      console.log(chalk.yellow.bold('🔍 DRY RUN COMPLETED'));
    } else if (result.success) {
      console.log(chalk.green.bold('✅ RESEND COMPLETED SUCCESSFULLY'));
    } else {
      console.log(chalk.yellow.bold('⚠️  RESEND COMPLETED WITH ERRORS'));
    }
    console.log(chalk.blue.bold('='.repeat(60)));

    // Summary
    console.log(chalk.cyan('\n📊 Summary:'));
    console.log(chalk.gray(`  Folder:               ${result.folder}`));
    console.log(chalk.gray(`  Media Description ID: ${result.mediaDescriptionId}`));
    console.log(chalk.gray(`  Total Subtitles:      ${result.totalSubtitles}`));
    console.log(chalk.green(`  Successful:           ${result.successful}`));
    if (result.failed > 0) {
      console.log(chalk.red(`  Failed:               ${result.failed}`));
    }
    if (result.skipped > 0) {
      console.log(chalk.yellow(`  Skipped:              ${result.skipped}`));
    }
    console.log(chalk.gray(`  Duration:             ${duration}s`));

    // Detailed results
    if (result.results && result.results.length > 0) {
      console.log(chalk.cyan('\n📋 Detailed Results:'));
      result.results.forEach((res, index) => {
        console.log('');
        if (res.success && !res.dryRun) {
          console.log(chalk.green(`  ✓ ${res.fileName} (${res.language})`));
          console.log(chalk.gray(`    Mux Track ID:  ${res.mux?.trackId || 'N/A'}`));
          console.log(chalk.gray(`    Mux Asset ID:  ${res.muxAssetId || 'N/A'}`));
          console.log(chalk.gray(`    S3 Key:        ${res.s3?.s3Key || 'N/A'}`));
        } else if (res.skipped) {
          console.log(chalk.yellow(`  ⊘ ${res.fileName} (${res.language}) - Skipped`));
          console.log(chalk.gray(`    Reason:        ${res.error}`));
        } else if (!res.success) {
          console.log(chalk.red(`  ✗ ${res.fileName} (${res.language})`));
          console.log(chalk.red(`    Error:         ${res.error}`));
        } else if (res.dryRun) {
          console.log(chalk.gray(`  ○ ${res.fileName} (${res.language}) [DRY RUN]`));
        }
      });
    }

    console.log('');

    // Exit code
    if (result.success || result.dryRun) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red.bold('\n❌ PROCESS FAILED'));
    console.error(chalk.red(`Error: ${error.message}`));
    if (verbose) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// Only run if executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
