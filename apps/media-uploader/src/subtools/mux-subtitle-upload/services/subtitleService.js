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
        passthrough: subtitle.passthrough,
        is_default: subtitle.is_default || false
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

    // Validate language code (BCP 47 compliance)
    if (!subtitle.language_code) {
      throw new Error(`Missing language_code for subtitle file: ${subtitle.file_path} (index: ${index})`);
    }
    
    if (!this.isValidBCP47(subtitle.language_code)) {
      this.logger.warn('Invalid BCP 47 language code detected', {
        languageCode: subtitle.language_code,
        filePath: subtitle.file_path,
        index: index,
        suggestion: 'Use valid BCP 47 codes like "en", "en-US", "fr", "es", etc.'
      });
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
      throw new Error(`Unsupported subtitle format: ${extension}. Supported formats: ${supportedFormats.join(', ')}. (file: ${subtitle.file_path}, index: ${index})`);
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

      if (extension === '.sbv' && !content.includes(',')) {
        this.logger.warn('SBV file may not be properly formatted (missing comma-separated timecodes)', {
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
   * Validate BCP 47 language code
   */
  isValidBCP47(languageCode) {
    // Basic BCP 47 validation - checks for common patterns
    const bcp47Pattern = /^[a-z]{2,3}(-[A-Z]{2})?(-[a-z]{4})?(-[A-Z]{2})?$/;
    return bcp47Pattern.test(languageCode);
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