#!/usr/bin/env node

/**
 * Excel Batch Editor - Standalone CLI tool
 * Updates specific fields in Excel files across multiple subfolders
 */

import { Command } from 'commander';
import { batchUpdateExcel } from './wrapper.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('excel-batch-editor')
  .description('Update specific fields in Excel files across multiple subfolders')
  .version('1.0.0')
  .requiredOption('-f, --folder <path>', 'Main folder containing subfolders with Excel files')
  .requiredOption('--field <name>', 'Field name to update (e.g., "policy")')
  .requiredOption('--value <value>', 'New value for the field')
  .option('-p, --pattern <pattern>', 'File pattern to match (default: "0_desc")', '0_desc')
  .option('--dry-run', 'Preview changes without modifying files')
  .option('-v, --verbose', 'Verbose output for detailed logging')
  .action(async (options) => {
    try {
      await batchUpdateExcel(options);
      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Enhanced help
program.on('--help', () => {
  console.log('');
  console.log(chalk.yellow('Examples:'));
  console.log('  $ excel-batch-editor --folder /path/to/main --field policy --value "public"');
  console.log('  $ excel-batch-editor --folder ./media --field policy --value "private" --dry-run');
  console.log('  $ excel-batch-editor --folder ./content --field status --value "ready" --pattern "0_dec" --verbose');
  console.log('');
  console.log(chalk.cyan('Notes:'));
  console.log('  • Uses ExcelJS library to preserve formatting while updating cell values');
  console.log('  • Searches for Excel files matching [pattern]*.xlsx in subfolders');
  console.log('  • Updates fields in the "Description" sheet (format: [desc, key, value])');
  console.log('  • Use --dry-run to preview changes before applying them');
  console.log('');
});

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}