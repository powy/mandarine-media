/**
 * Subtitle-Specific Upload Core Function
 * Pure function interface that accepts JSON configuration
 */

import fs from 'fs-extra';
import path from 'path';
import { validateConfig } from './schemas/inputSchema.js';
import { detectLanguageFromFilename, isValidBCP47, getLanguageDisplayName } from './services/languageDetector.js';
import { MuxService } from './services/muxService.js';
import { S3Service } from './services/s3Service.js';
import { ExcelService } from '../one-media-complete-upload/services/excelService.js';
import axios from 'axios';

/**
 * Subtitle-specific upload core function
 * Uploads a single subtitle file for a specific media description
 *
 * @param {Object} config - Configuration object
 * @param {string} config.subtitlePath - Path to subtitle file
 * @param {string} [config.language] - Language code (BCP 47) - auto-detected if not provided
 * @param {string} [config.mediaDescriptionId] - Media description ID - looked up from Excel if not provided
 * @param {string} [config.folderPath] - Folder path for Excel lookup (required if mediaDescriptionId not provided)
 * @param {Object} config.mux - Mux configuration
 * @param {Object} config.s3 - S3 configuration for subtitle storage
 * @param {Object} config.backend - Backend API configuration
 * @param {Object} [config.options] - Upload options
 * @param {boolean} [config.dryRun=false] - Dry run mode
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @returns {Promise<Object>} Upload result
 */
export async function subtitleSpecificUploadCore(config) {
  // Validate configuration
  const validatedConfig = validateConfig(config);

  const logger = {
    info: (msg) => validatedConfig.verbose && console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg)
  };

  logger.info('📝 Subtitle-Specific Upload - Starting...');
  logger.info(`Subtitle: ${validatedConfig.subtitlePath}`);

  // Step 1: Validate subtitle file exists
  logger.info('\n🔍 Step 1: Validating subtitle file...');

  if (!await fs.pathExists(validatedConfig.subtitlePath)) {
    throw new Error(`Subtitle file does not exist: ${validatedConfig.subtitlePath}`);
  }

  const fileName = path.basename(validatedConfig.subtitlePath);
  const fileExt = path.extname(validatedConfig.subtitlePath).toLowerCase();

  // Validate subtitle format
  const supportedFormats = ['.srt', '.vtt', '.sub', '.ssa', '.ass'];
  if (!supportedFormats.includes(fileExt)) {
    throw new Error(`Unsupported subtitle format: ${fileExt}. Supported formats: ${supportedFormats.join(', ')}`);
  }

  logger.info(`✓ Subtitle file exists: ${fileName}`);
  logger.info(`  Format: ${fileExt}`);

  // Step 2: Detect/determine language
  logger.info('\n🌐 Step 2: Determining language...');

  let language = validatedConfig.language;

  // Auto-detect language from filename if not provided
  if (!language && validatedConfig.options?.autoDetectLanguage !== false) {
    language = detectLanguageFromFilename(fileName);

    if (language) {
      logger.info(`✓ Language detected from filename: ${language} (${getLanguageDisplayName(language)})`);
    } else {
      logger.warn(`⚠ Could not detect language from filename: ${fileName}`);
    }
  }

  if (!language) {
    throw new Error('Language is required but not provided or detected. Please provide language parameter or use filename pattern like: video_en.srt');
  }

  // Validate language code
  if (!isValidBCP47(language)) {
    logger.warn(`⚠ Warning: "${language}" may not be a valid BCP 47 language code`);
  }

  logger.info(`✓ Using language: ${language} (${getLanguageDisplayName(language)})`);

  // Step 3: Get media description ID
  logger.info('\n🆔 Step 3: Getting media description ID...');

  let mediaDescriptionId = validatedConfig.mediaDescriptionId;

  // Auto-lookup media ID from Excel if not provided
  if (!mediaDescriptionId && validatedConfig.options?.autoLookupMediaId !== false) {
    if (!validatedConfig.folderPath) {
      throw new Error('folderPath is required when mediaDescriptionId is not provided');
    }

    logger.info(`  Looking up media ID from Excel in: ${validatedConfig.folderPath}`);

    const excelService = new ExcelService(validatedConfig.folderPath);
    mediaDescriptionId = await excelService.findMediaDescriptionId();

    if (!mediaDescriptionId) {
      throw new Error(`No media description ID found in Excel file at: ${validatedConfig.folderPath}`);
    }

    logger.info(`✓ Media description ID found in Excel: ${mediaDescriptionId}`);
  }

  if (!mediaDescriptionId) {
    throw new Error('mediaDescriptionId is required but not provided or found');
  }

  logger.info(`✓ Using media description ID: ${mediaDescriptionId}`);

  // Handle dry run
  if (validatedConfig.dryRun) {
    logger.info('\n🔍 Dry run mode - Stopping before upload');
    return {
      success: true,
      dryRun: true,
      subtitlePath: validatedConfig.subtitlePath,
      language,
      mediaDescriptionId,
      message: 'Dry run completed - no upload performed'
    };
  }

  // Step 4: Get Mux asset ID from backend via video file
  logger.info('\n📹 Step 4: Getting Mux asset ID from video file...');

  const muxService = new MuxService(validatedConfig, logger);
  const assetId = await muxService.getMuxAssetIdFromVideoFile(mediaDescriptionId);

  logger.info(`✓ Mux asset ID: ${assetId}`);

  // Step 5: Upload subtitle to S3
  logger.info('\n☁️  Step 5: Uploading subtitle to S3...');

  const s3Service = new S3Service(validatedConfig, logger);
  const s3Result = await s3Service.uploadSubtitle(
    validatedConfig.subtitlePath,
    mediaDescriptionId,
    language
  );

  logger.info(`✓ Subtitle uploaded to S3`);

  // Step 6: Add subtitle track to Mux asset
  logger.info('\n🎬 Step 6: Adding subtitle track to Mux asset...');

  const muxResult = await muxService.addSubtitleTrack(
    assetId,
    s3Result.s3Url,
    language,
    {
      closedCaptions: validatedConfig.options?.closedCaptions || false,
      name: validatedConfig.options?.name || `${getLanguageDisplayName(language)} Subtitles`
    }
  );

  logger.info(`✓ Subtitle track added to Mux: ${muxResult.trackId}`);

  // Step 7: Update backend with subtitle info
  logger.info('\n💾 Step 7: Updating backend with subtitle info...');

  const backendResult = await updateSubtitleInBackend(
    mediaDescriptionId,
    {
      language,
      s3Url: s3Result.s3Url,
      s3Key: s3Result.s3Key,
      muxTrackId: muxResult.trackId,
      fileName,
      assetId
    },
    validatedConfig.backend,
    logger
  );

  logger.info(`✓ Backend updated successfully`);

  return {
    success: true,
    subtitlePath: validatedConfig.subtitlePath,
    language,
    languageDisplayName: getLanguageDisplayName(language),
    mediaDescriptionId,
    assetId,
    s3: s3Result,
    mux: muxResult,
    backend: backendResult
  };
}

/**
 * Update subtitle information in backend
 * @private
 */
async function updateSubtitleInBackend(mediaDescriptionId, subtitleInfo, backendConfig, logger) {
  try {
    // Authenticate with backend
    const authResponse = await axios.post(
      `${backendConfig.baseUrl}/api/auth/login`,
      {
        username: backendConfig.username,
        password: backendConfig.password
      }
    );

    const token = authResponse.data.access_token || authResponse.data.token;

    // Update media description with subtitle info
    // This could be stored in a separate subtitles array or in metadata
    const updateData = {
      subtitle_info: {
        language: subtitleInfo.language,
        s3_url: subtitleInfo.s3Url,
        s3_key: subtitleInfo.s3Key,
        mux_track_id: subtitleInfo.muxTrackId,
        file_name: subtitleInfo.fileName,
        asset_id: subtitleInfo.assetId,
        uploaded_at: new Date().toISOString()
      }
    };

    const response = await axios.patch(
      `${backendConfig.baseUrl}/api/media-descriptions/${mediaDescriptionId}/subtitles`,
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
      response: response.data
    };
  } catch (error) {
    // If the subtitles endpoint doesn't exist, try a general update
    if (error.response?.status === 404) {
      logger.warn('⚠ Subtitles endpoint not found, attempting general update...');

      try {
        const authResponse = await axios.post(
          `${backendConfig.baseUrl}/api/auth/login`,
          {
            username: backendConfig.username,
            password: backendConfig.password
          }
        );

        const token = authResponse.data.access_token || authResponse.data.token;

        const response = await axios.patch(
          `${backendConfig.baseUrl}/api/media-descriptions/${mediaDescriptionId}`,
          {
            subtitle_url: subtitleInfo.s3Url,
            subtitle_language: subtitleInfo.language
          },
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
          response: response.data,
          fallback: true
        };
      } catch (fallbackError) {
        throw new Error(`Failed to update backend (fallback also failed): ${fallbackError.response?.data?.detail || fallbackError.message}`);
      }
    }

    throw new Error(`Failed to update backend with subtitle info: ${error.response?.data?.detail || error.message}`);
  }
}

export default {
  subtitleSpecificUploadCore
};
