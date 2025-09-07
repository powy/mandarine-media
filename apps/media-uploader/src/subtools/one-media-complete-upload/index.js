#!/usr/bin/env node

import { validateConfig } from './schemas/configSchema.js';
import { createLogger } from './config/logger.js';
import { loadJsonFile, scanFolder, findExcelFiles } from './utils/fileUtils.js';
import { ExcelService } from './services/excelService.js';
import { OrchestrationService } from './services/orchestrationService.js';
import { MediaAnalysisService } from './services/mediaAnalysisService.js';
import { ValidationService } from './services/validationService.js';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { pathToFileURL } from 'url';

export class OneMediaCompleteUpload {
  constructor(options) {
    this.options = options;
    this.config = null;
    this.logger = null;
    this.excelService = null;
    this.orchestrationService = null;
    this.mediaAnalysisService = null;
    this.validationService = null;
  }

  async run() {
    let mediaFiles = null;
    
    try {
      console.log(chalk.blue.bold('\n📦 One Media Complete Upload Tool\n'));
      
      // Load and validate configuration
      await this.loadConfiguration();
      
      // Initialize services
      this.initializeServices();
      
      // Validate folder path
      await this.validateFolderPath();
      
      // Scan folder for media files
      mediaFiles = await this.scanMediaFiles();
      
      // Check for Excel file
      const excelResult = await this.handleExcelFile();
      
      // If handleExcelFile returns an object with newlyCreated flag, we know it was just created and auto-filled
      let excelPath, isNewlyCreated = false;
      if (typeof excelResult === 'object' && excelResult.path) {
        excelPath = excelResult.path;
        isNewlyCreated = excelResult.newlyCreated;
      } else {
        excelPath = excelResult;
      }
      
      if (!excelPath) {
        // This shouldn't happen anymore, but keep for safety
        return { 
          success: true, 
          message: 'Excel template created. Please fill it and run again.',
          phase: 'template-creation'
        };
      }
      
      // Read Excel data
      const excelData = await this.excelService.readExcelFile(excelPath);
      
      // Only check for auto-fill if this is an existing file, not a newly created one
      if (!isNewlyCreated) {
        const shouldAutoFill = this.excelService.isFilesSheetEmpty(excelData.files);
        
        if (shouldAutoFill) {
          console.log(chalk.yellow('📋 Files sheet is empty. Running auto-fill analysis...'));
          await this.performAutoFill(excelPath, mediaFiles);
          
          // Re-read the Excel data after auto-fill
          const updatedExcelData = await this.excelService.readExcelFile(excelPath);
          
          return {
            success: true,
            message: 'Files sheet auto-filled with intelligent mappings. Please review and run again.',
            phase: 'auto-filled',
            data: {
              mediaFiles,
              excelData: updatedExcelData,
              excelPath
            }
          };
        }
      } else {
        // For newly created files, show that it's ready for review
        return {
          success: true,
          message: 'Excel template created with Files sheet auto-filled. Please fill Description sheet and run again.',
          phase: 'template-created-and-filled',
          data: {
            mediaFiles,
            excelData,
            excelPath
          }
        };
      }
      
      // Perform comprehensive validation before upload
      console.log(chalk.blue('\n🔍 Validating data and files...'));
      const validationResult = await this.validationService.validateComplete(
        excelData, 
        mediaFiles, 
        this.options.folder
      );
      
      if (!validationResult.valid) {
        console.log(chalk.red('❌ Validation failed:'));
        validationResult.context.validationErrors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
        
        if (validationResult.context.missingFiles.length > 0) {
          console.log(chalk.red('\n📋 Missing files:'));
          validationResult.context.missingFiles.forEach(file => {
            console.log(chalk.red(`  • ${file.name} (${file.type})`));
          });
        }
        
        return this.validationService.createErrorReport(
          validationResult.context, 
          ['Upload cannot proceed due to validation errors']
        );
      }
      
      console.log(chalk.green('✅ Validation passed'));
      
      // Check for existing duplicates before starting uploads
      console.log(chalk.cyan('\n🔍 Checking for existing media descriptions...'));
      const duplicateCheck = await this.orchestrationService.checkForDuplicates(excelData.description);
      
      if (!duplicateCheck.success) {
        console.log(chalk.red(`❌ Duplicate check failed: ${duplicateCheck.error}`));
        return this.validationService.createErrorReport(
          validationResult.context,
          [`Duplicate check failed: ${duplicateCheck.error}`]
        );
      }
      
      const { duplicates } = duplicateCheck;
      
      // Check for slug duplicates (blocking error)
      if (duplicates.bySlug) {
        console.log(chalk.red(`❌ Duplicate slug found: "${excelData.description.slug}"`));
        console.log(chalk.yellow(`   Existing media description ID: ${duplicates.bySlug.id}`));
        if (duplicates.bySlug.creation_date_utc) {
          console.log(chalk.yellow(`   Created: ${duplicates.bySlug.creation_date_utc}`));
        }
        console.log(chalk.cyan('\n   Please either:'));
        console.log(chalk.cyan('   1. Change the slug in your Excel file'));
        console.log(chalk.cyan('   2. Delete the existing media description'));
        console.log(chalk.cyan(`   3. Use a different slug (e.g., "${excelData.description.slug}_v2")`));
        
        return this.validationService.createErrorReport(
          validationResult.context,
          [
            `Duplicate slug exists: "${excelData.description.slug}"`,
            `Existing record ID: ${duplicates.bySlug.id}`,
            'Change the slug in your Excel file or delete the existing record'
          ]
        );
      }
      
      // Check for title duplicates (warning only)
      if (duplicates.byTitle) {
        console.log(chalk.yellow(`⚠️  Warning: Similar episode title exists: "${duplicates.byTitle.episode_title}"`));
        console.log(chalk.yellow(`   Existing media description ID: ${duplicates.byTitle.id}`));
        console.log(chalk.gray('   This is just a warning - continuing with upload...'));
      }
      
      if (!duplicates.bySlug && !duplicates.byTitle) {
        console.log(chalk.green(`✅ No duplicates found (checked ${duplicateCheck.totalChecked} records)`));
      }
      
      // Begin upload process
      console.log(chalk.blue('\n🚀 Starting upload process...'));
      const uploadResults = await this.orchestrationService.processUploads(
        excelData, 
        mediaFiles, 
        this.options.folder
      );
      
      if (uploadResults.success) {
        // Success - display final results
        console.log(chalk.green.bold('\n🎉 Upload completed successfully!'));
        console.log(chalk.green(`📄 Media Description ID: ${chalk.white(uploadResults.mediaDescriptionId)}`));
        
        // Show upload summary
        const { uploads } = uploadResults;
        if (uploads.videos.length > 0) {
          console.log(chalk.cyan(`\n🎬 Videos uploaded: ${uploads.videos.length}`));
          uploads.videos.forEach(video => {
            console.log(chalk.gray(`  • ${video.fileName} → Asset: ${video.assetId}`));
          });
        }
        
        if (uploads.images.length > 0) {
          console.log(chalk.cyan(`\n🖼️  Images uploaded: ${uploads.images.length}`));
          uploads.images.forEach(image => {
            console.log(chalk.gray(`  • ${image.fileName} → ${image.dimensions || 'unknown size'}`));
          });
        }
        
        if (uploads.subtitles.length > 0) {
          console.log(chalk.cyan(`\n📝 Subtitles uploaded: ${uploads.subtitles.length}`));
          uploads.subtitles.forEach(subtitle => {
            console.log(chalk.gray(`  • ${subtitle.fileName} (${subtitle.language})`));
          });
        }
        
        return {
          success: true,
          message: `Upload completed successfully! Media Description ID: ${uploadResults.mediaDescriptionId}`,
          phase: 'completed',
          mediaDescriptionId: uploadResults.mediaDescriptionId,
          data: uploadResults
        };
        
      } else {
        // Upload failed - return detailed error context
        console.log(chalk.red.bold('\n❌ Upload failed'));
        
        if (uploadResults.errors.length > 0) {
          console.log(chalk.red('\n📋 Errors encountered:'));
          uploadResults.errors.forEach(error => {
            console.log(chalk.red(`  • ${error}`));
          });
        }
        
        return {
          success: false,
          error: `Upload failed with ${uploadResults.errors.length} error(s)`,
          phase: 'upload-failed',
          context: {
            ...uploadResults.context,
            uploadErrors: uploadResults.errors,
            partialResults: {
              videosUploaded: uploadResults.uploads.videos.length,
              imagesUploaded: uploadResults.uploads.images.length,
              subtitlesUploaded: uploadResults.uploads.subtitles.length
            },
            summary: {
              totalErrors: uploadResults.errors.length,
              filesFound: uploadResults.context.filesFound.total,
              hasDescription: !!uploadResults.context.excelData?.description,
              hasFiles: !!(uploadResults.context.excelData?.files && uploadResults.context.excelData.files.length > 0),
              mediaDescriptionCreated: !!uploadResults.mediaDescriptionId
            }
          }
        };
      }
      
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Upload process failed: ${error.message}`);
      }
      console.error(chalk.red(`❌ Unexpected error: ${error.message}`));
      
      // Return comprehensive error context even for unexpected errors
      return {
        success: false,
        error: `Unexpected error: ${error.message}`,
        phase: 'unexpected-error',
        context: {
          folderPath: this.options.folder,
          errorDetails: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          },
          filesFound: mediaFiles ? this.buildFilesContext(mediaFiles) : null,
          configPath: this.options.config,
          summary: {
            phase: 'crashed-during-execution',
            hasConfig: !!this.config,
            hasServices: !!(this.excelService && this.orchestrationService),
            folderExists: await fs.pathExists(this.options.folder).catch(() => false)
          }
        }
      };
    }
  }

  async loadConfiguration() {
    try {
      console.log(chalk.gray(`Loading configuration from: ${this.options.config}`));
      
      const configData = await loadJsonFile(this.options.config);
      this.config = validateConfig(configData);
      
      // Initialize logger after config is loaded
      this.logger = createLogger(this.config);
      this.logger.info('Configuration loaded and validated successfully');
      
      console.log(chalk.green('✅ Configuration loaded successfully'));
    } catch (error) {
      throw new Error(`Configuration error: ${error.message}`);
    }
  }

  initializeServices() {
    this.excelService = new ExcelService(this.options.folder, this.logger);
    this.orchestrationService = new OrchestrationService(this.config, this.logger);
    this.mediaAnalysisService = new MediaAnalysisService(this.logger);
    this.validationService = new ValidationService(this.logger);
    this.logger.info('Services initialized');
  }

  async validateFolderPath() {
    try {
      const folderExists = await fs.pathExists(this.options.folder);
      if (!folderExists) {
        throw new Error(`Folder does not exist: ${this.options.folder}`);
      }
      
      const stat = await fs.stat(this.options.folder);
      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${this.options.folder}`);
      }
      
      console.log(chalk.green(`✅ Folder validated: ${this.options.folder}`));
      this.logger.info(`Folder validated: ${this.options.folder}`);
    } catch (error) {
      throw new Error(`Folder validation failed: ${error.message}`);
    }
  }

  async scanMediaFiles() {
    try {
      console.log(chalk.gray('Scanning folder for media files...'));
      
      const mediaFiles = await scanFolder(this.options.folder);
      
      console.log(chalk.green(`✅ Found ${mediaFiles.videos.length} videos, ${mediaFiles.images.length} images, ${mediaFiles.subtitles.length} subtitles`));
      this.logger.info(`Media scan complete: ${mediaFiles.videos.length} videos, ${mediaFiles.images.length} images, ${mediaFiles.subtitles.length} subtitles`);
      
      if (this.options.verbose) {
        if (mediaFiles.videos.length > 0) {
          console.log(chalk.blue('\n📹 Videos found:'));
          mediaFiles.videos.forEach(video => {
            console.log(chalk.gray(`  - ${video.name} (${this.formatFileSize(video.size)})`));
          });
        }
        
        if (mediaFiles.images.length > 0) {
          console.log(chalk.blue('\n🖼️  Images found:'));
          mediaFiles.images.forEach(image => {
            console.log(chalk.gray(`  - ${image.name} (${this.formatFileSize(image.size)})`));
          });
        }
        
        if (mediaFiles.subtitles.length > 0) {
          console.log(chalk.blue('\n📝 Subtitles found:'));
          mediaFiles.subtitles.forEach(subtitle => {
            console.log(chalk.gray(`  - ${subtitle.name} (${this.formatFileSize(subtitle.size)})`));
          });
        }
      }
      
      return mediaFiles;
    } catch (error) {
      throw new Error(`Media scan failed: ${error.message}`);
    }
  }

  async handleExcelFile() {
    try {
      console.log(chalk.gray('Checking for Excel file...'));
      
      // Look for existing Excel file
      const existingExcel = await this.excelService.findExistingExcelFile();
      
      if (existingExcel) {
        console.log(chalk.green(`✅ Found existing Excel file: ${path.basename(existingExcel)}`));
        return existingExcel;
      }
      
      // Create new Excel file from template
      console.log(chalk.yellow('📄 No Excel file found. Creating from template...'));
      
      const folderName = path.basename(this.options.folder);
      const newExcelPath = await this.excelService.createExcelFromTemplate(folderName);
      
      // Populate with initial file list and auto-fill Files sheet
      const mediaFiles = await scanFolder(this.options.folder);
      await this.excelService.populateInitialFileList(newExcelPath, mediaFiles, this.mediaAnalysisService);
      
      console.log(chalk.green(`✅ Excel template created with Files sheet auto-filled: ${path.basename(newExcelPath)}`));
      console.log(chalk.yellow(`\n⏸️  Please fill the Description sheet and run the command again:`));
      console.log(chalk.white(`   ${path.basename(newExcelPath)}`));
      console.log(chalk.gray(`\n   Excel file location: ${newExcelPath}`));
      console.log(chalk.gray(`   Fill the "Description" sheet with metadata`));
      console.log(chalk.gray(`   Review the "Files" sheet for accuracy`));
      
      return { path: newExcelPath, newlyCreated: true }; // Return object indicating new file
    } catch (error) {
      throw new Error(`Excel handling failed: ${error.message}`);
    }
  }

  async performAutoFill(excelPath, mediaFiles) {
    try {
      console.log(chalk.gray('Analyzing media files for intelligent mapping...'));
      
      // Generate file mappings using MediaAnalysisService
      const fileMappings = this.mediaAnalysisService.generateFileMappings(mediaFiles);
      
      // Apply mappings to Excel file
      await this.excelService.autoFillFilesSheet(excelPath, fileMappings);
      
      // Show user what was auto-filled
      const filledEntries = Object.entries(fileMappings).filter(([key, mapping]) => 
        mapping.fileName || mapping.poster || mapping.frSubtitle || mapping.enSubtitle || mapping.koSubtitle
      );
      
      if (filledEntries.length > 0) {
        console.log(chalk.green('\n✅ Auto-filled Files sheet:'));
        filledEntries.forEach(([rowType, mapping]) => {
          const parts = [];
          if (mapping.fileName) parts.push(`Video: ${mapping.fileName}`);
          if (mapping.poster) parts.push(`Poster: ${mapping.poster}`);
          if (mapping.frSubtitle) parts.push(`FR: ${mapping.frSubtitle}`);
          if (mapping.enSubtitle) parts.push(`EN: ${mapping.enSubtitle}`);
          if (mapping.koSubtitle) parts.push(`KO: ${mapping.koSubtitle}`);
          
          if (parts.length > 0) {
            console.log(chalk.gray(`  ${rowType}: ${parts.join(', ')}`));
          }
        });
        
        console.log(chalk.yellow('\n📝 Please review the auto-filled Excel file and run the command again.'));
        console.log(chalk.gray(`   Excel file: ${path.basename(excelPath)}`));
      } else {
        console.log(chalk.yellow('\n⚠️  No matching files found for auto-fill.'));
        console.log(chalk.gray('Please manually fill the Excel file.'));
      }
      
    } catch (error) {
      this.logger.error(`Auto-fill failed: ${error.message}`);
      console.log(chalk.red(`❌ Auto-fill failed: ${error.message}`));
      console.log(chalk.gray('Please manually fill the Excel file.'));
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Build files context for error reporting
   */
  buildFilesContext(mediaFiles) {
    return {
      videos: mediaFiles.videos.map(video => ({
        name: video.name,
        path: video.path,
        size: video.size,
        sizeFormatted: this.formatFileSize(video.size),
        extension: path.extname(video.name).toLowerCase()
      })),
      images: mediaFiles.images.map(image => ({
        name: image.name,
        path: image.path,
        size: image.size,
        sizeFormatted: this.formatFileSize(image.size),
        extension: path.extname(image.name).toLowerCase()
      })),
      subtitles: mediaFiles.subtitles.map(subtitle => ({
        name: subtitle.name,
        path: subtitle.path,
        size: subtitle.size,
        sizeFormatted: this.formatFileSize(subtitle.size),
        extension: path.extname(subtitle.name).toLowerCase()
      })),
      total: mediaFiles.videos.length + mediaFiles.images.length + mediaFiles.subtitles.length
    };
  }
}

// Command line execution
async function main() {
  try {
    if (process.argv.length < 4) {
      console.log('Usage: node index.js <folder_path> <config_path>');
      console.log('  folder_path: Path to folder containing media files and Excel files');
      console.log('  config_path: Path to JSON configuration file');
      process.exit(1);
    }
    
    const folderPath = process.argv[2];
    const configPath = process.argv[3];
    
    const uploader = new OneMediaCompleteUpload({
      folder: folderPath,
      config: configPath,
      verbose: true
    });
    
    const result = await uploader.run();
    
    if (result.success) {
      console.log(chalk.green.bold('\n✅ Upload completed successfully!'));
      process.exit(0);
    } else {
      console.log(chalk.red.bold('\n❌ Upload failed!'));
      console.log(chalk.red(`Error: ${result.error}`));
      if (result.context) {
        console.log('\nContext:', JSON.stringify(result.context, null, 2));
      }
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red.bold('\n💥 Fatal error:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Only run main if this file is executed directly (not imported)
// Check if this is the main module by comparing with the executed file
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export default OneMediaCompleteUpload;