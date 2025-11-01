/**
 * Upload Subtitle from Mux Asset ID
 * Pure function - No config files required
 *
 * Core upload function extracted from SubtitleService.uploadSingleSubtitle()
 * This is the base function that all other upload functions call
 */

import fs from 'fs-extra';
import path from 'path';
import S3Manager from '../services/s3Manager.js';
import MuxManager from '../services/muxManager.js';

/**
 * Language name mapping for common codes
 */
const LANGUAGE_NAMES = {
  'en': 'English',
  'fr': 'Français',
  'ko': '한국어',
  'es': 'Español',
  'de': 'Deutsch',
  'it': 'Italiano',
  'pt': 'Português',
  'ja': '日本語',
  'zh': '中文',
  'ar': 'العربية'
};

/**
 * Generate language display name from BCP 47 code
 */
function generateLanguageName(languageCode) {
  return LANGUAGE_NAMES[languageCode] || languageCode.toUpperCase();
}

/**
 * Upload subtitle file to Mux asset
 *
 * @param {Object} params - Upload parameters
 *
 * @param {string} params.assetId - Mux asset ID (required)
 * @param {string} params.subtitlePath - Full path to subtitle file (required)
 * @param {string} params.language - BCP 47 language code (e.g., 'en', 'fr', 'ko') (required)
 *
 * @param {string} params.muxTokenId - Mux API token ID (required)
 * @param {string} params.muxTokenSecret - Mux API token secret (required)
 *
 * @param {string} params.s3AccessKeyId - AWS S3 access key ID (required)
 * @param {string} params.s3SecretAccessKey - AWS S3 secret access key (required)
 * @param {string} params.s3Region - AWS S3 region (required)
 * @param {string} params.s3BucketName - AWS S3 bucket name (required)
 *
 * @param {string} [params.subtitleName] - Display name for subtitle track (default: generated from language)
 * @param {boolean} [params.isDefault=false] - Mark as default subtitle track
 * @param {boolean} [params.closedCaptions=false] - Mark as closed captions
 * @param {string} [params.textType='subtitles'] - Text type ('subtitles' or 'captions')
 * @param {string} [params.passthrough] - Custom passthrough data for Mux
 *
 * @param {Object} [params.options] - Upload options
 * @param {number} [params.options.cleanupDelayMinutes=120] - S3 cleanup delay in minutes
 * @param {number} [params.options.maxRetryAttempts=3] - Max retry attempts for Mux API
 * @param {number} [params.options.retryDelay=5000] - Retry delay in ms
 * @param {number} [params.options.monitoringTimeout=60000] - Track monitoring timeout in ms
 * @param {number} [params.options.monitoringInterval=5000] - Track monitoring interval in ms
 * @param {boolean} [params.options.skipCleanup=false] - Skip S3 cleanup
 * @param {boolean} [params.options.skipMonitoring=false] - Skip track status monitoring
 * @param {string} [params.options.s3KeyPrefix='subtitles'] - S3 key prefix
 *
 * @param {Object} [params.logger=console] - Logger object with info/warn/error methods
 *
 * @returns {Promise<Object>} Upload result
 * @returns {boolean} result.success - Whether upload succeeded
 * @returns {string} result.assetId - Mux asset ID
 * @returns {string} result.trackId - Mux track ID
 * @returns {string} result.language - Language code
 * @returns {string} result.subtitlePath - Path to subtitle file
 * @returns {string} result.s3Key - S3 object key
 * @returns {string} result.s3Url - Presigned S3 URL used for Mux
 * @returns {number} result.uploadTimeMs - S3 upload time in milliseconds
 * @returns {number} result.processingTimeMs - Mux processing time in milliseconds
 * @returns {number} result.totalTimeMs - Total time in milliseconds
 *
 * @throws {Error} If subtitle file not found
 * @throws {Error} If S3 upload fails
 * @throws {Error} If Mux track creation fails
 *
 * @example
 * const result = await uploadFromAssetId({
 *   assetId: 'abc123',
 *   subtitlePath: '/path/to/subtitle_en.srt',
 *   language: 'en',
 *   muxTokenId: 'your-token-id',
 *   muxTokenSecret: 'your-token-secret',
 *   s3AccessKeyId: 'your-access-key',
 *   s3SecretAccessKey: 'your-secret-key',
 *   s3Region: 'us-east-1',
 *   s3BucketName: 'my-bucket'
 * });
 */
export async function uploadFromAssetId(params) {
  const startTime = Date.now();

  // Extract parameters with defaults
  const {
    assetId,
    subtitlePath,
    language,
    muxTokenId,
    muxTokenSecret,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3Region,
    s3BucketName,
    subtitleName,
    isDefault = false,
    closedCaptions = false,
    textType = 'subtitles',
    passthrough,
    options = {},
    logger = console
  } = params;

  // Validate required parameters
  if (!assetId) throw new Error('assetId is required');
  if (!subtitlePath) throw new Error('subtitlePath is required');
  if (!language) throw new Error('language is required');
  if (!muxTokenId) throw new Error('muxTokenId is required');
  if (!muxTokenSecret) throw new Error('muxTokenSecret is required');
  if (!s3AccessKeyId) throw new Error('s3AccessKeyId is required');
  if (!s3SecretAccessKey) throw new Error('s3SecretAccessKey is required');
  if (!s3Region) throw new Error('s3Region is required');
  if (!s3BucketName) throw new Error('s3BucketName is required');

  // Extract options with defaults
  const cleanupDelayMinutes = options.cleanupDelayMinutes ?? 120;
  const maxRetryAttempts = options.maxRetryAttempts ?? 3;
  const retryDelay = options.retryDelay ?? 5000;
  const monitoringTimeout = options.monitoringTimeout ?? 60000;
  const monitoringInterval = options.monitoringInterval ?? 5000;
  const skipCleanup = options.skipCleanup ?? false;
  const skipMonitoring = options.skipMonitoring ?? false;
  const s3KeyPrefix = options.s3KeyPrefix ?? 'subtitles';

  logger.info?.(`[uploadFromAssetId] Starting upload: ${path.basename(subtitlePath)} (${language}) → asset ${assetId}`);

  // Step 1: Validate subtitle file exists
  if (!await fs.pathExists(subtitlePath)) {
    throw new Error(`Subtitle file not found: ${subtitlePath}`);
  }

  // Step 2: Initialize S3 Manager
  const s3Manager = new S3Manager(
    {
      access_key_id: s3AccessKeyId,
      secret_access_key: s3SecretAccessKey,
      region: s3Region,
      bucket_name: s3BucketName,
      subtitle_folder: s3KeyPrefix,
      presigned_url_expiry: 3600
    },
    logger
  );

  // Step 3: Initialize Mux Manager
  const muxManager = new MuxManager(
    {
      mux_token_id: muxTokenId,
      mux_token_secret: muxTokenSecret,
      max_retry_attempts: maxRetryAttempts,
      retry_delay: retryDelay
    },
    logger
  );

  // Step 4: Upload to S3
  logger.info?.('[uploadFromAssetId] Uploading to S3...');
  const s3Result = await s3Manager.uploadFile(
    subtitlePath,
    assetId,
    {
      language: language,
      'text-type': textType
    }
  );
  logger.info?.(`[uploadFromAssetId] S3 upload completed: ${s3Result.s3Key}`);

  // Step 5: Generate presigned URL for Mux
  logger.info?.('[uploadFromAssetId] Generating presigned URL...');
  const presignedUrl = await s3Manager.generatePresignedUrl(s3Result.s3Key);

  // Step 6: Add subtitle track to Mux
  logger.info?.('[uploadFromAssetId] Adding track to Mux...');
  const muxResult = await muxManager.addSubtitleTrack(
    assetId,
    presignedUrl,
    {
      language_code: language,
      name: subtitleName || generateLanguageName(language),
      text_type: textType,
      closed_captions: closedCaptions,
      is_default: isDefault,
      passthrough: passthrough
    }
  );
  logger.info?.(`[uploadFromAssetId] Mux track created: ${muxResult.trackId}`);

  // Step 7: Monitor track status (optional)
  let monitorResult = { success: true, processingTimeMs: 0 };
  if (!skipMonitoring) {
    logger.info?.('[uploadFromAssetId] Monitoring track status...');
    monitorResult = await muxManager.monitorTrackStatus(
      assetId,
      muxResult.trackId,
      monitoringTimeout,
      monitoringInterval
    );

    if (monitorResult.success) {
      logger.info?.(`[uploadFromAssetId] Track ready (processing: ${monitorResult.processingTimeMs}ms)`);
    } else {
      logger.warn?.(`[uploadFromAssetId] Track monitoring: ${monitorResult.error || 'timeout'}`);
    }
  }

  // Step 8: Schedule S3 cleanup (optional)
  if (!skipCleanup) {
    logger.info?.(`[uploadFromAssetId] Scheduling S3 cleanup (${cleanupDelayMinutes} minutes)...`);
    s3Manager.scheduleCleanup(s3Result.s3Key, cleanupDelayMinutes);
  }

  const totalTimeMs = Date.now() - startTime;

  logger.info?.(`[uploadFromAssetId] Upload completed successfully in ${totalTimeMs}ms`);

  // Return result
  return {
    success: monitorResult.success,
    assetId,
    trackId: muxResult.trackId,
    language,
    subtitlePath,
    subtitleName: subtitleName || generateLanguageName(language),
    s3Key: s3Result.s3Key,
    s3Url: presignedUrl,
    uploadTimeMs: s3Result.uploadTimeMs,
    processingTimeMs: monitorResult.processingTimeMs || 0,
    totalTimeMs,
    // Additional details
    s3Result: {
      bucket: s3Result.bucket,
      key: s3Result.s3Key,
      fileSize: s3Result.fileSize,
      contentType: s3Result.contentType
    },
    muxResult: {
      trackId: muxResult.trackId,
      assetId: muxResult.assetId,
      attempt: muxResult.attempt
    },
    monitorResult: {
      success: monitorResult.success,
      processingTimeMs: monitorResult.processingTimeMs,
      timeout: monitorResult.timeout
    }
  };
}

export default { uploadFromAssetId };
