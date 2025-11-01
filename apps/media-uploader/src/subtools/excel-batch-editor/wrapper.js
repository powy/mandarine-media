import { ExcelBatchService } from './services/excelBatchService.js';
import { createLogger } from './utils/logger.js';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';
import { createSyncFileLogger, createConsoleLogger, createDualLogger } from './utils/syncFileLogger.js';
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
 * Update single Excel file in a folder by Column A description
 * @param {string} folderPath - Folder containing 0_desc*.xlsx
 * @param {string} descriptionText - Column A description text
 * @param {string} newValue - New value for Column C
 * @param {Object} options - { verbose, dryRun, logFile }
 * @returns {Promise<Object>} Result { success, details, errors }
 */
export async function updateSingleExcelByDescription(folderPath, descriptionText, newValue, options = {}) {
  // Create dual logger that writes to both file and console immediately
  const logger = createDualLogger(options.logFile, options.verbose);

  try {
    logger.info('📊 Excel Single Update (by Description) v1.0.0');
    logger.info('=====================================');
    logger.info('');

    // Validate required parameters
    if (!folderPath) {
      throw new Error('Folder path is required');
    }
    if (!descriptionText) {
      throw new Error('Description text is required');
    }
    if (newValue === undefined || newValue === null) {
      throw new Error('New value is required');
    }

    // Validate folder exists
    const absoluteFolder = path.resolve(folderPath);
    if (!await fs.pathExists(absoluteFolder)) {
      throw new Error(`Folder does not exist: ${absoluteFolder}`);
    }

    const dryRun = options.dryRun || false;

    // Create console logger for ExcelBatchService
    const serviceLogger = createConsoleLogger(options.verbose);
    const excelBatchService = new ExcelBatchService(serviceLogger);

    // Print operation details
    logger.info('Operation Details:');
    logger.info(`  Folder: ${absoluteFolder}`);
    logger.info(`  Description: ${descriptionText}`);
    logger.info(`  New Value: ${newValue}`);
    logger.info(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    logger.info('');

    // Find 0_desc*.xlsx in the folder
    logger.info('Looking for 0_desc*.xlsx file...');
    const files = await fs.readdir(absoluteFolder);
    const excelFiles = files.filter(file =>
      file.startsWith('0_desc') && file.endsWith('.xlsx')
    );

    if (excelFiles.length === 0) {
      throw new Error(`No 0_desc*.xlsx file found in folder: ${absoluteFolder}`);
    }

    if (excelFiles.length > 1) {
      logger.warn(`Multiple 0_desc*.xlsx files found, using first one: ${excelFiles[0]}`);
    }

    const excelFile = excelFiles[0];
    const filePath = path.join(absoluteFolder, excelFile);
    logger.info(`Found Excel file: ${excelFile}`);

    // Update the Excel field
    const result = await excelBatchService.updateExcelFieldByDescription(
      filePath,
      descriptionText,
      newValue,
      dryRun
    );

    // Print result
    logger.info('');
    logger.info('==================================================');
    if (result.success) {
      if (dryRun) {
        logger.info('🔍 DRY RUN COMPLETED');
        logger.info('No files were modified.');
      } else {
        logger.info('✅ UPDATE COMPLETED');
      }
      logger.info(`File: ${excelFile}`);
      logger.info(`Description: "${descriptionText}"`);
      logger.info(`Old Value: "${result.oldValue}"`);
      logger.info(`New Value: "${result.newValue}"`);
      logger.info(`Row: ${result.rowNumber}`);
    } else {
      logger.error('❌ UPDATE FAILED');
      logger.error(`Error: ${result.error}`);
    }

    return {
      success: result.success,
      dryRun,
      file: excelFile,
      descriptionText,
      oldValue: result.oldValue,
      newValue: result.newValue,
      rowNumber: result.rowNumber,
      error: result.error
    };

  } catch (error) {
    logger.error(`❌ Excel update failed: ${error.message}`);
    if (options.verbose) {
      logger.error(error.stack);
    }
    throw error;
  }
}

/**
 * Update all Excel files recursively (parent + subfolders) by Column A description
 * @param {string} parentFolderPath - Parent folder path
 * @param {string} descriptionText - Column A description text
 * @param {string} newValue - New value (supports {{folder_name}} placeholders)
 * @param {Object} options - { verbose, dryRun, logFile }
 * @returns {Promise<Object>} Batch results
 */
export async function updateAllExcelsByDescriptionRecursive(parentFolderPath, descriptionText, newValue, options = {}) {
  // Create dual logger that writes to both file and console immediately
  const logger = createDualLogger(options.logFile, options.verbose);

  try {
    logger.info('📊 Excel Batch Update (by Description) v1.0.0');
    logger.info('=====================================');
    logger.info('');

    // Validate required parameters
    if (!parentFolderPath) {
      throw new Error('Parent folder path is required');
    }
    if (!descriptionText) {
      throw new Error('Description text is required');
    }
    if (newValue === undefined || newValue === null) {
      throw new Error('New value is required');
    }

    // Validate folder exists
    const absoluteFolder = path.resolve(parentFolderPath);
    if (!await fs.pathExists(absoluteFolder)) {
      throw new Error(`Folder does not exist: ${absoluteFolder}`);
    }

    const pattern = "0_desc";
    const dryRun = options.dryRun || false;

    // Create console logger for ExcelBatchService
    const serviceLogger = createConsoleLogger(options.verbose);
    const excelBatchService = new ExcelBatchService(serviceLogger);

    // Print operation details
    logger.info('Operation Details:');
    logger.info(`  Parent Folder: ${absoluteFolder}`);
    logger.info(`  Pattern: ${pattern}*.xlsx`);
    logger.info(`  Description: ${descriptionText}`);
    logger.info(`  New Value: ${newValue}`);
    logger.info(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);

    // Show information about folder placeholders if used
    if (newValue.includes('{{current_folder}}') ||
        newValue.includes('{{folder_name}}') ||
        newValue.includes('{{folder_path}}') ||
        newValue.includes('%CURRENT_FOLDER%')) {
      logger.info('  📁 Folder placeholders detected - values will be resolved per file:');
      logger.info('    {{current_folder}} or {{folder_name}} → folder name');
      logger.info('    {{folder_path}} → full folder path');
      logger.info('    %CURRENT_FOLDER% → folder name (legacy)');
    }
    logger.info('');

    // Find Excel files recursively
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
      logger.info('');
      logger.info('Found Excel files:');
      excelFiles.forEach(file => {
        logger.info(`  ${file.folderName}/${file.fileName}`);
      });
      logger.info('');
    }

    // Perform batch update by description
    const results = await excelBatchService.batchUpdateFilesByDescription(
      excelFiles,
      descriptionText,
      newValue,
      dryRun
    );

    // Final summary
    logger.info('');
    logger.info('==================================================');
    if (dryRun) {
      logger.info('🔍 DRY RUN COMPLETED');
      logger.info('No files were modified. Use without dry-run to apply changes.');
    } else {
      if (results.successful > 0) {
        logger.info('✅ BATCH UPDATE COMPLETED');
      } else {
        logger.error('❌ BATCH UPDATE FAILED');
      }
    }

    logger.info(`Files processed: ${results.totalFiles}`);
    logger.info(`Successful: ${results.successful}`);
    if (results.failed > 0) {
      logger.error(`Failed: ${results.failed}`);
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
    logger.error(`❌ Excel batch update failed: ${error.message}`);
    if (options.verbose) {
      logger.error(error.stack);
    }
    throw error;
  }
}

/**
 * Regenerate episode names from season name and folder structure
 * @param {string} parentFolderPath - Parent folder path containing season Excel
 * @param {Object} options - { verbose, dryRun, logFile }
 * @returns {Promise<Object>} Regeneration results
 */
export async function regenerateEpisodeNamesFromSeason(parentFolderPath, options = {}) {
  // Create dual logger that writes to both file and console immediately
  const logger = createDualLogger(options.logFile, options.verbose);

  try {
    logger.info('📊 Episode Name Regeneration v1.0.0');
    logger.info('=====================================');
    logger.info('');

    // Validate required parameters
    if (!parentFolderPath) {
      throw new Error('Parent folder path is required');
    }

    // Validate folder exists
    const absoluteFolder = path.resolve(parentFolderPath);
    if (!await fs.pathExists(absoluteFolder)) {
      throw new Error(`Folder does not exist: ${absoluteFolder}`);
    }

    const dryRun = options.dryRun || false;

    // Create console logger for ExcelBatchService
    const serviceLogger = createConsoleLogger(options.verbose);
    const excelBatchService = new ExcelBatchService(serviceLogger);

    // Print operation details
    logger.info('Operation Details:');
    logger.info(`  Parent Folder: ${absoluteFolder}`);
    logger.info(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    logger.info('');

    // Regenerate episode names
    const results = await excelBatchService.regenerateEpisodeNames(
      absoluteFolder,
      { dryRun, verbose: options.verbose }
    );

    // Print result
    logger.info('');
    logger.info('==================================================');
    if (results.success) {
      if (dryRun) {
        logger.info('🔍 DRY RUN COMPLETED');
        logger.info('No files were modified.');
      } else {
        logger.info('✅ REGENERATION COMPLETED');
      }
      logger.info(`Season: "${results.seasonName}"`);
      logger.info(`Folders processed: ${results.totalFolders}`);
      logger.info(`Successful: ${results.successful}`);
      if (results.failed > 0) {
        logger.error(`Failed: ${results.failed}`);
      }
      if (results.skipped > 0) {
        logger.warn(`Skipped: ${results.skipped}`);
      }
    } else {
      logger.error('❌ REGENERATION FAILED');
      if (results.errors.length > 0) {
        logger.error('');
        logger.error('Errors:');
        results.errors.forEach(error => {
          logger.error(`  ${error.folder}: ${error.error}`);
        });
      }
    }

    return results;

  } catch (error) {
    logger.error(`❌ Episode name regeneration failed: ${error.message}`);
    if (options.verbose) {
      logger.error(error.stack);
    }
    throw error;
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