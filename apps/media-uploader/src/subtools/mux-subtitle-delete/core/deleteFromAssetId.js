import chalk from 'chalk';
import MuxSubtitleDeleter from '../services/muxSubtitleDeleter.js';

/**
 * Layer 1: Delete subtitle tracks from a Mux asset by language
 *
 * @param {Object} params - Parameters
 * @param {string} params.muxAssetId - Mux asset ID
 * @param {string} params.language - Language code (e.g., 'en', 'fr', 'es')
 * @param {string} params.muxTokenId - Mux API token ID
 * @param {string} params.muxTokenSecret - Mux API token secret
 * @param {boolean} [params.dryRun=false] - If true, only simulate deletion
 * @param {Object} [params.logger=console] - Logger instance
 * @returns {Promise<Object>} Deletion results
 */
export async function deleteFromAssetId({
  muxAssetId,
  language,
  muxTokenId,
  muxTokenSecret,
  dryRun = false,
  logger = console
}) {
  // Validate required parameters
  if (!muxAssetId) {
    throw new Error('muxAssetId is required');
  }
  if (!language) {
    throw new Error('language is required');
  }
  if (!muxTokenId || !muxTokenSecret) {
    throw new Error('Mux credentials (muxTokenId and muxTokenSecret) are required');
  }

  logger.info(chalk.blue('=== Delete Subtitle from Mux Asset ==='));
  logger.info(`Asset ID: ${muxAssetId}`);
  logger.info(`Language: ${language}`);
  if (dryRun) {
    logger.info(chalk.yellow('[DRY RUN MODE]'));
  }
  logger.info('');

  try {
    // Initialize Mux subtitle deleter
    const deleter = new MuxSubtitleDeleter({
      tokenId: muxTokenId,
      tokenSecret: muxTokenSecret,
      logger,
      dryRun
    });

    // Validate asset exists and is ready
    logger.info('Validating Mux asset...');
    const asset = await deleter.validateAsset(muxAssetId);
    logger.info(chalk.green(`✓ Asset validated (status: ${asset.status})`));
    logger.info('');

    // Delete subtitles by language
    logger.info(`Deleting subtitle tracks for language '${language}'...`);
    const result = await deleter.deleteSubtitlesByLanguage(muxAssetId, language);

    logger.info('');
    logger.info(chalk.blue('=== Summary ==='));
    logger.info(`Tracks deleted: ${result.tracksDeleted}`);

    if (result.tracks && result.tracks.length > 0) {
      logger.info('\nDeleted tracks:');
      result.tracks.forEach(track => {
        logger.info(`  - Track ID: ${track.trackId}`);
        logger.info(`    Name: ${track.name || 'N/A'}`);
        logger.info(`    Language: ${track.languageCode}`);
      });
    }

    if (result.errors && result.errors.length > 0) {
      logger.info('\nErrors:');
      result.errors.forEach(error => {
        logger.error(`  - Track ${error.trackId}: ${error.error}`);
      });
    }

    return result;
  } catch (error) {
    logger.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}

export default deleteFromAssetId;
