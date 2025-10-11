#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UploaderToolCLI {
  constructor(wrappers) {
    this.program = new Command();
    this.wrappers = wrappers;
    this.setupCLI();
  }

  setupCLI() {
    this.program
      .name('media-uploader')
      .description('Unified media upload tool consolidating multiple upload utilities')
      .version('1.0.0')
      .configureHelp({
        sortSubcommands: true,
      });

    // Media Analyzer Command
    this.program
      .command('analyze')
      .alias('media-analyzer')
      .description('Analyze and associate video, subtitle, and image files')
      .argument('[path]', 'Path to folder to analyze (legacy mode)')
      .option('-v, --video-path <path>', 'Path to video folder')
      .option('-s, --subtitle-path <path>', 'Path to subtitle folder')
      .option('-i, --image-path <path>', 'Path to image folder')
      .option('-o, --output <file>', 'Output JSON file')
      .option('--verbose', 'Verbose mode for more details')
      .option('--min-score <score>', 'Minimum association score (default: 60)', parseInt)
      .option('--no-metadata', 'Skip video metadata reading (faster)')
      .option('--export-for-upload', 'Export format optimized for upload')
      .action(async (legacyPath, options) => {
        try {
          const analyzeOptions = {
            path: legacyPath,
            videoPath: options.videoPath,
            subtitlePath: options.subtitlePath,
            imagePath: options.imagePath,
            output: options.output,
            verbose: options.verbose,
            minScore: options.minScore,
            noMetadata: options.noMetadata,
            exportForUpload: options.exportForUpload
          };

          console.log(chalk.blue.bold('🎬 Media Analyzer\n'));
          const result = await this.wrappers.analyzeMedia(analyzeOptions);
          
          if (!options.output) {
            console.log('\n📊 Analysis Results:');
            console.log(JSON.stringify(result, null, 2));
          }
          
          process.exit(0);
        } catch (error) {
          console.error(chalk.red(`❌ Analysis failed: ${error.message}`));
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
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
          const result = await this.wrappers.uploadToMux(options);
          
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
          const result = await this.wrappers.uploadSubtitlesToMux(options);
          
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

    // Picture Upload Command
    this.program
      .command('picture-upload')
      .alias('upload-picture')
      .description('Upload pictures to S3 and create records in the backend API')
      .requiredOption('-c, --config <path>', 'Configuration JSON file path')
      .option('-v, --verbose', 'Verbose output')
      .option('--dry-run', 'Validate configuration and check file without uploading')
      .action(async (options) => {
        try {
          console.log(chalk.blue.bold('🖼️  Picture Upload\n'));
          const result = await this.wrappers.uploadPicture(options);
          
          if (result.dryRun) {
            console.log(chalk.yellow('✓ Dry run completed successfully'));
          } else {
            console.log(chalk.green('✅ Picture uploaded successfully'));
          }
          
          process.exit(0);
        } catch (error) {
          console.error(chalk.red(`❌ Picture upload failed: ${error.message}`));
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });

    // One Media Complete Upload Command
    this.program
      .command('one-media-complete-upload')
      .alias('complete-upload')
      .description('Complete media upload workflow from configuration and folder path')
      .requiredOption('-c, --config <path>', 'Configuration JSON file path')
      .requiredOption('-f, --folder <path>', 'Folder path containing media files')
      .option('-v, --verbose', 'Verbose output')
      .option('--dry-run', 'Validate configuration and scan files without processing')
      .action(async (options) => {
        try {
          console.log(chalk.blue.bold('📦 One Media Complete Upload\n'));
          const result = await this.wrappers.oneMediaCompleteUpload(options);
          
          if (result.phase === 'template-creation') {
            console.log(chalk.yellow('\n✓ Excel template created successfully'));
            console.log(chalk.gray('Please fill the Excel file and run the command again.'));
          } else if (result.phase === 'auto-filled') {
            console.log(chalk.yellow('\n✓ Files sheet auto-filled successfully'));
            console.log(chalk.gray('Please review the Excel file and run the command again.'));
          } else if (result.phase === 'ready-for-upload') {
            console.log(chalk.yellow('\n✓ Ready for upload processing'));
            console.log(chalk.gray('Upload functionality will be implemented in the next phase.'));
          } else {
            console.log(chalk.green('\n✅ Process completed successfully'));
          }
          
          process.exit(0);
        } catch (error) {
          console.error(chalk.red(`❌ Complete upload failed: ${error.message}`));
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });

    // Upload GUI Command
    this.program
      .command('gui')
      .alias('upload-gui')
      .description('Launch graphical interface for media upload')
      .option('-c, --config <path>', 'Path to config.ini file (default: ./config.ini)')
      .option('--create-config', 'Create a sample configuration file and exit')
      .option('-v, --verbose', 'Enable verbose output')
      .action(async (options) => {
        try {
          console.log(chalk.blue.bold('🖥️  Media Upload GUI\n'));
          const { launchUploadGUI } = await import('./subtools/upload-gui/wrapper.js');
          await launchUploadGUI(options);
        } catch (error) {
          console.error(chalk.red(`❌ GUI launch failed: ${error.message}`));
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });

    // Excel Batch Editor Command
    this.program
      .command('excel-batch-update')
      .alias('batch-excel')
      .description('Update specific fields in Excel files across multiple subfolders')
      .requiredOption('-f, --folder <path>', 'Main folder containing subfolders with Excel files')
      .requiredOption('--field <name>', 'Field name to update (e.g., "policy")')
      .requiredOption('--value <value>', 'New value for the field')
      .option('-p, --pattern <pattern>', 'File pattern to match (default: "0_desc")', '0_desc')
      .option('--dry-run', 'Preview changes without modifying files')
      .option('-v, --verbose', 'Verbose output for detailed logging')
      .action(async (options) => {
        try {
          console.log(chalk.blue.bold('📊 Excel Batch Editor\n'));
          const result = await this.wrappers.batchUpdateExcel(options);

          if (result.dryRun) {
            console.log(chalk.yellow('✓ Dry run completed successfully'));
          } else if (result.success) {
            console.log(chalk.green('✅ Batch update completed successfully'));
          } else {
            console.log(chalk.red('❌ Batch update completed with errors'));
          }

          process.exit(result.success ? 0 : 1);
        } catch (error) {
          console.error(chalk.red(`❌ Excel batch update failed: ${error.message}`));
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });

    // Propagate Season Data Command
    this.program
      .command('propagate-season-data')
      .alias('propagate')
      .description('Propagate missing data from season to all episodes')
      .requiredOption('--season-id <id>', 'Season media description ID')
      .requiredOption('-c, --config <path>', 'Configuration JSON file path')
      .option('--dry-run', 'Preview changes without updating')
      .option('-v, --verbose', 'Verbose output')
      .action(async (options) => {
        try {
          console.log(chalk.blue.bold('🔄 Season Data Propagation\n'));
          const result = await this.wrappers.propagateSeasonData(options);

          if (result.dryRun) {
            console.log(chalk.yellow('✓ Dry run completed successfully'));
          } else if (result.success) {
            console.log(chalk.green('✅ Propagation completed successfully'));
            console.log(chalk.cyan(`   Updated: ${result.updated} episodes`));
            console.log(chalk.gray(`   Skipped: ${result.skipped} episodes`));
          } else {
            console.log(chalk.yellow('⚠️  Propagation completed with errors'));
            console.log(chalk.cyan(`   Updated: ${result.updated} episodes`));
            console.log(chalk.gray(`   Skipped: ${result.skipped} episodes`));
            console.log(chalk.red(`   Errors: ${result.errors.length} episodes`));
          }

          process.exit(result.success ? 0 : 1);
        } catch (error) {
          console.error(chalk.red(`❌ Propagation failed: ${error.message}`));
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });

    // CLI Multi-Upload Command
    this.program
      .command('cli-multi-upload')
      .alias('multi-upload')
      .description('Upload multiple folders with subprocess-based parallel execution and staggered starts')
      .requiredOption('-c, --config <path>', 'Path to INI configuration file')
      .option('-f, --folders <list>', 'Comma-separated list of folder paths')
      .option('--folders-file <path>', 'Text file containing folder paths (one per line)')
      .option('-p, --parent-folder <path>', 'Parent folder to scan for subfolders')
      .option('-d, --delay <seconds>', 'Delay in seconds between starting each upload', '10')
      .option('--max-concurrent <number>', 'Maximum concurrent uploads', parseInt)
      .option('-v, --verbose', 'Verbose logging', false)
      .option('--report', 'Generate detailed summary report', false)
      .action(async (options) => {
        try {
          console.log(chalk.blue.bold('📦 CLI Multi-Upload\n'));
          const result = await this.wrappers.cliMultiUpload(options);

          if (result.success && result.failedCount === 0) {
            console.log(chalk.green.bold('\n✅ All uploads completed successfully!'));
          } else if (result.success) {
            console.log(chalk.yellow.bold('\n⚠️  Uploads completed with some failures'));
          } else {
            console.log(chalk.red.bold('\n❌ Multi-upload failed'));
          }

          console.log(chalk.cyan(`   Successful: ${result.successCount}/${result.totalFolders}`));
          console.log(chalk.red(`   Failed: ${result.failedCount}/${result.totalFolders}`));
          if (result.skippedCount > 0) {
            console.log(chalk.yellow(`   Skipped: ${result.skippedCount}`));
          }

          process.exit(result.success && result.failedCount === 0 ? 0 : 1);
        } catch (error) {
          console.error(chalk.red(`❌ Multi-upload failed: ${error.message}`));
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
      console.log('  $ media-uploader analyze /path/to/media --output results.json');
      console.log('  $ media-uploader mux-upload --config video-config.json');
      console.log('  $ media-uploader upload-subtitles --config subtitle-config.json');
      console.log('  $ media-uploader upload-picture --config picture-config.json --verbose');
      console.log('  $ media-uploader complete-upload --config config.json --folder /path/to/media');
      console.log('  $ media-uploader excel-batch-update --folder /path/to/main --field policy --value "public"');
      console.log('  $ media-uploader propagate-season-data --season-id abc123 --config config.json');
      console.log('  $ media-uploader cli-multi-upload --config config.ini --parent-folder /path/to/season');
      console.log('  $ media-uploader gui --config config.ini');
      console.log('  $ media-uploader gui --create-config');
      console.log('');
      console.log(chalk.cyan('Individual Tool Help:'));
      console.log('  $ media-uploader analyze --help');
      console.log('  $ media-uploader mux-upload --help');
      console.log('  $ media-uploader upload-subtitles --help');
      console.log('  $ media-uploader upload-picture --help');
      console.log('  $ media-uploader complete-upload --help');
      console.log('  $ media-uploader excel-batch-update --help');
      console.log('  $ media-uploader propagate-season-data --help');
      console.log('  $ media-uploader cli-multi-upload --help');
      console.log('  $ media-uploader gui --help');
      console.log('');
    });
  }

  async run() {
    try {
      if (process.argv.length <= 2) {
        console.log(chalk.blue.bold('📦 Uploader Tool v1.0.0'));
        console.log(chalk.gray('Unified media upload tool consolidating multiple utilities\n'));
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
  try {
    // Import subtool wrappers
    const mediaAnalyzerPkg = await import('./subtools/media-analyzer/wrapper.mjs');
    const { uploadToMux } = await import('./subtools/mux-upload/wrapper.js');
    const { uploadSubtitlesToMux } = await import('./subtools/mux-subtitle-upload/wrapper.js');
    const { uploadPicture } = await import('./subtools/picture-upload/wrapper.js');
    const { oneMediaCompleteUpload } = await import('./subtools/one-media-complete-upload/wrapper.js');
    const { batchUpdateExcel } = await import('./subtools/excel-batch-editor/wrapper.js');
    const { propagateSeasonData } = await import('./subtools/propagate-data/wrapper.js');
    const cliMultiUploadPkg = await import('./subtools/cli-multi-upload/wrapper.js');

    const wrappers = {
      analyzeMedia: mediaAnalyzerPkg.default.analyzeMedia,
      uploadToMux,
      uploadSubtitlesToMux,
      uploadPicture,
      oneMediaCompleteUpload,
      batchUpdateExcel,
      propagateSeasonData,
      cliMultiUpload: async (options) => {
        // Handle different input methods
        if (options.parentFolder) {
          return await cliMultiUploadPkg.cliMultiUploadFromParent(options);
        } else if (options.foldersFile) {
          return await cliMultiUploadPkg.cliMultiUploadFromFile(options);
        } else if (options.folders) {
          // Parse if it's a string (comma-separated)
          if (typeof options.folders === 'string') {
            return await cliMultiUploadPkg.cliMultiUploadFromString({
              ...options,
              foldersString: options.folders
            });
          } else {
            // Array of folders
            return await cliMultiUploadPkg.cliMultiUpload(options);
          }
        } else {
          throw new Error('No folders specified. Use --folders, --folders-file, or --parent-folder');
        }
      }
    };

    // Create and run CLI
    const cli = new UploaderToolCLI(wrappers);
    await cli.run();
  } catch (error) {
    console.error(chalk.red(`❌ Failed to initialize uploader tool: ${error.message}`));
    process.exit(1);
  }
}

// Export for testing
export { UploaderToolCLI };

// Main execution - handle Windows path separators
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  main();
}

