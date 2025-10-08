/**
 * Mux Service
 * Handles Mux API interactions for subtitle uploads
 */

import Mux from '@mux/mux-node';
import axios from 'axios';

/**
 * Mux Service Class
 */
export class MuxService {
  constructor(config, logger = console) {
    this.config = config;
    this.logger = logger;

    // Initialize Mux client
    const { Video } = new Mux(
      config.mux.tokenId,
      config.mux.tokenSecret
    );
    this.video = Video;
  }

  /**
   * Get Mux asset ID from backend using media description ID
   * @param {string} mediaDescriptionId - Media description ID
   * @returns {Promise<string>} Mux asset ID
   */
  async getMuxAssetId(mediaDescriptionId) {
    try {
      // Authenticate with backend
      const authResponse = await axios.post(
        `${this.config.backend.baseUrl}/api/auth/login`,
        {
          username: this.config.backend.username,
          password: this.config.backend.password
        }
      );

      const token = authResponse.data.access_token || authResponse.data.token;

      // Get media description from backend
      const mediaResponse = await axios.get(
        `${this.config.backend.baseUrl}/api/media-descriptions/${mediaDescriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const assetId = mediaResponse.data.mux_asset_id || mediaResponse.data.asset_id;

      if (!assetId) {
        throw new Error(`No Mux asset ID found for media description ${mediaDescriptionId}`);
      }

      return assetId;
    } catch (error) {
      throw new Error(`Failed to get Mux asset ID: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Add subtitle track to Mux asset
   * @param {string} assetId - Mux asset ID
   * @param {string} subtitleUrl - Subtitle file URL (S3)
   * @param {string} language - Language code (BCP 47)
   * @param {Object} options - Subtitle options
   * @param {boolean} [options.closedCaptions=false] - Mark as closed captions
   * @param {string} [options.name] - Subtitle track name
   * @returns {Promise<Object>} Mux track creation result
   */
  async addSubtitleTrack(assetId, subtitleUrl, language, options = {}) {
    try {
      this.logger.info && this.logger.info(`Adding subtitle track to Mux asset ${assetId}...`);

      const trackData = {
        url: subtitleUrl,
        type: 'text',
        text_type: 'subtitles',
        closed_captions: options.closedCaptions || false,
        language_code: language
      };

      // Add optional name
      if (options.name) {
        trackData.name = options.name;
      }

      // Create subtitle track
      const track = await this.video.Assets.createTrack(assetId, trackData);

      this.logger.info && this.logger.info(`Subtitle track created: ${track.id}`);

      return {
        success: true,
        trackId: track.id,
        assetId,
        language,
        track
      };
    } catch (error) {
      throw new Error(`Failed to add subtitle track to Mux: ${error.message}`);
    }
  }

  /**
   * Delete subtitle track from Mux asset
   * @param {string} assetId - Mux asset ID
   * @param {string} trackId - Track ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteSubtitleTrack(assetId, trackId) {
    try {
      await this.video.Assets.deleteTrack(assetId, trackId);

      this.logger.info && this.logger.info(`Subtitle track ${trackId} deleted from asset ${assetId}`);

      return {
        success: true,
        assetId,
        trackId
      };
    } catch (error) {
      throw new Error(`Failed to delete subtitle track: ${error.message}`);
    }
  }

  /**
   * List all subtitle tracks for an asset
   * @param {string} assetId - Mux asset ID
   * @returns {Promise<Array>} List of subtitle tracks
   */
  async listSubtitleTracks(assetId) {
    try {
      const asset = await this.video.Assets.get(assetId);

      const subtitleTracks = asset.tracks.filter(
        track => track.type === 'text'
      );

      return subtitleTracks;
    } catch (error) {
      throw new Error(`Failed to list subtitle tracks: ${error.message}`);
    }
  }
}

export default MuxService;
