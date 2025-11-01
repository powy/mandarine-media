import chalk from 'chalk';
import { deleteFromVideoFileId } from './deleteFromVideoFileId.js';
import {
  authenticateBackend,
  getVideoFileIdFromMediaDescription
} from '../../mux-subtitle-upload/core/backendClient.js';

/**
 * Layer 3: Delete subtitle tracks from a media description by language
 * Fetches the media description entity from backend to get the video file ID,
 * then calls Layer 2 to complete the deletion
 *
 * @param {Object} params - Parameters
 * @param {string} params.mediaDescriptionId - Media description UUID from backend
 * @param {string} params.language - Language code (e.g., 'en', 'fr', 'es')
 * @param {string} params.backendUrl - Backend base URL
 * @param {string} params.backendUsername - Backend username
 * @param {string} params.backendPassword - Backend password
 * @param {string} params.muxTokenId - Mux API token ID
 * @param {string} params.muxTokenSecret - Mux API token secret
 * @param {boolean} [params.dryRun=false] - If true, only simulate deletion
 * @param {Object} [params.logger=console] - Logger instance
 * @returns {Promise<Object>} Deletion results with media description metadata
 */
export async function deleteFromMediaDescriptionId({
  mediaDescriptionId,
  language,
  backendUrl,
  backendUsername,
  backendPassword,
  muxTokenId,
  muxTokenSecret,
  dryRun = false,
  logger = console
}) {
  // Validate required parameters
  if (!mediaDescriptionId) {
    throw new Error('mediaDescriptionId is required');
  }
  if (!language) {
    throw new Error('language is required');
  }
  if (!backendUrl || !backendUsername || !backendPassword) {
    throw new Error('Backend credentials (backendUrl, backendUsername, backendPassword) are required');
  }
  if (!muxTokenId || !muxTokenSecret) {
    throw new Error('Mux credentials (muxTokenId and muxTokenSecret) are required');
  }

  logger.info(chalk.blue('=== Delete Subtitle from Media Description ==='));
  logger.info(`Media Description ID: ${mediaDescriptionId}`);
  logger.info(`Language: ${language}`);
  if (dryRun) {
    logger.info(chalk.yellow('[DRY RUN MODE]'));
  }
  logger.info('');

  try {
    // Step 1: Authenticate with backend
    logger.info('Authenticating with backend...');
    const token = await authenticateBackend({
      baseUrl: backendUrl,
      username: backendUsername,
      password: backendPassword
    });
    logger.info(chalk.green('✓ Backend authentication successful'));
    logger.info('');

    // Step 2: Fetch media description and extract video file ID
    logger.info(`Fetching media description ${mediaDescriptionId}...`);
    const videoFileId = await getVideoFileIdFromMediaDescription(backendUrl, mediaDescriptionId, token);
    logger.info(chalk.green(`✓ Found video file ID: ${videoFileId}`));
    logger.info('');

    // Step 3: Delete subtitle from video file (Layer 2)
    const result = await deleteFromVideoFileId({
      videoFileId,
      language,
      backendUrl,
      backendUsername,
      backendPassword,
      muxTokenId,
      muxTokenSecret,
      dryRun,
      logger
    });

    // Add media description metadata to result
    return {
      ...result,
      mediaDescriptionId
    };
  } catch (error) {
    logger.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}

export default deleteFromMediaDescriptionId;
