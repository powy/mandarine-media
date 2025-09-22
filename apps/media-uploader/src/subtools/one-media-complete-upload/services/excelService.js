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
          rowData[colNumber - 1] = cell.value;
        });
        filesData.push(rowData);
      });
      
      // Extract data from Description sheet
      const descriptionData = [];
      descriptionSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const rowData = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          rowData[colNumber - 1] = cell.value;
        });
        descriptionData.push(rowData);
      });
      
      return {
        files: this.parseFilesData(filesData),
        description: this.parseDescriptionData(descriptionData),
        workbook // Keep reference for later use
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
          // Store the actual value from column C using the key from column B
          description[key] = value || '';
          
          // Enhanced logging for debugging, especially for date fields
          if (value && value.toString().trim() !== '') {
            this.logger?.info(`Parsed ${key}: "${value}" (from row with description: "${frenchDescription}")`);

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
        const fileMappings = mediaAnalysisService.generateFileMappings(fileList);
        
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
}