import { ExcelBatchService } from './services/excelBatchService.js';
import { createLogger } from './utils/logger.js';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Excel Batch Update Function Wrapper
 * @param {Object} options - Update options
 * @param {string} options.folder - Main folder containing subfolders with Excel files
 * @param {string} options.field - Field name to update (e.g., "policy")
 * @param {string} options.value - New value for the field
 * @param {string} options.pattern - File pattern to match (default: "0_desc")
 * @param {boolean} options.dryRun - Preview changes without modifying files
 * @param {boolean} options.verbose - Verbose output
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Update results
 */
export async function batchUpdateExcel(options) {
  let restoreConsole = null;

  if (options.logFile) {
    const logger = createFileLogger({
      logFile: options.logFile,
      verbose: options.verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  try{
    console.log(chalk.blue.bold('📊 Excel Batch Editor v1.0.0'));
    console.log('=====================================\n');

    // Validate required parameters
    if (!options.folder) {
      throw new Error('Main folder path is required (--folder)');
    }
    if (!options.field) {
      throw new Error('Field name is required (--field)');
    }
    if (!options.value) {
      throw new Error('Field value is required (--value)');
    }

    // Validate folder exists
    const absoluteFolder = path.resolve(options.folder);
    if (!await fs.pathExists(absoluteFolder)) {
      throw new Error(`Folder does not exist: ${absoluteFolder}`);
    }

    const pattern = options.pattern || "0_desc";
    const dryRun = options.dryRun || false;

    // Create logger - use custom logger if provided, otherwise create default
    const logger = options.customLogger || createLogger(options.verbose);

    // Create service instance
    const excelBatchService = new ExcelBatchService(logger);

    // Print operation details
    console.log(chalk.cyan('Operation Details:'));
    console.log(`  Folder: ${absoluteFolder}`);
    console.log(`  Pattern: ${pattern}*.xlsx`);
    console.log(`  Field: ${options.field}`);
    console.log(`  Value: ${options.value}`);
    console.log(`  Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE UPDATE')}`);

    // Show information about folder placeholders if used
    if (options.value.includes('{{current_folder}}') ||
        options.value.includes('{{folder_name}}') ||
        options.value.includes('{{folder_path}}') ||
        options.value.includes('%CURRENT_FOLDER%')) {
      console.log(chalk.magenta('  📁 Folder placeholders detected - values will be resolved per file:'));
      console.log(chalk.gray('    {{current_folder}} or {{folder_name}} → folder name'));
      console.log(chalk.gray('    {{folder_path}} → full folder path'));
      console.log(chalk.gray('    %CURRENT_FOLDER% → folder name (legacy)'));
    }
    console.log('');

    // Find Excel files
    logger.info('Scanning for Excel files...');
    const excelFiles = await excelBatchService.findExcelFiles(absoluteFolder, pattern);

    if (excelFiles.length === 0) {
      logger.warn(`No Excel files found matching pattern "${pattern}*.xlsx"`);
      return {
        success: true,
        totalFiles: 0,
        successful: 0,
        failed: 0,
        message: 'No files to process'
      };
    }

    // Show found files
    if (options.verbose) {
      console.log(chalk.cyan('\nFound Excel files:'));
      excelFiles.forEach(file => {
        console.log(`  ${file.folderName}/${file.fileName}`);
      });
      console.log('');
    }

    // Perform batch update
    const results = await excelBatchService.batchUpdateFiles(
      excelFiles,
      options.field,
      options.value,
      dryRun
    );

    // Final summary
    console.log('\n' + chalk.bold('='.repeat(50)));
    if (dryRun) {
      console.log(chalk.yellow.bold('🔍 DRY RUN COMPLETED'));
      console.log(chalk.gray('No files were modified. Use without --dry-run to apply changes.'));
    } else {
      if (results.successful > 0) {
        console.log(chalk.green.bold('✅ BATCH UPDATE COMPLETED'));
      } else {
        console.log(chalk.red.bold('❌ BATCH UPDATE FAILED'));
      }
    }

    console.log(`Files processed: ${results.totalFiles}`);
    console.log(`Successful: ${chalk.green(results.successful)}`);
    if (results.failed > 0) {
      console.log(`Failed: ${chalk.red(results.failed)}`);
    }

    return {
      success: results.failed === 0,
      dryRun,
      totalFiles: results.totalFiles,
      successful: results.successful,
      failed: results.failed,
      details: results.details,
      errors: results.errors
    };

  } catch (error) {
    console.error(chalk.red(`❌ Excel batch update failed: ${error.message}`));
    if (options.verbose) {
      console.error(error.stack);
    }
    throw error;
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

/**
 * CLI interface for Tauri backend calls
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options = {
    verbose: false,
    dryRun: false,
    pattern: "0_desc"
  };

  let folderPath = null;
  let fieldName = null;
  let fieldValue = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder':
        folderPath = args[i + 1];
        i++;
        break;
      case '--field':
        fieldName = args[i + 1];
        i++;
        break;
      case '--value':
        fieldValue = args[i + 1];
        i++;
        break;
      case '--pattern':
        options.pattern = args[i + 1];
        i++;
        break;
      case '--config':
        // Config parameter for compatibility - not used by excel batch editor currently
        i++;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }

  try {
    // Validate required arguments
    if (!folderPath) {
      throw new Error('No folder specified. Use --folder');
    }
    if (!fieldName) {
      throw new Error('No field specified. Use --field');
    }
    if (!fieldValue) {
      throw new Error('No value specified. Use --value');
    }

    // Set the parsed arguments
    options.folder = folderPath;
    options.field = fieldName;
    options.value = fieldValue;

    // Execute the batch update
    const result = await batchUpdateExcel(options);

    // Output result as JSON for Tauri to parse
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message,
      dryRun: options.dryRun,
      totalFiles: 0,
      successful: 0,
      failed: 0,
      details: [],
      errors: [error.message],
      context: {
        args,
        options,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      }
    };

    console.log(JSON.stringify(errorResult, null, 2));
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}