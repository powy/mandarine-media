/**
 * Server Integration for Season Data Propagation
 *
 * This module provides functions to integrate season data propagation
 * into server-side Excel processing workflows.
 */

import { propagateSeasonData } from './wrapper.js';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/**
 * Process a single Excel file and propagate season data if it's a season type
 * @param {string} excelFilePath - Path to the Excel file
 * @param {string} configPath - Path to configuration JSON file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
export async function processExcelFileForPropagation(excelFilePath, configPath, options = {}) {
  const { verbose = false, dryRun = false } = options;

  try {
    if (verbose) {
      console.log(chalk.gray(`Reading Excel file: ${excelFilePath}`));
    }

    // Read the Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);

    // Get the Description sheet
    const descriptionSheet = workbook.getWorksheet('Description');
    if (!descriptionSheet) {
      return {
        success: false,
        skipped: true,
        reason: 'No Description sheet found in Excel file'
      };
    }

    // Find media_type and id fields
    let mediaType = null;
    let mediaDescriptionId = null;

    descriptionSheet.eachRow((row, rowNumber) => {
      const field = row.getCell(2).value;
      const value = row.getCell(3).value;

      if (field === 'media_type') {
        mediaType = value;
      }
      if (field === 'id') {
        mediaDescriptionId = value;
      }
    });

    if (verbose) {
      console.log(chalk.gray(`  Media Type: ${mediaType}`));
      console.log(chalk.gray(`  ID: ${mediaDescriptionId}`));
    }

    // Check if it's a season type
    if (mediaType !== 'season') {
      return {
        success: false,
        skipped: true,
        reason: `Media type is "${mediaType}", not "season"`
      };
    }

    if (!mediaDescriptionId) {
      return {
        success: false,
        error: 'Season ID not found in Excel file'
      };
    }

    // Propagate data from season to episodes
    console.log(chalk.cyan(`\n🔄 Season detected - propagating data to episodes...`));

    const result = await propagateSeasonData({
      seasonId: mediaDescriptionId,
      config: configPath,
      verbose,
      dryRun,
      logFile: options.logFile
    });

    return {
      success: result.success,
      propagated: true,
      seasonId: mediaDescriptionId,
      ...result
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process all Excel files in a treatment folder
 * @param {string} treatmentFolderPath - Path to the folder containing Excel files
 * @param {string} configPath - Path to configuration JSON file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing summary
 */
export async function processTreatmentFolder(treatmentFolderPath, configPath, options = {}) {
  const { verbose = false, dryRun = false, excelPattern = '0_desc*.xlsx' } = options;

  try {
    console.log(chalk.blue.bold('📁 Processing Treatment Folder\n'));
    console.log(chalk.gray(`Folder: ${treatmentFolderPath}`));
    console.log(chalk.gray(`Config: ${configPath}\n`));

    // Find all Excel files matching the pattern
    const files = await fs.readdir(treatmentFolderPath);
    const excelFiles = files.filter(file => {
      // Match pattern like "0_desc*.xlsx"
      return file.startsWith('0_desc') && file.endsWith('.xlsx');
    });

    if (excelFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No Excel files found matching pattern'));
      return {
        success: true,
        processed: 0,
        propagated: 0,
        skipped: 0,
        errors: 0
      };
    }

    console.log(chalk.cyan(`Found ${excelFiles.length} Excel file(s)\n`));

    const results = {
      processed: 0,
      propagated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    // Process each Excel file
    for (const excelFile of excelFiles) {
      const excelPath = path.join(treatmentFolderPath, excelFile);

      console.log(chalk.cyan(`\n📄 Processing: ${excelFile}`));

      const result = await processExcelFileForPropagation(excelPath, configPath, options);

      results.processed++;

      if (result.propagated) {
        results.propagated++;
        console.log(chalk.green(`✅ Propagated: ${result.updated} episodes updated`));
      } else if (result.skipped) {
        results.skipped++;
        console.log(chalk.gray(`⏭️  Skipped: ${result.reason}`));
      } else if (result.error) {
        results.errors++;
        console.log(chalk.red(`❌ Error: ${result.error}`));
      }

      results.details.push({
        file: excelFile,
        ...result
      });
    }

    // Summary
    console.log(chalk.blue.bold('\n📊 Processing Summary:'));
    console.log(chalk.cyan(`  Processed: ${results.processed} file(s)`));
    console.log(chalk.green(`  Propagated: ${results.propagated} season(s)`));
    console.log(chalk.gray(`  Skipped: ${results.skipped} file(s)`));
    if (results.errors > 0) {
      console.log(chalk.red(`  Errors: ${results.errors} file(s)`));
    }

    return {
      success: results.errors === 0,
      ...results
    };

  } catch (error) {
    console.error(chalk.red(`❌ Treatment folder processing failed: ${error.message}`));
    throw error;
  }
}

/**
 * Process subfolders in a batch directory
 * Each subfolder should contain Excel files to process
 * @param {string} batchFolderPath - Path to the batch folder containing subfolders
 * @param {string} configPath - Path to configuration JSON file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing summary
 */
export async function processBatchFolders(batchFolderPath, configPath, options = {}) {
  const { verbose = false, dryRun = false } = options;

  try {
    console.log(chalk.blue.bold('📦 Processing Batch Folders\n'));
    console.log(chalk.gray(`Batch Folder: ${batchFolderPath}`));
    console.log(chalk.gray(`Config: ${configPath}\n`));

    // Get all subdirectories
    const entries = await fs.readdir(batchFolderPath, { withFileTypes: true });
    const subfolders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    if (subfolders.length === 0) {
      console.log(chalk.yellow('⚠️  No subfolders found'));
      return {
        success: true,
        processed: 0,
        totalPropagated: 0,
        totalSkipped: 0,
        totalErrors: 0
      };
    }

    console.log(chalk.cyan(`Found ${subfolders.length} subfolder(s)\n`));

    const batchResults = {
      processed: 0,
      totalPropagated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      folders: []
    };

    // Process each subfolder
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(batchFolderPath, subfolder);

      console.log(chalk.blue.bold(`\n📁 Processing folder: ${subfolder}`));
      console.log(chalk.gray('─'.repeat(60)));

      try {
        const result = await processTreatmentFolder(subfolderPath, configPath, options);

        batchResults.processed++;
        batchResults.totalPropagated += result.propagated || 0;
        batchResults.totalSkipped += result.skipped || 0;
        batchResults.totalErrors += result.errors || 0;

        batchResults.folders.push({
          folder: subfolder,
          ...result
        });

      } catch (error) {
        console.error(chalk.red(`❌ Failed to process folder ${subfolder}: ${error.message}`));
        batchResults.totalErrors++;
        batchResults.folders.push({
          folder: subfolder,
          success: false,
          error: error.message
        });
      }
    }

    // Final Summary
    console.log(chalk.blue.bold('\n\n📊 Batch Processing Summary:'));
    console.log(chalk.cyan(`  Folders Processed: ${batchResults.processed}`));
    console.log(chalk.green(`  Total Propagated: ${batchResults.totalPropagated} season(s)`));
    console.log(chalk.gray(`  Total Skipped: ${batchResults.totalSkipped} file(s)`));
    if (batchResults.totalErrors > 0) {
      console.log(chalk.red(`  Total Errors: ${batchResults.totalErrors}`));
    }

    return {
      success: batchResults.totalErrors === 0,
      ...batchResults
    };

  } catch (error) {
    console.error(chalk.red(`❌ Batch processing failed: ${error.message}`));
    throw error;
  }
}

export default {
  processExcelFileForPropagation,
  processTreatmentFolder,
  processBatchFolders
};
