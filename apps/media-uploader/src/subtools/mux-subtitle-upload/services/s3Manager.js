import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export default class S3Manager {
  constructor(config, logger) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.access_key_id,
        secretAccessKey: config.secret_access_key
      }
    });
    this.bucketName = config.bucket_name;
    this.subtitleFolder = config.subtitle_folder || 'subtitles';
    this.presignedUrlExpiry = config.presigned_url_expiry || 3600;
    this.logger = logger;
  }

  /**
   * Generate unique S3 key for subtitle file
   */
  generateS3Key(originalFilePath, assetId, language) {
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilePath);
    const baseFileName = path.basename(originalFilePath, extension);
    
    // Format: {subtitleFolder}/YYYY-MM-DD/assetId/language_filename_timestamp_hash.ext
    const date = new Date().toISOString().split('T')[0];
    return `${this.subtitleFolder}/${date}/${assetId}/${language}_${baseFileName}_${timestamp}_${hash}${extension}`;
  }

  /**
   * Upload subtitle file to S3 with progress tracking
   */
  async uploadFile(filePath, assetId, metadata = {}) {
    const startTime = Date.now();
    
    try {
      // Validate file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`Subtitle file not found: ${filePath}`);
      }

      const fileStats = await fs.stat(filePath);
      const fileContent = await fs.readFile(filePath);
      const s3Key = this.generateS3Key(filePath, assetId, metadata.language || 'unknown');
      
      this.logger.info('Starting S3 upload', {
        filePath: filePath,
        fileSize: fileStats.size,
        s3Key: s3Key,
        bucket: this.bucketName
      });

      // Determine content type
      const extension = path.extname(filePath).toLowerCase();
      let contentType;
      switch (extension) {
        case '.vtt':
          contentType = 'text/vtt';
          break;
        case '.srt':
          contentType = 'text/plain';
          break;
        case '.sbv':
          contentType = 'text/plain';
          break;
        default:
          contentType = 'text/plain';
      }

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        Metadata: {
          'upload-timestamp': new Date().toISOString(),
          'mux-asset-id': assetId,
          'language-code': metadata.language || 'unknown',
          'file-size': fileStats.size.toString(),
          ...metadata
        }
      });

      await this.client.send(uploadCommand);
      
      const uploadTime = Date.now() - startTime;
      this.logger.info('S3 upload successful', {
        s3Key: s3Key,
        uploadTimeMs: uploadTime,
        fileSizeBytes: fileStats.size,
        contentType: contentType
      });

      // Verify upload
      const isVerified = await this.verifyUpload(s3Key, fileStats.size);
      if (!isVerified) {
        throw new Error('Upload verification failed - file size mismatch');
      }

      return {
        success: true,
        s3Key: s3Key,
        bucket: this.bucketName,
        uploadTimeMs: uploadTime,
        fileSize: fileStats.size,
        contentType: contentType
      };

    } catch (error) {
      const uploadTime = Date.now() - startTime;
      this.logger.error('S3 upload failed', {
        error: error.message,
        filePath: filePath,
        uploadTimeMs: uploadTime
      });
      throw error;
    }
  }

  /**
   * Verify file exists in S3 and matches expected size
   */
  async verifyUpload(s3Key, expectedSize) {
    try {
      this.logger.debug('Verifying S3 upload', {
        s3Key: s3Key,
        expectedSize: expectedSize
      });
      
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      const response = await this.client.send(headCommand);
      const isValid = response.ContentLength === expectedSize;
      
      if (isValid) {
        this.logger.debug('S3 upload verification successful', {
          s3Key: s3Key,
          actualSize: response.ContentLength
        });
      } else {
        this.logger.error('S3 upload verification failed', {
          s3Key: s3Key,
          expectedSize: expectedSize,
          actualSize: response.ContentLength
        });
      }

      return isValid;

    } catch (error) {
      this.logger.error('S3 verification failed', {
        error: error.message,
        s3Key: s3Key
      });
      return false;
    }
  }

  /**
   * Generate presigned URL for Mux to fetch the file
   */
  async generatePresignedUrl(s3Key) {
    try {
      this.logger.debug('Generating presigned URL', {
        s3Key: s3Key,
        expirySeconds: this.presignedUrlExpiry
      });
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: this.presignedUrlExpiry
      });

      this.logger.info('Presigned URL generated successfully', {
        s3Key: s3Key,
        expirySeconds: this.presignedUrlExpiry
      });

      return url;

    } catch (error) {
      this.logger.error('Failed to generate presigned URL', {
        error: error.message,
        s3Key: s3Key
      });
      throw error;
    }
  }

  /**
   * Delete file from S3 after successful processing
   */
  async deleteFile(s3Key) {
    try {
      this.logger.info('Deleting S3 file', {
        s3Key: s3Key
      });
      
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      await this.client.send(deleteCommand);
      
      this.logger.info('S3 file deleted successfully', {
        s3Key: s3Key
      });

      return true;

    } catch (error) {
      this.logger.error('S3 deletion failed', {
        error: error.message,
        s3Key: s3Key
      });
      return false;
    }
  }

  /**
   * Schedule S3 cleanup after delay
   */
  scheduleCleanup(s3Key, delayMinutes = 120) {
    const delayMs = delayMinutes * 60 * 1000;
    
    setTimeout(async () => {
      try {
        this.logger.info('Executing scheduled S3 cleanup', {
          s3Key: s3Key,
          delayMinutes: delayMinutes
        });
        
        await this.deleteFile(s3Key);
        
      } catch (error) {
        this.logger.error('Scheduled cleanup failed', {
          s3Key: s3Key,
          error: error.message
        });
      }
    }, delayMs);

    this.logger.info('S3 cleanup scheduled', {
      s3Key: s3Key,
      delayMinutes: delayMinutes
    });
  }
}