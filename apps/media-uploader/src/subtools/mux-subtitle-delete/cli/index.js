#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { deleteFromAssetId } from '../core/deleteFromAssetId.js';
import { deleteFromVideoFileId } from '../core/deleteFromVideoFileId.js';
import { deleteFromMediaDescriptionId } from '../core/deleteFromMediaDescriptionId.js';
import { deleteWithIniConfig } from '../core/deleteWithIniConfig.js';

/**
 * CLI for deleting subtitle tracks from Mux assets
 */
class MuxSubtitleDeleteCLI {
  constructor() {
    this.program = new Command();
  }

  setupCLI() {
    this.program
      .name('mux-subtitle-delete')
      .description('Delete subtitle tracks from Mux assets by language code')
      .version('1.0.0');

    // Command: Delete from Mux asset ID
    this.program
      .command('from-asset')
      .description('Delete subtitle track from Mux asset ID')
      .requiredOption('-a, --asset-id <assetId>', 'Mux asset ID')
      .requiredOption('-l, --language <code>', 'Language code (e.g., en, fr, es)')
      .requiredOption('--mux-token-id <tokenId>', 'Mux API token ID')
      .requiredOption('--mux-token-secret <tokenSecret>', 'Mux API token secret')
      .option('--dry-run', 'Simulate deletion without actually deleting')
      .action(async (options) => {
        await this.handleFromAsset(options);
      });

    // Command: Delete from video file ID
    this.program
      .command('from-video-file')
      .description('Delete subtitle track from video file ID')
      .requiredOption('-v, --video-file-id <videoFileId>', 'Video file UUID')
      .requiredOption('-l, --language <code>', 'Language code (e.g., en, fr, es)')
      .requiredOption('--backend-url <url>', 'Backend base URL')
      .requiredOption('--backend-username <username>', 'Backend username')
      .requiredOption('--backend-password <password>', 'Backend password')
      .requiredOption('--mux-token-id <tokenId>', 'Mux API token ID')
      .requiredOption('--mux-token-secret <tokenSecret>', 'Mux API token secret')
      .option('--dry-run', 'Simulate deletion without actually deleting')
      .action(async (options) => {
        await this.handleFromVideoFile(options);
      });

    // Command: Delete from media description ID
    this.program
      .command('from-media-description')
      .description('Delete subtitle track from media description ID')
      .requiredOption('-m, --media-description-id <mediaDescriptionId>', 'Media description UUID')
      .requiredOption('-l, --language <code>', 'Language code (e.g., en, fr, es)')
      .requiredOption('--backend-url <url>', 'Backend base URL')
      .requiredOption('--backend-username <username>', 'Backend username')
      .requiredOption('--backend-password <password>', 'Backend password')
      .requiredOption('--mux-token-id <tokenId>', 'Mux API token ID')
      .requiredOption('--mux-token-secret <tokenSecret>', 'Mux API token secret')
      .option('--dry-run', 'Simulate deletion without actually deleting')
      .action(async (options) => {
        await this.handleFromMediaDescription(options);
      });

    // Command: Delete using INI configuration
    this.program
      .command('from-ini')
      .description('Delete subtitle track using INI configuration file')
      .requiredOption('-i, --ini <path>', 'Path to INI configuration file')
      .requiredOption('-m, --media-description-id <mediaDescriptionId>', 'Media description UUID')
      .requiredOption('-l, --language <code>', 'Language code (e.g., en, fr, es)')
      .option('--dry-run', 'Simulate deletion without actually deleting')
      .action(async (options) => {
        await this.handleFromIni(options);
      });

    return this.program;
  }

  async handleFromAsset(options) {
    const spinner = ora('Deleting subtitle track...').start();

    try {
      const result = await deleteFromAssetId({
        muxAssetId: options.assetId,
        language: options.language,
        muxTokenId: options.muxTokenId,
        muxTokenSecret: options.muxTokenSecret,
        dryRun: options.dryRun || false,
        logger: {
          info: (msg) => {
            spinner.stop();
            console.log(msg);
            spinner.start();
          },
          warn: (msg) => {
            spinner.stop();
            console.warn(chalk.yellow(msg));
            spinner.start();
          },
          error: (msg) => {
            spinner.stop();
            console.error(chalk.red(msg));
            spinner.start();
          }
        }
      });

      spinner.succeed('Subtitle deletion completed');
      this.displayResult(result);
    } catch (error) {
      spinner.fail('Subtitle deletion failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  }

  async handleFromVideoFile(options) {
    const spinner = ora('Deleting subtitle track...').start();

    try {
      const result = await deleteFromVideoFileId({
        videoFileId: options.videoFileId,
        language: options.language,
        backendUrl: options.backendUrl,
        backendUsername: options.backendUsername,
        backendPassword: options.backendPassword,
        muxTokenId: options.muxTokenId,
        muxTokenSecret: options.muxTokenSecret,
        dryRun: options.dryRun || false,
        logger: {
          info: (msg) => {
            spinner.stop();
            console.log(msg);
            spinner.start();
          },
          warn: (msg) => {
            spinner.stop();
            console.warn(chalk.yellow(msg));
            spinner.start();
          },
          error: (msg) => {
            spinner.stop();
            console.error(chalk.red(msg));
            spinner.start();
          }
        }
      });

      spinner.succeed('Subtitle deletion completed');
      this.displayResult(result);
    } catch (error) {
      spinner.fail('Subtitle deletion failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  }

  async handleFromMediaDescription(options) {
    const spinner = ora('Deleting subtitle track...').start();

    try {
      const result = await deleteFromMediaDescriptionId({
        mediaDescriptionId: options.mediaDescriptionId,
        language: options.language,
        backendUrl: options.backendUrl,
        backendUsername: options.backendUsername,
        backendPassword: options.backendPassword,
        muxTokenId: options.muxTokenId,
        muxTokenSecret: options.muxTokenSecret,
        dryRun: options.dryRun || false,
        logger: {
          info: (msg) => {
            spinner.stop();
            console.log(msg);
            spinner.start();
          },
          warn: (msg) => {
            spinner.stop();
            console.warn(chalk.yellow(msg));
            spinner.start();
          },
          error: (msg) => {
            spinner.stop();
            console.error(chalk.red(msg));
            spinner.start();
          }
        }
      });

      spinner.succeed('Subtitle deletion completed');
      this.displayResult(result);
    } catch (error) {
      spinner.fail('Subtitle deletion failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  }

  async handleFromIni(options) {
    const spinner = ora('Deleting subtitle track...').start();

    try {
      const result = await deleteWithIniConfig({
        mediaDescriptionId: options.mediaDescriptionId,
        language: options.language,
        iniFilePath: options.ini,
        dryRun: options.dryRun || false,
        logger: {
          info: (msg) => {
            spinner.stop();
            console.log(msg);
            spinner.start();
          },
          warn: (msg) => {
            spinner.stop();
            console.warn(chalk.yellow(msg));
            spinner.start();
          },
          error: (msg) => {
            spinner.stop();
            console.error(chalk.red(msg));
            spinner.start();
          }
        }
      });

      spinner.succeed('Subtitle deletion completed');
      this.displayResult(result);
    } catch (error) {
      spinner.fail('Subtitle deletion failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  }

  displayResult(result) {
    console.log('');
    console.log(chalk.blue('=== Deletion Summary ==='));
    console.log(`Tracks deleted: ${result.tracksDeleted}`);

    if (result.tracks && result.tracks.length > 0) {
      console.log('');
      console.log(chalk.green('Deleted tracks:'));
      result.tracks.forEach(track => {
        console.log(`  - Track ID: ${track.trackId}`);
        console.log(`    Language: ${track.languageCode}`);
        console.log(`    Name: ${track.name || 'N/A'}`);
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.log('');
      console.log(chalk.red('Errors:'));
      result.errors.forEach(error => {
        console.log(`  - Track ${error.trackId}: ${error.error}`);
      });
    }

    if (result.dryRun) {
      console.log('');
      console.log(chalk.yellow('[DRY RUN] No actual deletions were performed'));
    }
  }

  async run() {
    try {
      this.setupCLI();
      await this.program.parseAsync(process.argv);
    } catch (error) {
      console.error(chalk.red(`Fatal error: ${error.message}`));
      process.exit(1);
    }
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new MuxSubtitleDeleteCLI();
  cli.run();
}

export default MuxSubtitleDeleteCLI;
