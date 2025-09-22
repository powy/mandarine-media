import ExcelJS from 'exceljs';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class ExcelBatchService {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Find all Excel files matching pattern in subfolders
   * @param {string} mainFolder - Root folder to scan
   * @param {string} pattern - File pattern to match (default: "0_desc")
   * @returns {Promise<Array>} Array of found Excel file paths with their containing folders
   */
  async findExcelFiles(mainFolder, pattern = "0_desc") {
    const foundFiles = [];

    try {
      // Check if main folder exists
      if (!await fs.pathExists(mainFolder)) {
        throw new Error(`Main folder does not exist: ${mainFolder}`);
      }

      const items = await fs.readdir(mainFolder, { withFileTypes: true });

      // Process each subfolder
      for (const item of items) {
        if (item.isDirectory()) {
          const subfolderPath = path.join(mainFolder, item.name);

          try {
            const files = await fs.readdir(subfolderPath);

            // Look for Excel files matching the pattern
            const matchingFiles = files.filter(file =>
              file.startsWith(pattern) && file.endsWith('.xlsx')
            );

            for (const file of matchingFiles) {
              const filePath = path.join(subfolderPath, file);
              foundFiles.push({
                filePath,
                folder: subfolderPath,
                fileName: file,
                folderName: item.name
              });

              this.logger.info(`Found Excel file: ${path.join(item.name, file)}`);
            }

            if (matchingFiles.length === 0) {
              this.logger.warn(`No files matching pattern "${pattern}*.xlsx" in folder: ${item.name}`);
            }
          } catch (error) {
            this.logger.warn(`Error reading subfolder ${item.name}: ${error.message}`);
          }
        }
      }

      this.logger.info(`Total Excel files found: ${foundFiles.length}`);
      return foundFiles;

    } catch (error) {
      this.logger.error(`Error scanning folders: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a specific field in an Excel file's Description sheet
   * @param {string} filePath - Path to Excel file
   * @param {string} fieldName - Field to update (e.g., "policy")
   * @param {string} newValue - New value for the field
   * @param {boolean} dryRun - If true, don't save changes
   * @returns {Promise<Object>} Update result
   */
  async updateExcelField(filePath, fieldName, newValue, dryRun = false) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const descriptionSheet = workbook.getWorksheet('Description');
      if (!descriptionSheet) {
        throw new Error('Description sheet not found');
      }

      let fieldFound = false;
      let oldValue = null;
      let rowNumber = null;

      // Find the field in the Description sheet
      descriptionSheet.eachRow((row, rowNum) => {
        if (fieldFound) return; // Already found, skip remaining rows

        // Check if this row contains our field
        // Format: [description, key, value] where key is in column B
        const keyCell = row.getCell(2);
        const valueCell = row.getCell(3);

        if (keyCell.value && keyCell.value.toString() === fieldName) {
          fieldFound = true;
          oldValue = valueCell.value;
          rowNumber = rowNum;

          if (!dryRun) {
            // Update the value while preserving formatting
            valueCell.value = newValue;
          }
        }
      });

      if (!fieldFound) {
        return {
          success: false,
          error: `Field "${fieldName}" not found in Description sheet`,
          filePath
        };
      }

      const result = {
        success: true,
        filePath,
        fieldName,
        oldValue: oldValue ? oldValue.toString() : '',
        newValue,
        rowNumber,
        dryRun
      };

      if (!dryRun) {
        // Save the workbook with retry mechanism for file locks
        await this.saveWithRetry(workbook, filePath);
        this.logger.info(`Updated ${path.basename(filePath)}: ${fieldName} = "${newValue}"`);
      } else {
        this.logger.info(`[DRY RUN] Would update ${path.basename(filePath)}: ${fieldName} "${oldValue}" → "${newValue}"`);
      }

      return result;

    } catch (error) {
      this.logger.error(`Error updating ${path.basename(filePath)}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Save workbook with retry mechanism for file lock handling
   * @param {ExcelJS.Workbook} workbook - The workbook to save
   * @param {string} filePath - Path to save the workbook
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {number} delay - Base delay in milliseconds between retries
   */
  async saveWithRetry(workbook, filePath, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await workbook.xlsx.writeFile(filePath);
        return true;
      } catch (error) {
        // Check for file lock errors
        const isFileLocked = error.code === 'EBUSY' ||
                           error.code === 'EPERM' ||
                           error.message.includes('EBUSY') ||
                           error.message.includes('being used by another process') ||
                           error.message.includes('permission denied');

        if (isFileLocked) {
          this.logger.warn(`File locked attempt ${attempt}/${maxRetries}: ${path.basename(filePath)}`);

          if (attempt === maxRetries) {
            throw new Error(`File is locked by Excel or another application: ${path.basename(filePath)}. Please close the file and try again.`);
          }

          // Exponential backoff: wait longer with each attempt
          const waitTime = delay * attempt;
          this.logger.info(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Non-lock error, throw immediately
          throw error;
        }
      }
    }
  }

  /**
   * Batch update multiple Excel files
   * @param {Array} fileList - List of file objects from findExcelFiles
   * @param {string} fieldName - Field to update
   * @param {string} newValue - New value for the field
   * @param {boolean} dryRun - If true, don't save changes
   * @returns {Promise<Object>} Batch update results
   */
  async batchUpdateFiles(fileList, fieldName, newValue, dryRun = false) {
    const results = {
      totalFiles: fileList.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
      errors: []
    };

    this.logger.info(`${dryRun ? '[DRY RUN] ' : ''}Starting batch update of ${fileList.length} files...`);
    this.logger.info(`Field: "${fieldName}" → Value: "${newValue}"`);

    for (const fileInfo of fileList) {
      try {
        const result = await this.updateExcelField(
          fileInfo.filePath,
          fieldName,
          newValue,
          dryRun
        );

        if (result.success) {
          results.successful++;
          results.details.push({
            file: fileInfo.fileName,
            folder: fileInfo.folderName,
            oldValue: result.oldValue,
            newValue: result.newValue,
            status: 'updated'
          });
        } else {
          results.failed++;
          results.errors.push({
            file: fileInfo.fileName,
            folder: fileInfo.folderName,
            error: result.error
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          file: fileInfo.fileName,
          folder: fileInfo.folderName,
          error: error.message
        });
      }
    }

    // Print summary
    this.logger.info('\n' + chalk.bold('Batch Update Summary:'));
    this.logger.info(`Total files processed: ${results.totalFiles}`);
    this.logger.info(chalk.green(`Successful: ${results.successful}`));
    if (results.failed > 0) {
      this.logger.info(chalk.red(`Failed: ${results.failed}`));
    }
    if (results.skipped > 0) {
      this.logger.info(chalk.yellow(`Skipped: ${results.skipped}`));
    }

    if (results.errors.length > 0) {
      this.logger.info('\n' + chalk.red('Errors:'));
      results.errors.forEach(error => {
        this.logger.error(`${error.folder}/${error.file}: ${error.error}`);
      });
    }

    return results;
  }
}