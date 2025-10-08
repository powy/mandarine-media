/**
 * S3 Service for Subtitle Uploads
 * Handles subtitle file uploads to S3
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

/**
 * S3 Service Class
 */
export class S3Service {
  constructor(config, logger = console) {
    this.config = config;
    this.logger = logger;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey
      }
    });
  }

  /**
   * Upload subtitle file to S3
   * @param {string} subtitlePath - Local subtitle file path
   * @param {string} mediaDescriptionId - Media description ID (for organizing)
   * @param {string} language - Language code
   * @returns {Promise<Object>} Upload result with S3 URL
   */
  async uploadSubtitle(subtitlePath, mediaDescriptionId, language) {
    try {
      this.logger.info && this.logger.info(`Uploading subtitle to S3...`);

      // Validate file exists
      if (!await fs.pathExists(subtitlePath)) {
        throw new Error(`Subtitle file not found: ${subtitlePath}`);
      }

      // Read file
      const fileContent = await fs.readFile(subtitlePath);

      // Get file extension
      const ext = path.extname(subtitlePath).toLowerCase();

      // Generate S3 key
      // Format: subtitles/{mediaDescriptionId}/{language}/{uniqueId}.{ext}
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const fileName = `${language}_${uniqueId}${ext}`;
      const s3Key = `${this.config.s3.keyPrefix || 'subtitles/'}${mediaDescriptionId}/${language}/${fileName}`;

      // Determine content type
      const contentType = this.getContentType(ext);

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.config.s3.bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        Metadata: {
          'media-description-id': mediaDescriptionId,
          'language': language,
          'original-filename': path.basename(subtitlePath)
        }
      });

      await this.s3Client.send(command);

      // Construct S3 URL
      const s3Url = `https://${this.config.s3.bucket}.s3.${this.config.s3.region}.amazonaws.com/${s3Key}`;

      this.logger.info && this.logger.info(`Subtitle uploaded successfully to S3`);
      this.logger.info && this.logger.info(`S3 Key: ${s3Key}`);
      this.logger.info && this.logger.info(`S3 URL: ${s3Url}`);

      return {
        success: true,
        s3Url,
        s3Key,
        bucket: this.config.s3.bucket,
        region: this.config.s3.region,
        contentType,
        fileName,
        language,
        mediaDescriptionId
      };
    } catch (error) {
      throw new Error(`Failed to upload subtitle to S3: ${error.message}`);
    }
  }

  /**
   * Get content type for subtitle file
   * @param {string} ext - File extension (with dot)
   * @returns {string} Content type
   */
  getContentType(ext) {
    const contentTypes = {
      '.srt': 'text/plain',
      '.vtt': 'text/vtt',
      '.sub': 'text/plain',
      '.ssa': 'text/plain',
      '.ass': 'text/plain'
    };

    return contentTypes[ext.toLowerCase()] || 'text/plain';
  }

  /**
   * Delete subtitle from S3
   * @param {string} s3Key - S3 key to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteSubtitle(s3Key) {
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new DeleteObjectCommand({
        Bucket: this.config.s3.bucket,
        Key: s3Key
      });

      await this.s3Client.send(command);

      this.logger.info && this.logger.info(`Subtitle deleted from S3: ${s3Key}`);

      return {
        success: true,
        s3Key,
        bucket: this.config.s3.bucket
      };
    } catch (error) {
      throw new Error(`Failed to delete subtitle from S3: ${error.message}`);
    }
  }
}

export default S3Service;
