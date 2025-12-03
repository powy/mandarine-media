/**
 * Media Diagnostic Tool - Main Entry Point
 * Class-based interface for backward compatibility and programmatic usage
 */

import {
  verifyMediaDescriptionDirect,
  verifySeasonDirect,
  verifyBatchNonReady
} from './core.js';

/**
 * MediaDiagnostic class for verifying MediaDescription diagnostics
 *
 * @example
 * const diagnostic = new MediaDiagnostic({
 *   baseUrl: 'https://api.example.com',
 *   username: 'admin',
 *   password: 'secret'
 * });
 *
 * const result = await diagnostic.verifyMediaDescription('uuid-here');
 */
export class MediaDiagnostic {
  /**
   * Create a new MediaDiagnostic instance
   *
   * @param {Object} config - Default configuration
   * @param {string} [config.baseUrl] - Backend base URL
   * @param {string} [config.username] - Username
   * @param {string} [config.password] - Password
   * @param {boolean} [config.verbose=false] - Verbose logging
   * @param {number} [config.timeout=30000] - Request timeout in ms
   */
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl,
      username: config.username,
      password: config.password,
      verbose: config.verbose || false,
      timeout: config.timeout || 30000
    };
  }

  /**
   * Verify single MediaDescription
   *
   * @param {string} mediaDescriptionId - MediaDescription UUID
   * @param {Object} [options={}] - Override options
   * @returns {Promise<Object>} { id, diagnostics, is_ready, errors }
   */
  async verifyMediaDescription(mediaDescriptionId, options = {}) {
    return verifyMediaDescriptionDirect({
      ...this.config,
      mediaDescriptionId,
      ...options
    });
  }

  /**
   * Verify season (general description + all episodes)
   *
   * @param {string} seasonId - Season UUID
   * @param {Object} [options={}] - Override options
   * @param {boolean} [options.continueOnError=true] - Continue on individual episode errors
   * @returns {Promise<Object>} { seasonId, generalResult, episodeResults, summary }
   */
  async verifySeason(seasonId, options = {}) {
    return verifySeasonDirect({
      ...this.config,
      seasonId,
      continueOnError: true,
      ...options
    });
  }

  /**
   * Batch verify all non-ready MediaDescriptions
   *
   * @param {Object} [options={}] - Override options
   * @param {boolean} [options.continueOnError=true] - Continue on individual errors
   * @param {number} [options.limit=1000] - Max items to process
   * @returns {Promise<Object>} { nonReadyResults, nonReadyPendingResults, summary }
   */
  async verifyBatch(options = {}) {
    return verifyBatchNonReady({
      ...this.config,
      continueOnError: true,
      limit: 1000,
      ...options
    });
  }
}

// Export core functions for direct usage
export {
  verifyMediaDescriptionDirect,
  verifySeasonDirect,
  verifyBatchNonReady
} from './core.js';

// Export INI interface functions
export {
  verifyMediaDescriptionFromIni,
  verifySeasonFromIni,
  verifyBatchNonReadyFromIni
} from './iniInterface.js';

// Default export
export default MediaDiagnostic;
