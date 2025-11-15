/**
 * Upload Subtitles from Season Folder with INI Configuration (v2 Batch)
 *
 * Processes all episodes in a season by:
 * 1. Fetching all episodes for the season from backend API
 * 2. Matching episode numbers to numbered subfolders (01/, 02/, etc.)
 * 3. Calling v1 function for each matched episode-folder pair
 * 4. Continuing on errors and logging all operations
 *
 * @module uploadSubtitlesFromSeasonFolderWithIni
 */

import path from 'path';
import { readdir } from 'fs/promises';
import { uploadSubtitlesFromFolderByIdWithIni } from './uploadSubtitlesFromFolderByIdWithIni.js';
import { authenticateBackend, fetchAllSeasons, fetchAllMediaDescriptions } from '../core/backendClient.js';
import { readIniFile, iniToStandardConfig } from '../../../shared/utils/iniParser.js';

/**
 * Get season ID from media description ID
 * The mediaDescriptionId is the general_media_description_id of the season
 * We need to find the actual season ID by querying seasons
 *
 * @param {string} mediaDescriptionId - Season's general media description UUID
 * @param {string} iniPath - Path to INI configuration file
 * @param {Object} logger - Logger instance
 * @returns {Promise<string>} Season UUID
 */
async function getSeasonIdFromMediaDescriptionId(mediaDescriptionId, iniPath, logger) {
  logger.info?.(`[getSeasonIdFromMediaDescriptionId] Searching for season with general_media_description_id: ${mediaDescriptionId}`);

  // Read INI config to get backend credentials
  const iniConfig = await readIniFile(iniPath);
  const config = iniToStandardConfig(iniConfig);

  // Authenticate with backend
  const token = await authenticateBackend({
    baseUrl: config.backend.baseUrl,
    username: config.backend.username,
    password: config.backend.password
  });

  // Get all seasons and find the one with matching general_media_description_id
  // This is a workaround since there's no direct API to get season by media_description_id
  const allSeasons = await fetchAllSeasons(config.backend.baseUrl, token);

  const season = allSeasons.find(s => s.general_media_description_id === mediaDescriptionId);

  if (!season) {
    throw new Error(`No season found with general_media_description_id: ${mediaDescriptionId}`);
  }

  logger.info?.(`[getSeasonIdFromMediaDescriptionId] Found season: ${season.season_name} (ID: ${season.id})`);
  return season.id;
}

/**
 * List numbered subfolders in parent directory
 *
 * @param {string} parentFolderPath - Path to parent directory
 * @param {Object} logger - Logger instance
 * @returns {Promise<Array>} Array of {folderName, episodeNumber, fullPath}
 */
async function listNumberedFolders(parentFolderPath, logger) {
  logger.info?.(`[listNumberedFolders] Scanning parent folder: ${parentFolderPath}`);

  const entries = await readdir(parentFolderPath, { withFileTypes: true });

  const numberedFolders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const folderName = entry.name;
      // Try to parse folder name as integer
      // Handles both "01" and "1" formats
      const episodeNumber = parseInt(folderName, 10);

      return {
        folderName,
        episodeNumber: isNaN(episodeNumber) ? null : episodeNumber,
        fullPath: path.join(parentFolderPath, folderName)
      };
    })
    .filter(folder => folder.episodeNumber !== null)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  logger.info?.(`[listNumberedFolders] Found ${numberedFolders.length} numbered folders`);
  numberedFolders.forEach(folder => {
    logger.info?.(`  - ${folder.folderName} → Episode ${folder.episodeNumber}`);
  });

  return numberedFolders;
}

/**
 * Match episodes with folders by episode number
 *
 * @param {Array} episodes - Episodes from API
 * @param {Array} folders - Numbered folders
 * @param {Object} logger - Logger instance
 * @returns {Array} Matched pairs [{episode, folder}]
 */
function matchEpisodesWithFolders(episodes, folders, logger) {
  logger.info?.(`[matchEpisodesWithFolders] Matching ${episodes.length} episodes with ${folders.length} folders`);

  const matches = [];
  const folderMap = new Map(folders.map(f => [f.episodeNumber, f]));

  for (const episode of episodes) {
    const episodeNumber = episode.episode_number;
    const folder = folderMap.get(episodeNumber);

    if (folder) {
      matches.push({ episode, folder });
      logger.info?.(`  ✓ Episode ${episodeNumber}: ${episode.episode_title} → ${folder.folderName}`);
    } else {
      logger.warn?.(`  ✗ Episode ${episodeNumber}: ${episode.episode_title} → No matching folder`);
    }
  }

  logger.info?.(`[matchEpisodesWithFolders] Matched ${matches.length} episode-folder pairs`);
  return matches;
}

/**
 * Upload subtitles from season folder using media description ID and INI configuration
 *
 * This is the v2 batch function that processes all episodes in a season.
 *
 * @param {string} mediaDescriptionId - Season's general media description UUID from backend
 * @param {string} parentFolderPath - Path to parent folder containing numbered episode folders
 * @param {string} iniPath - Full path to INI configuration file
 * @param {Object} [options] - Optional override settings
 * @param {Object} [options.logger] - Custom logger (defaults to console)
 * @param {boolean} [options.dryRun] - If true, validate without uploading
 * @param {number} [options.delayBetweenUploadsMs] - Delay between uploads (default: 2000ms)
 *
 * @returns {Promise<Object>} Upload results summary
 * @returns {Object} result.summary - Overall results
 * @returns {number} result.summary.totalEpisodes - Total episodes in season
 * @returns {number} result.summary.foldersMatched - Episode-folder pairs matched
 * @returns {number} result.summary.successfullyProcessed - Episodes uploaded successfully
 * @returns {number} result.summary.failed - Episodes that failed
 * @returns {number} result.summary.skipped - Episodes without matching folders
 * @returns {Array} result.processedEpisodes - Details for each episode
 * @returns {Array} result.failedEpisodes - Failed episodes with errors
 * @returns {Array} result.skippedEpisodes - Skipped episodes
 *
 * @throws {Error} If parent folder not found
 * @throws {Error} If season not found
 * @throws {Error} If INI file not found or invalid
 *
 * @example
 * const result = await uploadSubtitlesFromSeasonFolderWithIni(
 *   'uuid-media-description-id',
 *   '/path/to/season/folder',
 *   '/path/to/config.ini',
 *   { logger: console }
 * );
 */
export async function uploadSubtitlesFromSeasonFolderWithIni(
  mediaDescriptionId,
  parentFolderPath,
  iniPath,
  options = {}
) {
  const logger = options.logger || console;
  const startTime = Date.now();

  logger.info?.('\n' + '='.repeat(70));
  logger.info?.('[uploadSubtitlesFromSeasonFolderWithIni] Starting season batch upload');
  logger.info?.('='.repeat(70));
  logger.info?.(`  Season Media Description ID: ${mediaDescriptionId}`);
  logger.info?.(`  Parent Folder: ${parentFolderPath}`);
  logger.info?.(`  INI Config: ${iniPath}`);
  logger.info?.('');

  try {
    // Step 1: Get season ID from media description ID
    logger.info?.('[uploadSubtitlesFromSeasonFolderWithIni] Step 1: Fetching season details...');
    const seasonId = await getSeasonIdFromMediaDescriptionId(mediaDescriptionId, iniPath, logger);

    // Step 2: Fetch all episodes for the season
    logger.info?.(`[uploadSubtitlesFromSeasonFolderWithIni] Step 2: Fetching episodes for season ${seasonId}...`);
    
    // Read INI config to get backend credentials
    const iniConfig = await readIniFile(iniPath);
    const config = iniToStandardConfig(iniConfig);

    // Authenticate with backend
    const token = await authenticateBackend({
      baseUrl: config.backend.baseUrl,
      username: config.backend.username,
      password: config.backend.password
    });

    const episodes = await fetchAllMediaDescriptions(config.backend.baseUrl, token, {
      season_id: seasonId,
      media_type: 'video'
    });

    episodes.sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));

    logger.info?.(`[uploadSubtitlesFromSeasonFolderWithIni] Found ${episodes.length} episodes`);
    episodes.forEach(ep => {
      logger.info?.(`  - Episode ${ep.episode_number}: ${ep.episode_title} (${ep.id})`);
    });

    // Step 3: List numbered folders
    logger.info?.('\n[uploadSubtitlesFromSeasonFolderWithIni] Step 3: Scanning numbered folders...');
    const folders = await listNumberedFolders(parentFolderPath, logger);

    // Step 4: Match episodes with folders
    logger.info?.('\n[uploadSubtitlesFromSeasonFolderWithIni] Step 4: Matching episodes with folders...');
    const matches = matchEpisodesWithFolders(episodes, folders, logger);

    // Step 5: Process each matched episode-folder pair
    logger.info?.('\n[uploadSubtitlesFromSeasonFolderWithIni] Step 5: Processing matched episodes...');
    logger.info?.('='.repeat(70) + '\n');

    const processedEpisodes = [];
    const failedEpisodes = [];
    const skippedEpisodes = [];

    // Track episodes without folders
    const matchedEpisodeNumbers = new Set(matches.map(m => m.episode.episode_number));
    for (const episode of episodes) {
      if (!matchedEpisodeNumbers.has(episode.episode_number)) {
        skippedEpisodes.push({
          episodeNumber: episode.episode_number,
          episodeTitle: episode.episode_title,
          episodeId: episode.id,
          reason: 'No matching folder found'
        });
      }
    }

    // Process each match sequentially
    for (let i = 0; i < matches.length; i++) {
      const { episode, folder } = matches[i];
      const episodeNumber = episode.episode_number;
      const episodeTitle = episode.episode_title;
      const mediaDescriptionId = episode.id;

      logger.info?.(`\n[${ i + 1}/${matches.length}] Processing Episode ${episodeNumber}: ${episodeTitle}`);
      logger.info?.(`  Media Description ID: ${mediaDescriptionId}`);
      logger.info?.(`  Folder: ${folder.folderName} (${folder.fullPath})`);
      logger.info?.('');

      try {
        // Call v1 function for this episode
        const result = await uploadSubtitlesFromFolderByIdWithIni(
          mediaDescriptionId,
          folder.fullPath,
          iniPath,
          options
        );

        processedEpisodes.push({
          episodeNumber,
          episodeTitle,
          episodeId: mediaDescriptionId,
          folderName: folder.folderName,
          success: true,
          result
        });

        logger.info?.(`✓ Episode ${episodeNumber} completed successfully`);
        logger.info?.(`  Uploaded: ${result.summary.totalUploaded}/${result.summary.totalMatched} subtitles`);

      } catch (error) {
        const errorMessage = error.message || String(error);

        failedEpisodes.push({
          episodeNumber,
          episodeTitle,
          episodeId: mediaDescriptionId,
          folderName: folder.folderName,
          error: errorMessage
        });

        logger.error?.(`✗ Episode ${episodeNumber} failed: ${errorMessage}`);

        // Continue with next episode (don't throw)
      }

      logger.info?.('-'.repeat(70));
    }

    // Step 6: Generate summary
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    logger.info?.('\n' + '='.repeat(70));
    logger.info?.('UPLOAD SUMMARY');
    logger.info?.('='.repeat(70));
    logger.info?.(`Total episodes in season: ${episodes.length}`);
    logger.info?.(`Folders matched: ${matches.length}`);
    logger.info?.(`Successfully processed: ${processedEpisodes.length}`);
    logger.info?.(`Failed: ${failedEpisodes.length}`);
    logger.info?.(`Skipped (no folder): ${skippedEpisodes.length}`);
    logger.info?.(`Duration: ${duration} seconds`);
    logger.info?.('');

    if (failedEpisodes.length > 0) {
      logger.info?.('Failed episodes:');
      failedEpisodes.forEach(ep => {
        logger.error?.(`  - Episode ${ep.episodeNumber} (${ep.folderName}): ${ep.error}`);
      });
      logger.info?.('');
    }

    if (skippedEpisodes.length > 0) {
      logger.info?.('Skipped episodes:');
      skippedEpisodes.forEach(ep => {
        logger.warn?.(`  - Episode ${ep.episodeNumber}: ${ep.reason}`);
      });
      logger.info?.('');
    }

    logger.info?.('='.repeat(70) + '\n');

    return {
      summary: {
        totalEpisodes: episodes.length,
        foldersMatched: matches.length,
        successfullyProcessed: processedEpisodes.length,
        failed: failedEpisodes.length,
        skipped: skippedEpisodes.length,
        durationSeconds: duration
      },
      processedEpisodes,
      failedEpisodes,
      skippedEpisodes
    };

  } catch (error) {
    logger.error?.(`\n[uploadSubtitlesFromSeasonFolderWithIni] Critical error: ${error.message}`);
    throw error;
  }
}

export default { uploadSubtitlesFromSeasonFolderWithIni };
