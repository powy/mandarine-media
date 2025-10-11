#!/usr/bin/env node

/**
 * CLI Multi-Upload Tool
 * Command-line interface for multi-folder uploads with subprocess execution
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { multiUploadFromList, multiUploadFromParent } from './multiUpload.js';
import {
  parseFoldersFromFile,
  parseFoldersFromString,
  resolveFolderPaths,
  createSummaryReport
} from './utils.js';
import { pathToFileURL } from 'url';

/**
 * CLI Multi-Upload Command Handler
 */
export class CliMultiUploadCommand {
  constructor() {
    this.program = new Command();
    this.setupCLI();
  }

  setupCLI() {
    this.program
      .name('cli-multi-upload')
      .description('Upload multiple folders with subprocess-based parallel execution and staggered starts')
      .version('1.0.0');

    // Main command with various input methods
    this.program
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
          await this.execute(options);
        } catch (error) {
          console.error(chalk.red(`\n❌ Error: ${error.message}`));
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });

    // Help examples
    this.program.on('--help', () => {
      console.log('');
      console.log(chalk.yellow('Examples:'));
      console.log('');
      console.log('  Upload specific folders (comma-separated):');
      console.log('    $ cli-multi-upload -c config.ini -f "/path/folder1,/path/folder2,/path/folder3"');
      console.log('');
      console.log('  Upload folders from text file:');
      console.log('    $ cli-multi-upload -c config.ini --folders-file folders.txt');
      console.log('');
      console.log('  Upload all subfolders in a parent folder:');
      console.log('    $ cli-multi-upload -c config.ini -p /path/to/season/folder');
      console.log('');
      console.log('  Custom delay and max concurrent:');
      console.log('    $ cli-multi-upload -c config.ini -p /path/to/folder -d 15 --max-concurrent 3');
      console.log('');
      console.log('  Verbose mode with report:');
      console.log('    $ cli-multi-upload -c config.ini -p /path/to/folder -v --report');
      console.log('');
      console.log(chalk.cyan('Folders File Format (folders.txt):'));
      console.log('  /path/to/folder1');
      console.log('  /path/to/folder2');
      console.log('  /path/to/folder3');
      console.log('  # Comments start with #');
      console.log('');
    });
  }

  async execute(options) {
    console.log(chalk.blue.bold('📦 CLI Multi-Upload Tool\n'));

    // Validate input options
    const inputMethods = [
      options.folders,
      options.foldersFile,
      options.parentFolder
    ].filter(Boolean).length;

    if (inputMethods === 0) {
      throw new Error(
        'No folders specified. Use one of: --folders, --folders-file, or --parent-folder'
      );
    }

    if (inputMethods > 1) {
      throw new Error(
        'Only one input method allowed: --folders, --folders-file, or --parent-folder'
      );
    }

    // Parse delay
    const delay = parseInt(options.delay);
    if (isNaN(delay) || delay < 0) {
      throw new Error('Invalid delay value. Must be a positive number.');
    }

    // Build upload options
    const uploadOptions = {
      delay,
      verbose: options.verbose,
      maxConcurrent: options.maxConcurrent || null
    };

    let result;

    // Execute based on input method
    if (options.parentFolder) {
      // Parent folder mode: scan for subfolders
      console.log(chalk.cyan('📂 Mode: Scanning parent folder for subfolders\n'));
      result = await multiUploadFromParent(
        options.config,
        options.parentFolder,
        uploadOptions
      );
    } else {
      // List mode: explicit folder list
      let folderPaths;

      if (options.foldersFile) {
        console.log(chalk.cyan('📄 Mode: Loading folders from file\n'));
        folderPaths = await parseFoldersFromFile(options.foldersFile);
        console.log(chalk.gray(`Loaded ${folderPaths.length} folder paths from file\n`));
      } else if (options.folders) {
        console.log(chalk.cyan('📝 Mode: Using provided folder list\n'));
        folderPaths = parseFoldersFromString(options.folders);
      }

      // Resolve to absolute paths
      folderPaths = resolveFolderPaths(folderPaths);

      result = await multiUploadFromList(
        options.config,
        folderPaths,
        uploadOptions
      );
    }

    // Print results
    console.log('');
    if (result.success) {
      console.log(chalk.green.bold('✅ Multi-upload completed successfully!'));
    } else {
      console.log(chalk.red.bold('❌ Multi-upload completed with failures'));
    }

    // Generate detailed report if requested
    if (options.report) {
      const report = createSummaryReport(result);
      console.log(report);
    }

    // Exit with appropriate code
    process.exit(result.success && result.failedCount === 0 ? 0 : 1);
  }

  async run(argv) {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      console.error(chalk.red(`\n❌ CLI Error: ${error.message}`));
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const cli = new CliMultiUploadCommand();
  await cli.run(process.argv);
}

// Check if this is the main module
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(chalk.red(`\n💥 Fatal error: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  });
}

export default CliMultiUploadCommand;
