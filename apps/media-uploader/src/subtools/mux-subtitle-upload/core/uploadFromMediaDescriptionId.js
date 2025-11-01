/**
 * Upload Subtitle from Media Description ID
 * Fetches video file ID from backend media description, then uploads
 *
 * This function adds media description layer on top of uploadFromVideoFileId
 */

import { uploadFromVideoFileId } from './uploadFromVideoFileId.js';
import { authenticateBackend, getVideoFileIdFromMediaDescription } from './backendClient.js';

/**
 * Upload subtitle file using Media Description ID from backend
 *
 * @param {Object} params - Upload parameters
 *
 * @param {string} params.mediaDescriptionId - Media description UUID from backend (required)
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
 * @returns {string} result.mediaDescriptionId - Media description ID used
 * @returns {string} result.videoFileId - Video file ID fetched
 * @returns {string} result.assetId - Mux asset ID fetched
 *
 * @throws {Error} If backend authentication fails
 * @throws {Error} If media description not found
 * @throws {Error} If video file ID not found in media description
 * @throws {Error} If video file not found
 * @throws {Error} If Mux asset ID not found in video file
 * @throws {Error} If upload fails (see uploadFromAssetId)
 *
 * @example
 * const result = await uploadFromMediaDescriptionId({
 *   mediaDescriptionId: 'uuid-media-description-id',
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
export async function uploadFromMediaDescriptionId(params) {
  const {
    mediaDescriptionId,
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
  if (!mediaDescriptionId) throw new Error('mediaDescriptionId is required');
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

  logger.info?.(`[uploadFromMediaDescriptionId] Starting upload for media description: ${mediaDescriptionId}`);

  // Step 1: Authenticate with backend
  logger.info?.('[uploadFromMediaDescriptionId] Authenticating with backend...');
  const token = await authenticateBackend({
    baseUrl: backendBaseUrl,
    username: backendUsername,
    password: backendPassword
  });
  logger.info?.('[uploadFromMediaDescriptionId] Backend authentication successful');

  // Step 2: Fetch video file ID from media description
  logger.info?.(`[uploadFromMediaDescriptionId] Fetching video file ID from media description ${mediaDescriptionId}...`);
  const videoFileId = await getVideoFileIdFromMediaDescription(
    backendBaseUrl,
    mediaDescriptionId,
    token
  );
  logger.info?.(`[uploadFromMediaDescriptionId] Video file ID found: ${videoFileId}`);

  // Step 3: Call uploadFromVideoFileId with the fetched video file ID
  logger.info?.('[uploadFromMediaDescriptionId] Proceeding with video file-based upload...');
  const result = await uploadFromVideoFileId({
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
    logger
  });

  logger.info?.('[uploadFromMediaDescriptionId] Upload completed successfully');

  // Return result with additional context
  return {
    ...result,
    mediaDescriptionId,
    // videoFileId and assetId are already in result from uploadFromVideoFileId
  };
}

export default { uploadFromMediaDescriptionId };
