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

      // First, check for Excel files in the current folder (season level)
      try {
        const mainFolderFiles = await fs.readdir(mainFolder);
        const mainMatchingFiles = mainFolderFiles.filter(file =>
          file.startsWith(pattern) && file.endsWith('.xlsx')
        );

        for (const file of mainMatchingFiles) {
          const filePath = path.join(mainFolder, file);
          foundFiles.push({
            filePath,
            folder: mainFolder,
            fileName: file,
            folderName: path.basename(mainFolder),
            isSeasonLevel: true  // Mark as season-level Excel
          });

          this.logger.info(`Found season-level Excel file: ${file}`);
        }

        if (mainMatchingFiles.length > 0) {
          this.logger.info(`Found ${mainMatchingFiles.length} season-level Excel file(s) in current folder`);
        }
      } catch (error) {
        this.logger.warn(`Error reading main folder: ${error.message}`);
      }

      const items = await fs.readdir(mainFolder, { withFileTypes: true });

      // Process each subfolder (episode level)
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
                folderName: item.name,
                isSeasonLevel: false  // Mark as episode-level Excel
              });

              this.logger.info(`Found episode-level Excel file: ${path.join(item.name, file)}`);
            }

            if (matchingFiles.length === 0) {
              this.logger.warn(`No files matching pattern "${pattern}*.xlsx" in folder: ${item.name}`);
            }
          } catch (error) {
            this.logger.warn(`Error reading subfolder ${item.name}: ${error.message}`);
          }
        }
      }

      this.logger.info(`Total Excel files found: ${foundFiles.length} (${foundFiles.filter(f => f.isSeasonLevel).length} season-level, ${foundFiles.filter(f => !f.isSeasonLevel).length} episode-level)`);
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
   * Resolve field value with folder-specific placeholders
   * @param {string} value - Raw value with potential placeholders
   * @param {Object} fileInfo - File information object
   * @returns {string} Resolved value
   */
  resolveFieldValue(value, fileInfo) {
    if (!value || typeof value !== 'string') {
      return value;
    }

    // Replace placeholders with actual folder information
    let resolvedValue = value;

    // Replace {{current_folder}} with the folder name containing the Excel file
    resolvedValue = resolvedValue.replace(/\{\{current_folder\}\}/g, fileInfo.folderName);

    // Replace {{folder_name}} (alternative syntax)
    resolvedValue = resolvedValue.replace(/\{\{folder_name\}\}/g, fileInfo.folderName);

    // Replace {{folder_path}} with the full folder path
    resolvedValue = resolvedValue.replace(/\{\{folder_path\}\}/g, fileInfo.folder);

    // Handle legacy %CURRENT_FOLDER% syntax for backward compatibility
    resolvedValue = resolvedValue.replace(/%CURRENT_FOLDER%/g, fileInfo.folderName);

    return resolvedValue;
  }

  /**
   * Check if folder name is numeric (for episode detection)
   * @param {string} folderName - Folder name to check
   * @returns {boolean} True if folder name is numeric
   */
  isNumericFolderName(folderName) {
    // Remove leading zeros and check if it's a valid positive integer
    const trimmed = folderName.replace(/^0+/, '') || '0';
    return /^\d+$/.test(trimmed) && parseInt(trimmed) > 0;
  }

  /**
   * Extract episode number from folder name
   * @param {string} folderName - Folder name (e.g., "005", "9", "010")
   * @returns {number|null} Episode number or null if not numeric
   */
  extractEpisodeNumber(folderName) {
    if (!this.isNumericFolderName(folderName)) {
      return null;
    }
    return parseInt(folderName.replace(/^0+/, '') || '0');
  }

  /**
   * Generate episode name from season name and episode number
   * @param {string} seasonName - Season name
   * @param {number} episodeNumber - Episode number
   * @returns {string} Generated episode name
   */
  generateEpisodeName(seasonName, episodeNumber) {
    return `${seasonName} episode ${episodeNumber}`;
  }

  /**
   * Generate episode slug from season name and episode number
   * @param {string} seasonName - Season name
   * @param {number} episodeNumber - Episode number
   * @returns {string} Generated episode slug
   */
  generateEpisodeSlug(seasonName, episodeNumber) {
    // Convert to lowercase, replace spaces with dashes, remove special characters
    const baseSlug = seasonName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    return `${baseSlug}-episode-${episodeNumber}`;
  }

  /**
   * Create episode Excel files from season template
   * @param {string} seasonExcelPath - Path to season Excel file
   * @param {Array} episodeFolders - Array of episode folder info
   * @param {boolean} dryRun - If true, don't create files
   * @returns {Promise<Object>} Creation results
   */
  async createEpisodesFromSeason(seasonExcelPath, episodeFolders, dryRun = false) {
    const results = {
      totalFolders: episodeFolders.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      warnings: [],
      details: [],
      errors: []
    };

    try {
      // Read season Excel template
      const seasonWorkbook = new ExcelJS.Workbook();
      await seasonWorkbook.xlsx.readFile(seasonExcelPath);

      const descriptionSheet = seasonWorkbook.getWorksheet('Description');
      if (!descriptionSheet) {
        throw new Error('Description sheet not found in season Excel');
      }

      // Extract season name from the template
      let seasonName = null;
      descriptionSheet.eachRow((row) => {
        const keyCell = row.getCell(2);
        const valueCell = row.getCell(3);
        if (keyCell.value && keyCell.value.toString() === 'season_name') {
          seasonName = valueCell.value ? valueCell.value.toString() : null;
        }
      });

      if (!seasonName) {
        throw new Error('Season name not found in season Excel template');
      }

      this.logger.info(`Using season template: "${seasonName}"`);

      // Process each episode folder
      for (const folderInfo of episodeFolders) {
        try {
          const episodeNumber = this.extractEpisodeNumber(folderInfo.folderName);

          if (episodeNumber === null) {
            results.warnings.push(`Non-numeric folder name: "${folderInfo.folderName}" - skipping`);
            results.skipped++;
            continue;
          }

          const episodeName = this.generateEpisodeName(seasonName, episodeNumber);
          const episodeSlug = this.generateEpisodeSlug(seasonName, episodeNumber);
          const targetFilePath = path.join(folderInfo.folder, '0_desc.xlsx');

          if (!dryRun) {
            // Create a copy of the season workbook
            const episodeWorkbook = new ExcelJS.Workbook();
            await episodeWorkbook.xlsx.readFile(seasonExcelPath);
            const episodeDescSheet = episodeWorkbook.getWorksheet('Description');

            // Update episode-specific fields
            episodeDescSheet.eachRow((row) => {
              const keyCell = row.getCell(2);
              const valueCell = row.getCell(3);

              if (keyCell.value) {
                const key = keyCell.value.toString();
                switch (key) {
                  case 'episode_title':
                    valueCell.value = episodeName;
                    break;
                  case 'slug':
                    valueCell.value = episodeSlug;
                    break;
                  case 'episode_number':
                    valueCell.value = episodeNumber;
                    break;
                }
              }
            });

            // Save the episode Excel file
            await this.saveWithRetry(episodeWorkbook, targetFilePath);
          }

          results.successful++;
          results.details.push({
            folder: folderInfo.folderName,
            episodeNumber,
            episodeName,
            episodeSlug,
            targetFile: path.basename(targetFilePath),
            status: dryRun ? 'would_create' : 'created'
          });

          this.logger.info(`${dryRun ? '[DRY RUN] Would create' : 'Created'} episode Excel: ${folderInfo.folderName}/${path.basename(targetFilePath)}`);

        } catch (error) {
          results.failed++;
          results.errors.push({
            folder: folderInfo.folderName,
            error: error.message
          });
          this.logger.error(`Error processing folder ${folderInfo.folderName}: ${error.message}`);
        }
      }

    } catch (error) {
      this.logger.error(`Error reading season template: ${error.message}`);
      throw error;
    }

    return results;
  }

  /**
   * Update a specific field in an Excel file's Description sheet by Column A description
   * @param {string} filePath - Path to Excel file
   * @param {string} descriptionText - Description text in Column A to find
   * @param {string} newValue - New value for Column C
   * @param {boolean} dryRun - If true, don't save changes
   * @returns {Promise<Object>} Update result
   */
  async updateExcelFieldByDescription(filePath, descriptionText, newValue, dryRun = false) {
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

      // Find the description in Column A of the Description sheet
      descriptionSheet.eachRow((row, rowNum) => {
        if (fieldFound) return; // Already found, skip remaining rows

        // Check if this row contains our description in Column A
        // Format: [description (Column A), key (Column B), value (Column C)]
        const descCell = row.getCell(1);
        const valueCell = row.getCell(3);

        if (descCell.value && descCell.value.toString().trim() === descriptionText.trim()) {
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
          error: `Description "${descriptionText}" not found in Column A of Description sheet`,
          filePath
        };
      }

      const result = {
        success: true,
        filePath,
        descriptionText,
        oldValue: oldValue ? oldValue.toString() : '',
        newValue,
        rowNumber,
        dryRun
      };

      if (!dryRun) {
        // Save the workbook with retry mechanism for file locks
        await this.saveWithRetry(workbook, filePath);
        this.logger.info(`Updated ${path.basename(filePath)}: "${descriptionText}" = "${newValue}"`);
      } else {
        this.logger.info(`[DRY RUN] Would update ${path.basename(filePath)}: "${descriptionText}" "${oldValue}" → "${newValue}"`);
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
   * Batch update multiple Excel files by Column A description
   * @param {Array} fileList - List of file objects from findExcelFiles
   * @param {string} descriptionText - Description text in Column A to find
   * @param {string} newValue - New value for Column C (can contain placeholders like {{current_folder}})
   * @param {boolean} dryRun - If true, don't save changes
   * @returns {Promise<Object>} Batch update results
   */
  async batchUpdateFilesByDescription(fileList, descriptionText, newValue, dryRun = false) {
    const results = {
      totalFiles: fileList.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
      errors: []
    };

    this.logger.info(`${dryRun ? '[DRY RUN] ' : ''}Starting batch update of ${fileList.length} files...`);
    this.logger.info(`Description: "${descriptionText}" → Value template: "${newValue}"`);

    for (const fileInfo of fileList) {
      try {
        // Resolve folder-specific value for this file
        const resolvedValue = this.resolveFieldValue(newValue, fileInfo);

        const result = await this.updateExcelFieldByDescription(
          fileInfo.filePath,
          descriptionText,
          resolvedValue,
          dryRun
        );

        if (result.success) {
          results.successful++;
          results.details.push({
            file: fileInfo.fileName,
            folder: fileInfo.folderName,
            oldValue: result.oldValue,
            newValue: result.newValue,
            status: 'updated',
            resolvedFrom: newValue !== resolvedValue ? newValue : undefined
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

  /**
   * Batch update multiple Excel files
   * @param {Array} fileList - List of file objects from findExcelFiles
   * @param {string} fieldName - Field to update
   * @param {string} newValue - New value for the field (can contain placeholders like {{current_folder}})
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
    this.logger.info(`Field: "${fieldName}" → Value template: "${newValue}"`);

    for (const fileInfo of fileList) {
      try {
        // Resolve folder-specific value for this file
        const resolvedValue = this.resolveFieldValue(newValue, fileInfo);

        const result = await this.updateExcelField(
          fileInfo.filePath,
          fieldName,
          resolvedValue,
          dryRun
        );

        if (result.success) {
          results.successful++;
          results.details.push({
            file: fileInfo.fileName,
            folder: fileInfo.folderName,
            oldValue: result.oldValue,
            newValue: result.newValue,
            status: 'updated',
            resolvedFrom: newValue !== resolvedValue ? newValue : undefined
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

  /**
   * Regenerate episode names from season name and folder structure
   * @param {string} parentFolderPath - Parent folder containing season Excel and episode subfolders
   * @param {Object} options - { verbose, dryRun, logFile }
   * @returns {Promise<Object>} Regeneration results
   */
  async regenerateEpisodeNames(parentFolderPath, options = {}) {
    const dryRun = options.dryRun || false;
    const results = {
      seasonName: null,
      totalFolders: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
      errors: [],
      warnings: []
    };

    try {
      this.logger.info('Starting episode name regeneration...');
      this.logger.info(`Parent folder: ${parentFolderPath}`);

      // Step 1: Find parent folder Excel (0_desc*.xlsx)
      const parentFiles = await fs.readdir(parentFolderPath);
      const parentExcel = parentFiles.find(file =>
        file.startsWith('0_desc') && file.endsWith('.xlsx')
      );

      if (!parentExcel) {
        throw new Error(`No season Excel file (0_desc*.xlsx) found in parent folder: ${parentFolderPath}`);
      }

      this.logger.info(`Found season Excel: ${parentExcel}`);

      // Step 2: Read season name from parent Excel
      const parentExcelPath = path.join(parentFolderPath, parentExcel);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(parentExcelPath);

      const descriptionSheet = workbook.getWorksheet('Description');
      if (!descriptionSheet) {
        throw new Error('Description sheet not found in season Excel');
      }

      let seasonName = null;
      descriptionSheet.eachRow((row) => {
        const descCell = row.getCell(1); // Column A
        const valueCell = row.getCell(3); // Column C

        if (descCell.value && descCell.value.toString().trim() === "Titre de la saison") {
          seasonName = valueCell.value ? valueCell.value.toString() : null;
        }
      });

      if (!seasonName) {
        throw new Error('Field "Titre de la saison" not found in parent Excel or has no value');
      }

      results.seasonName = seasonName;
      this.logger.info(`Season name: "${seasonName}"`);

      // Step 3: Find all subfolders
      const items = await fs.readdir(parentFolderPath, { withFileTypes: true });
      const subfolders = items.filter(item => item.isDirectory());

      if (subfolders.length === 0) {
        this.logger.warn('No subfolders found in parent folder');
        return {
          ...results,
          success: true,
          message: 'No subfolders to process'
        };
      }

      results.totalFolders = subfolders.length;
      this.logger.info(`Found ${subfolders.length} subfolder(s) to process`);

      // Step 4: Process each subfolder
      for (const subfolder of subfolders) {
        const folderPath = path.join(parentFolderPath, subfolder.name);
        const folderName = subfolder.name;

        try {
          this.logger.info(`Processing folder: ${folderName}`);

          // Find Excel in subfolder
          const files = await fs.readdir(folderPath);
          const excelFile = files.find(file =>
            file.startsWith('0_desc') && file.endsWith('.xlsx')
          );

          if (!excelFile) {
            results.skipped++;
            results.warnings.push(`No Excel file found in folder: ${folderName}`);
            this.logger.warn(`No Excel file found in ${folderName} - skipping`);
            continue;
          }

          // Generate episode title
          const episodeTitle = `${seasonName} - Episode ${folderName}`;
          this.logger.info(`Generating title: "${episodeTitle}"`);

          // Update Excel
          const excelPath = path.join(folderPath, excelFile);
          const updateResult = await this.updateExcelFieldByDescription(
            excelPath,
            "Titre de la vidéo",
            episodeTitle,
            dryRun
          );

          if (updateResult.success) {
            results.successful++;
            results.details.push({
              folder: folderName,
              file: excelFile,
              oldTitle: updateResult.oldValue,
              newTitle: episodeTitle,
              status: 'updated'
            });
            this.logger.info(`✓ Updated ${folderName}: "${episodeTitle}"`);
          } else {
            results.failed++;
            results.errors.push({
              folder: folderName,
              file: excelFile,
              error: updateResult.error
            });
            this.logger.error(`✗ Failed ${folderName}: ${updateResult.error}`);
          }

        } catch (error) {
          results.failed++;
          results.errors.push({
            folder: folderName,
            error: error.message
          });
          this.logger.error(`Error processing ${folderName}: ${error.message}`);
        }
      }

      // Print summary
      this.logger.info('\n' + chalk.bold('Episode Name Regeneration Summary:'));
      this.logger.info(`Season: "${seasonName}"`);
      this.logger.info(`Total folders: ${results.totalFolders}`);
      this.logger.info(chalk.green(`Successful: ${results.successful}`));
      if (results.failed > 0) {
        this.logger.info(chalk.red(`Failed: ${results.failed}`));
      }
      if (results.skipped > 0) {
        this.logger.info(chalk.yellow(`Skipped: ${results.skipped}`));
      }

      if (results.warnings.length > 0) {
        this.logger.info('\n' + chalk.yellow('Warnings:'));
        results.warnings.forEach(warning => {
          this.logger.warn(`  ${warning}`);
        });
      }

      if (results.errors.length > 0) {
        this.logger.info('\n' + chalk.red('Errors:'));
        results.errors.forEach(error => {
          this.logger.error(`  ${error.folder}: ${error.error}`);
        });
      }

      return {
        ...results,
        success: results.failed === 0,
        dryRun
      };

    } catch (error) {
      this.logger.error(`Error in episode name regeneration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enhanced batch creation with season-to-episode support
   * @param {string} mainFolder - Root folder to scan
   * @param {string} pattern - File pattern to match (default: "0_desc")
   * @param {boolean} dryRun - If true, don't create files
   * @returns {Promise<Object>} Enhanced batch creation results
   */
  async enhancedBatchCreation(mainFolder, pattern = "0_desc", dryRun = false) {
    const results = {
      seasonProcessing: null,
      regularProcessing: null,
      totalOperations: 0,
      warnings: [],
      errors: []
    };

    try {
      // First, find all Excel files
      const allFiles = await this.findExcelFiles(mainFolder, pattern);
      const seasonFiles = allFiles.filter(f => f.isSeasonLevel);
      const episodeFiles = allFiles.filter(f => !f.isSeasonLevel);

      this.logger.info(`Found ${seasonFiles.length} season-level and ${episodeFiles.length} episode-level Excel files`);

      // If season Excel exists, perform season-to-episode creation
      if (seasonFiles.length > 0) {
        this.logger.info(chalk.cyan('🎬 Season Excel detected - initiating episode creation process...'));

        for (const seasonFile of seasonFiles) {
          try {
            // Get all subfolders in the main directory for potential episodes
            const items = await fs.readdir(mainFolder, { withFileTypes: true });
            const episodeFolders = [];

            for (const item of items) {
              if (item.isDirectory()) {
                const subfolderPath = path.join(mainFolder, item.name);
                episodeFolders.push({
                  folder: subfolderPath,
                  folderName: item.name
                });
              }
            }

            if (episodeFolders.length === 0) {
              results.warnings.push(`No subfolders found for episode creation in: ${path.basename(mainFolder)}`);
              continue;
            }

            // Create episodes from season template
            const creationResult = await this.createEpisodesFromSeason(
              seasonFile.filePath,
              episodeFolders,
              dryRun
            );

            results.seasonProcessing = creationResult;
            results.totalOperations += creationResult.totalFolders;

            // Log warnings from episode creation
            if (creationResult.warnings.length > 0) {
              results.warnings.push(...creationResult.warnings);
              this.logger.warn('\n' + chalk.yellow('⚠️  Warnings during episode creation:'));
              creationResult.warnings.forEach(warning => {
                this.logger.warn(`   ${warning}`);
              });
            }

            // Log summary
            this.logger.info('\n' + chalk.bold('Season-to-Episode Creation Summary:'));
            this.logger.info(`Total folders processed: ${creationResult.totalFolders}`);
            this.logger.info(chalk.green(`Episodes created: ${creationResult.successful}`));
            if (creationResult.failed > 0) {
              this.logger.info(chalk.red(`Failed: ${creationResult.failed}`));
            }
            if (creationResult.skipped > 0) {
              this.logger.info(chalk.yellow(`Skipped (non-numeric folders): ${creationResult.skipped}`));
            }

          } catch (error) {
            results.errors.push(`Error processing season file ${seasonFile.fileName}: ${error.message}`);
            this.logger.error(`Error processing season file: ${error.message}`);
          }
        }

        // After season processing, re-scan for episode files
        const updatedFiles = await this.findExcelFiles(mainFolder, pattern);
        const newEpisodeFiles = updatedFiles.filter(f => !f.isSeasonLevel);

        if (newEpisodeFiles.length !== episodeFiles.length) {
          this.logger.info(chalk.green(`📁 Episode Excel files updated: ${episodeFiles.length} → ${newEpisodeFiles.length}`));
        }

        results.regularProcessing = {
          message: 'Episode Excel files created/updated from season template',
          episodeFilesFound: newEpisodeFiles.length
        };

      } else {
        // No season Excel found - this is regular batch processing
        this.logger.info('📄 No season Excel found - this appears to be regular episode-level processing');
        results.regularProcessing = {
          message: 'Regular batch processing mode - no season template detected',
          episodeFilesFound: episodeFiles.length
        };
      }

      // Display final warnings
      if (results.warnings.length > 0) {
        this.logger.info('\n' + chalk.yellow('⚠️  Overall Warnings:'));
        results.warnings.forEach((warning, index) => {
          this.logger.warn(`   ${index + 1}. ${warning}`);
        });
      }

      // Display errors
      if (results.errors.length > 0) {
        this.logger.info('\n' + chalk.red('❌ Errors:'));
        results.errors.forEach((error, index) => {
          this.logger.error(`   ${index + 1}. ${error}`);
        });
      }

    } catch (error) {
      this.logger.error(`Error in enhanced batch creation: ${error.message}`);
      results.errors.push(error.message);
      throw error;
    }

    return results;
  }
}