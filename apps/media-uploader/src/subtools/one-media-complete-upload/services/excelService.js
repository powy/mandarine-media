import ExcelJS from 'exceljs';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExcelService {
  constructor(folderPath, logger) {
    this.folderPath = folderPath;
    this.logger = logger;
    // Default to new 0_desc template, with fallback to 0_list for backward compatibility
    this.templatePath = path.join(__dirname, '..', 'templates', '0_desc_template.xlsx');
    this.fallbackTemplatePath = path.join(__dirname, '..', 'templates', '0_list_template.xlsx');
  }

  /**
   * Extract plain text from Excel cell value, handling rich text objects
   * @param {any} cellValue - The cell value from ExcelJS
   * @returns {string|number} Plain text string or original number
   */
  extractCellText(cellValue) {
    if (!cellValue) return '';

    // Handle rich text objects
    if (cellValue.richText && Array.isArray(cellValue.richText)) {
      return cellValue.richText.map(part => part.text || '').join('');
    }

    // Keep numbers as-is to avoid breaking numeric fields
    if (typeof cellValue === 'number') return cellValue;

    // Convert everything else to string and trim
    return String(cellValue).trim();
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
        // Check for file lock errors (Windows EBUSY, EPERM, or specific Excel lock messages)
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
   * Rename file with retry mechanism for file lock handling
   * @param {string} oldPath - Current file path
   * @param {string} newPath - New file path
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {number} delay - Base delay in milliseconds between retries
   */
  async renameWithRetry(oldPath, newPath, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.rename(oldPath, newPath);
        return true;
      } catch (error) {
        // Check for file lock errors
        const isFileLocked = error.code === 'EBUSY' ||
                           error.code === 'EPERM' ||
                           error.message.includes('EBUSY') ||
                           error.message.includes('being used by another process');

        if (isFileLocked) {
          this.logger.warn(`File rename locked attempt ${attempt}/${maxRetries}: ${path.basename(oldPath)}`);

          if (attempt === maxRetries) {
            throw new Error(`File is locked by Excel or another application: ${path.basename(oldPath)}. Please close the file and try again.`);
          }

          // Exponential backoff
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

  async findExistingExcelFile() {
    try {
      const files = await fs.readdir(this.folderPath);

      // First try to find 0_desc files
      let excelFiles = files.filter(file =>
        file.startsWith('0_desc') && file.endsWith('.xlsx')
      );

      // If no 0_desc files found, fall back to 0_list for backward compatibility
      if (excelFiles.length === 0) {
        excelFiles = files.filter(file =>
          file.startsWith('0_list') && file.endsWith('.xlsx')
        );

        if (excelFiles.length > 0) {
          this.logger.warn(`Found legacy 0_list Excel file: ${excelFiles[0]}. Consider renaming to 0_desc pattern.`);
        }
      }

      if (excelFiles.length > 0) {
        const excelPath = path.join(this.folderPath, excelFiles[0]);
        this.logger.info(`Found existing Excel file: ${excelFiles[0]}`);
        return excelPath;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error searching for Excel files: ${error.message}`);
      throw error;
    }
  }

  async createExcelFromTemplate(folderName) {
    try {
      // Generate the auto Excel filename with new 0_desc pattern
      const sanitizedFolderName = folderName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      const excelFileName = `0_desc_${sanitizedFolderName}_auto.xlsx`;
      const targetPath = path.join(this.folderPath, excelFileName);

      // Check if template exists, fall back to legacy template if needed
      let templateExists = await fs.pathExists(this.templatePath);
      let finalTemplatePath = this.templatePath;

      if (!templateExists) {
        this.logger.warn(`Primary template not found at: ${this.templatePath}, checking fallback...`);
        templateExists = await fs.pathExists(this.fallbackTemplatePath);

        if (templateExists) {
          this.logger.info(`Using legacy template: ${this.fallbackTemplatePath}`);
          finalTemplatePath = this.fallbackTemplatePath;
        } else {
          throw new Error(`Template file not found at: ${this.templatePath} or ${this.fallbackTemplatePath}`);
        }
      }

      // Load template workbook with ExcelJS to preserve all formatting
      const templateWorkbook = new ExcelJS.Workbook();
      await templateWorkbook.xlsx.readFile(finalTemplatePath);

      // Save to target location - this preserves all formatting
      await templateWorkbook.xlsx.writeFile(targetPath);

      this.logger.info(`Created Excel file with preserved formatting: ${excelFileName}`);
      console.log(chalk.green(`✅ Created Excel file: ${excelFileName}`));

      return targetPath;
    } catch (error) {
      this.logger.error(`Error creating Excel from template: ${error.message}`);
      throw error;
    }
  }

  async createExcelFromSeasonTemplate(seasonExcelPath, folderName, targetFolder) {
    try {
      this.logger.info(`Creating episode Excel from season template: ${seasonExcelPath}`);

      // Generate the Excel filename for episode
      const sanitizedFolderName = folderName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      const excelFileName = `0_desc_${sanitizedFolderName}_auto.xlsx`;
      const targetPath = path.join(targetFolder, excelFileName);

      // Load season Excel as template
      this.logger.info(`🔍 DIAGNOSTIC: Loading season Excel from: ${seasonExcelPath}`);
      const seasonWorkbook = new ExcelJS.Workbook();
      await seasonWorkbook.xlsx.readFile(seasonExcelPath);
      this.logger.info(`✓ Season Excel workbook loaded successfully`);

      const descriptionSheet = seasonWorkbook.getWorksheet('Description');
      if (!descriptionSheet) {
        throw new Error('Description sheet not found in season Excel');
      }

      // DIAGNOSTIC: Dump ALL Description sheet data from loaded season Excel
      this.logger.info(`🔍 DIAGNOSTIC: Reading ALL Description sheet data from season Excel:`);
      const seasonDescriptionData = [];
      descriptionSheet.eachRow((row, rowNumber) => {
        const col1 = row.getCell(1).value;
        const col2 = row.getCell(2).value;
        const col3 = row.getCell(3).value;
        seasonDescriptionData.push({row: rowNumber, colA: col1, colB: col2, colC: col3});
        this.logger.info(`  Row ${rowNumber}: A="${col1}" | B="${col2}" | C="${col3}"`);
      });
      this.logger.info(`📊 Total Description sheet rows in season Excel: ${seasonDescriptionData.length}`);

      // Extract episode number from folder name if numeric
      const episodeNumber = this.extractEpisodeNumber(folderName);
      if (episodeNumber !== null) {
        this.logger.info(`Extracted episode number from folder name "${folderName}": ${episodeNumber}`);
      } else {
        this.logger.warn(`Could not extract episode number from folder name "${folderName}" (non-numeric folder name)`);
      }

      // Get season name from the template
      let seasonName = null;
      descriptionSheet.eachRow((row) => {
        const keyCell = row.getCell(2);
        const valueCell = row.getCell(3);
        if (keyCell.value && keyCell.value.toString() === 'season_name') {
          seasonName = valueCell.value ? valueCell.value.toString() : null;
          this.logger.info(`Found season_name in Description sheet: "${seasonName}"`);
        }
      });

      if (!seasonName) {
        this.logger.warn('season_name not found or empty in season Excel Description sheet');
      }

      // Update episode-specific fields in Description sheet
      // FIX: Use two-pass approach to ensure cell modifications persist
      // Pass 1: Build a map of keys to row numbers
      // Pass 2: Update cells using direct row access (proven working pattern)
      this.logger.info(`Processing episode: folder="${folderName}", episodeNumber=${episodeNumber}, seasonName="${seasonName}"`);

      const rowMap = new Map();
      descriptionSheet.eachRow((row, rowNumber) => {
        const keyCell = row.getCell(2);
        if (keyCell.value) {
          const key = keyCell.value.toString();
          rowMap.set(key, rowNumber);
        }
      });

      this.logger.info(`Description sheet contains ${rowMap.size} keys: ${Array.from(rowMap.keys()).join(', ')}`);

      // Update episode_title
      if (rowMap.has('episode_title')) {
        if (episodeNumber !== null && seasonName) {
          const row = descriptionSheet.getRow(rowMap.get('episode_title'));
          row.getCell(3).value = `${seasonName} episode ${episodeNumber}`;
          this.logger.info(`✓ Set episode_title = "${seasonName} episode ${episodeNumber}"`);
        } else {
          this.logger.warn(`✗ Cannot set episode_title (episodeNumber=${episodeNumber}, seasonName="${seasonName}")`);
        }
      } else {
        this.logger.warn('✗ Key "episode_title" not found in season Excel Description sheet');
      }

      // Update slug
      if (rowMap.has('slug')) {
        if (episodeNumber !== null && seasonName) {
          const row = descriptionSheet.getRow(rowMap.get('slug'));
          const baseSlug = seasonName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
          row.getCell(3).value = `${baseSlug}-episode-${episodeNumber}`;
          this.logger.info(`✓ Set slug = "${baseSlug}-episode-${episodeNumber}"`);
        } else {
          this.logger.warn(`✗ Cannot set slug (episodeNumber=${episodeNumber}, seasonName="${seasonName}")`);
        }
      } else {
        this.logger.warn('✗ Key "slug" not found in season Excel Description sheet');
      }

      // Update episode_number
      if (rowMap.has('episode_number')) {
        if (episodeNumber !== null) {
          const row = descriptionSheet.getRow(rowMap.get('episode_number'));
          row.getCell(3).value = episodeNumber;
          this.logger.info(`✓ Set episode_number = "${episodeNumber}"`);
        } else {
          this.logger.warn(`✗ Cannot set episode_number (episodeNumber=${episodeNumber}, folder="${folderName}")`);
        }
      } else {
        this.logger.warn('✗ Key "episode_number" not found in season Excel Description sheet');
      }

      // Update media_type (unconditional - episodes are always videos)
      if (rowMap.has('media_type')) {
        const row = descriptionSheet.getRow(rowMap.get('media_type'));
        row.getCell(3).value = 'video';
        this.logger.info('✓ Set media_type = "video"');
      } else {
        this.logger.warn('✗ Key "media_type" not found in season Excel Description sheet');
      }

      // Remove the ID line from Description sheet (episodes get their own ID when uploaded)
      const rowsToDelete = [];
      descriptionSheet.eachRow((row, rowNumber) => {
        const keyCell = row.getCell(2);
        if (keyCell.value && keyCell.value.toString().toLowerCase() === 'id') {
          rowsToDelete.push(rowNumber);
        }
      });

      // Delete rows in reverse order to maintain correct row numbers
      rowsToDelete.reverse().forEach(rowNumber => {
        descriptionSheet.spliceRows(rowNumber, 1);
        this.logger.info(`Removed ID line (row ${rowNumber}) from episode Description sheet`);
      });

      // Clear the Files sheet data (columns B-F) while keeping structure
      // BUT delete entire row if row type is "ID" (same logic as Description sheet)
      const filesSheet = seasonWorkbook.getWorksheet('Files');
      if (filesSheet) {
        const filesRowsToDelete = [];

        filesSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber > 1) { // Skip header row
            const rowTypeCell = row.getCell(1);
            const rowType = rowTypeCell.value?.toString().toLowerCase();

            // Check if this is an ID row - if so, mark for deletion
            if (rowType === 'id') {
              filesRowsToDelete.push(rowNumber);
            } else {
              // For non-ID rows, clear data cells (columns 2-6) while keeping row type label
              row.getCell(2).value = null; // File name
              row.getCell(3).value = null; // Poster
              row.getCell(4).value = null; // Fr subtitle
              row.getCell(5).value = null; // En subtitle
              row.getCell(6).value = null; // Ko Subtitle
            }
          }
        });

        // Delete ID rows in reverse order to maintain correct row numbers
        if (filesRowsToDelete.length > 0) {
          filesRowsToDelete.reverse().forEach(rowNumber => {
            filesSheet.spliceRows(rowNumber, 1);
            this.logger.info(`Removed ID row (row ${rowNumber}) from episode Files sheet`);
          });
        }

        this.logger.info('Cleared Files sheet data from season template - keeping row structure for auto-fill');
      }

      // DIAGNOSTIC: Dump Description sheet data BEFORE saving to verify what will be saved
      this.logger.info(`🔍 DIAGNOSTIC: Verifying Description sheet data BEFORE save:`);
      const finalDescriptionData = [];
      descriptionSheet.eachRow((row, rowNumber) => {
        const col1 = row.getCell(1).value;
        const col2 = row.getCell(2).value;
        const col3 = row.getCell(3).value;
        finalDescriptionData.push({row: rowNumber, colA: col1, colB: col2, colC: col3});
        this.logger.info(`  Row ${rowNumber}: A="${col1}" | B="${col2}" | C="${col3}"`);
      });
      this.logger.info(`📊 Total Description sheet rows BEFORE save: ${finalDescriptionData.length}`);

      // Save the episode Excel file
      this.logger.info(`💾 Saving episode Excel to: ${targetPath}`);
      await seasonWorkbook.xlsx.writeFile(targetPath);
      this.logger.info(`✅ Episode Excel file saved successfully`);

      this.logger.info(`Created episode Excel from season template: ${excelFileName}`);
      console.log(chalk.green(`✅ Created episode Excel from season: ${excelFileName}`));

      return targetPath;
    } catch (error) {
      this.logger.error(`Error creating Excel from season template: ${error.message}`);
      throw error;
    }
  }

  extractEpisodeNumber(folderName) {
    // Check if folder name is numeric (possibly with leading zeros)
    // Return as string to preserve leading zeros (e.g., "09" stays "09", not 9)
    if (/^\d+$/.test(folderName)) {
      return folderName;
    }
    return null;
  }

  async readExcelFile(excelPath) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      // Check for required sheets
      const filesSheet = workbook.getWorksheet('Files');
      const descriptionSheet = workbook.getWorksheet('Description');
      
      if (!filesSheet || !descriptionSheet) {
        throw new Error('Excel file must contain "Files" and "Description" sheets');
      }
      
      // Extract data from Files sheet
      const filesData = [];
      filesSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const rowData = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          rowData[colNumber - 1] = this.extractCellText(cell.value);
        });
        filesData.push(rowData);
      });
      
      // Extract data from Description sheet
      const descriptionData = [];
      descriptionSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const rowData = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          rowData[colNumber - 1] = this.extractCellText(cell.value);
        });
        descriptionData.push(rowData);
      });
      
      return {
        files: this.parseFilesData(filesData),
        description: this.parseDescriptionData(descriptionData)
        // Note: workbook object removed - it has circular references and cannot be JSON stringified
        // The workbook is only needed internally during Excel operations, not in return values
      };
    } catch (error) {
      this.logger.error(`Error reading Excel file: ${error.message}`);
      throw error;
    }
  }

  parseFilesData(data) {
    if (data.length < 2) return [];
    
    const headers = data[0]; // ['Files', 'File name', 'Poster', 'Fr subtitle', 'En subtitle', 'Ko Subtitle']
    const files = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row.length > 0 && row[0]) { // Check if row has data in first column
        const file = {
          type: row[0] || '',           // Files column (Video, Trailer 1, etc.)
          fileName: row[1] || '',       // File name column
          poster: row[2] || '',         // Poster column
          frSubtitle: row[3] || '',     // Fr subtitle column
          enSubtitle: row[4] || '',     // En subtitle column
          koSubtitle: row[5] || '',     // Ko Subtitle column
          status: 'Pending',            // Default status
          uploadedFiles: {}             // Track uploaded file paths
        };
        files.push(file);
      }
    }
    
    return files;
  }

  parseDescriptionData(data) {
    const description = {};
    
    // Updated template structure: Row format is [description, key, value]
    // Column A: French description, Column B: Technical key, Column C: Actual value
    // Skip header rows (Settings, empty rows, Presentation)
    let inSettingsSection = false;
    let inPresentationSection = false;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      if (row && row[0] === 'Settings') {
        inSettingsSection = true;
        continue;
      }
      
      if (row && row[0] === 'Presentation') {
        inSettingsSection = false;
        inPresentationSection = true;
        continue;
      }
      
      // Parse data rows with correct structure: [description, key, value]
      // Column A: French description (for human readability)
      // Column B: Technical key (program_name, episode_number, etc.)
      // Column C: Actual value (the data we need)
      if (row && row.length >= 3 && row[1] && row[2] !== undefined) {
        const frenchDescription = row[0];  // e.g., 'Titre du programme' (for reference)
        const key = row[1];                // e.g., 'program_name' (technical key)
        const value = row[2];              // e.g., 'pompom bag program' (actual value)

        if (key && typeof key === 'string') {
          // IMPORTANT: Only set non-empty values to avoid overwriting populated fields
          // This handles duplicate keys in Excel where an empty row might overwrite a good value
          const valueStr = value?.toString().trim() || '';

          if (valueStr !== '') {
            // Store the actual value from column C using the key from column B
            description[key] = value;

            // Enhanced logging for debugging, especially for date fields
            this.logger?.info(`Parsed ${key}: "${value}" (from row with description: "${frenchDescription}")`);
          } else {
            // Don't overwrite existing values with empty ones
            if (!description[key]) {
              description[key] = '';
            }
          }
        }
      }
    }

    // Post-process to normalize policy field names
    this.normalizePolicyField(description);

    return description;
  }

  /**
   * Normalize policy field names - check for policy, policies, or playback_policies
   * and store the value consistently as 'policy'
   */
  normalizePolicyField(description) {
    const policyFields = ['policy', 'policies', 'playback_policies'];
    let policyValue = null;
    let foundField = null;

    // Check for any of the policy field variants
    for (const field of policyFields) {
      if (description[field] && description[field].toString().trim() !== '') {
        policyValue = description[field].toString().trim();
        foundField = field;
        break;
      }
    }

    if (policyValue) {
      // Store the policy value under the standard 'policy' key
      description.policy = policyValue;

      // Clean up other policy field variants if they exist
      policyFields.forEach(field => {
        if (field !== 'policy' && description[field]) {
          delete description[field];
        }
      });

      if (this.logger) {
        this.logger.info(`Policy field normalized: found "${foundField}" with value "${policyValue}", stored as "policy"`);
      }
    } else if (this.logger) {
      this.logger.warn('No policy field found. Checked: policy, policies, playback_policies');
    }
  }

  async updateExcelFile(excelPath, updates) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      if (updates.files) {
        // Update Files sheet while preserving formatting
        const filesSheet = workbook.getWorksheet('Files');
        const headers = ['File Name', 'File Path', 'Type', 'Size', 'Status', 'Mux Asset ID', 'S3 URL', 'Notes'];
        
        // Clear existing data but keep headers and formatting
        const headerRow = filesSheet.getRow(1);
        headers.forEach((header, index) => {
          headerRow.getCell(index + 1).value = header;
        });
        
        // Add new file data starting from row 2
        updates.files.forEach((file, index) => {
          const row = filesSheet.getRow(index + 2);
          row.getCell(1).value = file['File Name'] || '';
          row.getCell(2).value = file['File Path'] || '';
          row.getCell(3).value = file['Type'] || '';
          row.getCell(4).value = file['Size'] || '';
          row.getCell(5).value = file['Status'] || '';
          row.getCell(6).value = file['Mux Asset ID'] || '';
          row.getCell(7).value = file['S3 URL'] || '';
          row.getCell(8).value = file['Notes'] || '';
        });
      }
      
      if (updates.description) {
        // Update Description sheet while preserving formatting
        const descriptionSheet = workbook.getWorksheet('Description');
        
        Object.entries(updates.description).forEach(([key, value]) => {
          descriptionSheet.eachRow((row, rowNumber) => {
            const firstCell = row.getCell(1);
            if (firstCell.value && firstCell.value.toString().toLowerCase().replace(/\s/g, '') === key.toLowerCase()) {
              row.getCell(2).value = value;
            }
          });
        });
      }
      
      // Save the updated workbook with preserved formatting
      await workbook.xlsx.writeFile(excelPath);
      
      this.logger.info('Excel file updated successfully with preserved formatting');
    } catch (error) {
      this.logger.error(`Error updating Excel file: ${error.message}`);
      throw error;
    }
  }

  async populateInitialFileList(excelPath, fileList, mediaAnalysisService) {
    try {
      const totalFiles = fileList.videos.length + fileList.images.length + fileList.subtitles.length;
      
      this.logger.info(`Excel template ready. Found ${totalFiles} files in folder for auto-fill:`);
      this.logger.info(`  Videos: ${fileList.videos.map(v => v.name).join(', ')}`);
      this.logger.info(`  Images: ${fileList.images.map(i => i.name).join(', ')}`);
      this.logger.info(`  Subtitles: ${fileList.subtitles.map(s => s.name).join(', ')}`);
      
      // Generate intelligent file mappings and auto-fill the Files sheet immediately
      if (mediaAnalysisService && totalFiles > 0) {
        this.logger.info(`Performing immediate auto-fill of Files sheet...`);
        
        // Generate file mappings using MediaAnalysisService
        const fileMappings = await mediaAnalysisService.generateFileMappings(fileList);
        
        // Apply mappings to Excel file with preserved formatting
        await this.autoFillFilesSheet(excelPath, fileMappings);
        
        // Log what was auto-filled
        const filledEntries = Object.entries(fileMappings).filter(([key, mapping]) => 
          mapping.fileName || mapping.poster || mapping.frSubtitle || mapping.enSubtitle || mapping.koSubtitle
        );
        
        if (filledEntries.length > 0) {
          this.logger.info(`Auto-filled ${filledEntries.length} entries in Files sheet`);
          filledEntries.forEach(([rowType, mapping]) => {
            const parts = [];
            if (mapping.fileName) parts.push(`Video: ${mapping.fileName}`);
            if (mapping.poster) parts.push(`Poster: ${mapping.poster}`);
            if (mapping.frSubtitle) parts.push(`FR: ${mapping.frSubtitle}`);
            if (mapping.enSubtitle) parts.push(`EN: ${mapping.enSubtitle}`);
            if (mapping.koSubtitle) parts.push(`KO: ${mapping.koSubtitle}`);
            
            if (parts.length > 0) {
              this.logger.info(`  ${rowType}: ${parts.join(', ')}`);
            }
          });
        } else {
          this.logger.info(`No matching files found for auto-fill patterns`);
        }
      } else {
        this.logger.info(`No MediaAnalysisService provided or no files found - skipping auto-fill`);
      }
      
      this.logger.info(`Template created with Files sheet auto-populated`);
    } catch (error) {
      this.logger.error(`Error with file list auto-fill: ${error.message}`);
      throw error;
    }
  }

  getFileTypeLabel(extension) {
    const ext = extension.toLowerCase();
    
    if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'Video';
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) return 'Image';
    if (['.srt', '.vtt', '.ass', '.ssa'].includes(ext)) return 'Subtitle';
    
    return 'Other';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if the Files sheet is empty (only has template structure)
   */
  isFilesSheetEmpty(filesData) {
    if (!filesData || filesData.length === 0) return true;
    
    // Check if any row has actual file data
    return filesData.every(file => 
      !file.fileName && 
      !file.poster && 
      !file.frSubtitle && 
      !file.enSubtitle && 
      !file.koSubtitle
    );
  }

  /**
   * Auto-fill the Files sheet with intelligent mappings while preserving ALL formatting
   */
  async autoFillFilesSheet(excelPath, fileMappings) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      const filesSheet = workbook.getWorksheet('Files');
      if (!filesSheet) {
        throw new Error('Files sheet not found');
      }
      
      // Iterate through each row and update values while preserving ALL formatting
      filesSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const firstCell = row.getCell(1);
        if (firstCell.value) {
          const rowType = firstCell.value.toString();
          const mapping = fileMappings[rowType];
          
          if (mapping) {
            // Update cells while preserving their existing formatting
            if (mapping.fileName) {
              const fileNameCell = row.getCell(2);
              fileNameCell.value = mapping.fileName;
              // All formatting (fonts, borders, colors, etc.) is preserved
            }
            
            if (mapping.poster) {
              const posterCell = row.getCell(3);
              posterCell.value = mapping.poster;
            }
            
            if (mapping.frSubtitle) {
              const frSubtitleCell = row.getCell(4);
              frSubtitleCell.value = mapping.frSubtitle;
            }
            
            if (mapping.enSubtitle) {
              const enSubtitleCell = row.getCell(5);
              enSubtitleCell.value = mapping.enSubtitle;
            }
            
            if (mapping.koSubtitle) {
              const koSubtitleCell = row.getCell(6);
              koSubtitleCell.value = mapping.koSubtitle;
            }
            
            if (mapping.fileName || mapping.poster || mapping.frSubtitle || mapping.enSubtitle || mapping.koSubtitle) {
              this.logger.info(`Auto-filled ${rowType}: ${JSON.stringify(mapping)}`);
            }
          }
        }
      });
      
      // Save the workbook - all original formatting is preserved
      await workbook.xlsx.writeFile(excelPath);
      
      this.logger.info('Files sheet auto-filled successfully with preserved formatting');
      return true;
    } catch (error) {
      this.logger.error(`Error auto-filling Files sheet: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save media_description ID to the Description sheet
   * Adds a new row 1 with format: A1="ID", B1="id", C1=uuid_value
   */
  async saveMediaDescriptionToExcel(excelPath, mediaDescriptionId) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      const descriptionSheet = workbook.getWorksheet('Description');
      if (!descriptionSheet) {
        throw new Error('Description sheet not found');
      }
      
      // Insert a new row at the top (row 1)
      descriptionSheet.insertRow(1);
      
      // Set the new row 1 with media_description data
      const newRow = descriptionSheet.getRow(1);
      newRow.getCell(1).value = 'ID';
      newRow.getCell(2).value = 'id';
      newRow.getCell(3).value = mediaDescriptionId;
      
      // Apply basic formatting to the new row
      newRow.getCell(1).font = { bold: true };
      newRow.getCell(2).font = { bold: true };
      newRow.getCell(3).font = { bold: true };
      
      // Save the workbook with retry mechanism
      await this.saveWithRetry(workbook, excelPath);
      
      this.logger.info(`Saved media_description ID "${mediaDescriptionId}" to Description sheet`);
      return true;
    } catch (error) {
      this.logger.error(`Error saving media_description ID to Excel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rename Excel file by adding "_uploaded" suffix
   */
  async renameExcelFile(excelPath) {
    try {
      const parsedPath = path.parse(excelPath);
      const newFileName = `${parsedPath.name}_uploaded${parsedPath.ext}`;
      const newFilePath = path.join(parsedPath.dir, newFileName);
      
      // Check if the new file already exists
      if (await fs.pathExists(newFilePath)) {
        this.logger.warn(`File already exists: ${newFileName}, skipping rename`);
        return excelPath; // Return original path if rename not possible
      }
      
      // Rename the file with retry for file lock handling
      await this.renameWithRetry(excelPath, newFilePath);

      this.logger.info(`Renamed Excel file: ${parsedPath.base} -> ${newFileName}`);
      return newFilePath;
    } catch (error) {
      // Check if it's a file lock error and provide user-friendly message
      const isFileLocked = error.code === 'EBUSY' ||
                         error.code === 'EPERM' ||
                         error.message.includes('being used by another process') ||
                         error.message.includes('File is locked');

      if (isFileLocked) {
        this.logger.warn(`Cannot rename file - it's locked by Excel: ${parsedPath.base}. Keeping original name.`);
        return excelPath; // Return original path instead of failing
      }

      this.logger.error(`Error renaming Excel file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find media description ID from Excel Description sheet
   * Used for subtitle-specific uploads to get the media ID for server integration
   * @returns {string|null} - Media description ID or null if not found
   */
  async findMediaDescriptionId() {
    try {
      // Find existing Excel file
      const excelPath = await this.findExistingExcelFile();
      if (!excelPath) {
        this.logger.warn('No Excel file found in folder for media ID lookup');
        return null;
      }

      // Read Excel file
      const excelData = await this.readExcelFile(excelPath);

      // Look for 'id' field in description data (primary field)
      if (excelData.description && excelData.description.id) {
        this.logger.info(`Found media description ID: ${excelData.description.id}`);
        return excelData.description.id;
      }

      // Alternative: look for other possible ID fields
      const possibleIdFields = ['media_description_id', 'media_id', 'description_id', 'uuid', 'guid'];
      for (const field of possibleIdFields) {
        if (excelData.description && excelData.description[field]) {
          this.logger.info(`Found media ID in field '${field}': ${excelData.description[field]}`);
          return excelData.description[field];
        }
      }

      this.logger.warn('No media description ID found in Excel Description sheet');
      this.logger.info('Available description fields:', Object.keys(excelData.description || {}));
      return null;

    } catch (error) {
      this.logger.error(`Error looking up media description ID from Excel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if Excel file contains media description ID
   * @returns {boolean} - True if media ID is available
   */
  async hasMediaDescriptionId() {
    try {
      const mediaId = await this.findMediaDescriptionId();
      return !!mediaId;
    } catch (error) {
      this.logger.warn(`Could not check for media description ID: ${error.message}`);
      return false;
    }
  }

  /**
   * Get media description info for subtitle uploads
   * @returns {Object} - Object with media ID and related info
   */
  async getMediaDescriptionInfo() {
    try {
      const excelPath = await this.findExistingExcelFile();
      if (!excelPath) {
        return { hasExcel: false, mediaId: null, excelPath: null };
      }

      const mediaId = await this.findMediaDescriptionId();

      return {
        hasExcel: true,
        mediaId,
        excelPath,
        hasMediaId: !!mediaId
      };
    } catch (error) {
      this.logger.error(`Error getting media description info: ${error.message}`);
      return { hasExcel: false, mediaId: null, excelPath: null, error: error.message };
    }
  }
}