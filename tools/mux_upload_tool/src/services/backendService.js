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
  
  async createVideoFileRecord(videoMetadata) {
    try {
      if (!this.token) {
        await this.authenticate();
      }
      
      // Find audio channel UUIDs from languages if provided
      let audioChannelUuidList = [];
      if (videoMetadata.audio_languages && videoMetadata.languages) {
        audioChannelUuidList = videoMetadata.audio_languages
          .map(lang => {
            const langObj = videoMetadata.languages.find(l => 
              l.sigle?.toLowerCase() === lang.toLowerCase() ||
              l.name?.toLowerCase().includes(lang.toLowerCase())
            );
            return langObj?.id;
          })
          .filter(Boolean);
      }
      
      const videoFileData = {
        file_name: videoMetadata.external_id,
        external_id: videoMetadata.external_id,
        upload_status: "initialized",
        upload_method: "new_upload",
        duration_seconds: videoMetadata.duration_seconds,
        file_size_bytes: videoMetadata.file_size_bytes,
        frame_rate: videoMetadata.frame_rate,
        bitrate_kbps: Math.round(videoMetadata.bitrate / 1000), // Convert to kbps
        resolution_width: videoMetadata.max_resolution_width,
        resolution_height: videoMetadata.max_resolution_height,
        environment_text: this.config.settings?.environment_text || null,
        audio_channel_uuid_list: audioChannelUuidList.length > 0 ? audioChannelUuidList : null
      };
      
      this.logger.info('Creating video file record', { videoFileData });
      
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
      
      // Add playback ID if available
      if (muxData.playback_ids && muxData.playback_ids.length > 0) {
        updateData.mux_playback_id = muxData.playback_ids[0].id;
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
}

export default BackendService;