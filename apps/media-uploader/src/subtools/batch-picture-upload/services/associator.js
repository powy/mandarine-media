/**
 * Picture Associator Service
 * Handles batch association of pictures to media descriptions
 */

import axios from 'axios';
import chalk from 'chalk';

/**
 * Picture Associator Class
 * Associates a picture ID to multiple media descriptions
 */
export class PictureAssociator {
  constructor(config, logger = console) {
    this.config = config;
    this.logger = logger;
    this.token = null;
  }

  /**
   * Authenticate with backend API
   * @returns {Promise<string>} Authentication token
   */
  async authenticate() {
    if (this.token) {
      return this.token;
    }

    try {
      const response = await axios.post(
        `${this.config.backend.baseUrl}/api/auth/login`,
        {
          username: this.config.backend.username,
          password: this.config.backend.password
        }
      );

      this.token = response.data.access_token || response.data.token;
      return this.token;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Associate picture to a single media description
   * @param {string} mediaDescriptionId - Media description ID
   * @param {string} pictureId - Picture ID to associate
   * @param {string} fieldName - Field name (e.g., 'image_1920x1080_id')
   * @returns {Promise<Object>} Association result
   */
  async associatePictureToMedia(mediaDescriptionId, pictureId, fieldName) {
    const token = await this.authenticate();

    try {
      const updateData = {
        [fieldName]: pictureId
      };

      const response = await axios.patch(
        `${this.config.backend.baseUrl}/api/media-descriptions/${mediaDescriptionId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        mediaDescriptionId,
        pictureId,
        field: fieldName,
        response: response.data
      };
    } catch (error) {
      throw new Error(
        `Failed to associate picture ${pictureId} to media ${mediaDescriptionId}: ${error.response?.data?.detail || error.message}`
      );
    }
  }

  /**
   * Batch associate picture to multiple media descriptions
   * @param {Array<Object>} associations - Array of {mediaDescriptionId, folderName, excelPath}
   * @param {string} pictureId - Picture ID to associate
   * @param {string} format - Picture format (e.g., '1920x1080')
   * @returns {Promise<Object>} Batch association results
   */
  async batchAssociatePicture(associations, pictureId, format) {
    const results = {
      successes: [],
      failures: [],
      total: associations.length
    };

    // Determine field name from format
    const fieldName = `image_${format}_id`;

    if (this.logger.info) {
      this.logger.info(`Starting batch association for ${associations.length} media descriptions`);
      this.logger.info(`Picture ID: ${pictureId}, Format: ${format}, Field: ${fieldName}`);
    } else {
      console.log(chalk.cyan(`Starting batch association for ${associations.length} media descriptions`));
      console.log(chalk.gray(`Picture ID: ${pictureId}, Format: ${format}, Field: ${fieldName}`));
    }

    let completed = 0;

    for (const assoc of associations) {
      try {
        const result = await this.associatePictureToMedia(
          assoc.mediaDescriptionId,
          pictureId,
          fieldName
        );

        results.successes.push({
          ...assoc,
          result
        });

        completed++;
        const progress = Math.round((completed / associations.length) * 100);

        if (this.logger.info) {
          this.logger.info(`✓ Associated to ${assoc.folderName} (${completed}/${associations.length} - ${progress}%)`);
        } else {
          console.log(chalk.green(`✓ Associated to ${assoc.folderName} (${completed}/${associations.length} - ${progress}%)`));
        }
      } catch (error) {
        results.failures.push({
          ...assoc,
          error: error.message
        });

        completed++;
        const progress = Math.round((completed / associations.length) * 100);

        if (this.logger.error) {
          this.logger.error(`✗ Failed to associate to ${assoc.folderName}: ${error.message} (${completed}/${associations.length} - ${progress}%)`);
        } else {
          console.log(chalk.red(`✗ Failed to associate to ${assoc.folderName}: ${error.message} (${completed}/${associations.length} - ${progress}%)`));
        }
      }
    }

    return results;
  }
}

export default PictureAssociator;
