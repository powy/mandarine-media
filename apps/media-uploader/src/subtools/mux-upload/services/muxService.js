import Mux from '@mux/mux-node';
import fs from 'fs-extra';
import path from 'path';
import { MuxUploadError, ErrorCodes, handleMuxError, retryableOperation } from '../utils/errorHandler.js';
import { validateSubtitleUrl } from '../utils/fileUtils.js';

export class MuxService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize Mux client
    this.mux = new Mux({
      tokenId: config.auth.mux_token_id,
      tokenSecret: config.auth.mux_token_secret
    });
    
    this.muxClient = this.mux.video;
  }
  
  async createDirectUpload() {
    const uploadConfig = this.buildUploadConfig();
    
    try {
      this.logger.debug('Creating direct upload', { uploadConfig });
      
      const upload = await retryableOperation(
        () => this.muxClient.uploads.create(uploadConfig),
        this.logger,
        this.config.options?.retry_attempts || 3,
        this.config.options?.retry_delay || 5000,
        'Direct upload creation'
      );
      
      this.logger.logDirectUploadCreated(upload);
      return upload;
      
    } catch (error) {
      this.logger.logUploadError('unknown', error, 0);
      handleMuxError(error, 'Direct upload creation');
    }
  }
  
  buildUploadConfig() {
    const settings = this.config.settings || {};
    const video = this.config.video || {};
    
    const uploadConfig = {
      cors_origin: settings.cors_origin || '*',
      new_asset_settings: {
        playback_policy: settings.playback_policy || ['public'],
        video_quality: settings.video_quality || 'basic',
        max_resolution_tier: settings.max_resolution_tier || '1080p',
        normalize_audio: settings.normalize_audio !== undefined ? settings.normalize_audio : false,
        master_access: settings.master_access || 'none'
      }
    };

    // Only add mp4_support if explicitly provided in settings (don't send by default)
    if (settings.mp4_support !== undefined) {
      uploadConfig.new_asset_settings.mp4_support = settings.mp4_support;
    }

    // Don't send encoding_tier parameter at all (as per requirements)
    
    // Add passthrough if provided (only from settings as per schema)
    const passthrough = settings.passthrough || video.title;
    if (passthrough) {
      uploadConfig.new_asset_settings.passthrough = passthrough;
    }
    
    // Build meta object from video info and custom metadata
    const meta = {};
    
    // Add title and description from video config
    if (video.title) {
      meta.title = video.title;
    } else {
      // Generate title from filename if video.title is missing
      const filepath = video.filepath || '';
      const filename = filepath.split(/[/\\]/).pop() || '';
      meta.title = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '); // Remove extension and replace _ - with spaces
    }
    if (video.description) {
      meta.description = video.description;
    }
    
    // Add any custom metadata but filter out title to prevent duplication
    if (this.config.metadata) {
      const filteredMetadata = { ...this.config.metadata };
      delete filteredMetadata.title; // Remove title to prevent overriding video.title
      Object.assign(meta, filteredMetadata);
    }
    
    // Add meta to upload config if we have any metadata
    if (Object.keys(meta).length > 0) {
      uploadConfig.new_asset_settings.meta = meta;
    }
    
    // Add DRM configuration if specified
    if (this.config.drm?.enabled) {
      uploadConfig.new_asset_settings.playback_policy = ['drm'];
      
      if (this.config.drm.configuration_id) {
        uploadConfig.new_asset_settings.drm_configuration_id = this.config.drm.configuration_id;
      }
    }
    
    // Add static renditions if specified
    if (this.config.static_renditions?.files) {
      uploadConfig.new_asset_settings.static_renditions = {
        files: this.config.static_renditions.files.map(file => ({
          name: file.name,
          ext: file.ext || 'mp4',
          resolution_tier: file.resolution_tier,
          passthrough: file.passthrough
        }))
      };
    }
    
    // Add watermark if specified
    if (this.config.watermark) {
      uploadConfig.new_asset_settings.watermark = {
        url: this.config.watermark.url,
        overlay_settings: this.config.watermark.overlay_settings || {}
      };
    }
    
    return uploadConfig;
  }
  
  async monitorUploadStatus(uploadId) {
    const maxWaitTime = this.config.options?.timeout || 3600000; // 1 hour default
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();
    
    this.logger.info('Monitoring upload status', { uploadId, maxWaitTime });
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const upload = await this.muxClient.uploads.retrieve(uploadId);
        
        this.logger.debug('Upload status check', {
          uploadId,
          status: upload.status,
          assetId: upload.asset_id
        });
        
        if (upload.status === 'asset_created' && upload.asset_id) {
          this.logger.info('Upload completed, retrieving asset', {
            uploadId,
            assetId: upload.asset_id
          });
          
          // Get the created asset
          const asset = await this.muxClient.assets.retrieve(upload.asset_id);
          return asset;
        }
        
        if (upload.status === 'errored') {
          throw new MuxUploadError(
            'Upload failed with error',
            ErrorCodes.UPLOAD_FAILED,
            { 
              uploadId, 
              error: upload.error,
              details: upload
            }
          );
        }
        
        if (upload.status === 'cancelled') {
          throw new MuxUploadError(
            'Upload was cancelled',
            ErrorCodes.UPLOAD_CANCELLED,
            { uploadId, details: upload }
          );
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        if (error instanceof MuxUploadError) {
          throw error;
        }
        
        this.logger.warn('Error checking upload status', {
          uploadId,
          error: error.message
        });
        
        // Continue polling unless it's a critical error
        if (error.response?.status < 500) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    throw new MuxUploadError(
      'Upload status monitoring timeout',
      ErrorCodes.TIMEOUT_ERROR,
      { uploadId, waitTime: maxWaitTime }
    );
  }
  
  async waitForAssetReady(assetId) {
    // Validate assetId parameter
    if (!assetId) {
      throw new MuxUploadError(
        'Cannot wait for asset ready: assetId is undefined or null',
        ErrorCodes.VALIDATION_ERROR,
        { assetId }
      );
    }
    
    const maxWaitTime = this.config.options?.timeout || 3600000; // 1 hour default
    const pollInterval = 10000; // 10 seconds (longer than upload polling)
    const startTime = Date.now();
    
    this.logger.info('Waiting for asset to be ready', { assetId, maxWaitTime });
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const asset = await this.muxClient.assets.retrieve(assetId);
        
        // Log the monitoring status
        this.logger.logMuxStatusMonitoring(assetId, asset.status, asset.status === 'ready');
        
        this.logger.debug('Asset status check', {
          assetId,
          status: asset.status,
          duration: asset.duration
        });
        
        if (asset.status === 'ready') {
          this.logger.info('Asset is ready', {
            assetId,
            duration: asset.duration,
            tracks: asset.tracks?.length || 0
          });
          return asset;
        }
        
        if (asset.status === 'errored') {
          throw new MuxUploadError(
            'Asset processing failed',
            ErrorCodes.UPLOAD_FAILED,
            { 
              assetId,
              status: asset.status,
              errors: asset.errors || []
            }
          );
        }
        
        // Continue polling for preparing/processing states
        this.logger.debug('Asset still processing', {
          assetId,
          status: asset.status,
          waitTime: Date.now() - startTime
        });
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        if (error instanceof MuxUploadError) {
          throw error;
        }
        
        this.logger.warn('Error checking asset status', {
          assetId,
          error: error.message
        });
        
        // Continue polling unless it's a critical error
        if (error.response?.status < 500) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    throw new MuxUploadError(
      'Asset ready state monitoring timeout',
      ErrorCodes.TIMEOUT_ERROR,
      { assetId, waitTime: maxWaitTime }
    );
  }
  
  async addSubtitles(assetId, subtitles) {
    if (!subtitles || subtitles.length === 0) {
      return [];
    }
    
    this.logger.info('Adding subtitle tracks', {
      assetId,
      subtitleCount: subtitles.length
    });
    
    const results = [];
    
    // Process subtitles sequentially to avoid overwhelming the API
    for (const subtitle of subtitles) {
      try {
        // Validate subtitle URL/file
        const subtitleInfo = await validateSubtitleUrl(subtitle.url);
        
        let subtitleUrl = subtitle.url;
        
        // If it's a local file, serve it temporarily
        if (subtitleInfo.isLocal) {
          this.logger.debug('Processing local subtitle file', {
            file: subtitle.url,
            language: subtitle.language_code,
            size: subtitleInfo.size
          });
          
          subtitleUrl = await this.createSubtitleUrl(subtitle.url, subtitle.language_code);
        }
        
        const trackConfig = {
          url: subtitleUrl,
          type: 'text',
          text_type: subtitle.text_type || 'subtitles',
          closed_captions: subtitle.closed_captions || false,
          language_code: subtitle.language_code,
          name: subtitle.name
        };
        
        if (subtitle.passthrough) {
          trackConfig.passthrough = subtitle.passthrough;
        }
        
        const track = await retryableOperation(
          () => this.muxClient.assets.createTrack(assetId, trackConfig),
          this.logger,
          this.config.options?.retry_attempts || 3,
          this.config.options?.retry_delay || 5000,
          `Subtitle track creation (${subtitle.language_code})`
        );
        
        this.logger.logSubtitleAdded(assetId, subtitle, track.id);
        results.push({ subtitle, track, success: true, uploadedUrl: subtitleUrl });
        
      } catch (error) {
        this.logger.logSubtitleError(assetId, subtitle, error);
        results.push({ subtitle, error, success: false });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    this.logger.info('Subtitle processing complete', {
      assetId,
      total: results.length,
      successful: successCount,
      failed: failureCount
    });
    
    return results;
  }
  
  async createSubtitleUrl(filePath, languageCode) {
    try {
      // For local files, we need to create a temporary server or use a different approach
      // Since Mux API only accepts URLs, let's create a minimal HTTP server for local files
      
      if (!this._subtitleServer) {
        this._subtitleServer = await this.startSubtitleServer();
      }
      
      // Copy the file to the server's directory and return the URL
      const fileName = `${languageCode}_${Date.now()}_${path.basename(filePath)}`;
      const serverPath = path.join(this._subtitleServer.directory, fileName);
      
      // Copy the file
      await fs.copy(filePath, serverPath);
      
      const subtitleUrl = `http://localhost:${this._subtitleServer.port}/${fileName}`;
      
      this.logger.debug('Local subtitle file served', {
        originalPath: filePath,
        serverUrl: subtitleUrl,
        fileName
      });
      
      return subtitleUrl;
      
    } catch (error) {
      this.logger.error('Failed to create subtitle URL', {
        filePath,
        languageCode,
        error: error.message
      });
      throw error;
    }
  }
  
  async startSubtitleServer() {
    const { createServer } = await import('http');
    const { tmpdir } = await import('os');
    
    // Create temporary directory for subtitle files
    const tempDir = path.join(tmpdir(), 'mux-upload-subtitles');
    await fs.ensureDir(tempDir);
    
    // Find available port
    const port = await this.findAvailablePort(8000);
    
    const server = createServer((req, res) => {
      const filePath = path.join(tempDir, path.basename(req.url));
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'GET') {
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
          }
          
          res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Content-Length': data.length
          });
          res.end(data);
        });
      } else {
        res.writeHead(405);
        res.end('Method not allowed');
      }
    });
    
    return new Promise((resolve, reject) => {
      server.listen(port, 'localhost', (err) => {
        if (err) {
          reject(err);
        } else {
          this.logger.debug('Subtitle server started', { port, directory: tempDir });
          resolve({
            server,
            port,
            directory: tempDir,
            close: () => {
              server.close();
              fs.remove(tempDir).catch(() => {});
            }
          });
        }
      });
    });
  }
  
  async findAvailablePort(startPort) {
    const { createServer } = await import('http');
    
    for (let port = startPort; port < startPort + 100; port++) {
      try {
        await new Promise((resolve, reject) => {
          const testServer = createServer();
          testServer.listen(port, 'localhost', (err) => {
            testServer.close();
            if (err) {
              reject(err);
            } else {
              resolve(port);
            }
          });
        });
        return port;
      } catch {
        continue;
      }
    }
    throw new Error('No available port found');
  }
  
  async setupWebhook() {
    if (!this.config.webhook?.enabled) {
      return null;
    }
    
    try {
      const webhookConfig = {
        url: this.config.webhook.url,
        events: this.config.webhook.events || ['video.asset.ready', 'video.asset.errored']
      };
      
      const webhook = await retryableOperation(
        () => this.mux.webhooks.create(webhookConfig),
        this.logger,
        this.config.options?.retry_attempts || 3,
        this.config.options?.retry_delay || 5000,
        'Webhook registration'
      );
      
      this.logger.logWebhookRegistered(webhook.id, webhook.url, webhook.events);
      return webhook;
      
    } catch (error) {
      this.logger.error('Webhook registration failed', {
        error: error.message,
        url: this.config.webhook.url
      });
      
      // Don't fail the entire upload for webhook registration failures
      return null;
    }
  }
  
  async getAssetPlaybackInfo(assetId) {
    try {
      const asset = await this.muxClient.assets.retrieve(assetId);
      
      const playbackInfo = {
        asset_id: asset.id,
        status: asset.status,
        duration: asset.duration,
        resolution_tier: asset.resolution_tier,
        video_quality: asset.video_quality,
        playback_ids: asset.playback_ids || [],
        tracks: asset.tracks || [],
        created_at: asset.created_at,
        updated_at: asset.updated_at
      };
      
      return playbackInfo;
      
    } catch (error) {
      handleMuxError(error, 'Asset retrieval');
    }
  }
  
  async deleteAsset(assetId) {
    try {
      await this.muxClient.assets.delete(assetId);
      this.logger.info('Asset deleted', { assetId });
      return true;
      
    } catch (error) {
      this.logger.error('Asset deletion failed', {
        assetId,
        error: error.message
      });
      handleMuxError(error, 'Asset deletion');
    }
  }
  
  async listAssets(options = {}) {
    try {
      const params = {
        limit: options.limit || 100,
        page: options.page || 1
      };
      
      if (options.live_stream_id) {
        params.live_stream_id = options.live_stream_id;
      }
      
      if (options.upload_id) {
        params.upload_id = options.upload_id;
      }
      
      const response = await this.muxClient.assets.list(params);
      return response;
      
    } catch (error) {
      handleMuxError(error, 'Asset listing');
    }
  }
  
  getPlaybackUrl(playbackId, options = {}) {
    const baseUrl = 'https://stream.mux.com';
    let url = `${baseUrl}/${playbackId}`;
    
    if (options.extension) {
      url += `.${options.extension}`;
    }
    
    const queryParams = new URLSearchParams();
    
    if (options.token) {
      queryParams.append('token', options.token);
    }
    
    if (options.time) {
      queryParams.append('time', options.time);
    }
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    return url;
  }
  
  getThumbnailUrl(playbackId, options = {}) {
    const baseUrl = 'https://image.mux.com';
    const url = `${baseUrl}/${playbackId}/thumbnail.${options.format || 'jpg'}`;
    
    const queryParams = new URLSearchParams();
    
    if (options.time) {
      queryParams.append('time', options.time);
    }
    
    if (options.width) {
      queryParams.append('width', options.width);
    }
    
    if (options.height) {
      queryParams.append('height', options.height);
    }
    
    if (options.fit_mode) {
      queryParams.append('fit_mode', options.fit_mode);
    }
    
    if (queryParams.toString()) {
      return `${url}?${queryParams.toString()}`;
    }
    
    return url;
  }
}

export default MuxService;