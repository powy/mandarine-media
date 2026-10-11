/**
 * Subtitle Analyzer
 * Analyzes subtitle tracks for Mux assets
 */

import { REPORT_CONFIG } from '../config/constants.js';

export class SubtitleAnalyzer {
  /**
   * Create a new Subtitle Analyzer
   * @param {Object} logger - Logger instance
   */
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Analyze subtitle tracks for a specific language
   * @param {Object} asset - Mux asset object
   * @param {string} languageCode - Language code (e.g., 'fr', 'en', 'ko')
   * @returns {string} Subtitle status
   */
  analyzeLanguage(asset, languageCode) {
    const tracks = asset.tracks || [];

    // Filter for text tracks (subtitles/captions)
    const textTracks = tracks.filter(track => track.type === 'text');

    // Filter for specific language
    const langTracks = textTracks.filter(track => track.language_code === languageCode);

    // Determine status based on number and state of tracks
    if (langTracks.length === 0) {
      return REPORT_CONFIG.SUBTITLE_STATUS.NONE;
    } else if (langTracks.length === 1) {
      const track = langTracks[0];

      // Check if track has an error status
      if (track.status === 'errored') {
        return REPORT_CONFIG.SUBTITLE_STATUS.BROKEN;
      }

      return REPORT_CONFIG.SUBTITLE_STATUS.OK;
    } else {
      // Multiple tracks for the same language
      return REPORT_CONFIG.SUBTITLE_STATUS.DUPLICATED;
    }
  }

  /**
   * Analyze subtitle tracks for all configured languages
   * @param {Object} asset - Mux asset object
   * @returns {Object} Object with subtitle status for each language
   */
  analyzeAsset(asset) {
    const analysis = {};

    REPORT_CONFIG.SUBTITLE_LANGUAGES.forEach(lang => {
      analysis[lang] = this.analyzeLanguage(asset, lang);
    });

    return analysis;
  }

  /**
   * Analyze all assets and return subtitle analysis map
   * @param {Array} assets - Array of Mux asset objects
   * @param {Function} progressCallback - Optional progress callback
   * @returns {Object} Map of asset ID to subtitle analysis
   */
  analyzeAll(assets, progressCallback = () => {}) {
    this.logger.info(`Analyzing subtitle tracks for ${assets.length} assets...`);

    const analysisMap = {};

    assets.forEach((asset, index) => {
      analysisMap[asset.id] = this.analyzeAsset(asset);

      // Log progress every 100 assets
      if ((index + 1) % 100 === 0) {
        this.logger.info(`Analyzed ${index + 1}/${assets.length} assets`);
        progressCallback({ current: index + 1, total: assets.length });
      }
    });

    this.logger.info(`Subtitle analysis completed for ${assets.length} assets`);
    return analysisMap;
  }

  /**
   * Get subtitle track details for debugging/logging
   * @param {Object} asset - Mux asset object
   * @returns {Array} Array of text track details
   */
  getTrackDetails(asset) {
    const tracks = asset.tracks || [];
    const textTracks = tracks.filter(track => track.type === 'text');

    return textTracks.map(track => ({
      id: track.id,
      language: track.language_code,
      status: track.status,
      name: track.name
    }));
  }
}

export default SubtitleAnalyzer;
