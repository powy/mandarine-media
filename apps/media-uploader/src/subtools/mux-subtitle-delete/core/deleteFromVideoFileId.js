import chalk from 'chalk';
import { deleteFromAssetId } from './deleteFromAssetId.js';
import {
  authenticateBackend,
  getMuxAssetIdFromVideoFile
} from '../../mux-subtitle-upload/core/backendClient.js';

/**
 * Layer 2: Delete subtitle tracks from a video file by language
 * Fetches the video file entity from backend to get the Mux asset ID
 *
 * @param {Object} params - Parameters
 * @param {string} params.videoFileId - Video file UUID from backend
 * @param {string} params.language - Language code (e.g., 'en', 'fr', 'es')
 * @param {string} params.backendUrl - Backend base URL
 * @param {string} params.backendUsername - Backend username
 * @param {string} params.backendPassword - Backend password
 * @param {string} params.muxTokenId - Mux API token ID
 * @param {string} params.muxTokenSecret - Mux API token secret
 * @param {boolean} [params.dryRun=false] - If true, only simulate deletion
 * @param {Object} [params.logger=console] - Logger instance
 * @returns {Promise<Object>} Deletion results with video file metadata
 */
export async function deleteFromVideoFileId({
  videoFileId,
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
  if (!videoFileId) {
    throw new Error('videoFileId is required');
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

  logger.info(chalk.blue('=== Delete Subtitle from Video File ==='));
  logger.info(`Video File ID: ${videoFileId}`);
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

    // Step 2: Fetch video file and extract Mux asset ID
    logger.info(`Fetching video file ${videoFileId}...`);
    const muxAssetId = await getMuxAssetIdFromVideoFile(backendUrl, videoFileId, token);
    logger.info(chalk.green(`✓ Found Mux asset ID: ${muxAssetId}`));
    logger.info('');

    // Step 3: Delete subtitle from Mux asset (Layer 1)
    const result = await deleteFromAssetId({
      muxAssetId,
      language,
      muxTokenId,
      muxTokenSecret,
      dryRun,
      logger
    });

    // Add video file metadata to result
    return {
      ...result,
      videoFileId,
      muxAssetId
    };
  } catch (error) {
    logger.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}

export default deleteFromVideoFileId;
