import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import S3Manager from './s3Manager.js';
import MuxManager from './muxManager.js';

export default class SubtitleService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.sessionId = crypto.randomUUID();
    
    // Resolve relative paths to absolute paths for all subtitles
    this.config = this.resolveFilePaths(config);
    
    this.s3Manager = new S3Manager(config.s3, logger);
    this.muxManager = new MuxManager(config.auth, logger);
    
    this.options = {
      cleanupDelayMinutes: config.options?.cleanup_delay_minutes || 120,
      maxRetryAttempts: config.options?.max_retry_attempts || 3,
      retryDelay: config.options?.retry_delay || 5000,
      monitoringTimeout: config.options?.monitoring_timeout || 60000,
      monitoringInterval: config.options?.monitoring_interval || 5000,
      validateBeforeUpload: config.options?.validate_before_upload !== false
    };
  }

  /**
   * Static factory method: Create service with explicit credentials
   * @param {Object} params - Parameters object
   * @param {Object} params.awsCredentials - AWS credentials and S3 config
   * @param {string} params.awsCredentials.accessKeyId - AWS Access Key ID
   * @param {string} params.awsCredentials.secretAccessKey - AWS Secret Access Key  
   * @param {string} params.awsCredentials.region - AWS region
   * @param {string} params.awsCredentials.bucket - S3 bucket name
   * @param {Object} params.muxCredentials - Mux API credentials
   * @param {string} params.muxCredentials.tokenId - Mux Token ID
   * @param {string} params.muxCredentials.tokenSecret - Mux Token Secret
   * @param {string} params.assetId - Mux Asset ID
   * @param {Array} params.subtitles - Array of subtitle objects
   * @param {Object} params.options - Optional configuration
   * @param {Object} params.logger - Optional logger (will create default if not provided)
   * @returns {Promise<Object>} Upload results
   */
  static async withCredentials({
    awsCredentials,
    muxCredentials, 
    assetId,
    subtitles,
    options = {},
    logger = null
  }) {
    // Build config object from explicit parameters
    const config = {
      auth: {
        mux_token_id: muxCredentials.tokenId,
        mux_token_secret: muxCredentials.tokenSecret
      },
      s3: {
        access_key_id: awsCredentials.accessKeyId,
        secret_access_key: awsCredentials.secretAccessKey,
        region: awsCredentials.region,
        bucket_name: awsCredentials.bucket,
        presigned_url_expiry: options.presignedUrlExpiry || 3600
      },
      mux_asset_id: assetId,
      subtitles: subtitles,
      options: {
        cleanup_delay_minutes: options.cleanupDelayMinutes || 120,
        max_retry_attempts: options.maxRetryAttempts || 3,
        retry_delay: options.retryDelay || 5000,
        monitoring_timeout: options.monitoringTimeout || 60000,
        monitoring_interval: options.monitoringInterval || 5000,
        validate_before_upload: options.validateBeforeUpload !== false
      }
    };

    // Create logger if not provided
    if (!logger) {
      const { createLogger } = await import('../config/logger.js');
      logger = createLogger({
        logging: {
          level: options.logLevel || 'info',
          console: true,
          format: 'simple'
        }
      });
    }

    // Create and run service
    const service = new SubtitleService(config, logger);
    return await service.uploadSubtitles();
  }

  /**
   * Static factory method: Create service using environment variables
   * @param {string} assetId - Mux Asset ID
   * @param {Array} subtitles - Array of subtitle objects
   * @param {Object} options - Optional configuration
   * @param {Object} logger - Optional logger
   * @returns {Promise<Object>} Upload results
   */
  static async withEnvironment(assetId, subtitles, options = {}, logger = null) {
    // Read from environment variables
    const awsCredentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET_NAME
    };

    const muxCredentials = {
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET
    };

    // Validate required environment variables
    const requiredEnvVars = [
      { name: 'AWS_ACCESS_KEY_ID', value: awsCredentials.accessKeyId },
      { name: 'AWS_SECRET_ACCESS_KEY', value: awsCredentials.secretAccessKey },
      { name: 'S3_BUCKET_NAME', value: awsCredentials.bucket },
      { name: 'MUX_TOKEN_ID', value: muxCredentials.tokenId },
      { name: 'MUX_TOKEN_SECRET', value: muxCredentials.tokenSecret }
    ];

    const missingVars = requiredEnvVars.filter(env => !env.value);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.map(env => env.name).join(', ')}`);
    }

    // Use the withCredentials method
    return await SubtitleService.withCredentials({
      awsCredentials,
      muxCredentials,
      assetId,
      subtitles,
      options,
      logger
    });
  }

  /**
   * Resolve relative file paths to absolute paths
   */
  resolveFilePaths(config) {
    const resolvedConfig = { ...config };
    
    if (resolvedConfig.subtitles) {
      resolvedConfig.subtitles = resolvedConfig.subtitles.map(subtitle => ({
        ...subtitle,
        file_path: path.resolve(subtitle.file_path)
      }));
    }
    
    return resolvedConfig;
  }

  /**
   * Main method to upload all subtitles to a Mux asset
   */
  async uploadSubtitles() {
    const startTime = Date.now();
    
    this.logger.logStart(this.sessionId, this.config);
    
    try {
      // Step 1: Validate inputs
      if (this.options.validateBeforeUpload) {
        await this.validateInputs();
      }

      // Step 2: Process each subtitle
      const results = [];
      for (let i = 0; i < this.config.subtitles.length; i++) {
        const subtitle = this.config.subtitles[i];
        
        try {
          this.logger.logSubtitleStart(this.sessionId, subtitle, i);
          const result = await this.uploadSingleSubtitle(subtitle, i);
          results.push(result);
          this.logger.logSubtitleSuccess(this.sessionId, subtitle, result, i);
        } catch (error) {
          this.logger.logSubtitleError(this.sessionId, subtitle, error, i);
          results.push({
            success: false,
            subtitle: subtitle,
            error: error.message,
            index: i
          });
        }
      }

      const totalTime = Date.now() - startTime;
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      const summary = {
        sessionId: this.sessionId,
        success: failed.length === 0,
        totalSubtitles: results.length,
        successful: successful.length,
        failed: failed.length,
        totalTimeMs: totalTime,
        results: results
      };

      if (summary.success) {
        this.logger.logSuccess(this.sessionId, results);
      } else {
        this.logger.logError(this.sessionId, new Error(`${failed.length} of ${results.length} subtitles failed`));
      }

      return summary;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.logError(this.sessionId, error, { totalTimeMs: totalTime });
      
      throw {
        sessionId: this.sessionId,
        success: false,
        error: error.message,
        totalTimeMs: totalTime
      };
    }
  }

  /**
   * Upload a single subtitle file
   */
  async uploadSingleSubtitle(subtitle, index) {
    const startTime = Date.now();

    // Step 1: Upload to S3
    const s3Result = await this.s3Manager.uploadFile(
      subtitle.file_path, 
      this.config.mux_asset_id, 
      {
        language: subtitle.language_code,
        'session-id': this.sessionId,
        'subtitle-index': index.toString(),
        'text-type': subtitle.text_type || 'subtitles'
      }
    );

    // Step 2: Generate presigned URL
    const presignedUrl = await this.s3Manager.generatePresignedUrl(s3Result.s3Key);

    // Step 3: Add track to Mux
    const muxResult = await this.muxManager.addSubtitleTrack(
      this.config.mux_asset_id,
      presignedUrl,
      {
        language_code: subtitle.language_code,
        name: subtitle.name,
        text_type: subtitle.text_type || 'subtitles',
        closed_captions: subtitle.closed_captions || false,
        passthrough: subtitle.passthrough
      }
    );

    // Step 4: Monitor processing
    const monitorResult = await this.muxManager.monitorTrackStatus(
      this.config.mux_asset_id,
      muxResult.trackId,
      this.options.monitoringTimeout,
      this.options.monitoringInterval
    );

    // Step 5: Schedule S3 cleanup
    this.s3Manager.scheduleCleanup(s3Result.s3Key, this.options.cleanupDelayMinutes);

    const totalTime = Date.now() - startTime;

    return {
      success: monitorResult.success,
      subtitle: subtitle,
      index: index,
      trackId: muxResult.trackId,
      s3Key: s3Result.s3Key,
      uploadTimeMs: s3Result.uploadTimeMs,
      processingTimeMs: monitorResult.processingTimeMs || 0,
      totalTimeMs: totalTime,
      monitoringResult: monitorResult,
      s3Result: s3Result,
      muxResult: muxResult
    };
  }

  /**
   * Validate all inputs before starting upload
   */
  async validateInputs() {
    this.logger.info('Validating inputs', {
      sessionId: this.sessionId
    });

    // Validate Mux asset
    const assetValidation = await this.muxManager.validateAsset(this.config.mux_asset_id);
    if (!assetValidation.exists) {
      throw new Error(`Mux asset not found: ${this.config.mux_asset_id}`);
    }

    if (!assetValidation.ready) {
      this.logger.warn('Mux asset not ready', {
        assetId: this.config.mux_asset_id,
        status: assetValidation.status
      });
    }

    // Validate each subtitle file
    for (let i = 0; i < this.config.subtitles.length; i++) {
      const subtitle = this.config.subtitles[i];
      await this.validateSubtitleFile(subtitle, i);
    }

    // Check for duplicate languages
    const languages = this.config.subtitles.map(s => s.language_code);
    const duplicates = languages.filter((lang, index) => languages.indexOf(lang) !== index);
    if (duplicates.length > 0) {
      this.logger.warn('Duplicate language codes found', {
        duplicates: [...new Set(duplicates)]
      });
    }

    this.logger.info('Input validation completed successfully', {
      sessionId: this.sessionId,
      assetStatus: assetValidation.status,
      subtitleCount: this.config.subtitles.length
    });
  }

  /**
   * Validate a single subtitle file
   */
  async validateSubtitleFile(subtitle, index) {
    // Check file exists
    if (!await fs.pathExists(subtitle.file_path)) {
      throw new Error(`Subtitle file not found: ${subtitle.file_path} (index: ${index})`);
    }

    // Check file size
    const stats = await fs.stat(subtitle.file_path);
    if (stats.size === 0) {
      throw new Error(`Subtitle file is empty: ${subtitle.file_path} (index: ${index})`);
    }

    if (stats.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error(`Subtitle file too large (${stats.size} bytes): ${subtitle.file_path} (index: ${index})`);
    }

    if (stats.size > 1024 * 1024) { // Warn if > 1MB
      this.logger.warn('Large subtitle file detected', {
        filePath: subtitle.file_path,
        sizeMB: (stats.size / 1024 / 1024).toFixed(2),
        index: index
      });
    }

    // Check file extension
    const extension = path.extname(subtitle.file_path).toLowerCase();
    const supportedFormats = ['.srt', '.vtt', '.sbv'];
    if (!supportedFormats.includes(extension)) {
      this.logger.warn('Unsupported subtitle format', {
        extension: extension,
        filePath: subtitle.file_path,
        supportedFormats: supportedFormats,
        index: index
      });
    }

    // Basic content validation
    try {
      const content = await fs.readFile(subtitle.file_path, 'utf8');
      if (content.trim().length === 0) {
        throw new Error(`Subtitle file appears to be empty: ${subtitle.file_path} (index: ${index})`);
      }

      // Check for common subtitle format patterns
      if (extension === '.srt' && !content.includes('-->')) {
        this.logger.warn('SRT file may not be properly formatted (missing --> timecodes)', {
          filePath: subtitle.file_path,
          index: index
        });
      }

      if (extension === '.vtt' && !content.startsWith('WEBVTT')) {
        this.logger.warn('VTT file may not be properly formatted (missing WEBVTT header)', {
          filePath: subtitle.file_path,
          index: index
        });
      }
    } catch (error) {
      throw new Error(`Cannot read subtitle file: ${subtitle.file_path} (index: ${index}) - ${error.message}`);
    }

    this.logger.debug('Subtitle file validation passed', {
      filePath: subtitle.file_path,
      fileSize: stats.size,
      language: subtitle.language_code,
      index: index
    });
  }

  /**
   * Get current session information
   */
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      assetId: this.config.mux_asset_id,
      subtitleCount: this.config.subtitles.length,
      options: this.options
    };
  }

  /**
   * Convert SRT to VTT format if needed
   */
  convertSrtToVtt(srtContent) {
    // Add WEBVTT header and convert timestamp format
    let vttContent = 'WEBVTT\n\n';
    
    // Replace commas with dots in timestamps
    vttContent += srtContent
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
      .replace(/\r\n/g, '\n');
    
    return vttContent;
  }
}