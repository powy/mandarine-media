/**
 * Resend Subtitles Core Function V2
 * Proper implementation following the correct data flow:
 * 1. Get media description ID from Excel
 * 2. Fetch media description from backend
 * 3. Get main video file ID from media description
 * 4. Fetch video file from backend
 * 5. Get Mux asset ID from video file
 * 6. Upload subtitle to S3
 * 7. Add subtitle track to Mux asset
 */

import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { S3Service } from './services/s3Service.js';
import { MuxService } from './services/muxService.js';
import { getLanguageDisplayName } from './services/languageDetector.js';

/**
 * Upload a single subtitle file for a specific media description
 * This function takes explicit parameters and follows the correct backend chain
 *
 * @param {Object} config - Configuration object
 * @param {string} config.subtitlePath - Path to subtitle file
 * @param {string} config.language - Language code (BCP 47, e.g., 'fr', 'en', 'ko')
 * @param {string} config.mediaDescriptionId - Media description ID
 * @param {Object} config.mux - Mux configuration {tokenId, tokenSecret}
 * @param {Object} config.s3 - S3 configuration {accessKeyId, secretAccessKey, region, bucket, keyPrefix}
 * @param {Object} config.backend - Backend API configuration {baseUrl, username, password}
 * @param {Object} [config.options] - Upload options
 * @param {boolean} [config.options.closedCaptions=false] - Mark as closed captions
 * @param {string} [config.options.name] - Subtitle track name
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @returns {Promise<Object>} Upload result
 */
export async function resendSubtitleSingle(config) {
  const logger = {
    info: (msg) => config.verbose && console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg)
  };

  logger.info('📝 Resend Subtitle (Single) - Starting...');
  logger.info(`  Subtitle: ${path.basename(config.subtitlePath)}`);
  logger.info(`  Language: ${config.language}`);
  logger.info(`  Media Description ID: ${config.mediaDescriptionId}`);

  // Step 1: Validate subtitle file exists
  if (!await fs.pathExists(config.subtitlePath)) {
    throw new Error(`Subtitle file does not exist: ${config.subtitlePath}`);
  }

  const fileName = path.basename(config.subtitlePath);
  const fileExt = path.extname(config.subtitlePath).toLowerCase();

  // Validate subtitle format
  const supportedFormats = ['.srt', '.vtt', '.sub', '.ssa', '.ass'];
  if (!supportedFormats.includes(fileExt)) {
    throw new Error(`Unsupported subtitle format: ${fileExt}. Supported: ${supportedFormats.join(', ')}`);
  }

  logger.info(`✓ Subtitle file validated: ${fileName}`);

  // Step 2: Authenticate with backend
  logger.info('\n🔐 Step 1: Authenticating with backend...');

  const loginData = new URLSearchParams();
  loginData.append('username', config.backend.username);
  loginData.append('password', config.backend.password);

  const authResponse = await axios.post(
    `${config.backend.baseUrl}/api/v1/auth/login`,
    loginData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    }
  );

  const token = authResponse.data.access_token || authResponse.data.token;
  logger.info('✓ Authenticated with backend');

  // Step 3: Get media description from backend
  logger.info('\n📋 Step 2: Fetching media description from backend...');

  const mediaDescResponse = await axios.get(
    `${config.backend.baseUrl}/api/v1/media-descriptions/${config.mediaDescriptionId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    }
  );

  const mediaDescription = mediaDescResponse.data;
  logger.info(`✓ Media description fetched: ${mediaDescription.episode_title || mediaDescription.id}`);

  // Step 4: Extract main video file ID from media description
  logger.info('\n🎬 Step 3: Getting main video file ID...');

  const videoFileId = mediaDescription.main_video_file_id ||
                      mediaDescription.video_file_id ||
                      mediaDescription.file_id;

  if (!videoFileId) {
    throw new Error(
      `No video file ID found in media description ${config.mediaDescriptionId}. ` +
      `Available fields: ${Object.keys(mediaDescription).join(', ')}`
    );
  }

  logger.info(`✓ Video file ID: ${videoFileId}`);

  // Step 5: Get video file from backend
  logger.info('\n📹 Step 4: Fetching video file from backend...');

  const videoFileResponse = await axios.get(
    `${config.backend.baseUrl}/api/v1/video-files/${videoFileId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    }
  );

  const videoFile = videoFileResponse.data;
  logger.info(`✓ Video file fetched: ${videoFile.file_name || videoFile.id}`);

  // Step 6: Extract Mux asset ID from video file
  logger.info('\n🎥 Step 5: Getting Mux asset ID...');

  const muxAssetId = videoFile.mux_asset_id || videoFile.asset_id;

  if (!muxAssetId) {
    throw new Error(
      `No Mux asset ID found in video file ${videoFileId}. ` +
      `Available fields: ${Object.keys(videoFile).join(', ')}`
    );
  }

  logger.info(`✓ Mux asset ID: ${muxAssetId}`);

  // Step 7: Upload subtitle to S3
  logger.info('\n☁️  Step 6: Uploading subtitle to S3...');

  const s3Service = new S3Service(config, logger);
  const s3Result = await s3Service.uploadSubtitle(
    config.subtitlePath,
    config.mediaDescriptionId,
    config.language
  );

  logger.info(`✓ Subtitle uploaded to S3: ${s3Result.s3Key}`);

  // Step 8: Add subtitle track to Mux asset
  logger.info('\n🎬 Step 7: Adding subtitle track to Mux...');

  const muxService = new MuxService(config, logger);
  const muxResult = await muxService.addSubtitleTrack(
    muxAssetId,
    s3Result.s3Url,
    config.language,
    {
      closedCaptions: config.options?.closedCaptions || false,
      name: config.options?.name || `${getLanguageDisplayName(config.language)} Subtitles`
    }
  );

  logger.info(`✓ Subtitle track added: ${muxResult.trackId}`);

  // Step 9: Update backend with subtitle info (optional, depends on your backend schema)
  logger.info('\n💾 Step 8: Updating backend with subtitle info...');

  try {
    const updateData = {
      subtitle_info: {
        language: config.language,
        s3_url: s3Result.s3Url,
        s3_key: s3Result.s3Key,
        mux_track_id: muxResult.trackId,
        file_name: fileName
      }
    };

    // This is optional - your backend might not have a specific subtitle update endpoint
    // You can comment this out if it's not needed
    await axios.patch(
      `${config.backend.baseUrl}/api/v1/media-descriptions/${config.mediaDescriptionId}/subtitle`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      }
    );

    logger.info('✓ Backend updated with subtitle info');
  } catch (error) {
    // Non-critical - subtitle was already uploaded to Mux
    logger.warn(`⚠️  Could not update backend subtitle info: ${error.message}`);
  }

  logger.info('\n✅ Subtitle resend completed successfully!');

  return {
    success: true,
    subtitlePath: config.subtitlePath,
    fileName,
    language: config.language,
    languageDisplayName: getLanguageDisplayName(config.language),
    mediaDescriptionId: config.mediaDescriptionId,
    videoFileId,
    muxAssetId,
    s3: s3Result,
    mux: muxResult
  };
}

export default {
  resendSubtitleSingle
};
