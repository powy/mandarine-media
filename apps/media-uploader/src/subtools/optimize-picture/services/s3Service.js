import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs-extra';
import path from 'path';
import { pipeline } from 'stream/promises';

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
   * Extract S3 key from CloudFront URL
   * @param {string} url - CloudFront URL
   * @returns {string|null} - S3 key or null if not extractable
   */
  urlToKey(url) {
    try {
      // Format: https://domain/key
      const urlObj = new URL(url);
      // Remove leading slash from pathname
      return urlObj.pathname.substring(1);
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert S3 key to CloudFront URL
   * @param {string} key - S3 key
   * @returns {string} - CloudFront URL
   */
  keyToUrl(key) {
    return `https://${this.cloudfrontDomain}/${key}`;
  }

  /**
   * Download a file from S3 to local path
   * @param {string} s3Key - S3 object key
   * @param {string} localPath - Local file path to save to
   * @returns {Promise<void>}
   */
  async downloadFile(s3Key, localPath) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      });

      const response = await this.s3Client.send(command);

      // Ensure directory exists
      await fs.ensureDir(path.dirname(localPath));

      // Stream to file
      const writeStream = fs.createWriteStream(localPath);
      await pipeline(response.Body, writeStream);

      return {
        success: true,
        localPath,
        contentType: response.ContentType,
        contentLength: response.ContentLength
      };
    } catch (error) {
      throw new Error(`S3 download failed: ${error.message}`);
    }
  }

  /**
   * Upload a file to S3
   * @param {string} localPath - Local file path
   * @param {string} s3Key - Target S3 key
   * @param {string} contentType - MIME type
   * @returns {Promise<Object>} - Upload result with URL
   */
  async uploadFile(localPath, s3Key, contentType = 'image/webp') {
    try {
      const fileStream = fs.createReadStream(localPath);
      const stats = await fs.stat(localPath);

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: s3Key,
          Body: fileStream,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable'
        }
      });

      await upload.done();

      const url = this.keyToUrl(s3Key);

      return {
        success: true,
        url,
        key: s3Key,
        bucket: this.bucket,
        size: stats.size
      };
    } catch (error) {
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Get content type for a file based on extension
   * @param {string} fileName - File name
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
