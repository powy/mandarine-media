import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs-extra';
import path from 'path';

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
    this.keyPrefix = config.keyPrefix || 'pictures/';
  }

  /**
   * Upload a picture file to S3
   * @param {string} filePath - Local path to the picture file
   * @param {string} customKey - Optional custom S3 key
   * @returns {Promise<string>} - The S3 URL of the uploaded file
   */
  async uploadPicture(filePath, customKey = null) {
    try {
      const fileName = path.basename(filePath);
      const s3Key = customKey || `${this.keyPrefix}${Date.now()}-${fileName}`;
      
      const fileStream = fs.createReadStream(filePath);
      
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: s3Key,
          Body: fileStream,
          ContentType: this.getContentType(fileName)
        }
      });

      const result = await upload.done();
      
      // Return the S3 URL
      return `https://${this.bucket}.s3.${this.s3Client.config.region}.amazonaws.com/${s3Key}`;
    } catch (error) {
      throw new Error(`S3 upload failed: ${error.message}`);
    }
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
 * @param {string} filePath - Path to the picture file
 * @param {Object} s3Config - S3 configuration object
 * @param {string} customKey - Optional custom S3 key
 * @returns {Promise<string>} - The S3 URL of the uploaded file
 */
export async function uploadToS3(filePath, s3Config, customKey = null) {
  const s3Service = new S3Service(s3Config);
  return await s3Service.uploadPicture(filePath, customKey);
}