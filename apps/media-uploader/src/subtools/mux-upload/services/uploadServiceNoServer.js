import fs from 'fs-extra';
import axios from 'axios';
import { createUpload } from '@mux/upchunk';
import { MuxUploadError, ErrorCodes, retryableOperation, handleChunkUploadError, handleResumeStateError, handleUploadMethodError } from '../utils/errorHandler.js';
import { validateVideoFile, createReadStream, formatFileSize } from '../utils/fileUtils.js';
import { extractVideoMetadata, checkVideoFileExists } from '../utils/videoMetadata.js';
import MuxService from './muxService.js';
import { EnhancedChunkUploader } from '../lib/enhanced-chunk-uploader.js';
import { EnhancedRetryHandler } from '../utils/enhanced-retry.js';
import { NetworkHealthChecker } from '../utils/network-health-checker.js';

export class UploadServiceNoServer {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.muxService = new MuxService(config, logger);

    // Initialize enhanced upload components
    this.retryHandler = new EnhancedRetryHandler(logger);
    this.chunkUploader = new EnhancedChunkUploader(config, logger, this.retryHandler);
    this.healthChecker = new NetworkHealthChecker(logger);
  }

  async uploadVideo() {
    let uploadId = null;
    let assetId = null;
    const processStartTime = Date.now();
    let uploadStartTime;

    try {
      this.logger.info('Starting video upload process (no-server mode)');

      // Step 0: Optional pre-upload network health check (Mux only)
      if (this.config.options?.enable_health_check !== false) {
        this.logger.info('Step 0: Performing pre-upload network health check');

        const healthResult = await this.healthChecker.checkHealth({
          timeout: this.config.options?.health_check_timeout || 10000,
          endpoints: ['api.mux.com']
        });

        if (!healthResult.healthy) {
          this.logger.warn('⚠️  Network health check detected issues', {
            issues: healthResult.issues.map(i => i.type)
          });

          const recommendations = this.healthChecker.getRecommendations(healthResult);
          if (recommendations.length > 0) {
            this.logger.warn('💡 Recommendations:');
            recommendations.forEach(rec => {
              this.logger.warn(`   ${rec.issue}:`);
              rec.actions.forEach(action => {
                this.logger.warn(`      - ${action}`);
              });
            });
          }

          this.logger.warn('⚠️  Continuing with upload despite network issues...');
        } else {
          this.logger.info('✅ Network health check passed');
        }
      }

      // Step 1: Check if video file exists
      this.logger.info('Step 1: Checking video file existence');
      await checkVideoFileExists(this.config.video.filepath, this.logger);

      // Step 3: Extract video metadata
      this.logger.info('Step 3: Extracting video metadata');
      const videoMetadata = await extractVideoMetadata(this.config.video.filepath, this.logger);

      // Step 5: Validate video file (needed for Mux upload)
      this.logger.info('Step 5: Validating video file for Mux upload');
      const fileInfo = await validateVideoFile(this.config.video.filepath);
      this.logger.info('Video file validated for Mux', {
        filepath: fileInfo.filepath,
        size: fileInfo.sizeFormatted,
        extension: fileInfo.extension
      });

      // Step 6: Create Mux direct upload
      this.logger.info('Step 6: Creating Mux direct upload');
      this.logger.debug('About to call muxService.createDirectUpload()', {
        muxConfigured: !!this.muxService,
        authConfigPresent: !!this.config.auth,
        tokenIdPresent: !!this.config.auth?.mux_token_id,
        tokenSecretPresent: !!this.config.auth?.mux_token_secret
      });

      const upload = await this.muxService.createDirectUpload();
      uploadId = upload.id;

      this.logger.info('Mux direct upload created successfully', {
        uploadId,
        uploadUrl: upload.url?.substring(0, 60) + '...',
        assetId: upload.asset_id || 'will be created on completion'
      });

      this.logger.logUploadStart(fileInfo.filepath, fileInfo.size, uploadId);

      // Step 8: Upload file to Mux (Enhanced)
      this.logger.info('Step 8: Uploading file to Mux with enhanced chunked uploader');
      this.logger.debug('Starting chunkUploader.upload()', {
        uploadUrl: upload.url?.substring(0, 60) + '...',
        filePath: fileInfo.filepath,
        fileSize: fileInfo.sizeFormatted,
        chunkUploaderInitialized: !!this.chunkUploader
      });

      uploadStartTime = Date.now();

      const UPLOAD_TIMEOUT = this.config.options?.timeout || (12 * 60 * 60 * 1000);
      const uploadPromise = this.chunkUploader.upload(upload.url, fileInfo.filepath);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Mux upload hung - no response after ${UPLOAD_TIMEOUT/1000}s`)), UPLOAD_TIMEOUT)
      );

      try {
        await Promise.race([uploadPromise, timeoutPromise]);
      } catch (error) {
        this.logger.error('Mux upload failed or timed out', {
          error: error.message,
          duration: Date.now() - uploadStartTime,
          filePath: fileInfo.filepath
        });
        throw error;
      }

      const uploadDuration = Date.now() - uploadStartTime;

      this.logger.info('Mux upload completed', {
        duration: `${Math.round(uploadDuration / 1000)} seconds`
      });

      // Step 8b: Monitor upload status and get asset
      this.logger.info('Step 8b: Monitoring Mux upload status');
      const asset = await this.muxService.monitorUploadStatus(uploadId);
      assetId = asset?.id;

      if (!assetId) {
        throw new Error(`Failed to get valid asset ID from Mux upload monitoring. Asset: ${JSON.stringify(asset)}`);
      }

      this.logger.logUploadComplete(uploadId, assetId, asset.duration);

      // Step 9: Wait for asset to be ready
      this.logger.info('Step 9: Waiting for Mux asset to be ready');
      let readyAsset = await this.muxService.waitForAssetReady(assetId);

      this.logger.info('Asset ready - validating data completeness', {
        assetId,
        status: readyAsset.status,
        duration: readyAsset.duration,
        playbackIds: readyAsset.playback_ids?.length || 0,
        playbackIdDetails: readyAsset.playback_ids?.map(pb => ({
          id: pb.id,
          policy: pb.policy
        })) || [],
        tracks: readyAsset.tracks?.length || 0,
        hasPlaybackIds: !!(readyAsset.playback_ids && readyAsset.playback_ids.length > 0)
      });

      if (!readyAsset.playback_ids || readyAsset.playback_ids.length === 0) {
        this.logger.warn('WARNING: Ready asset has no playback IDs - this will likely cause file_url to be null', {
          assetId,
          assetStatus: readyAsset.status,
          suggestion: 'Check asset configuration and playback policies'
        });
      }

      // Step 11: Add subtitles if provided
      let subtitleResults = [];
      if (this.config.subtitles && this.config.subtitles.length > 0) {
        this.logger.info('Step 11: Adding subtitle tracks');
        subtitleResults = await this.muxService.addSubtitles(assetId, this.config.subtitles);
      }

      // Step 12: Setup webhook if configured
      const webhook = await this.muxService.setupWebhook();

      // Prepare result
      const result = {
        success: true,
        backend_record: null,
        upload: {
          id: uploadId,
          status: 'completed'
        },
        asset: {
          id: assetId,
          status: readyAsset.status,
          duration: readyAsset.duration,
          resolution_tier: readyAsset.resolution_tier,
          video_quality: readyAsset.video_quality,
          playback_ids: readyAsset.playback_ids || [],
          tracks: readyAsset.tracks || [],
          created_at: readyAsset.created_at
        },
        metadata: videoMetadata,
        subtitles: {
          total: subtitleResults.length,
          successful: subtitleResults.filter(r => r.success).length,
          failed: subtitleResults.filter(r => !r.success).length,
          details: subtitleResults
        },
        webhook: webhook ? {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events
        } : null,
        file: {
          original_path: this.config.video.filepath,
          filename: fileInfo.filename,
          size: fileInfo.size,
          size_formatted: fileInfo.sizeFormatted
        },
        playback_urls: this.generatePlaybackUrls(readyAsset.playback_ids || []),
        thumbnail_urls: this.generateThumbnailUrls(readyAsset.playback_ids || [])
      };

      this.logger.info('Upload process completed successfully (no-server mode)', {
        uploadId,
        assetId,
        duration: readyAsset.duration
      });

      return result;

    } catch (error) {
      this.logger.logUploadError(uploadId || 'unknown', error);

      // Cleanup on failure
      if (assetId) {
        try {
          await this.muxService.deleteAsset(assetId);
          this.logger.info('Asset cleaned up after failure', { assetId });
        } catch (cleanupError) {
          this.logger.warn('Failed to cleanup asset after error', {
            assetId,
            error: cleanupError.message
          });
        }
      }

      throw error;
    }
  }

  // Legacy method - replaced by enhanced chunk uploader
  async performFileUpload(uploadUrl, fileInfo) {
    this.logger.warn('Legacy performFileUpload called - using enhanced uploader instead');
    return await this.chunkUploader.upload(uploadUrl, fileInfo.filepath);
  }

  async performStreamUpload(uploadUrl, fileInfo) {
    this.logger.info('Starting stream upload', {
      filename: fileInfo.filename,
      size: fileInfo.sizeFormatted,
      timeout: this.config.options?.timeout || 43200000
    });

    try {
      const fileStream = createReadStream(fileInfo.filepath);
      let uploadedBytes = 0;

      fileStream.on('open', () => {
        this.logger.info('File stream opened successfully', { filepath: fileInfo.filepath });
      });

      fileStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const progress = (uploadedBytes / fileInfo.size) * 100;
        this.logger.logUploadProgress('stream', progress, uploadedBytes, fileInfo.size);
      });

      fileStream.on('error', (streamError) => {
        this.logger.error('File stream error during upload', {
          filepath: fileInfo.filepath,
          error: streamError.message,
          uploadedBytes: uploadedBytes
        });
      });

      const response = await axios.put(uploadUrl, fileStream, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileInfo.size
        },
        timeout: this.config.options?.timeout || 43200000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.loaded && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            this.logger.info('HTTP upload progress', {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              progress: progress.toFixed(2) + '%'
            });
          }
        }
      });

      this.logger.info('Stream upload completed successfully', {
        status: response.status,
        statusText: response.statusText,
        uploadedBytes: uploadedBytes,
        size: fileInfo.sizeFormatted
      });

      return response;

    } catch (error) {
      this.logger.error('Stream upload failed', {
        filename: fileInfo.filename,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }

  // Legacy method - replaced by enhanced chunk uploader
  async performChunkedUpload(uploadUrl, fileInfo) {
    this.logger.warn('Legacy performChunkedUpload called - using enhanced uploader instead');
    return await this.chunkUploader.upload(uploadUrl, fileInfo.filepath);
  }

  generatePlaybackUrls(playbackIds) {
    return playbackIds.map(playbackId => ({
      id: playbackId.id,
      policy: playbackId.policy,
      hls_url: this.muxService.getPlaybackUrl(playbackId.id, { extension: 'm3u8' }),
      mp4_url: this.muxService.getPlaybackUrl(playbackId.id, { extension: 'mp4' }),
      stream_url: this.muxService.getPlaybackUrl(playbackId.id)
    }));
  }

  generateThumbnailUrls(playbackIds) {
    return playbackIds.map(playbackId => ({
      id: playbackId.id,
      policy: playbackId.policy,
      thumbnail_jpg: this.muxService.getThumbnailUrl(playbackId.id, { format: 'jpg' }),
      thumbnail_png: this.muxService.getThumbnailUrl(playbackId.id, { format: 'png' }),
      thumbnail_gif: this.muxService.getThumbnailUrl(playbackId.id, { format: 'gif' }),
      animated_gif: this.muxService.getThumbnailUrl(playbackId.id, { format: 'gif', time: '1' })
    }));
  }

  async cleanup() {
    // Clean up subtitle server if it was started
    if (this.muxService._subtitleServer) {
      try {
        this.muxService._subtitleServer.close();
        this.logger.debug('Subtitle server stopped');
      } catch (error) {
        this.logger.warn('Error stopping subtitle server', { error: error.message });
      }
    }
  }

  async validateUpload() {
    try {
      await checkVideoFileExists(this.config.video.filepath, this.logger);

      if (this.config.drm?.enabled && !this.config.drm.configuration_id) {
        throw new MuxUploadError(
          'DRM enabled but no configuration_id provided',
          ErrorCodes.DRM_CONFIG_ERROR
        );
      }

      if (this.config.subtitles) {
        for (const subtitle of this.config.subtitles) {
          await this.muxService.constructor.validateSubtitleUrl?.(subtitle.url);
        }
      }

      this.logger.info('Upload validation completed successfully (no-server mode)');
      return true;

    } catch (error) {
      this.logger.error('Upload validation failed', { error: error.message });
      throw error;
    }
  }

  async validateFileAccess(fileInfo) {
    this.logger.info('Validating file access', { filepath: fileInfo.filepath });

    try {
      const fileExists = await fs.pathExists(fileInfo.filepath);
      if (!fileExists) {
        throw new MuxUploadError(
          `File does not exist: ${fileInfo.filepath}`,
          ErrorCodes.FILE_NOT_FOUND,
          { filepath: fileInfo.filepath }
        );
      }

      const stats = await fs.stat(fileInfo.filepath);

      this.logger.info('File stats retrieved', {
        filepath: fileInfo.filepath,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      });

      if (!stats.isFile()) {
        throw new MuxUploadError(
          `Path is not a file: ${fileInfo.filepath}`,
          ErrorCodes.INVALID_FILE_TYPE,
          { filepath: fileInfo.filepath, type: stats.isDirectory() ? 'directory' : 'other' }
        );
      }

      try {
        await fs.access(fileInfo.filepath, fs.constants.R_OK);
        this.logger.info('File is readable', { filepath: fileInfo.filepath });
      } catch (accessError) {
        throw new MuxUploadError(
          `File is not readable: ${fileInfo.filepath}`,
          ErrorCodes.FILE_ACCESS_DENIED,
          { filepath: fileInfo.filepath, error: accessError.message }
        );
      }

      this.logger.info('File validation completed successfully', { filepath: fileInfo.filepath });

    } catch (error) {
      if (error instanceof MuxUploadError) {
        throw error;
      }

      throw new MuxUploadError(
        `File validation failed: ${error.message}`,
        ErrorCodes.FILE_VALIDATION_ERROR,
        { filepath: fileInfo.filepath, originalError: error.message }
      );
    }
  }
}

export default UploadServiceNoServer;
