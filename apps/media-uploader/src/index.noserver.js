#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UploaderToolNoServerCLI {
  constructor(wrappers) {
    this.program = new Command();
    this.wrappers = wrappers;
    this.setupCLI();
  }

  setupCLI() {
    this.program
      .name('media-uploader-noserver')
      .description('Mux-only media uploader (no backend server required)')
      .version('1.0.0')
      .configureHelp({
        sortSubcommands: true,
      });

    // Mux Video Upload Command
    this.program
      .command('mux-upload')
      .alias('upload-video')
      .description('Upload video files to Mux')
      .requiredOption('-c, --config <path>', 'Configuration JSON file path')
      .option('-d, --debug', 'Enable debug logging')
      .option('-t, --timeout <seconds>', 'Upload timeout in seconds', parseInt, 3600)
      .option('-r, --retry <count>', 'Number of retry attempts', parseInt, 3)
      .option('--dry-run', 'Validate configuration without uploading')
      .option('--progress', 'Show upload progress bar', true)
      .option('--no-progress', 'Disable upload progress bar')
      .option('-v, --verbose', 'Verbose output')
      .option('-q, --quiet', 'Quiet mode (errors only)')
      .action(async (options) => {
        try {
          console.log(chalk.blue.bold('🎬 Mux Video Upload\n'));
          const result = await this.wrappers.uploadToMux({ ...options, noServer: true });

          if (result.dryRun) {
            console.log(chalk.yellow('✓ Dry run completed successfully'));
          } else {
            console.log(chalk.green('✅ Upload completed successfully'));
          }

          process.exit(0);
        } catch (error) {
          console.error(chalk.red(`❌ Upload failed: ${error.message}`));
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });

    // Mux Subtitle Upload Command
    this.program
      .command('mux-subtitle-upload')
      .alias('upload-subtitles')
      .description('Upload subtitle files to existing Mux assets via S3')
      .requiredOption('-c, --config <path>', 'Configuration JSON file path')
      .option('-d, --debug', 'Enable debug logging')
      .option('-r, --retry <count>', 'Number of retry attempts', parseInt, 3)
      .option('--dry-run', 'Validate configuration without uploading')
      .option('-v, --verbose', 'Verbose output')
      .option('-q, --quiet', 'Quiet mode (errors only)')
      .option('--no-cleanup', 'Skip S3 file cleanup after upload')
      .option('--cleanup-delay <minutes>', 'S3 cleanup delay in minutes', parseInt, 120)
      .action(async (options) => {
        try {
          console.log(chalk.blue.bold('📝 Mux Subtitle Upload\n'));
          const result = await this.wrappers.uploadSubtitlesToMux({ ...options, noServer: true });

          if (result.dryRun) {
            console.log(chalk.yellow('✓ Dry run completed successfully'));
          } else {
            console.log(chalk.green(`✅ Upload completed: ${result.successCount}/${result.totalProcessed} successful`));
          }

          process.exit(result.success ? 0 : 1);
        } catch (error) {
          console.error(chalk.red(`❌ Subtitle upload failed: ${error.message}`));
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });

    // Global help enhancement
    this.program.on('--help', () => {
      console.log('');
      console.log(chalk.yellow('Examples:'));
      console.log('  $ media-uploader-noserver mux-upload --config config-mux-only.json');
      console.log('  $ media-uploader-noserver mux-upload --config config.json --dry-run');
      console.log('  $ media-uploader-noserver mux-subtitle-upload --config subtitle-config.json');
      console.log('');
      console.log(chalk.cyan('Notes:'));
      console.log('  Backend credentials in config files are silently ignored.');
      console.log('  Subtitle upload requires mux_asset_id to be set directly in config.');
      console.log('');
    });
  }

  async run() {
    try {
      if (process.argv.length <= 2) {
        console.log(chalk.blue.bold('📦 Mux-Only Uploader v1.0.0'));
        console.log(chalk.gray('Mux-only media uploader (no backend server required)\n'));
        this.program.help();
        return;
      }

      await this.program.parseAsync();
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  }
}

// Main execution with dynamic imports
async function main() {
  // Print no-server mode notice
  console.log(chalk.yellow('[No-Server Mode] Backend access is disabled.'));

  try {
    const { uploadToMux } = await import('./subtools/mux-upload/wrapper.js');
    const { uploadSubtitlesToMux } = await import('./subtools/mux-subtitle-upload/wrapper.js');

    const wrappers = {
      uploadToMux,
      uploadSubtitlesToMux
    };

    const cli = new UploaderToolNoServerCLI(wrappers);
    await cli.run();
  } catch (error) {
    console.error(chalk.red(`❌ Failed to initialize uploader tool: ${error.message}`));
    process.exit(1);
  }
}

// Export for testing
export { UploaderToolNoServerCLI };

// Main execution - handle Windows path separators
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  main();
}
