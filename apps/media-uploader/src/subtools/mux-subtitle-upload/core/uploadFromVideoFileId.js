/**
 * Upload Subtitle from Video File ID
 * Fetches Mux asset ID from backend video file, then uploads
 *
 * This function adds backend integration layer on top of uploadFromAssetId
 */

import { uploadFromAssetId } from './uploadFromAssetId.js';
import { authenticateBackend, getMuxAssetIdFromVideoFile } from './backendClient.js';

/**
 * Upload subtitle file using Video File ID from backend
 *
 * @param {Object} params - Upload parameters
 *
 * @param {string} params.videoFileId - Video file UUID from backend (required)
 * @param {string} params.subtitlePath - Full path to subtitle file (required)
 * @param {string} params.language - BCP 47 language code (required)
 *
 * @param {string} params.backendBaseUrl - Backend API base URL (required)
 * @param {string} params.backendUsername - Backend username (required)
 * @param {string} params.backendPassword - Backend password (required)
 *
 * @param {string} params.muxTokenId - Mux API token ID (required)
 * @param {string} params.muxTokenSecret - Mux API token secret (required)
 *
 * @param {string} params.s3AccessKeyId - AWS S3 access key ID (required)
 * @param {string} params.s3SecretAccessKey - AWS S3 secret access key (required)
 * @param {string} params.s3Region - AWS S3 region (required)
 * @param {string} params.s3BucketName - AWS S3 bucket name (required)
 *
 * @param {string} [params.subtitleName] - Display name for subtitle track
 * @param {boolean} [params.isDefault=false] - Mark as default subtitle track
 * @param {boolean} [params.closedCaptions=false] - Mark as closed captions
 * @param {string} [params.textType='subtitles'] - Text type
 * @param {string} [params.passthrough] - Custom passthrough data
 *
 * @param {Object} [params.options] - Upload options (see uploadFromAssetId)
 * @param {Object} [params.logger=console] - Logger object
 *
 * @returns {Promise<Object>} Upload result (see uploadFromAssetId)
 * @returns {string} result.videoFileId - Video file ID used
 * @returns {string} result.assetId - Mux asset ID fetched
 *
 * @throws {Error} If backend authentication fails
 * @throws {Error} If video file not found
 * @throws {Error} If Mux asset ID not found in video file
 * @throws {Error} If upload fails (see uploadFromAssetId)
 *
 * @example
 * const result = await uploadFromVideoFileId({
 *   videoFileId: 'uuid-video-file-id',
 *   subtitlePath: '/path/to/subtitle_en.srt',
 *   language: 'en',
 *   backendBaseUrl: 'https://api.example.com',
 *   backendUsername: 'user',
 *   backendPassword: 'pass',
 *   muxTokenId: 'your-token-id',
 *   muxTokenSecret: 'your-token-secret',
 *   s3AccessKeyId: 'your-access-key',
 *   s3SecretAccessKey: 'your-secret-key',
 *   s3Region: 'us-east-1',
 *   s3BucketName: 'my-bucket'
 * });
 */
export async function uploadFromVideoFileId(params) {
  const {
    videoFileId,
    subtitlePath,
    language,
    backendBaseUrl,
    backendUsername,
    backendPassword,
    muxTokenId,
    muxTokenSecret,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3Region,
    s3BucketName,
    subtitleName,
    isDefault,
    closedCaptions,
    textType,
    passthrough,
    options,
    logger = console
  } = params;

  // Validate required parameters
  if (!videoFileId) throw new Error('videoFileId is required');
  if (!subtitlePath) throw new Error('subtitlePath is required');
  if (!language) throw new Error('language is required');
  if (!backendBaseUrl) throw new Error('backendBaseUrl is required');
  if (!backendUsername) throw new Error('backendUsername is required');
  if (!backendPassword) throw new Error('backendPassword is required');
  if (!muxTokenId) throw new Error('muxTokenId is required');
  if (!muxTokenSecret) throw new Error('muxTokenSecret is required');
  if (!s3AccessKeyId) throw new Error('s3AccessKeyId is required');
  if (!s3SecretAccessKey) throw new Error('s3SecretAccessKey is required');
  if (!s3Region) throw new Error('s3Region is required');
  if (!s3BucketName) throw new Error('s3BucketName is required');

  logger.info?.(`[uploadFromVideoFileId] Starting upload for video file: ${videoFileId}`);

  // Step 1: Authenticate with backend
  logger.info?.('[uploadFromVideoFileId] Authenticating with backend...');
  const token = await authenticateBackend({
    baseUrl: backendBaseUrl,
    username: backendUsername,
    password: backendPassword
  });
  logger.info?.('[uploadFromVideoFileId] Backend authentication successful');

  // Step 2: Fetch Mux asset ID from video file
  logger.info?.(`[uploadFromVideoFileId] Fetching Mux asset ID from video file ${videoFileId}...`);
  const assetId = await getMuxAssetIdFromVideoFile(
    backendBaseUrl,
    videoFileId,
    token
  );
  logger.info?.(`[uploadFromVideoFileId] Mux asset ID found: ${assetId}`);

  // Step 3: Call uploadFromAssetId with the fetched asset ID
  logger.info?.('[uploadFromVideoFileId] Proceeding with asset-based upload...');
  const result = await uploadFromAssetId({
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
    isDefault,
    closedCaptions,
    textType,
    passthrough,
    options,
    logger
  });

  logger.info?.('[uploadFromVideoFileId] Upload completed successfully');

  // Return result with additional context
  return {
    ...result,
    videoFileId,
    // assetId is already in result from uploadFromAssetId
  };
}

export default { uploadFromVideoFileId };
