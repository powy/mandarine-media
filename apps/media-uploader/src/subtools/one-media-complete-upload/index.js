#!/usr/bin/env node

import { validateConfig } from './schemas/configSchema.js';
import { createLogger } from './config/logger.js';
import { loadJsonFile, scanFolder, findExcelFiles } from './utils/fileUtils.js';
import { ExcelService } from './services/excelService.js';
import { OrchestrationService } from './services/orchestrationService.js';
import { MediaAnalysisService } from './services/mediaAnalysisService.js';
import { ValidationService } from './services/validationService.js';
import { createDualLogger } from '../excel-batch-editor/utils/syncFileLogger.js';
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

  /**
   * Prepare Excel file with template and auto-fill Files sheet
   * @returns {Promise<Object>} Result with Excel path and data
   */
  async prepareExcel() {
    let mediaFiles = null;

    try {
      this.log(chalk.blue.bold('\n📋 Excel Preparation Mode\n'));

      // Load and validate configuration
      await this.loadConfiguration();

      // Initialize services
      this.initializeServices();

      // Validate folder path
      await this.validateFolderPath();

      // Scan folder for media files
      mediaFiles = await this.scanMediaFiles();

      // Handle Excel file creation/auto-fill
      const excelResult = await this.handleExcelFile();

      let excelPath, isNewlyCreated = false;
      if (typeof excelResult === 'object' && excelResult.path) {
        excelPath = excelResult.path;
        isNewlyCreated = excelResult.newlyCreated;
      } else {
        excelPath = excelResult;
      }

      if (!excelPath) {
        return {
          success: false,
          error: 'Failed to create Excel file',
          phase: 'excel-creation-failed'
        };
      }

      // Read Excel data to return current state
      const excelData = await this.excelService.readExcelFile(excelPath);

      // Check if auto-fill is needed for existing Excel files
      if (!isNewlyCreated) {
        const shouldAutoFill = this.excelService.isFilesSheetEmpty(excelData.files);

        if (shouldAutoFill) {
          this.log(chalk.yellow('📋 Files sheet is empty. Running auto-fill analysis...'));
          await this.performAutoFill(excelPath, mediaFiles);

          // Re-read the Excel data after auto-fill
          const updatedExcelData = await this.excelService.readExcelFile(excelPath);

          return {
            success: true,
            message: 'Files sheet auto-filled with intelligent mappings. Excel is ready for Description sheet completion.',
            phase: 'auto-filled',
            excelPath,
            data: {
              mediaFiles,
              excelData: updatedExcelData
            }
          };
        } else {
          return {
            success: true,
            message: 'Excel file is ready. Files sheet is already populated.',
            phase: 'excel-ready',
            excelPath,
            data: {
              mediaFiles,
              excelData
            }
          };
        }
      } else {
        // For newly created files
        return {
          success: true,
          message: 'Excel template created with Files sheet auto-filled. Please fill Description sheet.',
          phase: 'template-created-and-filled',
          excelPath,
          data: {
            mediaFiles,
            excelData
          }
        };
      }

    } catch (error) {
      if (this.logger) {
        this.logger.error(`Excel preparation failed: ${error.message}`);
      }
      this.logError(chalk.red(`❌ Excel preparation error: ${error.message}`));

      return {
        success: false,
        error: `Excel preparation failed: ${error.message}`,
        phase: 'preparation-error',
        context: {
          folderPath: this.options.folder,
          errorDetails: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          },
          filesFound: mediaFiles ? this.buildFilesContext(mediaFiles) : null
        }
      };
    }
  }

  /**
   * Execute upload process (assumes Excel file already exists and is filled)
   * @returns {Promise<Object>} Upload results
   */
  async executeUpload() {
    let mediaFiles = null;
    let excelData = null;
    let excelPath = null;

    try {
      this.log(chalk.blue.bold('\n🚀 Upload Execution Mode\n'));

      // Load and validate configuration
      await this.loadConfiguration();

      // Initialize services
      this.initializeServices();

      // Validate folder path
      await this.validateFolderPath();

      // Scan folder for media files
      mediaFiles = await this.scanMediaFiles();

      // Find existing Excel file (required for upload mode)
      this.log(chalk.gray('Looking for existing Excel file...'));
      excelPath = await this.excelService.findExistingExcelFile();

      if (!excelPath) {
        return {
          success: false,
          error: 'No Excel file found. Please run prepare mode first to create and fill the Excel file.',
          phase: 'excel-not-found',
          context: {
            folderPath: this.options.folder,
            filesFound: mediaFiles ? this.buildFilesContext(mediaFiles) : null
          }
        };
      }

      this.log(chalk.green(`✅ Found Excel file: ${path.basename(excelPath)}`));

      // Read Excel data
      excelData = await this.excelService.readExcelFile(excelPath);

      // Check if media_description ID already exists (indicating already uploaded)
      if (excelData.description.id) {
        this.log(chalk.yellow('⚠️  Media already uploaded - ID field detected'));
        this.log(chalk.yellow(`   Existing ID: ${excelData.description.id}`));
        this.log(chalk.cyan('\n   This content has already been uploaded to the system.'));
        this.log(chalk.cyan('   To force re-upload, remove the ID row from the Description sheet.'));

        return {
          success: false,
          error: 'Media already uploaded. ID field is filled in Excel.',
          phase: 'already-uploaded',
          mediaDescriptionId: excelData.description.id,
          context: {
            folderPath: this.options.folder,
            existingId: excelData.description.id,
            message: 'Remove ID row from Description sheet to allow re-upload'
          }
        };
      }

      // Perform comprehensive validation before upload
      this.log(chalk.blue('\n🔍 Validating data and files...'));
      const validationResult = await this.validationService.validateComplete(
        excelData,
        mediaFiles,
        this.options.folder
      );

      if (!validationResult.valid) {
        this.log(chalk.red('❌ Validation failed:'));
        validationResult.context.validationErrors.forEach(error => {
          this.log(chalk.red(`  • ${error}`));
        });

        if (validationResult.context.missingFiles.length > 0) {
          this.log(chalk.red('\n📋 Missing files:'));
          validationResult.context.missingFiles.forEach(file => {
            this.log(chalk.red(`  • ${file.name} (${file.type})`));
          });
        }

        return this.validationService.createErrorReport(
          validationResult.context,
          ['Upload cannot proceed due to validation errors']
        );
      }

      this.log(chalk.green('✅ Validation passed'));

      // Check for existing duplicates before starting uploads
      this.log(chalk.cyan('\n🔍 Checking for existing media descriptions...'));
      const duplicateCheck = await this.orchestrationService.checkForDuplicates(excelData.description);

      if (!duplicateCheck.success) {
        this.log(chalk.red(`❌ Duplicate check failed: ${duplicateCheck.error}`));
        return this.validationService.createErrorReport(
          validationResult.context,
          [`Duplicate check failed: ${duplicateCheck.error}`]
        );
      }

      const { duplicates } = duplicateCheck;

      // Check for slug duplicates (blocking error)
      if (duplicates.bySlug) {
        this.log(chalk.red(`❌ Duplicate slug found: "${excelData.description.slug}"`));
        this.log(chalk.yellow(`   Existing media description ID: ${duplicates.bySlug.id}`));
        if (duplicates.bySlug.creation_date_utc) {
          this.log(chalk.yellow(`   Created: ${duplicates.bySlug.creation_date_utc}`));
        }
        this.log(chalk.cyan('\n   Please either:'));
        this.log(chalk.cyan('   1. Change the slug in your Excel file'));
        this.log(chalk.cyan('   2. Delete the existing media description'));
        this.log(chalk.cyan(`   3. Use a different slug (e.g., "${excelData.description.slug}_v2")`));

        return this.validationService.createErrorReport(
          validationResult.context,
          [
            `Duplicate slug exists: "${excelData.description.slug}"`,
            `Existing record ID: ${duplicates.bySlug.id}`,
            'Change the slug in your Excel file or delete the existing record'
          ]
        );
      }

      // Check for title duplicates (error - stop execution)
      if (duplicates.byTitle) {
        this.log(chalk.red(`❌ Error: Similar episode title exists: "${duplicates.byTitle.episode_title}"`));
        this.log(chalk.red(`   Existing media description ID: ${duplicates.byTitle.id}`));
        this.log(chalk.red('   Stopping upload to prevent duplicates.'));
        throw new Error(`Duplicate episode title detected: "${duplicates.byTitle.episode_title}"`);
      }

      if (!duplicates.bySlug && !duplicates.byTitle) {
        this.log(chalk.green(`✅ No duplicates found (checked ${duplicateCheck.totalChecked} records)`));
      }

      // Begin upload process
      this.log(chalk.blue('\n🚀 Starting upload process...'));
      const uploadResults = await this.orchestrationService.processUploads(
        excelData,
        mediaFiles,
        this.options.folder,
        excelPath,
        this.options  // Pass options to access isSeasonLevel
      );

      if (uploadResults.success) {
        // Success - display final results
        this.log(chalk.green.bold('\n🎉 Upload completed successfully!'));
        this.log(chalk.green(`📄 Media Description ID: ${chalk.white(uploadResults.mediaDescriptionId)}`));

        // Show Excel update information
        if (uploadResults.updatedExcelPath) {
          this.log(chalk.green(`📋 Excel file updated: ${chalk.white(path.basename(uploadResults.updatedExcelPath))}`));
        }

        // Show upload summary
        const { uploads } = uploadResults;
        if (uploads.videos.length > 0) {
          this.log(chalk.cyan(`\n🎬 Videos uploaded: ${uploads.videos.length}`));
          uploads.videos.forEach(video => {
            this.log(chalk.gray(`  • ${video.fileName} → Asset: ${video.assetId}`));
          });
        }

        if (uploads.images.length > 0) {
          this.log(chalk.cyan(`\n🖼️  Images uploaded: ${uploads.images.length}`));
          uploads.images.forEach(image => {
            this.log(chalk.gray(`  • ${image.fileName} → ${image.dimensions || 'unknown size'}`));
          });
        }

        if (uploads.subtitles.length > 0) {
          this.log(chalk.cyan(`\n📝 Subtitles uploaded: ${uploads.subtitles.length}`));
          uploads.subtitles.forEach(subtitle => {
            this.log(chalk.gray(`  • ${subtitle.fileName} (${subtitle.language})`));
          });
        }

        return {
          success: true,
          message: `Upload completed successfully! Media Description ID: ${uploadResults.mediaDescriptionId}`,
          phase: 'completed',
          mediaDescriptionId: uploadResults.mediaDescriptionId,
          excelPath: uploadResults.updatedExcelPath || excelPath, // Return renamed path or original
          data: uploadResults
        };

      } else {
        // Upload failed - return detailed error context
        this.log(chalk.red.bold('\n❌ Upload failed'));

        if (uploadResults.errors.length > 0) {
          this.log(chalk.red('\n📋 Errors encountered:'));
          uploadResults.errors.forEach(error => {
            this.log(chalk.red(`  • ${error}`));
          });
        }

        return {
          success: false,
          error: `Upload failed with ${uploadResults.errors.length} error(s)`,
          phase: 'upload-failed',
          excelPath: excelPath, // Include for consistency
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
        this.logger.error(`Upload execution failed: ${error.message}`);
      }
      this.logError(chalk.red(`❌ Upload execution error: ${error.message}`));

      return {
        success: false,
        error: `Upload execution failed: ${error.message}`,
        phase: 'upload-execution-error',
        context: {
          folderPath: this.options.folder,
          excelPath,
          errorDetails: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          },
          filesFound: mediaFiles ? this.buildFilesContext(mediaFiles) : null,
          excelData: excelData ? {
            hasDescription: !!excelData.description,
            hasFiles: !!(excelData.files && excelData.files.length > 0)
          } : null
        }
      };
    }
  }

  async run() {
    // Check for mode parameter
    if (this.options.mode === 'prepare') {
      return this.prepareExcel();
    } else if (this.options.mode === 'upload') {
      return this.executeUpload();
    }

    // Default auto mode - keep existing behavior
    let mediaFiles = null;
    
    try {
      this.log(chalk.blue.bold('\n📦 One Media Complete Upload Tool\n'));
      
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

      // Check if media_description ID already exists (indicating already uploaded)
      if (excelData.description.id) {
        this.log(chalk.yellow('⚠️  Media already uploaded - ID field detected'));
        this.log(chalk.yellow(`   Existing ID: ${excelData.description.id}`));
        this.log(chalk.cyan('\n   This content has already been uploaded to the system.'));
        this.log(chalk.cyan('   To force re-upload, remove the ID row from the Description sheet.'));

        return {
          success: false,
          error: 'Media already uploaded. ID field is filled in Excel.',
          phase: 'already-uploaded',
          mediaDescriptionId: excelData.description.id,
          context: {
            folderPath: this.options.folder,
            existingId: excelData.description.id,
            message: 'Remove ID row from Description sheet to allow re-upload'
          }
        };
      }

      // Only check for auto-fill if this is an existing file, not a newly created one
      if (!isNewlyCreated) {
        const shouldAutoFill = this.excelService.isFilesSheetEmpty(excelData.files);
        
        if (shouldAutoFill) {
          this.log(chalk.yellow('📋 Files sheet is empty. Running auto-fill analysis...'));
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
      this.log(chalk.blue('\n🔍 Validating data and files...'));
      const validationResult = await this.validationService.validateComplete(
        excelData, 
        mediaFiles, 
        this.options.folder
      );
      
      if (!validationResult.valid) {
        this.log(chalk.red('❌ Validation failed:'));
        validationResult.context.validationErrors.forEach(error => {
          this.log(chalk.red(`  • ${error}`));
        });
        
        if (validationResult.context.missingFiles.length > 0) {
          this.log(chalk.red('\n📋 Missing files:'));
          validationResult.context.missingFiles.forEach(file => {
            this.log(chalk.red(`  • ${file.name} (${file.type})`));
          });
        }
        
        return this.validationService.createErrorReport(
          validationResult.context, 
          ['Upload cannot proceed due to validation errors']
        );
      }
      
      this.log(chalk.green('✅ Validation passed'));
      
      // Check for existing duplicates before starting uploads
      this.log(chalk.cyan('\n🔍 Checking for existing media descriptions...'));
      const duplicateCheck = await this.orchestrationService.checkForDuplicates(excelData.description);
      
      if (!duplicateCheck.success) {
        this.log(chalk.red(`❌ Duplicate check failed: ${duplicateCheck.error}`));
        return this.validationService.createErrorReport(
          validationResult.context,
          [`Duplicate check failed: ${duplicateCheck.error}`]
        );
      }
      
      const { duplicates } = duplicateCheck;
      
      // Check for slug duplicates (blocking error)
      if (duplicates.bySlug) {
        this.log(chalk.red(`❌ Duplicate slug found: "${excelData.description.slug}"`));
        this.log(chalk.yellow(`   Existing media description ID: ${duplicates.bySlug.id}`));
        if (duplicates.bySlug.creation_date_utc) {
          this.log(chalk.yellow(`   Created: ${duplicates.bySlug.creation_date_utc}`));
        }
        this.log(chalk.cyan('\n   Please either:'));
        this.log(chalk.cyan('   1. Change the slug in your Excel file'));
        this.log(chalk.cyan('   2. Delete the existing media description'));
        this.log(chalk.cyan(`   3. Use a different slug (e.g., "${excelData.description.slug}_v2")`));
        
        return this.validationService.createErrorReport(
          validationResult.context,
          [
            `Duplicate slug exists: "${excelData.description.slug}"`,
            `Existing record ID: ${duplicates.bySlug.id}`,
            'Change the slug in your Excel file or delete the existing record'
          ]
        );
      }
      
      // Check for title duplicates (error - stop execution)
      if (duplicates.byTitle) {
        this.log(chalk.red(`❌ Error: Similar episode title exists: "${duplicates.byTitle.episode_title}"`));
        this.log(chalk.red(`   Existing media description ID: ${duplicates.byTitle.id}`));
        this.log(chalk.red('   Stopping upload to prevent duplicates.'));
        throw new Error(`Duplicate episode title detected: "${duplicates.byTitle.episode_title}"`);
      }
      
      if (!duplicates.bySlug && !duplicates.byTitle) {
        this.log(chalk.green(`✅ No duplicates found (checked ${duplicateCheck.totalChecked} records)`));
      }
      
      // Begin upload process
      this.log(chalk.blue('\n🚀 Starting upload process...'));
      const uploadResults = await this.orchestrationService.processUploads(
        excelData,
        mediaFiles,
        this.options.folder,
        excelPath,
        this.options  // Pass options to access isSeasonLevel
      );
      
      if (uploadResults.success) {
        // Success - display final results
        this.log(chalk.green.bold('\n🎉 Upload completed successfully!'));
        this.log(chalk.green(`📄 Media Description ID: ${chalk.white(uploadResults.mediaDescriptionId)}`));
        
        // Show Excel update information
        if (uploadResults.updatedExcelPath) {
          this.log(chalk.green(`📋 Excel file updated: ${chalk.white(path.basename(uploadResults.updatedExcelPath))}`));
        }
        
        // Show upload summary
        const { uploads } = uploadResults;
        if (uploads.videos.length > 0) {
          this.log(chalk.cyan(`\n🎬 Videos uploaded: ${uploads.videos.length}`));
          uploads.videos.forEach(video => {
            this.log(chalk.gray(`  • ${video.fileName} → Asset: ${video.assetId}`));
          });
        }
        
        if (uploads.images.length > 0) {
          this.log(chalk.cyan(`\n🖼️  Images uploaded: ${uploads.images.length}`));
          uploads.images.forEach(image => {
            this.log(chalk.gray(`  • ${image.fileName} → ${image.dimensions || 'unknown size'}`));
          });
        }

        if (uploads.subtitles.length > 0) {
          this.log(chalk.cyan(`\n📝 Subtitles uploaded: ${uploads.subtitles.length}`));
          uploads.subtitles.forEach(subtitle => {
            this.log(chalk.gray(`  • ${subtitle.fileName} (${subtitle.language})`));
          });
        }

        return {
          success: true,
          message: `Upload completed successfully! Media Description ID: ${uploadResults.mediaDescriptionId}`,
          phase: 'completed',
          mediaDescriptionId: uploadResults.mediaDescriptionId,
          excelPath: uploadResults.updatedExcelPath || excelPath, // Return renamed path or original
          data: uploadResults
        };
        
      } else {
        // Upload failed - return detailed error context
        this.log(chalk.red.bold('\n❌ Upload failed'));

        if (uploadResults.errors.length > 0) {
          this.log(chalk.red('\n📋 Errors encountered:'));
          uploadResults.errors.forEach(error => {
            this.log(chalk.red(`  • ${error}`));
          });
        }

        return {
          success: false,
          error: `Upload failed with ${uploadResults.errors.length} error(s)`,
          phase: 'upload-failed',
          excelPath: excelPath, // Include for consistency
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
      this.logError(chalk.red(`❌ Unexpected error: ${error.message}`));
      
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
      this.log(chalk.gray(`Loading configuration from: ${this.options.config}`));
      
      const configData = await loadJsonFile(this.options.config);
      this.config = validateConfig(configData);

      // Initialize logger after config is loaded
      // Use syncFileLogger if logFile option is provided, otherwise use Winston
      if (this.options.logFile) {
        this.logger = createDualLogger(this.options.logFile, this.options.verbose !== false);
        this.logger.info('Configuration loaded and validated successfully (using sync file logger)');
      } else {
        this.logger = createLogger(this.config);
        this.logger.info('Configuration loaded and validated successfully');
      }
      
      this.log(chalk.green('✅ Configuration loaded successfully'));
    } catch (error) {
      throw new Error(`Configuration error: ${error.message}`);
    }
  }

  initializeServices() {
    this.excelService = new ExcelService(this.options.folder, this.logger);
    this.orchestrationService = new OrchestrationService(this.config, this.logger, this.excelService);
    this.mediaAnalysisService = new MediaAnalysisService(this.logger);
    this.validationService = new ValidationService(this.logger);
    this.logger.info('Services initialized');
  }

  /**
   * Helper method to log to both console and file logger
   * Strips ANSI color codes when writing to file
   * @param {string} message - Message to log (may contain chalk formatting)
   * @param {string} level - Log level (info, warn, error, debug)
   */
  log(message, level = 'info') {
    // Always log to console for user feedback
    console.log(message);

    // Also log to file if logger exists, stripping ANSI codes
    if (this.logger && typeof this.logger[level] === 'function') {
      // Strip ANSI color codes for file logging
      const stripped = message.replace(/\u001b\[\d+m/g, '');
      this.logger[level](stripped);
    }
  }

  /**
   * Helper method to log errors to both console and file logger
   * @param {string} message - Error message to log
   */
  logError(message) {
    console.error(message);

    if (this.logger && typeof this.logger.error === 'function') {
      const stripped = message.replace(/\u001b\[\d+m/g, '');
      this.logger.error(stripped);
    }
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
      
      this.log(chalk.green(`✅ Folder validated: ${this.options.folder}`));
      this.logger.info(`Folder validated: ${this.options.folder}`);
    } catch (error) {
      throw new Error(`Folder validation failed: ${error.message}`);
    }
  }

  async scanMediaFiles() {
    try {
      this.log(chalk.gray('Scanning folder for media files...'));
      
      const mediaFiles = await scanFolder(this.options.folder);
      
      this.log(chalk.green(`✅ Found ${mediaFiles.videos.length} videos, ${mediaFiles.images.length} images, ${mediaFiles.subtitles.length} subtitles`));
      this.logger.info(`Media scan complete: ${mediaFiles.videos.length} videos, ${mediaFiles.images.length} images, ${mediaFiles.subtitles.length} subtitles`);
      
      if (this.options.verbose) {
        if (mediaFiles.videos.length > 0) {
          this.log(chalk.blue('\n📹 Videos found:'));
          mediaFiles.videos.forEach(video => {
            this.log(chalk.gray(`  - ${video.name} (${this.formatFileSize(video.size)})`));
          });
        }
        
        if (mediaFiles.images.length > 0) {
          this.log(chalk.blue('\n🖼️  Images found:'));
          mediaFiles.images.forEach(image => {
            this.log(chalk.gray(`  - ${image.name} (${this.formatFileSize(image.size)})`));
          });
        }
        
        if (mediaFiles.subtitles.length > 0) {
          this.log(chalk.blue('\n📝 Subtitles found:'));
          mediaFiles.subtitles.forEach(subtitle => {
            this.log(chalk.gray(`  - ${subtitle.name} (${this.formatFileSize(subtitle.size)})`));
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
      this.log(chalk.gray('Checking for Excel file...'));

      // Look for existing Excel file
      const existingExcel = await this.excelService.findExistingExcelFile();

      if (existingExcel) {
        this.log(chalk.green(`✅ Found existing Excel file: ${path.basename(existingExcel)}`));
        return existingExcel;
      }

      // Check if we should use season Excel as template (for episodes)
      // DIAGNOSTIC: Log the decision-making variables
      this.log(chalk.magenta('🔍 DIAGNOSTIC: Excel creation decision point'));
      this.log(chalk.gray(`   Folder: ${this.options.folder}`));
      this.log(chalk.gray(`   seasonExcelPath: ${this.options.seasonExcelPath || 'NOT SET'}`));
      this.log(chalk.gray(`   isSeasonLevel: ${this.options.isSeasonLevel}`));

      const useSeasonTemplate = this.options.seasonExcelPath && !this.options.isSeasonLevel;
      this.log(chalk.gray(`   useSeasonTemplate = ${this.options.seasonExcelPath ? 'true' : 'false'} && ${!this.options.isSeasonLevel ? 'true' : 'false'} = ${useSeasonTemplate}`));

      if (useSeasonTemplate) {
        this.log(chalk.cyan(`📋 Creating episode Excel from season template...`));
        this.log(chalk.cyan(`   Using season template: ${this.options.seasonExcelPath}`));
        const folderName = path.basename(this.options.folder);
        const newExcelPath = await this.excelService.createExcelFromSeasonTemplate(
          this.options.seasonExcelPath,
          folderName,
          this.options.folder
        );

        // Populate with initial file list and auto-fill Files sheet
        const mediaFiles = await scanFolder(this.options.folder);
        await this.excelService.populateInitialFileList(newExcelPath, mediaFiles, this.mediaAnalysisService);

        this.log(chalk.green(`✅ Episode Excel created from season template with Files sheet auto-filled: ${path.basename(newExcelPath)}`));

        return { path: newExcelPath, newlyCreated: true };
      }

      // Create new Excel file from template
      this.log(chalk.yellow('📄 No Excel file found. Creating BLANK template (no season template available)...'));
      this.log(chalk.yellow(`   Reason: seasonExcelPath=${this.options.seasonExcelPath ? 'SET' : 'NOT SET'}, isSeasonLevel=${this.options.isSeasonLevel}`));

      const folderName = path.basename(this.options.folder);
      const newExcelPath = await this.excelService.createExcelFromTemplate(folderName);

      // Populate with initial file list and auto-fill Files sheet
      const mediaFiles = await scanFolder(this.options.folder);
      await this.excelService.populateInitialFileList(newExcelPath, mediaFiles, this.mediaAnalysisService);

      this.log(chalk.green(`✅ Excel template created with Files sheet auto-filled: ${path.basename(newExcelPath)}`));
      this.log(chalk.yellow(`\n⏸️  Please fill the Description sheet and run the command again:`));
      this.log(chalk.white(`   ${path.basename(newExcelPath)}`));
      this.log(chalk.gray(`\n   Excel file location: ${newExcelPath}`));
      this.log(chalk.gray(`   Fill the "Description" sheet with metadata`));
      this.log(chalk.gray(`   Review the "Files" sheet for accuracy`));

      return { path: newExcelPath, newlyCreated: true }; // Return object indicating new file
    } catch (error) {
      throw new Error(`Excel handling failed: ${error.message}`);
    }
  }

  async performAutoFill(excelPath, mediaFiles) {
    try {
      this.log(chalk.gray('Analyzing media files for intelligent mapping...'));
      
      // Generate file mappings using MediaAnalysisService
      const fileMappings = await this.mediaAnalysisService.generateFileMappings(mediaFiles);
      
      // Apply mappings to Excel file
      await this.excelService.autoFillFilesSheet(excelPath, fileMappings);
      
      // Show user what was auto-filled
      const filledEntries = Object.entries(fileMappings).filter(([key, mapping]) => 
        mapping.fileName || mapping.poster || mapping.frSubtitle || mapping.enSubtitle || mapping.koSubtitle
      );
      
      if (filledEntries.length > 0) {
        this.log(chalk.green('\n✅ Auto-filled Files sheet:'));
        filledEntries.forEach(([rowType, mapping]) => {
          const parts = [];
          if (mapping.fileName) parts.push(`Video: ${mapping.fileName}`);
          if (mapping.poster) parts.push(`Poster: ${mapping.poster}`);
          if (mapping.frSubtitle) parts.push(`FR: ${mapping.frSubtitle}`);
          if (mapping.enSubtitle) parts.push(`EN: ${mapping.enSubtitle}`);
          if (mapping.koSubtitle) parts.push(`KO: ${mapping.koSubtitle}`);
          
          if (parts.length > 0) {
            this.log(chalk.gray(`  ${rowType}: ${parts.join(', ')}`));
          }
        });
        
        this.log(chalk.yellow('\n📝 Please review the auto-filled Excel file and run the command again.'));
        this.log(chalk.gray(`   Excel file: ${path.basename(excelPath)}`));
      } else {
        this.log(chalk.yellow('\n⚠️  No matching files found for auto-fill.'));
        this.log(chalk.gray('Please manually fill the Excel file.'));
      }
      
    } catch (error) {
      this.logger.error(`Auto-fill failed: ${error.message}`);
      this.log(chalk.red(`❌ Auto-fill failed: ${error.message}`));
      this.log(chalk.gray('Please manually fill the Excel file.'));
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
      console.log('Usage: node index.js <folder_path> <config_path> [mode]');
      console.log('  folder_path: Path to folder containing media files and Excel files');
      console.log('  config_path: Path to JSON configuration file');
      console.log('  mode: Operation mode (optional)');
      console.log('    - "prepare": Only create and fill Excel template');
      console.log('    - "upload": Only execute upload (Excel must exist and be filled)');
      console.log('    - omitted: Auto mode (current behavior - create Excel if needed, then upload)');
      process.exit(1);
    }

    const folderPath = process.argv[2];
    const configPath = process.argv[3];
    const mode = process.argv[4]; // Optional mode parameter

    // Validate mode parameter
    if (mode && !['prepare', 'upload'].includes(mode)) {
      console.log(chalk.red(`❌ Invalid mode: "${mode}". Valid modes are: prepare, upload`));
      process.exit(1);
    }

    const uploader = new OneMediaCompleteUpload({
      folder: folderPath,
      config: configPath,
      verbose: true,
      mode: mode // Pass mode to the uploader
    });

    let result;

    // Call appropriate method based on mode
    if (mode === 'prepare') {
      console.log(chalk.cyan('📋 Running in Excel Preparation mode'));
      result = await uploader.prepareExcel();
    } else if (mode === 'upload') {
      console.log(chalk.cyan('🚀 Running in Upload Execution mode'));
      result = await uploader.executeUpload();
    } else {
      console.log(chalk.cyan('🔄 Running in Auto mode'));
      result = await uploader.run();
    }
    
    if (result.success) {
      if (mode === 'prepare') {
        console.log(chalk.green.bold('\n✅ Excel preparation completed successfully!'));
        if (result.excelPath) {
          console.log(chalk.green(`📋 Excel file ready: ${path.basename(result.excelPath)}`));
        }
      } else if (mode === 'upload') {
        console.log(chalk.green.bold('\n✅ Upload execution completed successfully!'));
        if (result.mediaDescriptionId) {
          console.log(chalk.green(`🎯 Media Description ID: ${result.mediaDescriptionId}`));
        }
      } else {
        console.log(chalk.green.bold('\n✅ Process completed successfully!'));
      }
      process.exit(0);
    } else {
      if (mode === 'prepare') {
        console.log(chalk.red.bold('\n❌ Excel preparation failed!'));
      } else if (mode === 'upload') {
        console.log(chalk.red.bold('\n❌ Upload execution failed!'));
      } else {
        console.log(chalk.red.bold('\n❌ Process failed!'));
      }
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
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export default OneMediaCompleteUpload;