/**
 * Upload GUI New Wrapper
 * Uses the new three-interface architecture for better isolation
 */

import { MediaUploaderInterfaces, executeTool } from '../../interfaces/index.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';
import path from 'path';
import fs from 'fs-extra';

/**
 * New GUI wrapper class that uses the interface system
 */
export class NewUploadGuiWrapper {
  constructor(iniFilePath) {
    this.iniFilePath = iniFilePath;
    this.config = null;
  }

  /**
   * Initialize the wrapper by loading and validating configuration
   */
  async initialize() {
    try {
      // Read and parse INI file
      const iniConfig = await readIniFile(this.iniFilePath);
      this.config = iniToStandardConfig(iniConfig);

      // Validate essential configuration sections
      this.validateConfiguration();

      return {
        success: true,
        message: 'Configuration loaded successfully',
        config: this.config
      };
    } catch (error) {
      throw new Error(`Failed to initialize GUI wrapper: ${error.message}`);
    }
  }

  /**
   * Execute media analysis using the new interface
   * @param {Object} paths - Analysis paths
   * @param {string} [paths.videoPath] - Path to video folder
   * @param {string} [paths.subtitlePath] - Path to subtitle folder
   * @param {string} [paths.imagePath] - Path to image folder
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Analysis result
   */
  async executeMediaAnalysis(paths, options = {}) {
    try {
      const result = await MediaUploaderInterfaces.mediaAnalyzer.fromIni(this.iniFilePath, {
        paths,
        saveToFile: options.saveToFile || true,
        outputFile: options.outputFile,
        exportForUpload: options.exportForUpload || false,
        ...options
      });

      return {
        success: true,
        tool: 'media-analyzer',
        result: result.result,
        outputFile: result.outputFile,
        uploadFile: result.uploadFile
      };
    } catch (error) {
      return {
        success: false,
        tool: 'media-analyzer',
        error: error.message
      };
    }
  }

  /**
   * Execute video upload using the new interface
   * @param {string} videoPath - Path to video file
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Upload result
   */
  async executeVideoUpload(videoPath, options = {}) {
    try {
      const result = await MediaUploaderInterfaces.muxUpload.fromIniWithVideo(
        this.iniFilePath,
        videoPath,
        options
      );

      return {
        success: true,
        tool: 'mux-upload',
        result: result.result,
        message: result.message
      };
    } catch (error) {
      return {
        success: false,
        tool: 'mux-upload',
        error: error.message
      };
    }
  }

  /**
   * Execute picture upload using the new interface
   * @param {string} picturePath - Path to picture file
   * @param {Object} metadata - Picture metadata
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Upload result
   */
  async executePictureUpload(picturePath, metadata = {}, options = {}) {
    try {
      const result = await MediaUploaderInterfaces.pictureUpload.fromIniWithMetadata(
        this.iniFilePath,
        picturePath,
        metadata,
        options
      );

      return {
        success: true,
        tool: 'picture-upload',
        result: result.result,
        message: result.message
      };
    } catch (error) {
      return {
        success: false,
        tool: 'picture-upload',
        error: error.message
      };
    }
  }

  /**
   * Execute complete media upload workflow
   * @param {Object} mediaInfo - Media information
   * @param {string} mediaInfo.videoPath - Path to video file
   * @param {Array<string>} [mediaInfo.picturePaths] - Array of picture file paths
   * @param {Object} [mediaInfo.subtitlePaths] - Subtitle file paths by language
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Complete upload result
   */
  async executeCompleteUpload(mediaInfo, options = {}) {
    const results = {
      success: true,
      uploads: [],
      errors: []
    };

    try {
      // 1. Upload video
      if (mediaInfo.videoPath) {
        const videoResult = await this.executeVideoUpload(mediaInfo.videoPath, {
          ...options,
          verbose: options.verbose || false
        });

        results.uploads.push(videoResult);
        if (!videoResult.success) {
          results.success = false;
          results.errors.push(`Video upload failed: ${videoResult.error}`);
        }
      }

      // 2. Upload pictures
      if (mediaInfo.picturePaths && mediaInfo.picturePaths.length > 0) {
        for (const picturePath of mediaInfo.picturePaths) {
          const pictureResult = await this.executePictureUpload(
            picturePath,
            { fileName: path.basename(picturePath) },
            options
          );

          results.uploads.push(pictureResult);
          if (!pictureResult.success) {
            results.success = false;
            results.errors.push(`Picture upload failed (${picturePath}): ${pictureResult.error}`);
          }
        }
      }

      // 3. Upload subtitles (placeholder - would use muxSubtitleUpload when refactored)
      if (mediaInfo.subtitlePaths) {
        for (const [language, subtitlePath] of Object.entries(mediaInfo.subtitlePaths)) {
          // This would use the muxSubtitleUpload interface once refactored
          results.uploads.push({
            success: false,
            tool: 'mux-subtitle-upload',
            error: 'Subtitle upload interface not yet refactored'
          });
          results.errors.push(`Subtitle upload for ${language} not yet implemented`);
        }
      }

      return results;

    } catch (error) {
      return {
        success: false,
        uploads: results.uploads,
        errors: [...results.errors, error.message]
      };
    }
  }

  /**
   * Execute batch processing from analysis result
   * @param {Object} analysisResult - Result from media analysis
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Batch processing result
   */
  async executeBatchFromAnalysis(analysisResult, options = {}) {
    const batchResults = {
      success: true,
      processed: 0,
      failed: 0,
      results: [],
      errors: []
    };

    try {
      const mediaItems = analysisResult.result?.media_items || [];

      for (const item of mediaItems) {
        const mediaInfo = {
          videoPath: item.video?.filepath,
          picturePaths: item.images?.map(img => img.filepath) || [],
          subtitlePaths: item.subtitles?.reduce((acc, sub) => {
            acc[sub.language_code] = sub.filepath;
            return acc;
          }, {}) || {}
        };

        const uploadResult = await this.executeCompleteUpload(mediaInfo, {
          ...options,
          verbose: options.verbose || false
        });

        batchResults.results.push({
          item: item.title || item.video?.filename || 'Unknown',
          ...uploadResult
        });

        if (uploadResult.success) {
          batchResults.processed++;
        } else {
          batchResults.failed++;
          batchResults.errors.push(...uploadResult.errors);
        }
      }

      batchResults.success = batchResults.failed === 0;
      return batchResults;

    } catch (error) {
      batchResults.success = false;
      batchResults.errors.push(error.message);
      return batchResults;
    }
  }

  /**
   * Get processing status and progress information
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.config !== null,
      configPath: this.iniFilePath,
      availableTools: Object.keys(MediaUploaderInterfaces),
      config: this.config
    };
  }

  /**
   * Validate essential configuration sections
   * @private
   */
  validateConfiguration() {
    const required = ['backend', 'mux', 's3'];
    const missing = [];

    for (const section of required) {
      if (!this.config[section]) {
        missing.push(section);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required configuration sections: ${missing.join(', ')}`);
    }

    // Validate specific required fields
    if (!this.config.backend.baseUrl || !this.config.backend.username || !this.config.backend.password) {
      throw new Error('Backend configuration is incomplete (baseUrl, username, password required)');
    }

    if (!this.config.mux.tokenId || !this.config.mux.tokenSecret) {
      throw new Error('Mux configuration is incomplete (tokenId, tokenSecret required)');
    }

    if (!this.config.s3.accessKeyId || !this.config.s3.secretAccessKey) {
      throw new Error('S3 configuration is incomplete (accessKeyId, secretAccessKey required)');
    }
  }
}

/**
 * Factory function to create and initialize a new GUI wrapper
 * @param {string} iniFilePath - Path to INI configuration file
 * @returns {Promise<NewUploadGuiWrapper>} Initialized wrapper instance
 */
export async function createUploadGuiWrapper(iniFilePath) {
  const wrapper = new NewUploadGuiWrapper(iniFilePath);
  await wrapper.initialize();
  return wrapper;
}