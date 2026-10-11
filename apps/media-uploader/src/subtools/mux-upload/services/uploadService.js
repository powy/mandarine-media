import fs from 'fs-extra';
import axios from 'axios';
import { createUpload } from '@mux/upchunk';
import pg from 'pg';
import { MuxUploadError, ErrorCodes, retryableOperation, handleDatabaseError, handleChunkUploadError, handleResumeStateError, handleUploadMethodError } from '../utils/errorHandler.js';
import { validateVideoFile, createReadStream, formatFileSize } from '../utils/fileUtils.js';
import { extractVideoMetadata, checkVideoFileExists } from '../utils/videoMetadata.js';
import MuxService from './muxService.js';
import BackendService from './backendService.js';
import { EnhancedChunkUploader } from '../lib/enhanced-chunk-uploader.js';
import { EnhancedRetryHandler } from '../utils/enhanced-retry.js';
import { NetworkHealthChecker } from '../utils/network-health-checker.js';

const { Client: PostgresClient } = pg;

export class UploadService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.muxService = new MuxService(config, logger);
    this.backendService = new BackendService(config, logger);
    this.dbClient = null;
    this.videoRecord = null;
    this.backendSkipped = false;

    // Initialize enhanced upload components
    this.retryHandler = new EnhancedRetryHandler(logger);
    this.chunkUploader = new EnhancedChunkUploader(config, logger, this.retryHandler);
    this.healthChecker = new NetworkHealthChecker(logger);

    if (config.database) {
      this.initializeDatabase();
    }
  }
  
  async initializeDatabase() {
    if (!this.config.database) return;
    
    const dbConfig = this.config.database;
    
    try {
      if (dbConfig.type === 'postgresql') {
        this.dbClient = new PostgresClient({
          host: dbConfig.connection.host,
          port: dbConfig.connection.port,
          database: dbConfig.connection.database,
          user: dbConfig.connection.user,
          password: dbConfig.connection.password,
          ssl: dbConfig.connection.ssl || false
        });
        
        await this.dbClient.connect();
        this.logger.info('Database connected successfully', {
          type: dbConfig.type,
          host: dbConfig.connection.host,
          database: dbConfig.connection.database
        });
      }
    } catch (error) {
      this.logger.logDatabaseError(error, 'Database initialization');
      handleDatabaseError(error, 'Database initialization');
    }
  }
  
  async uploadVideo() {
    let uploadId = null;
    let assetId = null;
    const processStartTime = Date.now(); // Track total process time
    let uploadStartTime; // Track upload duration

    try {
      this.logger.info('Starting enhanced video upload process with backend integration');

      // Step 0: Optional pre-upload network health check
      if (this.config.options?.enable_health_check !== false) {
        this.logger.info('Step 0: Performing pre-upload network health check');

        const healthEndpoints = ['api.mux.com'];
        if (this.config.backend?.server_address) {
          const backendHostname = this.config.backend.server_address.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          healthEndpoints.push(backendHostname);
        }

        const healthResult = await this.healthChecker.checkHealth({
          timeout: this.config.options?.health_check_timeout || 10000,
          endpoints: healthEndpoints
        });

        if (!healthResult.healthy) {
          this.logger.warn('⚠️  Network health check detected issues', {
            issues: healthResult.issues.map(i => i.type)
          });

          // Get recommendations
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

          // Continue with upload but warn user
          this.logger.warn('⚠️  Continuing with upload despite network issues...');
        } else {
          this.logger.info('✅ Network health check passed');
        }
      }

      // Step 1: Check if video file exists
      this.logger.info('Step 1: Checking video file existence');
      await checkVideoFileExists(this.config.video.filepath, this.logger);
      
      // Step 2: Test backend connection
      this.logger.info('Step 2: Testing backend connection');
      try {
        await this.backendService.testConnection();
        this.logger.info('✅ Backend connection verified');
      } catch (error) {
        this.logger.warn(`⚠️  Backend unreachable — skipping backend steps: ${error.message}`);
        this.backendSkipped = true;
      }
      
      // Step 3: Extract video metadata
      this.logger.info('Step 3: Extracting video metadata');
      const videoMetadata = await extractVideoMetadata(this.config.video.filepath, this.logger);
      
      // Step 4: Get languages from backend
      this.logger.info('Step 4: Fetching language list from backend');
      let languages = [];
      if (!this.backendSkipped) {
        try {
          languages = await this.backendService.getLanguages();
        } catch (error) {
          this.logger.warn(`⚠️  Could not fetch languages from backend: ${error.message}`);
          this.backendSkipped = true;
        }
      } else {
        this.logger.info('Step 4: Skipping language fetch (backend unavailable)');
      }
      videoMetadata.languages = languages;
      
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
      
      // Step 7: Create video file record (asset ID will be added later)
      if (!this.backendSkipped) {
        this.logger.info('Step 7: Creating video file record in backend');
        try {
          this.videoRecord = await this.backendService.createVideoFileRecord(videoMetadata);
          this.logger.info('Video record created with UUID', { uuid: this.videoRecord.id });
        } catch (error) {
          this.logger.warn(`⚠️  Could not create backend video record: ${error.message} — continuing with Mux upload`);
          this.videoRecord = null;
          this.backendSkipped = true;
        }
      } else {
        this.logger.info('Step 7: Skipping backend record creation (backend unavailable)');
        this.videoRecord = null;
      }
      
      this.logger.logUploadStart(fileInfo.filepath, fileInfo.size, uploadId);

      // Step 8: Upload file to Mux (Enhanced)
      this.logger.info('Step 8: Uploading file to Mux with enhanced chunked uploader');
      this.logger.debug('Starting chunkUploader.upload()', {
        uploadUrl: upload.url?.substring(0, 60) + '...',
        filePath: fileInfo.filepath,
        fileSize: fileInfo.sizeFormatted,
        chunkUploaderInitialized: !!this.chunkUploader
      });

      uploadStartTime = Date.now(); // Track upload start

      // Wrap upload with timeout to detect hangs
      // Use configured timeout or default to 12 hours for large files
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

      // Validate asset ID before proceeding
      if (!assetId) {
        throw new Error(`Failed to get valid asset ID from Mux upload monitoring. Asset: ${JSON.stringify(asset)}`);
      }

      this.logger.logUploadComplete(uploadId, assetId, asset.duration);

      // CRITICAL: Re-authenticate after long upload to prevent 401 errors on backend updates
      if (!this.backendSkipped && (uploadDuration > 30 * 60 * 1000 || this.backendService.isTokenNearExpiry(10))) {
        this.logger.info('Refreshing authentication after upload completion', {
          uploadDuration: `${Math.round(uploadDuration / 1000)} seconds`,
          tokenNearExpiry: this.backendService.isTokenNearExpiry(10)
        });
        try {
          await this.backendService.authenticate(true);
        } catch (error) {
          this.logger.warn(`⚠️  Re-authentication failed: ${error.message}`);
          this.backendSkipped = true;
        }
      } else if (!this.backendSkipped) {
        this.logger.debug('Authentication check passed - no refresh needed', {
          uploadDuration: `${Math.round(uploadDuration / 1000)} seconds`,
          tokenExpired: this.backendService.isTokenExpired()
        });
      }

      // Step 8c: Post-upload backend connectivity check (for long uploads)
      if (!this.backendSkipped && uploadDuration > 5 * 60 * 1000) { // Only for uploads > 5 minutes
        this.logger.info('Step 8c: Verifying backend connectivity after long upload');

        const backendHostname = this.config.backend.server_address.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

        const postUploadHealth = await this.healthChecker.checkHealth({
          timeout: 10000,
          endpoints: [backendHostname]
        });

        if (!postUploadHealth.healthy) {
          this.logger.warn('⚠️  Backend connectivity issues detected after upload', {
            issues: postUploadHealth.issues.map(i => i.type)
          });

          // Wait and retry health check
          this.logger.info('Retrying backend health check after 5s...');
          await new Promise(resolve => setTimeout(resolve, 5000));

          const retryHealth = await this.healthChecker.checkHealth({
            timeout: 10000,
            endpoints: [backendHostname]
          });

          if (!retryHealth.healthy) {
            this.logger.warn('⚠️  Backend still unreachable after retry - continuing anyway (enhanced retry will handle it)', {
              issues: retryHealth.issues.map(i => i.type)
            });
          } else {
            this.logger.info('✅ Backend health check passed on retry');
          }
        } else {
          this.logger.info('✅ Backend connectivity verified after long upload');
        }
      }

      // Update status to upload completed
      const isPostUpload = uploadDuration > 5 * 60 * 1000; // Flag for post-upload retry logic
      if (this.videoRecord) {
        await this.backendService.updateUploadStatus(
          this.videoRecord.id,
          'upload_completed',
          assetId,
          null, // muxPlaybackId
          isPostUpload
        );
      }
      
      // Step 9: Wait for asset to be ready
      this.logger.info('Step 9: Waiting for Mux asset to be ready');
      let readyAsset = await this.muxService.waitForAssetReady(assetId);

      // Validate asset data before proceeding
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

      // Warn if playback IDs are missing - this is often the source of issues
      if (!readyAsset.playback_ids || readyAsset.playback_ids.length === 0) {
        this.logger.warn('WARNING: Ready asset has no playback IDs - this will likely cause file_url to be null', {
          assetId,
          assetStatus: readyAsset.status,
          suggestion: 'Check asset configuration and playback policies'
        });
      }

      // Step 10: Complete video file data from Mux API
      if (this.videoRecord) {
        this.logger.info('Step 10: Completing video file data from Mux API');
        try {
          const completedVideoFile = await this.backendService.completeVideoFileFromMux(this.videoRecord.id);

          if (completedVideoFile) {
            this.logger.info('Video file completed successfully with Mux data', {
              uuid: this.videoRecord.id,
              duration: completedVideoFile.duration_seconds,
              encoding_status: completedVideoFile.encoding_status,
              file_url: completedVideoFile.file_url,
              mux_playback_id: completedVideoFile.mux_playback_id
            });
            // Update our local reference with completed data
            this.videoRecord = completedVideoFile;
          }
        } catch (error) {
          // The complete-from-mux endpoint failed - use fallback method
          this.logger.warn('Complete-from-mux endpoint failed, using fallback manual update', {
            error: error.message,
            assetId,
            videoRecordId: this.videoRecord.id
          });

          await this.backendService.updateVideoFileWithMuxData(this.videoRecord.id, {
            assetId: readyAsset.id,
            status: readyAsset.status,
            duration: readyAsset.duration,
            playback_ids: readyAsset.playback_ids
          });
        }
      } else {
        this.logger.info('Step 10: Skipping backend completion (backend unavailable)');
      }
      
      // Step 11: Add subtitles if provided
      let subtitleResults = [];
      if (this.config.subtitles && this.config.subtitles.length > 0) {
        this.logger.info('Step 11: Adding subtitle tracks');
        subtitleResults = await this.muxService.addSubtitles(assetId, this.config.subtitles);
      }
      
      // Step 12: Setup webhook if configured
      const webhook = await this.muxService.setupWebhook();
      
      // Step 13: Save to database if configured (legacy feature)
      if (this.config.database) {
        await this.saveToDatabase(readyAsset, upload, subtitleResults);
      }
      
      // Prepare result
      const result = {
        success: true,
        backend_record: this.videoRecord ? {
          uuid: this.videoRecord.id,
          upload_status: 'upload_completed',
          upload_url: this.videoRecord.upload_url
        } : null,
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
      
      this.logger.info('Enhanced upload process completed successfully', {
        uuid: this.videoRecord?.id || null,
        uploadId,
        assetId,
        duration: readyAsset.duration
      });
      
      return result;
      
    } catch (error) {
      this.logger.logUploadError(uploadId || 'unknown', error);
      
      // Update backend status to failed if we have a record
      if (this.videoRecord) {
        try {
          await this.backendService.updateUploadStatus(this.videoRecord.id, 'upload_failed');
          this.logger.info('Backend record updated with failure status', { uuid: this.videoRecord.id });
        } catch (statusError) {
          this.logger.warn('Failed to update backend status after upload failure', {
            uuid: this.videoRecord.id,
            error: statusError.message
          });
        }
      }
      
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
  // Kept for potential fallback scenarios
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

      // Enhanced stream event logging
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
        size: fileInfo.sizeFormatted,
        headers: {
          'content-type': response.headers['content-type'],
          'etag': response.headers.etag,
          'x-amz-request-id': response.headers['x-amz-request-id']
        }
      });

      return response;

    } catch (error) {
      this.logger.error('Stream upload failed', {
        filename: fileInfo.filename,
        error: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : undefined
      });

      throw error;
    }
  }
  
  // Legacy method - replaced by enhanced chunk uploader
  // This method had critical memory issues with large files
  async performChunkedUpload(uploadUrl, fileInfo) {
    this.logger.warn('Legacy performChunkedUpload called - using enhanced uploader instead');
    return await this.chunkUploader.upload(uploadUrl, fileInfo.filepath);
  }
  
  // Legacy database save method (kept for backward compatibility)
  async saveToDatabase(asset, upload, subtitleResults = []) {
    if (!this.dbClient) return;
    
    const tableName = this.config.database.table || 'mux_assets';
    
    try {
      // Save main asset record
      const assetRecord = {
        asset_id: asset.id,
        upload_id: upload.id,
        status: asset.status,
        duration: asset.duration,
        resolution_tier: asset.resolution_tier,
        video_quality: asset.video_quality,
        passthrough: asset.passthrough,
        upload_completed_at: new Date(),
        created_at: new Date(asset.created_at),
        updated_at: new Date()
      };
      
      if (this.config.database.save_playback_ids && asset.playback_ids) {
        assetRecord.playback_ids = JSON.stringify(asset.playback_ids);
      }
      
      if (this.config.database.save_tracks && asset.tracks) {
        assetRecord.tracks = JSON.stringify(asset.tracks);
      }
      
      if (this.config.database.save_metadata && this.config.metadata) {
        assetRecord.metadata = JSON.stringify(this.config.metadata);
      }
      
      const insertQuery = this.buildInsertQuery(tableName, assetRecord);
      await this.dbClient.query(insertQuery.query, insertQuery.values);
      
      this.logger.logDatabaseSave(asset.id, tableName);
      
      // Save subtitle records if configured
      if (subtitleResults.length > 0 && this.config.database.save_tracks) {
        await this.saveSubtitleRecords(asset.id, subtitleResults);
      }
      
    } catch (error) {
      this.logger.logDatabaseError(error, 'Asset save');
      handleDatabaseError(error, 'Asset save');
    }
  }
  
  async saveSubtitleRecords(assetId, subtitleResults) {
    const subtitleTable = 'mux_subtitles';
    
    for (const result of subtitleResults) {
      if (result.success && result.track) {
        try {
          const subtitleRecord = {
            asset_id: assetId,
            track_id: result.track.id,
            language_code: result.subtitle.language_code,
            name: result.subtitle.name,
            text_type: result.subtitle.text_type,
            closed_captions: result.subtitle.closed_captions || false,
            passthrough: result.subtitle.passthrough,
            status: result.track.status,
            created_at: new Date()
          };
          
          const insertQuery = this.buildInsertQuery(subtitleTable, subtitleRecord);
          await this.dbClient.query(insertQuery.query, insertQuery.values);
          
          this.logger.debug('Subtitle record saved', {
            assetId,
            trackId: result.track.id,
            language: result.subtitle.language_code
          });
          
        } catch (error) {
          this.logger.warn('Failed to save subtitle record', {
            assetId,
            language: result.subtitle.language_code,
            error: error.message
          });
        }
      }
    }
  }
  
  buildInsertQuery(tableName, record) {
    const columns = Object.keys(record).filter(key => record[key] !== undefined);
    const values = columns.map(col => record[col]);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (asset_id) DO UPDATE SET
        ${columns.map(col => `${col} = EXCLUDED.${col}`).join(', ')},
        updated_at = CURRENT_TIMESTAMP
    `;
    
    return { query, values };
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
    if (this.dbClient) {
      try {
        await this.dbClient.end();
        this.logger.debug('Database connection closed');
      } catch (error) {
        this.logger.warn('Error closing database connection', { error: error.message });
      }
    }
    
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
      // Validate video file exists
      await checkVideoFileExists(this.config.video.filepath, this.logger);
      
      // Test backend connection
      await this.backendService.testConnection();
      
      // Validate configuration
      if (this.config.drm?.enabled && !this.config.drm.configuration_id) {
        throw new MuxUploadError(
          'DRM enabled but no configuration_id provided',
          ErrorCodes.DRM_CONFIG_ERROR
        );
      }
      
      // Validate subtitle URLs if provided
      if (this.config.subtitles) {
        for (const subtitle of this.config.subtitles) {
          await this.muxService.constructor.validateSubtitleUrl?.(subtitle.url);
        }
      }
      
      // Test database connection if configured
      if (this.config.database && !this.dbClient) {
        await this.initializeDatabase();
      }
      
      this.logger.info('Enhanced upload validation completed successfully');
      return true;
      
    } catch (error) {
      this.logger.error('Upload validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Comprehensive file access validation
   */
  async validateFileAccess(fileInfo) {
    this.logger.info('Validating file access', { filepath: fileInfo.filepath });

    try {
      // Check if file exists
      const fileExists = await fs.pathExists(fileInfo.filepath);
      if (!fileExists) {
        throw new MuxUploadError(
          `File does not exist: ${fileInfo.filepath}`,
          ErrorCodes.FILE_NOT_FOUND,
          { filepath: fileInfo.filepath }
        );
      }

      // Get detailed file stats
      const stats = await fs.stat(fileInfo.filepath);

      this.logger.info('File stats retrieved', {
        filepath: fileInfo.filepath,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        birthtime: stats.birthtime,
        mtime: stats.mtime,
        mode: stats.mode.toString(8),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      });

      // Verify it's actually a file
      if (!stats.isFile()) {
        throw new MuxUploadError(
          `Path is not a file: ${fileInfo.filepath}`,
          ErrorCodes.INVALID_FILE_TYPE,
          { filepath: fileInfo.filepath, type: stats.isDirectory() ? 'directory' : 'other' }
        );
      }

      // Check file size consistency
      if (stats.size !== fileInfo.size) {
        this.logger.warn('File size mismatch detected', {
          filepath: fileInfo.filepath,
          expectedSize: fileInfo.size,
          actualSize: stats.size,
          difference: Math.abs(stats.size - fileInfo.size)
        });
      }

      // Check file permissions (readable)
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

      // Try to create a read stream as a final validation
      try {
        const testStream = createReadStream(fileInfo.filepath, { start: 0, end: 1024 }); // Read first 1KB
        const streamPromise = new Promise((resolve, reject) => {
          let bytesRead = 0;
          testStream.on('data', (chunk) => {
            bytesRead += chunk.length;
          });
          testStream.on('end', () => {
            resolve(bytesRead);
          });
          testStream.on('error', reject);
        });

        const bytesRead = await streamPromise;
        this.logger.info('File stream test successful', {
          filepath: fileInfo.filepath,
          testBytesRead: bytesRead
        });
      } catch (streamError) {
        throw new MuxUploadError(
          `Cannot create file stream: ${fileInfo.filepath}`,
          ErrorCodes.FILE_STREAM_ERROR,
          { filepath: fileInfo.filepath, error: streamError.message }
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

  /**
   * Test network connectivity to upload URL
   */
  async testConnectivity(uploadUrl) {
    this.logger.info('Testing connectivity to upload URL');

    try {
      // Parse URL for logging
      const url = new URL(uploadUrl);
      this.logger.info('Upload URL details', {
        hostname: url.hostname,
        protocol: url.protocol,
        port: url.port || (url.protocol === 'https:' ? 443 : 80)
      });

      // Test connectivity with a HEAD request (no body)
      const response = await axios.head(uploadUrl, {
        timeout: 10000, // 10 second timeout for connectivity test
        validateStatus: (status) => status < 500 // Accept any status code < 500 as connected
      });

      this.logger.info('Connectivity test successful', {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': response.headers['content-type'],
          'server': response.headers.server,
          'connection': response.headers.connection
        }
      });

    } catch (error) {
      const connectivityError = {
        uploadUrl: uploadUrl.substring(0, 50) + '...',
        error: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall
      };

      if (error.response) {
        connectivityError.httpStatus = error.response.status;
        connectivityError.httpStatusText = error.response.statusText;
      }

      this.logger.error('Connectivity test failed', connectivityError);

      throw new MuxUploadError(
        `Network connectivity test failed: ${error.message}`,
        ErrorCodes.NETWORK_ERROR,
        connectivityError
      );
    }
  }
}

export default UploadService;