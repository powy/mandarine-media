// Function wrapper for picture-upload tool
import { validateConfig } from './schemas/inputSchema.js';
import { checkFileExists, getImageMetadata, loadConfigFile } from './utils/fileUtils.js';
import { uploadToS3 } from './services/s3Service.js';
import { createPictureRecord, updatePictureRecord } from './services/apiService.js';
import { PictureUploadError, ErrorCodes, handleError } from './utils/errorHandler.js';
import axios from 'axios';

/**
 * Picture Upload Function Wrapper
 * @param {Object} options - Upload options
 * @param {string} options.config - Configuration file path
 * @param {boolean} options.verbose - Verbose output
 * @param {boolean} options.dryRun - Validate configuration and check file without uploading
 * @returns {Promise<Object>} Upload results
 */
export async function uploadPicture(options) {
  try {
    console.log('🖼️  Picture Upload Tool v1.0.0');
    console.log('=====================================\n');

    // Load and validate configuration
    const config = await loadAndValidateConfig(options.config);
    
    // Check if picture file exists
    await checkPictureFile(config.picturePath);
    
    // Get image metadata
    const metadata = await getMetadata(config);
    
    if (options.verbose) {
      console.log('📋 Image metadata:');
      console.log(`  Format: ${metadata.format}`);
      console.log(`  Width: ${metadata.width}px`);
      console.log(`  Height: ${metadata.height}px`);
      if (metadata.fileSizeBytes) {
        console.log(`  Size: ${metadata.fileSizeBytes} bytes`);
      }
      console.log('');
    }
    
    // Handle dry run
    if (options.dryRun) {
      console.log('✓ Dry run - Configuration is valid and file exists, no upload performed\n');
      return { 
        dryRun: true, 
        success: true, 
        metadata,
        config 
      };
    }
    
    console.log('🚀 Starting upload process...\n');
    
    // Step 1: Create picture record in API with placeholder URL
    // Generate unique placeholder to avoid conflicts
    const randomId = Math.random().toString(36).substring(2, 10); // 8 char alphanumeric
    const placeholderUrl = `placeholder_${randomId}`;
    const pictureData = {
      image_url: placeholderUrl,
      file_name: metadata.fileName,
      width: metadata.width,
      height: metadata.height,
      alt_text: config.metadata?.altText || null
    };
    
    // Only include file_size_bytes if we have valid data
    if (metadata.fileSizeBytes) {
      pictureData.file_size_bytes = metadata.fileSizeBytes;
    }
    
    console.log('📝 Creating backend record with placeholder URL...');
    if (options.verbose) {
      console.log('📦 API payload:', JSON.stringify(pictureData, null, 2));
    }
    const apiResult = await createPictureRecord(pictureData, config.api);
    console.log(`✅ Backend record created with ID: ${apiResult.id}`);
    
    // Step 2: Upload to S3 using record ID for folder structure
    const s3Result = await uploadImageToS3(config, metadata, apiResult.id);
    
    // Debug logging for URL received from S3Service
    console.log('🔍 Wrapper Debug:');
    console.log('  s3Result.url:', s3Result.url);
    console.log('  typeof s3Result.url:', typeof s3Result.url);
    
    // Step 3: Check URL accessibility before saving to backend
    console.log('🔍 Checking URL accessibility...');
    const isAccessible = await checkUrlAccessibility(s3Result.url);
    
    if (!isAccessible) {
      throw new PictureUploadError(
        `Uploaded file is not accessible at: ${s3Result.url}`,
        ErrorCodes.URL_ACCESS_ERROR,
        { url: s3Result.url }
      );
    }
    
    console.log('✅ URL is accessible');
    
    // Step 4: Update picture record with accessible CloudFront URL
    console.log('🔄 Updating backend record with CloudFront URL...');
    const updatedApiResult = await updatePictureRecord(
      apiResult.id, 
      { image_url: s3Result.url }, 
      config.api
    );
    
    // Display success message
    console.log('✅ Upload completed successfully!');
    console.log(`  S3 URL: ${s3Result.url}`);
    console.log(`  API Record ID: ${apiResult.id}`);
    console.log(`  S3 Key: ${s3Result.key}`);
    
    const result = {
      success: true,
      s3: s3Result,
      api: updatedApiResult,
      metadata,
      config
    };
    
    if (options.verbose) {
      console.log('\n📊 Complete Results:');
      console.log(JSON.stringify(result, null, 2));
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Picture upload failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    throw error;
  }
}

async function loadAndValidateConfig(configPath) {
  try {
    console.log(`📄 Loading configuration from: ${configPath}`);
    
    const config = await loadConfigFile(configPath);
    const validatedConfig = validateConfig(config);
    
    console.log('✅ Configuration loaded and validated\n');
    return validatedConfig;
    
  } catch (error) {
    console.error('❌ Configuration validation failed');
    throw new PictureUploadError(
      `Configuration validation failed: ${error.message}`,
      ErrorCodes.CONFIG_VALIDATION_ERROR,
      { configPath, originalError: error.message }
    );
  }
}

async function checkPictureFile(picturePath) {
  try {
    console.log(`🔍 Checking picture file: ${picturePath}`);
    
    const exists = await checkFileExists(picturePath);
    
    if (!exists) {
      throw new PictureUploadError(
        `Picture file not found: ${picturePath}`,
        ErrorCodes.FILE_NOT_FOUND,
        { filePath: picturePath }
      );
    }
    
    console.log('✅ Picture file exists\n');
    
  } catch (error) {
    if (error instanceof PictureUploadError) {
      throw error;
    }
    
    throw new PictureUploadError(
      `Error checking picture file: ${error.message}`,
      ErrorCodes.FILE_ACCESS_ERROR,
      { filePath: picturePath, originalError: error.message }
    );
  }
}

async function getMetadata(config) {
  try {
    console.log('📊 Extracting image metadata...');
    
    const metadata = await getImageMetadata(config.picturePath);
    
    console.log('✅ Metadata extracted successfully\n');
    return metadata;
    
  } catch (error) {
    throw new PictureUploadError(
      `Failed to extract image metadata: ${error.message}`,
      ErrorCodes.METADATA_EXTRACTION_ERROR,
      { filePath: config.picturePath, originalError: error.message }
    );
  }
}

async function uploadImageToS3(config, metadata, recordId) {
  try {
    console.log(`☁️  Uploading to S3 with record ID: ${recordId}...`);
    
    const result = await uploadToS3({
      filePath: config.picturePath,
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
      region: config.s3.region,
      bucket: config.s3.bucket,
      keyPrefix: config.s3.keyPrefix,
      cloudfrontDomain: config.cloudfront.domain,
      recordId: recordId,
      contentType: `image/${metadata.format}`,
      metadata: {
        width: metadata.width.toString(),
        height: metadata.height.toString(),
        format: metadata.format,
        size: metadata.fileSizeBytes.toString()
      }
    });
    
    console.log(`✅ Successfully uploaded to S3: ${result.key}`);
    return result;
    
  } catch (error) {
    throw new PictureUploadError(
      `S3 upload failed: ${error.message}`,
      ErrorCodes.S3_UPLOAD_ERROR,
      { 
        bucket: config.s3.bucket, 
        key: config.s3.key, 
        originalError: error.message 
      }
    );
  }
}

async function checkUrlAccessibility(url) {
  try {
    const response = await axios.head(url, {
      timeout: 10000, // 10 second timeout
      validateStatus: function (status) {
        return status >= 200 && status < 300; // Only accept 2xx status codes
      }
    });
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.log(`⚠️ URL accessibility check failed: ${error.message}`);
    return false;
  }
}

export default { uploadPicture };