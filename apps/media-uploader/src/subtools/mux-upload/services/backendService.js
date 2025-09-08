import axios from 'axios';
import { MuxUploadError, ErrorCodes } from '../utils/errorHandler.js';

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
  }
  
  async authenticate() {
    try {
      // Create form data for OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append('username', this.credentials.email);
      formData.append('password', this.credentials.password);
      
      const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data.access_token) {
        this.token = response.data.access_token;
        this.logger.logBackendConnection(this.baseURL, true);
        return true;
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      this.logger.logBackendConnection(this.baseURL, false, error.message);
      throw new MuxUploadError(
        `Backend authentication failed: ${error.message}`,
        ErrorCodes.AUTH_FAILED,
        { serverAddress: this.baseURL, error: error.response?.data }
      );
    }
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
    try {
      if (!this.token) {
        await this.authenticate();
      }
      
      const response = await axios.get(`${this.baseURL}/api/v1/languages?limit=100`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      const languages = response.data || [];
      this.logger.logLanguageListFetched(languages.length, true);
      return languages;
    } catch (error) {
      this.logger.logLanguageListFetched(0, false, error.message);
      throw new MuxUploadError(
        `Failed to fetch languages: ${error.message}`,
        ErrorCodes.DATABASE_CONNECTION_FAILED,
        { error: error.response?.data }
      );
    }
  }
  
  async createVideoFileRecord(videoMetadata, muxAssetId = null) {
    try {
      if (!this.token) {
        await this.authenticate();
      }
      
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
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      const videoRecord = response.data;
      this.logger.logVideoFileRecordCreated(videoRecord.id, videoMetadata.external_id, true);
      
      return videoRecord;
    } catch (error) {
      this.logger.logVideoFileRecordCreated(null, videoMetadata.external_id, false, error.message);
      throw new MuxUploadError(
        `Failed to create video file record: ${error.message}`,
        ErrorCodes.DATABASE_CONNECTION_FAILED,
        { error: error.response?.data, videoMetadata }
      );
    }
  }
  
  async updateUploadStatus(uuid, status, muxAssetId = null, muxPlaybackId = null) {
    try {
      if (!this.token) {
        await this.authenticate();
      }
      
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
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      this.logger.logUploadStatusUpdate(uuid, status, true);
      return response.data;
    } catch (error) {
      this.logger.logUploadStatusUpdate(uuid, status, false, error.message);
      throw new MuxUploadError(
        `Failed to update upload status: ${error.message}`,
        ErrorCodes.DATABASE_CONNECTION_FAILED,
        { error: error.response?.data, uuid, status }
      );
    }
  }
  
  async updateVideoFileWithMuxData(uuid, muxData) {
    try {
      if (!this.token) {
        await this.authenticate();
      }
      
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
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      this.logger.info('Video file updated with Mux data', {
        uuid,
        assetId: muxData.assetId,
        muxStatus: muxData.status,
        backendStatus: updateData.upload_status,
        duration: muxData.duration
      });
      
      return response.data;
    } catch (error) {
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
    }
  }

  async completeVideoFileFromMux(uuid) {
    try {
      if (!this.token) {
        await this.authenticate();
      }
      
      this.logger.info('Calling Mux completion endpoint for video file', { uuid });
      
      const response = await axios.post(`${this.baseURL}/api/v1/video-files/${uuid}/complete-from-mux`, {}, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      this.logger.info('Video file completed with Mux data successfully', {
        uuid,
        encoding_status: response.data.encoding_status,
        duration_seconds: response.data.duration_seconds,
        mux_playback_id: response.data.mux_playback_id
      });
      
      return response.data;
    } catch (error) {
      // Log as error since URL population is critical for proper functioning
      this.logger.error('Failed to complete video file with Mux data - URL may not be populated correctly', {
        uuid,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        endpoint: `${this.baseURL}/api/v1/video-files/${uuid}/complete-from-mux`
      });
      
      // Return null to indicate completion failed but don't throw
      // This allows the upload process to continue with fallback method
      return null;
    }
  }
}

export default BackendService;