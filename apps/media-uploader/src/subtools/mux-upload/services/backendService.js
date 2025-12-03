import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { MuxUploadError, ErrorCodes } from '../utils/errorHandler.js';
import { EnhancedRetryHandler } from '../utils/enhanced-retry.js';

export class BackendService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.baseURL = config.backend.server_address.replace(/\/$/, ''); // Remove trailing slash
    this.credentials = {
      email: config.backend.user,
      password: config.backend.password
    };
    this.token = null;
    this.tokenExpiry = null;
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
    this.authenticationInProgress = false;

    // Initialize enhanced retry handler for network resilience
    this.retryHandler = new EnhancedRetryHandler(logger);
  }

  // JWT Token Management Utilities
  parseToken(token) {
    try {
      const decoded = jwtDecode(token);
      return {
        exp: decoded.exp * 1000, // Convert to milliseconds
        iat: decoded.iat * 1000,
        email: decoded.email || decoded.sub,
        isExpired: Date.now() >= decoded.exp * 1000,
        expiresIn: (decoded.exp * 1000) - Date.now()
      };
    } catch (error) {
      this.logger.warn('Failed to parse JWT token', { error: error.message });
      return null;
    }
  }

  isTokenExpired() {
    if (!this.token) return true;
    const tokenData = this.parseToken(this.token);
    return !tokenData || tokenData.isExpired;
  }

  isTokenNearExpiry(bufferMinutes = 5) {
    if (!this.token) return true;
    const tokenData = this.parseToken(this.token);
    if (!tokenData) return true;
    const bufferMs = bufferMinutes * 60 * 1000;
    return tokenData.expiresIn <= bufferMs;
  }

  logAuthState(context) {
    const tokenData = this.token ? this.parseToken(this.token) : null;
    this.logger.debug('Authentication state', {
      context,
      hasToken: !!this.token,
      isExpired: this.isTokenExpired(),
      expiresIn: tokenData ? `${Math.round(tokenData.expiresIn / 60000)} minutes` : 'N/A',
      email: tokenData?.email
    });
  }

  async waitForAuthentication(timeout = 30000) {
    const startTime = Date.now();
    while (this.authenticationInProgress) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Authentication timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async authenticate(forceRefresh = false) {
    // Prevent concurrent authentication attempts
    if (this.authenticationInProgress && !forceRefresh) {
      await this.waitForAuthentication();
      return this.token !== null;
    }

    // Check if current token is still valid
    if (!forceRefresh && this.token && !this.isTokenNearExpiry()) {
      this.logger.debug('Using existing valid token');
      return true;
    }

    this.authenticationInProgress = true;

    try {
      this.logger.info('Authenticating with backend', {
        forceRefresh,
        tokenExpired: this.isTokenExpired()
      });

      const formData = new URLSearchParams();
      formData.append('username', this.credentials.email);
      formData.append('password', this.credentials.password);

      const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000 // 30 second timeout
      });

      if (response.data.access_token) {
        this.token = response.data.access_token;
        const tokenData = this.parseToken(this.token);
        this.tokenExpiry = tokenData ? tokenData.exp : null;

        this.logger.logBackendConnection(this.baseURL, true);
        this.logger.info('Authentication successful', {
          expiresIn: tokenData ? `${Math.round(tokenData.expiresIn / 60000)} minutes` : 'unknown'
        });
        return true;
      }
      throw new Error('No access token received');
    } catch (error) {
      this.logger.logBackendConnection(this.baseURL, false, error.message);
      throw new MuxUploadError(
        `Backend authentication failed: ${error.message}`,
        ErrorCodes.AUTH_FAILED,
        { serverAddress: this.baseURL, error: error.response?.data }
      );
    } finally {
      this.authenticationInProgress = false;
    }
  }

  // Request wrapper with retry logic for 401 errors
  async makeAuthenticatedRequest(requestFn, options = {}) {
    const {
      maxRetries = this.maxRetries,
      context = 'backend API call',
      isPostUpload = false
    } = options;

    // Use more retries for post-upload calls (after long Mux upload)
    const effectiveRetries = isPostUpload ? 8 : maxRetries;

    this.logger.debug(`Starting ${context}`, {
      maxRetries: effectiveRetries,
      backendUrl: this.baseURL,
      isPostUpload
    });

    // Use enhanced retry handler for network resilience
    return await this.retryHandler.executeWithRetry(async () => {
      // Check and refresh token before request
      if (this.isTokenNearExpiry()) {
        this.logger.info('Token near expiry, refreshing before request');
        await this.authenticate(true);
      }

      try {
        // Execute the actual request
        const result = await requestFn();
        return result;

      } catch (error) {
        // Handle 401 specially - re-authenticate and retry immediately
        if (error.response?.status === 401) {
          this.logger.warn(`Authentication error (401) - re-authenticating`, {
            url: error.config?.url,
            method: error.config?.method?.toUpperCase()
          });

          // Clear invalid token
          this.token = null;
          this.tokenExpiry = null;

          // Force re-authentication
          await this.authenticate(true);

          // Retry the request with new token
          return await requestFn();
        }

        // For other errors (including DNS), throw to let EnhancedRetryHandler handle retry
        throw error;
      }
    }, {
      maxAttempts: effectiveRetries,
      baseDelayMs: 1000,
      context
    });
  }

  handle401Error(error, context) {
    this.logger.error('Authentication failure', {
      context,
      status: error.response?.status,
      message: error.response?.data?.detail || error.message,
      tokenExpired: this.isTokenExpired(),
      tokenData: this.token ? this.parseToken(this.token) : null
    });

    // Clear invalid token
    this.token = null;
    this.tokenExpiry = null;
  }

  async testConnection() {
    try {
      // Try to authenticate first
      await this.authenticate();
      
      // Test API access by fetching languages
      const response = await axios.get(`${this.baseURL}/api/v1/languages?limit=1`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      this.logger.logBackendConnection(this.baseURL, true);
      return true;
    } catch (error) {
      this.logger.logBackendConnection(this.baseURL, false, error.message);
      throw new MuxUploadError(
        `Backend connection test failed: ${error.message}`,
        ErrorCodes.DATABASE_CONNECTION_FAILED,
        { serverAddress: this.baseURL, error: error.response?.data }
      );
    }
  }
  
  async getLanguages() {
    return this.makeAuthenticatedRequest(async () => {
      const response = await axios.get(`${this.baseURL}/api/v1/languages?limit=100`, {
        headers: { Authorization: `Bearer ${this.token}` },
        timeout: 10000
      });

      const languages = response.data || [];
      this.logger.logLanguageListFetched(languages.length, true);
      return languages;
    }).catch(error => {
      this.logger.logLanguageListFetched(0, false, error.message);
      throw new MuxUploadError(
        `Failed to fetch languages: ${error.message}`,
        ErrorCodes.DATABASE_CONNECTION_FAILED,
        { error: error.response?.data }
      );
    });
  }
  
  async createVideoFileRecord(videoMetadata, muxAssetId = null) {
    return this.makeAuthenticatedRequest(async () => {
      const fileName = videoMetadata.external_id;

      // Use title from video config, fallback to filename-generated title
      let title;
      if (this.config.video && this.config.video.title) {
        title = this.config.video.title;
      } else {
        // Generate title from filename as fallback
        title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '); // Remove extension and replace _ - with spaces
      }
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); // Generate slug

      const videoFileData = {
        file_name: fileName,
        title: title,
        slug: slug,
        upload_status: muxAssetId ? "file_uploading" : "initialized",
        upload_method: "new_upload",
        bitrate_kbps: videoMetadata.bitrate ? Math.round(videoMetadata.bitrate / 1000) : null, // Convert to kbps
        environment_text: this.config.settings?.environment_text || null,
        drm_protection: this.config.drm?.enabled || false
      };

      // Add mux_asset_id if provided
      if (muxAssetId) {
        videoFileData.mux_asset_id = muxAssetId;
      }

      this.logger.info('Creating video file record', {
        videoFileData: {
          ...videoFileData,
          mux_asset_id: muxAssetId || 'not_provided'
        }
      });

      const response = await axios.post(`${this.baseURL}/api/v1/video-files/create-metadata`, videoFileData, {
        headers: { Authorization: `Bearer ${this.token}` },
        timeout: 30000
      });

      const videoRecord = response.data;
      this.logger.logVideoFileRecordCreated(videoRecord.id, videoMetadata.external_id, true);

      return videoRecord;
    }).catch(error => {
      this.logger.logVideoFileRecordCreated(null, videoMetadata.external_id, false, error.message);
      throw new MuxUploadError(
        `Failed to create video file record: ${error.message}`,
        ErrorCodes.DATABASE_CONNECTION_FAILED,
        { error: error.response?.data, videoMetadata }
      );
    });
  }
  
  async updateUploadStatus(uuid, status, muxAssetId = null, muxPlaybackId = null, isPostUpload = false) {
    return this.makeAuthenticatedRequest(async () => {
      const updateData = {
        upload_status: status
      };

      // Add Mux information if provided
      if (muxAssetId) {
        updateData.mux_asset_id = muxAssetId;
      }
      if (muxPlaybackId) {
        updateData.mux_playback_id = muxPlaybackId;
      }

      const response = await axios.put(`${this.baseURL}/api/v1/video-files/${uuid}`, updateData, {
        headers: { Authorization: `Bearer ${this.token}` },
        timeout: isPostUpload ? 60000 : 30000 // Longer timeout after long uploads
      });

      this.logger.logUploadStatusUpdate(uuid, status, true);
      return response.data;
    }, {
      maxRetries: 5,
      context: `update upload status to ${status}`,
      isPostUpload
    }).catch(error => { // Extra retries for critical operation
      this.logger.logUploadStatusUpdate(uuid, status, false, error.message);
      throw new MuxUploadError(
        `Failed to update upload status: ${error.message}`,
        ErrorCodes.DATABASE_CONNECTION_FAILED,
        { error: error.response?.data, uuid, status }
      );
    });
  }
  
  async updateVideoFileWithMuxData(uuid, muxData) {
    return this.makeAuthenticatedRequest(async () => {
      const updateData = {
        mux_asset_id: muxData.assetId,
        upload_status: muxData.status === 'ready' ? 'ready_no_subtitles' : 'upload_completed',
        encoding_status: muxData.status === 'ready' ? 'completed' : 'processing'
      };

      // Add playback ID if available (fallback when complete-from-mux fails)
      if (muxData.playback_ids && muxData.playback_ids.length > 0) {
        updateData.mux_playback_id = muxData.playback_ids[0].id;
        this.logger.info('Setting playback ID from Mux data', {
          uuid,
          playbackId: updateData.mux_playback_id
        });
      }

      // Update duration if available and not already set
      if (muxData.duration) {
        updateData.duration_seconds = Math.round(muxData.duration);
      }

      const response = await axios.put(`${this.baseURL}/api/v1/video-files/${uuid}`, updateData, {
        headers: { Authorization: `Bearer ${this.token}` },
        timeout: 30000
      });

      this.logger.info('Video file updated with Mux data', {
        uuid,
        assetId: muxData.assetId,
        muxStatus: muxData.status,
        backendStatus: updateData.upload_status,
        duration: muxData.duration
      });

      return response.data;
    }).catch(error => {
      this.logger.error('Failed to update video file with Mux data', {
        uuid,
        error: error.message,
        muxData
      });
      throw new MuxUploadError(
        `Failed to update video file with Mux data: ${error.message}`,
        ErrorCodes.DATABASE_CONNECTION_FAILED,
        { error: error.response?.data, uuid, muxData }
      );
    });
  }

  async completeVideoFileFromMux(uuid) {
    try {
      return await this.makeAuthenticatedRequest(async () => {
        this.logger.info('Calling Mux completion endpoint for video file', { uuid });

        const response = await axios.post(`${this.baseURL}/api/v1/video-files/${uuid}/complete-from-mux`, {}, {
          headers: { Authorization: `Bearer ${this.token}` },
          timeout: 60000 // Longer timeout for completion
        });

        // Validate that we got meaningful data
        const hasFileUrl = response.data.file_url !== null && response.data.file_url !== undefined;
        const hasDuration = response.data.duration_seconds !== null && response.data.duration_seconds !== undefined;
        const hasPlaybackId = response.data.mux_playback_id !== null && response.data.mux_playback_id !== undefined;

        this.logger.info('Video file completed with Mux data successfully', {
          uuid,
          encoding_status: response.data.encoding_status,
          duration_seconds: response.data.duration_seconds,
          mux_playback_id: response.data.mux_playback_id,
          file_url: response.data.file_url,
          validation: {
            hasFileUrl,
            hasDuration,
            hasPlaybackId
          }
        });

        return response.data;
      }, { maxRetries: 5 }); // Extra retries for critical operation
    } catch (error) {
      // Log but don't throw - allows fallback method
      this.logger.error('Failed to complete video file with Mux data', {
        uuid,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        endpoint: `${this.baseURL}/api/v1/video-files/${uuid}/complete-from-mux`
      });
      return null;
    }
  }

}

export default BackendService;