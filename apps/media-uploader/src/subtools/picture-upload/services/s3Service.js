import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs-extra';
import path from 'path';
import { sanitizePath } from '../utils/fileUtils.js';

export class S3Service {
  constructor(config) {
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      region: config.region
    });
    this.bucket = config.bucket;
    this.region = config.region;
    this.keyPrefix = config.keyPrefix || 'images/visuals/';
    this.cloudfrontDomain = config.cloudfrontDomain || 'www.kyool.eu';
  }

  /**
   * Upload a picture file to S3
   * @param {string} filePath - Local path to the picture file
   * @param {string} recordId - Record ID for folder structure
   * @param {string} customKey - Optional custom S3 key (overrides recordId-based key)
   * @returns {Promise<Object>} - Upload result with URL and key
   */
  async uploadPicture(filePath, recordId = null, customKey = null) {
    try {
      // Sanitize file path to remove Unicode control characters
      const cleanFilePath = sanitizePath(filePath);

      const originalFileName = path.basename(cleanFilePath);
      const sanitizedFileName = this.sanitizeFilename(originalFileName);
      let s3Key;

      if (customKey) {
        s3Key = customKey;
      } else if (recordId) {
        // Use record ID for folder structure: prefix + recordId + sanitized filename
        // Remove trailing slash from keyPrefix to avoid double slashes
        const cleanKeyPrefix = this.keyPrefix.replace(/\/$/, '');
        s3Key = `${cleanKeyPrefix}/${recordId}/${sanitizedFileName}`;
      } else {
        // Fallback to timestamp-based naming with sanitized filename
        const cleanKeyPrefix = this.keyPrefix.replace(/\/$/, '');
        s3Key = `${cleanKeyPrefix}/${Date.now()}-${sanitizedFileName}`;
      }

      const fileStream = fs.createReadStream(cleanFilePath);
      
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: s3Key,
          Body: fileStream,
          ContentType: this.getContentType(originalFileName)
        }
      });

      const result = await upload.done();
      
      // Debug logging to trace URL construction
      console.log('🔍 S3Service Debug:');
      console.log('  originalFileName:', originalFileName);
      console.log('  sanitizedFileName:', sanitizedFileName);
      console.log('  bucket:', this.bucket);
      console.log('  region:', this.region);
      console.log('  cloudfrontDomain:', this.cloudfrontDomain);
      console.log('  s3Key:', s3Key);
      
      // Construct CloudFront URL: https://domain/keyPrefix/recordId/filename
      const constructedUrl = `https://${this.cloudfrontDomain}/${s3Key}`;
      console.log('  constructedUrl:', constructedUrl);
      
      // Return both URL and key
      return {
        url: constructedUrl,
        key: s3Key,
        bucket: this.bucket
      };
    } catch (error) {
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Sanitize filename for S3 storage
   * @param {string} filename - Original filename
   * @returns {string} - Sanitized filename safe for URLs
   */
  sanitizeFilename(filename) {
    return filename
      .toLowerCase()
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/[^a-z0-9\-_.]/g, ''); // Remove special characters except hyphens, underscores, dots
  }

  /**
   * Get the appropriate content type for a file based on its extension
   * @param {string} fileName - Name of the file
   * @returns {string} - MIME type
   */
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }
}

/**
 * Standalone function to upload picture to S3
 * @param {Object} uploadConfig - Upload configuration
 * @param {string} uploadConfig.filePath - Path to the picture file
 * @param {string} uploadConfig.bucket - S3 bucket name
 * @param {string} uploadConfig.recordId - Record ID for folder structure
 * @param {string} uploadConfig.key - Optional custom S3 key
 * @param {string} uploadConfig.contentType - Content type
 * @param {Object} uploadConfig.metadata - File metadata
 * @returns {Promise<Object>} - Upload result with URL
 */
export async function uploadToS3(uploadConfig) {
  const s3Config = {
    accessKeyId: uploadConfig.accessKeyId,
    secretAccessKey: uploadConfig.secretAccessKey,
    region: uploadConfig.region,
    bucket: uploadConfig.bucket,
    keyPrefix: uploadConfig.keyPrefix,
    cloudfrontDomain: uploadConfig.cloudfrontDomain
  };
  
  const s3Service = new S3Service(s3Config);
  return await s3Service.uploadPicture(uploadConfig.filePath, uploadConfig.recordId, uploadConfig.key);
}