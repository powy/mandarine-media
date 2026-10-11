/**
 * Mux API Client
 * Handles all Mux API interactions with pagination support
 */

import Mux from '@mux/mux-node';
import { REPORT_CONFIG } from '../config/constants.js';

/**
 * Delay utility function
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class MuxApiClient {
  /**
   * Create a new Mux API Client
   * @param {string} tokenId - Mux API token ID
   * @param {string} tokenSecret - Mux API token secret
   * @param {Object} logger - Logger instance
   */
  constructor(tokenId, tokenSecret, logger) {
    if (!tokenId || !tokenSecret) {
      throw new Error('Mux credentials (tokenId and tokenSecret) are required');
    }

    this.logger = logger;
    this.mux = new Mux({
      tokenId: tokenId,
      tokenSecret: tokenSecret
    });
  }

  /**
   * List all assets with pagination handling
   * @param {Function} progressCallback - Callback function for progress reporting
   * @returns {Promise<Array>} Array of all assets
   */
  async listAllAssets(progressCallback = () => {}) {
    this.logger.info('Fetching all Mux assets with pagination...');

    const assets = [];
    let pageCount = 0;

    try {
      // Initial request with max limit
      let page = await this.listAssetsWithRetry({ limit: REPORT_CONFIG.MUX_API.ASSETS_PER_PAGE });
      pageCount++;

      // Process initial page
      if (page && page.data) {
        assets.push(...page.data);
        this.logger.info(`Fetched page ${pageCount}: ${page.data.length} assets (Total: ${assets.length})`);
        progressCallback({ count: assets.length, page: pageCount });
      }

      // Continue pagination while there are more pages
      while (page && typeof page.hasNextPage === 'function' && page.hasNextPage()) {
        // Rate limiting delay
        await delay(REPORT_CONFIG.MUX_API.PAGE_DELAY_MS);

        // Fetch next page
        page = await this.getNextPageWithRetry(page);
        pageCount++;

        if (page && page.data) {
          assets.push(...page.data);
          this.logger.info(`Fetched page ${pageCount}: ${page.data.length} assets (Total: ${assets.length})`);
          progressCallback({ count: assets.length, page: pageCount });
        }
      }

      this.logger.info(`Completed asset fetching: ${assets.length} total assets from ${pageCount} pages`);
      return assets;

    } catch (error) {
      this.logger.error(`Failed to list assets: ${error.message}`);
      throw new Error(`Mux API error while listing assets: ${error.message}`);
    }
  }

  /**
   * List assets with retry logic
   * @param {Object} params - List parameters
   * @returns {Promise<Object>} Page object
   */
  async listAssetsWithRetry(params) {
    let lastError;

    for (let attempt = 1; attempt <= REPORT_CONFIG.MUX_API.MAX_RETRIES; attempt++) {
      try {
        return await this.mux.video.assets.list(params);
      } catch (error) {
        lastError = error;
        this.logger.warn(`Asset list attempt ${attempt}/${REPORT_CONFIG.MUX_API.MAX_RETRIES} failed: ${error.message}`);

        // Check if error is authentication-related (don't retry)
        if (error.message && (error.message.includes('auth') || error.message.includes('unauthorized'))) {
          throw new Error(`Authentication failed. Please check your Mux credentials: ${error.message}`);
        }

        // Exponential backoff before retry
        if (attempt < REPORT_CONFIG.MUX_API.MAX_RETRIES) {
          const waitTime = REPORT_CONFIG.MUX_API.RETRY_BACKOFF_MS * Math.pow(2, attempt - 1);
          this.logger.info(`Waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
        }
      }
    }

    throw new Error(`Failed to list assets after ${REPORT_CONFIG.MUX_API.MAX_RETRIES} attempts: ${lastError.message}`);
  }

  /**
   * Get next page with retry logic
   * @param {Object} currentPage - Current page object
   * @returns {Promise<Object>} Next page object
   */
  async getNextPageWithRetry(currentPage) {
    let lastError;

    for (let attempt = 1; attempt <= REPORT_CONFIG.MUX_API.MAX_RETRIES; attempt++) {
      try {
        return await currentPage.getNextPage();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Get next page attempt ${attempt}/${REPORT_CONFIG.MUX_API.MAX_RETRIES} failed: ${error.message}`);

        // Exponential backoff before retry
        if (attempt < REPORT_CONFIG.MUX_API.MAX_RETRIES) {
          const waitTime = REPORT_CONFIG.MUX_API.RETRY_BACKOFF_MS * Math.pow(2, attempt - 1);
          this.logger.info(`Waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
        }
      }
    }

    throw new Error(`Failed to get next page after ${REPORT_CONFIG.MUX_API.MAX_RETRIES} attempts: ${lastError.message}`);
  }

  /**
   * Retrieve detailed asset information (if needed for individual assets)
   * @param {string} assetId - Mux asset ID
   * @returns {Promise<Object>} Asset details
   */
  async getAssetDetails(assetId) {
    try {
      const response = await this.mux.video.assets.retrieve(assetId);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to retrieve asset ${assetId}: ${error.message}`);
      throw new Error(`Mux API error retrieving asset ${assetId}: ${error.message}`);
    }
  }
}

export default MuxApiClient;
