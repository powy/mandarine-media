/**
 * Upload Subtitles from Folder by Media Description ID with INI Configuration
 *
 * Scans a folder for video and subtitle files, uses prepare-excel matching logic
 * to identify main video subtitles (avoiding trailer subtitles), then uploads
 * them to a specific media description ID.
 */

import path from 'path';
import { uploadFromMediaDescriptionIdWithIni } from './uploadFromMediaDescriptionIdWithIni.js';
import { scanFolder } from '../../one-media-complete-upload/utils/fileUtils.js';
import { MediaAnalysisService } from '../../one-media-complete-upload/services/mediaAnalysisService.js';

/**
 * Upload subtitles from folder using media description ID and INI configuration
 *
 * This function:
 * 1. Scans folder for videos and subtitles
 * 2. Uses full prepare-excel logic to match subtitles to videos
 * 3. Extracts only main video subtitles (avoiding trailer subtitles)
 * 4. Uploads each subtitle with 2-second delays between uploads
 *
 * @param {string} mediaDescriptionId - Media description UUID from backend
 * @param {string} folderPath - Full path to folder containing subtitle files
 * @param {string} iniPath - Full path to INI configuration file
 * @param {Object} [options] - Optional override settings
 * @param {Object} [options.logger] - Custom logger (defaults to console)
 * @param {boolean} [options.dryRun] - If true, validate without uploading
 * @param {number} [options.delayBetweenUploadsMs] - Delay between uploads (default: 2000ms)
 *
 * @returns {Promise<Object>} Upload results summary
 * @returns {Object} result.summary - Overall results
 * @returns {number} result.summary.totalFound - Total subtitles found in folder
 * @returns {number} result.summary.totalMatched - Subtitles matched to main video
 * @returns {number} result.summary.totalUploaded - Successfully uploaded subtitles
 * @returns {Object} result.uploads - Upload results for each language {fr, en, ko}
 * @returns {Object} result.videoAnalysis - Video categorization details
 *
 * @throws {Error} If folder not found or invalid
 * @throws {Error} If no videos found in folder
 * @throws {Error} If INI file not found or invalid
 * @throws {Error} If upload fails
 *
 * @example
 * const result = await uploadSubtitlesFromFolderByIdWithIni(
 *   'uuid-media-description-id',
 *   '/path/to/folder',
 *   '/path/to/config.ini',
 *   { logger: console }
 * );
 */
export async function uploadSubtitlesFromFolderByIdWithIni(
  mediaDescriptionId,
  folderPath,
  iniPath,
  options = {}
) {
  const logger = options.logger || console;
  const delayMs = options.delayBetweenUploadsMs ?? 2000;

  logger.info?.(`[uploadSubtitlesFromFolderByIdWithIni] Starting subtitle upload process`);
  logger.info?.(`  Media Description ID: ${mediaDescriptionId}`);
  logger.info?.(`  Folder: ${folderPath}`);
  logger.info?.(`  INI Config: ${iniPath}`);
  logger.info?.(`  Delay between uploads: ${delayMs}ms`);

  // Step 1: Scan folder for videos and subtitles
  logger.info?.('[uploadSubtitlesFromFolderByIdWithIni] Scanning folder for media files...');
  const mediaFiles = await scanFolder(folderPath);

  logger.info?.(`  Found ${mediaFiles.videos.length} video(s)`);
  logger.info?.(`  Found ${mediaFiles.subtitles.length} subtitle(s)`);
  logger.info?.(`  Found ${mediaFiles.images.length} image(s)`);

  // Validate we have videos (needed for matching logic)
  if (mediaFiles.videos.length === 0) {
    throw new Error('No video files found in folder. Video files are needed to properly match subtitles.');
  }

  // If no subtitles, nothing to do
  if (mediaFiles.subtitles.length === 0) {
    logger.warn('[uploadSubtitlesFromFolderByIdWithIni] No subtitle files found in folder');
    return {
      summary: {
        totalFound: 0,
        totalMatched: 0,
        totalUploaded: 0
      },
      uploads: { fr: null, en: null, ko: null },
      videoAnalysis: null
    };
  }

  // Step 2: Analyze videos using prepare-excel logic
  logger.info?.('[uploadSubtitlesFromFolderByIdWithIni] Analyzing videos to identify main video, trailers, and extracts...');
  const analysisService = new MediaAnalysisService(logger);
  const videoAnalysis = analysisService.analyzeVideos(mediaFiles.videos);

  logger.info?.(`  Main video: ${videoAnalysis.mainVideo?.name || 'None'}`);
  logger.info?.(`  Trailers: ${videoAnalysis.trailers.length}`);
  logger.info?.(`  Extracts: ${videoAnalysis.extracts.length}`);

  if (!videoAnalysis.mainVideo) {
    throw new Error('Could not identify main video in folder');
  }

  // Step 3: Match subtitles to videos using string similarity and duration matching
  logger.info?.('[uploadSubtitlesFromFolderByIdWithIni] Matching subtitles to videos using string similarity and duration matching...');
  const subtitleMappings = await analysisService.analyzeSubtitles(mediaFiles.subtitles, videoAnalysis);

  // Step 4: Extract only main video subtitles
  const mainVideoSubtitles = {
    fr: subtitleMappings.fr.get(videoAnalysis.mainVideo) || null,
    en: subtitleMappings.en.get(videoAnalysis.mainVideo) || null,
    ko: subtitleMappings.ko.get(videoAnalysis.mainVideo) || null
  };

  const matchedCount = [mainVideoSubtitles.fr, mainVideoSubtitles.en, mainVideoSubtitles.ko]
    .filter(Boolean).length;

  logger.info?.('[uploadSubtitlesFromFolderByIdWithIni] Main video subtitle selection:');
  logger.info?.(`  French (fr): ${mainVideoSubtitles.fr?.name || 'None'}`);
  logger.info?.(`  English (en): ${mainVideoSubtitles.en?.name || 'None'}`);
  logger.info?.(`  Korean (ko): ${mainVideoSubtitles.ko?.name || 'None'}`);
  logger.info?.(`  Total matched to main video: ${matchedCount}`);

  if (matchedCount === 0) {
    logger.warn('[uploadSubtitlesFromFolderByIdWithIni] No subtitles matched to main video');
    return {
      summary: {
        totalFound: mediaFiles.subtitles.length,
        totalMatched: 0,
        totalUploaded: 0
      },
      uploads: { fr: null, en: null, ko: null },
      videoAnalysis
    };
  }

  // Step 5: Dry run check
  if (options.dryRun) {
    logger.info?.('[uploadSubtitlesFromFolderByIdWithIni] DRY RUN - Would upload the following subtitles:');
    for (const [lang, subtitle] of Object.entries(mainVideoSubtitles)) {
      if (subtitle) {
        logger.info?.(`  ${lang}: ${subtitle.name}`);
      }
    }
    return {
      dryRun: true,
      summary: {
        totalFound: mediaFiles.subtitles.length,
        totalMatched: matchedCount,
        totalUploaded: 0
      },
      uploads: mainVideoSubtitles,
      videoAnalysis
    };
  }

  // Step 6: Upload each subtitle with delays
  logger.info?.('[uploadSubtitlesFromFolderByIdWithIni] Starting subtitle uploads with rate limiting...');

  const uploadResults = {
    fr: null,
    en: null,
    ko: null
  };

  let uploadedCount = 0;
  const languages = ['fr', 'en', 'ko'];

  for (const language of languages) {
    const subtitle = mainVideoSubtitles[language];

    if (!subtitle) {
      logger.info?.(`[uploadSubtitlesFromFolderByIdWithIni] Skipping ${language} - no subtitle matched`);
      continue;
    }

    try {
      // Wait before upload (including before first upload for safety)
      logger.info?.(`[uploadSubtitlesFromFolderByIdWithIni] Waiting ${delayMs}ms before upload (rate limiting)...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Upload subtitle
      logger.info?.(`[uploadSubtitlesFromFolderByIdWithIni] Uploading ${language} subtitle: ${subtitle.name}`);

      const uploadResult = await uploadFromMediaDescriptionIdWithIni(
        mediaDescriptionId,
        subtitle.fullPath,
        language,
        iniPath,
        {
          ...options,
          logger
        }
      );

      uploadResults[language] = {
        success: true,
        subtitle: subtitle.name,
        result: uploadResult
      };

      uploadedCount++;
      logger.info?.(`[uploadSubtitlesFromFolderByIdWithIni] ✓ Successfully uploaded ${language} subtitle`);

    } catch (error) {
      logger.error?.(`[uploadSubtitlesFromFolderByIdWithIni] ✗ Failed to upload ${language} subtitle: ${error.message}`);
      uploadResults[language] = {
        success: false,
        subtitle: subtitle.name,
        error: error.message
      };
    }
  }

  // Step 7: Return summary
  logger.info?.('[uploadSubtitlesFromFolderByIdWithIni] Upload process completed');
  logger.info?.(`  Total subtitles found: ${mediaFiles.subtitles.length}`);
  logger.info?.(`  Matched to main video: ${matchedCount}`);
  logger.info?.(`  Successfully uploaded: ${uploadedCount}`);

  return {
    summary: {
      totalFound: mediaFiles.subtitles.length,
      totalMatched: matchedCount,
      totalUploaded: uploadedCount
    },
    uploads: uploadResults,
    videoAnalysis,
    mainVideoName: videoAnalysis.mainVideo.name
  };
}

export default { uploadSubtitlesFromFolderByIdWithIni };
