import fs from 'fs-extra';
import axios from 'axios';
import { createUpload } from '@mux/upchunk';
import pg from 'pg';
import { MuxUploadError, ErrorCodes, retryableOperation, handleDatabaseError } from '../utils/errorHandler.js';
import { validateVideoFile, createReadStream, formatFileSize } from '../utils/fileUtils.js';
import { extractVideoMetadata, checkVideoFileExists } from '../utils/videoMetadata.js';
import MuxService from './muxService.js';
import BackendService from './backendService.js';

const { Client: PostgresClient } = pg;

export class UploadService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.muxService = new MuxService(config, logger);
    this.backendService = new BackendService(config, logger);
    this.dbClient = null;
    this.videoRecord = null;
    
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
    
    try {
      this.logger.info('Starting enhanced video upload process with backend integration');
      
      // Step 1: Check if video file exists
      this.logger.info('Step 1: Checking video file existence');
      await checkVideoFileExists(this.config.video.filepath, this.logger);
      
      // Step 2: Test backend connection
      this.logger.info('Step 2: Testing backend connection');
      await this.backendService.testConnection();
      
      // Step 3: Extract video metadata
      this.logger.info('Step 3: Extracting video metadata');
      const videoMetadata = await extractVideoMetadata(this.config.video.filepath, this.logger);
      
      // Step 4: Get languages from backend
      this.logger.info('Step 4: Fetching language list from backend');
      const languages = await this.backendService.getLanguages();
      videoMetadata.languages = languages;
      
      // Step 5: Create video file record in backend
      this.logger.info('Step 5: Creating video file record in backend');
      this.videoRecord = await this.backendService.createVideoFileRecord(videoMetadata);
      this.logger.info('Video record created with UUID', { uuid: this.videoRecord.id });
      
      // Step 6: Start the upload process
      this.logger.info('Step 6: Starting Mux upload process');
      
      // Update status to upload started
      await this.backendService.updateUploadStatus(this.videoRecord.id, 'file_uploading');
      
      // Validate video file (legacy step for Mux compatibility)
      const fileInfo = await validateVideoFile(this.config.video.filepath);
      this.logger.info('Video file validated for Mux', {
        filepath: fileInfo.filepath,
        size: fileInfo.sizeFormatted,
        extension: fileInfo.extension
      });
      
      // Create direct upload
      const upload = await this.muxService.createDirectUpload();
      uploadId = upload.id;
      
      this.logger.logUploadStart(fileInfo.filepath, fileInfo.size, uploadId);
      
      // Upload file to Mux
      await this.performFileUpload(upload.url, fileInfo);
      
      // Step 7: Monitor upload status and get asset
      this.logger.info('Step 7: Monitoring Mux upload status');
      const asset = await this.muxService.monitorUploadStatus(uploadId);
      assetId = asset.id;
      
      this.logger.logUploadComplete(uploadId, assetId, asset.duration);
      
      // Update status to upload completed
      await this.backendService.updateUploadStatus(
        this.videoRecord.id, 
        'upload_completed',
        assetId,
        asset.playback_ids?.[0]?.id
      );
      
      // Step 8: Wait for asset to be ready
      this.logger.info('Step 8: Waiting for Mux asset to be ready');
      let readyAsset = await this.muxService.waitForAssetReady(assetId);
      
      // Step 9: Update backend with final Mux data
      this.logger.info('Step 9: Updating backend with final Mux data');
      await this.backendService.updateVideoFileWithMuxData(this.videoRecord.id, {
        assetId: readyAsset.id,
        status: readyAsset.status,
        duration: readyAsset.duration,
        playback_ids: readyAsset.playback_ids
      });
      
      // Step 10: Add subtitles if provided
      let subtitleResults = [];
      if (this.config.subtitles && this.config.subtitles.length > 0) {
        this.logger.info('Step 10: Adding subtitle tracks');
        subtitleResults = await this.muxService.addSubtitles(assetId, this.config.subtitles);
      }
      
      // Step 11: Setup webhook if configured
      const webhook = await this.muxService.setupWebhook();
      
      // Step 12: Save to database if configured (legacy feature)
      if (this.config.database) {
        await this.saveToDatabase(readyAsset, upload, subtitleResults);
      }
      
      // Prepare result
      const result = {
        success: true,
        backend_record: {
          uuid: this.videoRecord.id,
          upload_status: 'upload_completed',
          upload_url: this.videoRecord.upload_url
        },
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
        uuid: this.videoRecord.id,
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
  
  async performFileUpload(uploadUrl, fileInfo) {
    const chunkSize = this.config.options?.chunk_size || 31457280; // 30MB default
    
    try {
      if (fileInfo.size > 100 * 1024 * 1024) { // Files larger than 100MB use chunked upload
        return await this.performChunkedUpload(uploadUrl, fileInfo, chunkSize);
      } else {
        return await this.performStreamUpload(uploadUrl, fileInfo);
      }
    } catch (error) {
      // Update backend status on upload failure
      if (this.videoRecord) {
        try {
          await this.backendService.updateUploadStatus(this.videoRecord.id, 'upload_failed');
        } catch (statusError) {
          this.logger.warn('Failed to update backend status on upload failure', {
            uuid: this.videoRecord.id,
            error: statusError.message
          });
        }
      }
      
      throw new MuxUploadError(
        'File upload failed',
        ErrorCodes.UPLOAD_FAILED,
        {
          uploadUrl: uploadUrl.substring(0, 50) + '...',
          fileSize: fileInfo.size,
          error: error.message
        }
      );
    }
  }
  
  async performStreamUpload(uploadUrl, fileInfo) {
    this.logger.info('Starting stream upload', {
      filename: fileInfo.filename,
      size: fileInfo.sizeFormatted
    });
    
    const fileStream = createReadStream(fileInfo.filepath);
    let uploadedBytes = 0;
    
    fileStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const progress = (uploadedBytes / fileInfo.size) * 100;
      this.logger.logUploadProgress('stream', progress, uploadedBytes, fileInfo.size);
    });
    
    const response = await axios.put(uploadUrl, fileStream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileInfo.size
      },
      timeout: this.config.options?.timeout || 3600000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    this.logger.info('Stream upload completed', {
      status: response.status,
      uploadedBytes: uploadedBytes,
      size: fileInfo.sizeFormatted
    });
    
    return response;
  }
  
  async performChunkedUpload(uploadUrl, fileInfo, chunkSize) {
    this.logger.info('Starting chunked upload', {
      filename: fileInfo.filename,
      size: fileInfo.sizeFormatted,
      chunkSize: formatFileSize(chunkSize)
    });
    
    return new Promise((resolve, reject) => {
      const upload = createUpload({
        endpoint: uploadUrl,
        file: fs.createReadStream(fileInfo.filepath),
        chunkSize: chunkSize
      });
      
      upload.on('progress', (progress) => {
        const percentage = parseFloat(progress.detail);
        const uploadedBytes = Math.round((percentage / 100) * fileInfo.size);
        this.logger.logUploadProgress('chunked', percentage, uploadedBytes, fileInfo.size);
      });
      
      upload.on('success', () => {
        this.logger.info('Chunked upload completed', {
          filename: fileInfo.filename,
          size: fileInfo.sizeFormatted
        });
        resolve();
      });
      
      upload.on('error', (error) => {
        this.logger.error('Chunked upload failed', {
          filename: fileInfo.filename,
          error: error.message
        });
        reject(error);
      });
      
      // Handle timeout
      const timeout = setTimeout(() => {
        upload.abort();
        reject(new MuxUploadError(
          'Upload timeout',
          ErrorCodes.TIMEOUT_ERROR,
          { filename: fileInfo.filename, timeout: this.config.options?.timeout }
        ));
      }, this.config.options?.timeout || 3600000);
      
      upload.on('success', () => clearTimeout(timeout));
      upload.on('error', () => clearTimeout(timeout));
    });
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
}

export default UploadService;