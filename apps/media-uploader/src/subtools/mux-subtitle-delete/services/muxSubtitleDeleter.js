import Mux from '@mux/mux-node';
import chalk from 'chalk';

/**
 * Service for deleting subtitle tracks from Mux assets
 */
class MuxSubtitleDeleter {
  constructor({ tokenId, tokenSecret, logger = console, dryRun = false }) {
    if (!tokenId || !tokenSecret) {
      throw new Error('Mux tokenId and tokenSecret are required');
    }

    this.mux = new Mux({ tokenId, tokenSecret });
    this.video = this.mux.video;
    this.logger = logger;
    this.dryRun = dryRun;
  }

  /**
   * Lists all subtitle tracks for a given asset
   * @param {string} assetId - Mux asset ID
   * @returns {Promise<Array>} Array of subtitle tracks
   */
  async listSubtitleTracks(assetId) {
    try {
      const asset = await this.video.assets.retrieve(assetId);
      const tracks = asset.tracks || [];

      // Filter for text/subtitle tracks only
      const subtitleTracks = tracks.filter(track => track.type === 'text');

      this.logger.info(`Found ${subtitleTracks.length} subtitle track(s) on asset ${assetId}`);
      return subtitleTracks;
    } catch (error) {
      throw new Error(`Failed to list subtitle tracks: ${error.message}`);
    }
  }

  /**
   * Deletes a specific subtitle track by track ID
   * @param {string} assetId - Mux asset ID
   * @param {string} trackId - Track ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteSubtitleTrack(assetId, trackId) {
    try {
      if (this.dryRun) {
        this.logger.info(chalk.yellow(`[DRY RUN] Would delete track ${trackId} from asset ${assetId}`));
        return { success: true, assetId, trackId, dryRun: true };
      }

      await this.video.assets.deleteTrack(assetId, trackId);
      this.logger.info(chalk.green(`✓ Subtitle track ${trackId} deleted from asset ${assetId}`));
      return { success: true, assetId, trackId };
    } catch (error) {
      this.logger.error(chalk.red(`✗ Failed to delete track ${trackId}: ${error.message}`));
      throw new Error(`Failed to delete subtitle track: ${error.message}`);
    }
  }

  /**
   * Deletes subtitle tracks by language code
   * @param {string} assetId - Mux asset ID
   * @param {string} language - Language code (e.g., 'en', 'fr', 'es')
   * @returns {Promise<Object>} Deletion results
   */
  async deleteSubtitlesByLanguage(assetId, language) {
    try {
      // Normalize language code to lowercase
      const normalizedLanguage = language.toLowerCase();

      // List all subtitle tracks
      const subtitleTracks = await this.listSubtitleTracks(assetId);

      // Find tracks matching the language
      const matchingTracks = subtitleTracks.filter(track => {
        const trackLanguage = track.language_code?.toLowerCase();
        return trackLanguage === normalizedLanguage;
      });

      if (matchingTracks.length === 0) {
        this.logger.warn(chalk.yellow(`No subtitle tracks found for language '${language}' on asset ${assetId}`));
        return {
          success: true,
          assetId,
          language,
          tracksDeleted: 0,
          tracks: [],
          message: 'No matching tracks found'
        };
      }

      this.logger.info(`Found ${matchingTracks.length} track(s) for language '${language}'`);

      // Delete each matching track
      const results = [];
      const errors = [];

      for (const track of matchingTracks) {
        try {
          const result = await this.deleteSubtitleTrack(assetId, track.id);
          results.push({
            trackId: track.id,
            name: track.name,
            languageCode: track.language_code,
            result
          });
        } catch (error) {
          errors.push({
            trackId: track.id,
            error: error.message
          });
        }
      }

      const summary = {
        success: errors.length === 0,
        assetId,
        language,
        tracksDeleted: results.length,
        tracks: results,
        errors: errors.length > 0 ? errors : undefined,
        dryRun: this.dryRun
      };

      if (this.dryRun) {
        this.logger.info(chalk.yellow(`[DRY RUN] Would have deleted ${results.length} track(s)`));
      } else {
        this.logger.info(chalk.green(`✓ Successfully deleted ${results.length} subtitle track(s)`));
      }

      if (errors.length > 0) {
        this.logger.error(chalk.red(`✗ Failed to delete ${errors.length} track(s)`));
      }

      return summary;
    } catch (error) {
      throw new Error(`Failed to delete subtitles by language: ${error.message}`);
    }
  }

  /**
   * Validates that an asset exists and is ready
   * @param {string} assetId - Mux asset ID
   * @returns {Promise<Object>} Asset information
   */
  async validateAsset(assetId) {
    try {
      const asset = await this.video.assets.retrieve(assetId);

      if (asset.status !== 'ready') {
        throw new Error(`Asset ${assetId} is not ready (status: ${asset.status})`);
      }

      return asset;
    } catch (error) {
      throw new Error(`Failed to validate asset: ${error.message}`);
    }
  }
}

export default MuxSubtitleDeleter;
