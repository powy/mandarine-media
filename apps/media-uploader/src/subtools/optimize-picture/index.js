#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { optimizePicture, optimizeMediaDescriptionPictures } from './wrapper.js';

const program = new Command();

program
  .name('optimize-picture')
  .description('Optimize pictures by creating WebP variants (large and small)')
  .version('1.0.0');

program
  .requiredOption('-c, --config <path>', 'Configuration JSON file path')
  .option('-p, --picture-id <uuid>', 'Single picture ID to optimize')
  .option('-r, --resolution <format>', 'Resolution format (e.g., 1920x1080)')
  .option('-m, --media-description-id <uuid>', 'Media description ID to optimize all pictures')
  .option('-v, --verbose', 'Verbose output')
  .option('--dry-run', 'Validate without processing')
  .action(async (options) => {
    try {
      // Determine which mode to run
      if (options.mediaDescriptionId) {
        // Batch mode: optimize all pictures of a media description
        const result = await optimizeMediaDescriptionPictures({
          config: options.config,
          mediaDescriptionId: options.mediaDescriptionId,
          verbose: options.verbose,
          dryRun: options.dryRun
        });

        if (options.dryRun) {
          console.log(chalk.yellow('\n✓ Dry run completed'));
        } else if (result.success && result.errors.length === 0) {
          console.log(chalk.green('\n✅ All pictures optimized successfully'));
        } else if (result.errors.length > 0) {
          console.log(chalk.red('\n❌ Completed with errors'));
          process.exit(1);
        }
      } else if (options.pictureId && options.resolution) {
        // Single picture mode
        const result = await optimizePicture({
          config: options.config,
          pictureId: options.pictureId,
          resolution: options.resolution,
          verbose: options.verbose,
          dryRun: options.dryRun
        });

        if (result.dryRun) {
          console.log(chalk.yellow('\n✓ Dry run completed'));
        } else if (result.skipped) {
          console.log(chalk.yellow(`\n⚠️  Skipped: ${result.reason}`));
        } else {
          console.log(chalk.green('\n✅ Picture optimized successfully'));
        }
      } else {
        // Check config for mode
        const result = await (async () => {
          // Try to load config to determine mode
          const fs = await import('fs-extra');
          const config = JSON.parse(await fs.default.readFile(options.config, 'utf-8'));

          if (config.mediaDescriptionId) {
            return await optimizeMediaDescriptionPictures({
              config: options.config,
              verbose: options.verbose,
              dryRun: options.dryRun
            });
          } else if (config.pictureId && config.resolution) {
            return await optimizePicture({
              config: options.config,
              verbose: options.verbose,
              dryRun: options.dryRun
            });
          } else {
            throw new Error('Config must specify either (pictureId + resolution) or mediaDescriptionId');
          }
        })();

        if (result.dryRun) {
          console.log(chalk.yellow('\n✓ Dry run completed'));
        } else if (result.success) {
          console.log(chalk.green('\n✅ Optimization completed'));
        }
      }

      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();
