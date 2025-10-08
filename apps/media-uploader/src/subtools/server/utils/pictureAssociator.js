/**
 * Picture Association Utility
 * Associates picture IDs to media_description records via API
 */

import axios from 'axios';
import { formatDetector } from './formatDetector.js';

export class PictureAssociator {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Force IPv4 by replacing localhost with 127.0.0.1
   * @param {string} url - The URL to process
   * @returns {string} - URL with localhost replaced by 127.0.0.1
   */
  forceIPv4Url(url) {
    return url.replace(/localhost/gi, '127.0.0.1');
  }

  /**
   * Authenticate with backend and get JWT token
   * @returns {Object} - Authentication result with token
   */
  async authenticateWithBackend() {
    try {
      const authUrl = this.forceIPv4Url(`${this.config.backend.baseUrl}/api/v1/auth/login`);

      this.logger.info('Authenticating with backend API...');

      const authResponse = await axios.post(authUrl, {
        username: this.config.backend.username,
        password: this.config.backend.password
      }, {
        timeout: 10000
      });

      if (authResponse.status !== 200) {
        return {
          success: false,
          error: `Authentication failed with status ${authResponse.status}`,
          response: authResponse.data
        };
      }

      const token = authResponse.data.access_token;
      if (!token) {
        return {
          success: false,
          error: 'No access token received from authentication',
          response: authResponse.data
        };
      }

      this.logger.info('Backend authentication successful');
      return {
        success: true,
        token
      };

    } catch (error) {
      this.logger.error(`Backend authentication failed: ${error.message}`);

      if (error.response) {
        this.logger.error(`Auth Response Status: ${error.response.status}`);
        this.logger.error(`Auth Response Data: ${JSON.stringify(error.response.data)}`);
      }

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Associate a picture ID to a media description record
   * @param {string} mediaDescriptionId - The media description ID to update
   * @param {string} pictureId - The picture ID to associate
   * @param {string} format - The picture format (e.g., "1920_1080")
   * @returns {Object} - Association result
   */
  async associatePictureToMediaDescription(mediaDescriptionId, pictureId, format) {
    try {
      // Validate format
      if (!formatDetector.isFormatSupported(format)) {
        throw new Error(`Unsupported format: ${format}. Supported formats: ${formatDetector.getSupportedDisplayFormats().join(', ')}`);
      }

      // Get field name for this format
      const fieldName = formatDetector.getFieldName(format);

      this.logger.info(`Associating picture to media description: ${mediaDescriptionId} -> ${fieldName} = ${pictureId}`);

      // Authenticate with backend
      const authResult = await this.authenticateWithBackend();
      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication failed: ${authResult.error}`,
          details: authResult.details
        };
      }

      // Prepare PATCH payload
      const patchPayload = {
        [fieldName]: pictureId
      };

      // Make PATCH request to update media description
      const patchUrl = this.forceIPv4Url(`${this.config.backend.baseUrl}/api/v1/media-descriptions/${mediaDescriptionId}`);

      this.logger.info(`PATCH ${patchUrl}`, { payload: patchPayload });

      const patchResponse = await axios.patch(
        patchUrl,
        patchPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authResult.token}`
          },
          timeout: 30000
        }
      );

      if (patchResponse.status !== 200) {
        return {
          success: false,
          error: `PATCH request failed with status ${patchResponse.status}`,
          response: patchResponse.data
        };
      }

      this.logger.info(`Successfully associated picture ${pictureId} to media description ${mediaDescriptionId} (${fieldName})`);

      return {
        success: true,
        mediaDescriptionId,
        pictureId,
        format,
        fieldName,
        response: patchResponse.data
      };

    } catch (error) {
      this.logger.error(`Failed to associate picture to media description: ${error.message}`);

      if (error.response) {
        this.logger.error(`PATCH Response Status: ${error.response.status}`);
        this.logger.error(`PATCH Response Data: ${JSON.stringify(error.response.data)}`);
      }

      return {
        success: false,
        error: error.message,
        details: error.response?.data,
        mediaDescriptionId,
        pictureId,
        format
      };
    }
  }

  /**
   * Associate a picture to multiple media descriptions (batch operation)
   * @param {Array} associations - Array of {mediaDescriptionId, folderName} objects
   * @param {string} pictureId - The picture ID to associate
   * @param {string} format - The picture format
   * @returns {Object} - Batch association results
   */
  async batchAssociatePicture(associations, pictureId, format) {
    const results = {
      successes: [],
      failures: [],
      total: associations.length
    };

    this.logger.info(`Starting batch association of picture ${pictureId} (${format}) to ${associations.length} media descriptions`);

    for (const association of associations) {
      try {
        const result = await this.associatePictureToMediaDescription(
          association.mediaDescriptionId,
          pictureId,
          format
        );

        if (result.success) {
          results.successes.push({
            ...result,
            folderName: association.folderName
          });
          this.logger.info(`✓ Associated to ${association.folderName} (${association.mediaDescriptionId})`);
        } else {
          results.failures.push({
            ...result,
            folderName: association.folderName
          });
          this.logger.error(`✗ Failed to associate to ${association.folderName}: ${result.error}`);
        }
      } catch (error) {
        results.failures.push({
          success: false,
          error: error.message,
          mediaDescriptionId: association.mediaDescriptionId,
          folderName: association.folderName,
          pictureId,
          format
        });
        this.logger.error(`✗ Exception associating to ${association.folderName}: ${error.message}`);
      }
    }

    this.logger.info(`Batch association completed: ${results.successes.length} successes, ${results.failures.length} failures`);

    return results;
  }
}

export default PictureAssociator;