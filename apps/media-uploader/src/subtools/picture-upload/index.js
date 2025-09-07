#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

import { validateConfig } from './schemas/inputSchema.js';
import { checkFileExists, getImageMetadata, loadConfigFile } from './utils/fileUtils.js';
import { uploadToS3 } from './services/s3Service.js';
import { createPictureRecord } from './services/apiService.js';
import { PictureUploadError, ErrorCodes, handleError } from './utils/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PictureUploadTool {
  constructor() {
    this.program = new Command();
  }

  setupCLI() {
    this.program
      .name('picture-upload')
      .description('Upload pictures to S3 and create records in the backend API')
      .version('1.0.0')
      .requiredOption('-c, --config <path>', 'Configuration JSON file path')
      .option('-v, --verbose', 'Verbose output')
      .option('--dry-run', 'Validate configuration and check file without uploading')
      .helpOption('-h, --help', 'Display help for command');
    
    this.program.parse();
    return this.program.opts();
  }

  async run() {
    try {
      const options = this.setupCLI();
      
      console.log('🖼️  Picture Upload Tool v1.0.0');
      console.log('=====================================\n');

      // Load and validate configuration
      const config = await this.loadAndValidateConfig(options.config);
      
      // Check if picture file exists
      await this.checkPictureFile(config.picturePath);
      
      // Get image metadata
      const metadata = await this.getMetadata(config);
      
      if (options.dryRun) {
        console.log('✅ Dry run completed successfully');
        console.log('Configuration is valid and picture file is accessible');
        return;
      }

      // Upload to S3
      const s3Url = await this.uploadPictureToS3(config.picturePath, config.s3);
      
      // Create API record
      const pictureRecord = await this.createApiRecord(s3Url, metadata, config.api);
      
      console.log('✅ Picture upload completed successfully!');
      console.log(`📁 S3 URL: ${s3Url}`);
      console.log(`🆔 Picture ID: ${pictureRecord.id}`);
      
    } catch (error) {
      handleError(error, 'Picture upload');
      process.exit(1);
    }
  }

  async loadAndValidateConfig(configPath) {
    try {
      console.log(`📋 Loading configuration from ${configPath}...`);
      const config = await loadConfigFile(configPath);
      const validatedConfig = validateConfig(config);
      console.log('✅ Configuration validated successfully\n');
      return validatedConfig;
    } catch (error) {
      throw new PictureUploadError(
        `Configuration error: ${error.message}`,
        ErrorCodes.CONFIG_VALIDATION_FAILED,
        error
      );
    }
  }

  async checkPictureFile(picturePath) {
    console.log(`🔍 Checking picture file: ${picturePath}...`);
    const exists = await checkFileExists(picturePath);
    
    if (!exists) {
      throw new PictureUploadError(
        `Picture file not found or not readable: ${picturePath}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }
    
    console.log('✅ Picture file exists and is readable\n');
  }

  async getMetadata(config) {
    try {
      console.log('📊 Reading image metadata...');
      const metadata = await getImageMetadata(config.picturePath);
      
      // Add custom metadata if provided
      if (config.metadata) {
        if (config.metadata.fileName) {
          metadata.fileName = config.metadata.fileName;
        }
        if (config.metadata.altText) {
          metadata.altText = config.metadata.altText;
        }
      }
      
      console.log(`   📏 Dimensions: ${metadata.width}x${metadata.height}`);
      console.log(`   📦 Size: ${(metadata.fileSizeBytes / 1024).toFixed(2)} KB`);
      console.log(`   📄 Format: ${metadata.format}`);
      console.log('✅ Metadata read successfully\n');
      
      return metadata;
    } catch (error) {
      throw new PictureUploadError(
        `Failed to read image metadata: ${error.message}`,
        ErrorCodes.METADATA_READ_FAILED,
        error
      );
    }
  }

  async uploadPictureToS3(picturePath, s3Config) {
    try {
      console.log('☁️  Uploading to S3...');
      const s3Url = await uploadToS3(picturePath, s3Config);
      console.log('✅ S3 upload completed\n');
      return s3Url;
    } catch (error) {
      throw new PictureUploadError(
        `S3 upload failed: ${error.message}`,
        ErrorCodes.S3_UPLOAD_FAILED,
        error
      );
    }
  }

  async createApiRecord(s3Url, metadata, apiConfig) {
    try {
      console.log('🔗 Creating picture record in API...');
      const pictureRecord = await createPictureRecord(s3Url, metadata, apiConfig);
      console.log('✅ API record created successfully\n');
      return pictureRecord;
    } catch (error) {
      throw new PictureUploadError(
        `API record creation failed: ${error.message}`,
        ErrorCodes.API_REQUEST_FAILED,
        error
      );
    }
  }
}

// Export individual functions for embedding
export { checkFileExists, uploadToS3, createPictureRecord };

// Export the main class
export { PictureUploadTool };

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tool = new PictureUploadTool();
  tool.run();
}