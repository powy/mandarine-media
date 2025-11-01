/**
 * Upload Subtitle from JSON Configuration
 * Routes to appropriate core function based on JSON content
 *
 * This is the main entry point used by the existing system
 * Provides backward compatibility with current upload media complet
 */

import { uploadFromAssetId } from './core/uploadFromAssetId.js';
import { uploadFromVideoFileId } from './core/uploadFromVideoFileId.js';
import { uploadFromMediaDescriptionId } from './core/uploadFromMediaDescriptionId.js';
import { loadConfigFile } from './utils/fileUtils.js';
import { createLogger } from './config/logger.js';

/**
 * Upload subtitle(s) from JSON configuration file
 *
 * @param {string} jsonPath - Path to JSON configuration file
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @param {boolean} [options.quiet] - Suppress console output
 * @param {boolean} [options.dryRun] - Validate without uploading
 * @param {string} [options.logFile] - Path to log file
 * @param {Object} [options.logger] - Custom logger
 *
 * @returns {Promise<Object>} Upload results
 * @returns {boolean} result.success - Overall success status
 * @returns {number} result.totalSubtitles - Total number of subtitles processed
 * @returns {number} result.successful - Number of successful uploads
 * @returns {number} result.failed - Number of failed uploads
 * @returns {Array} result.results - Array of individual upload results
 *
 * @throws {Error} If JSON file not found or invalid
 * @throws {Error} If required configuration missing
 *
 * @example JSON formats supported:
 * // Format 1: With mux_asset_id (direct)
 * {
 *   "mux_asset_id": "abc123",
 *   "subtitles": [
 *     { "language_code": "en", "file_path": "/path/to/en.srt", "name": "English", "is_default": true },
 *     { "language_code": "fr", "file_path": "/path/to/fr.srt", "name": "Français" }
 *   ],
 *   "auth": { "mux_token_id": "...", "mux_token_secret": "..." },
 *   "s3": { "access_key_id": "...", "secret_access_key": "...", "region": "...", "bucket_name": "..." }
 * }
 *
 * // Format 2: With video_file_id (via backend)
 * {
 *   "video_file_id": "uuid-video-file",
 *   "subtitles": [...],
 *   "backend": { "base_url": "...", "username": "...", "password": "..." },
 *   "auth": {...},
 *   "s3": {...}
 * }
 *
 * // Format 3: With media_description_id (via backend)
 * {
 *   "media_description_id": "uuid-media-desc",
 *   "subtitles": [...],
 *   "backend": {...},
 *   "auth": {...},
 *   "s3": {...}
 * }
 */
export async function uploadFromJson(jsonPath, options = {}) {
  const startTime = Date.now();
  const logger = options.logger || console;

  try {
    // Step 1: Load and parse JSON configuration
    logger.info?.(`[uploadFromJson] Loading configuration from ${jsonPath}`);
    const { config } = await loadConfigFile(jsonPath);

    // Step 2: Validate basic structure
    if (!config.subtitles || !Array.isArray(config.subtitles) || config.subtitles.length === 0) {
      throw new Error('Invalid JSON configuration: "subtitles" array is required and must contain at least one subtitle');
    }

    logger.info?.(`[uploadFromJson] Processing ${config.subtitles.length} subtitle(s)`);

    // Step 3: Determine upload strategy based on available IDs
    const hasAssetId = !!config.mux_asset_id;
    const hasVideoFileId = !!config.video_file_id;
    const hasMediaDescId = !!config.media_description_id;

    let uploadStrategy;
    if (hasAssetId) {
      uploadStrategy = 'asset';
      logger.info?.('[uploadFromJson] Using direct asset ID strategy');
    } else if (hasVideoFileId) {
      uploadStrategy = 'videoFile';
      logger.info?.('[uploadFromJson] Using video file ID strategy (backend fetch required)');
    } else if (hasMediaDescId) {
      uploadStrategy = 'mediaDescription';
      logger.info?.('[uploadFromJson] Using media description ID strategy (backend fetch required)');
    } else {
      throw new Error(
        'Invalid JSON configuration: Must provide one of: mux_asset_id, video_file_id, or media_description_id'
      );
    }

    // Step 4: Validate required credentials based on strategy
    validateCredentials(config, uploadStrategy);

    // Step 5: Dry run check
    if (options.dryRun) {
      logger.info?.('[uploadFromJson] DRY RUN - Configuration validated successfully');
      return {
        dryRun: true,
        success: true,
        strategy: uploadStrategy,
        totalSubtitles: config.subtitles.length,
        message: 'Configuration is valid. No upload performed.'
      };
    }

    // Step 6: Process each subtitle
    const results = [];
    const errors = [];

    for (let i = 0; i < config.subtitles.length; i++) {
      const subtitle = config.subtitles[i];

      try {
        logger.info?.(`[uploadFromJson] Processing subtitle ${i + 1}/${config.subtitles.length}: ${subtitle.language_code}`);

        // Build common parameters
        const commonParams = {
          subtitlePath: subtitle.file_path,
          language: subtitle.language_code,
          subtitleName: subtitle.name,
          isDefault: subtitle.is_default ?? false,
          closedCaptions: subtitle.closed_captions ?? false,
          textType: subtitle.text_type ?? 'subtitles',
          passthrough: subtitle.passthrough,
          options: config.options || {},
          logger
        };

        // Call appropriate core function based on strategy
        let result;
        if (uploadStrategy === 'asset') {
          result = await uploadFromAssetId({
            ...commonParams,
            assetId: config.mux_asset_id,
            muxTokenId: config.auth.mux_token_id,
            muxTokenSecret: config.auth.mux_token_secret,
            s3AccessKeyId: config.s3.access_key_id,
            s3SecretAccessKey: config.s3.secret_access_key,
            s3Region: config.s3.region,
            s3BucketName: config.s3.bucket_name
          });
        } else if (uploadStrategy === 'videoFile') {
          result = await uploadFromVideoFileId({
            ...commonParams,
            videoFileId: config.video_file_id,
            backendBaseUrl: config.backend.base_url,
            backendUsername: config.backend.username,
            backendPassword: config.backend.password,
            muxTokenId: config.auth.mux_token_id,
            muxTokenSecret: config.auth.mux_token_secret,
            s3AccessKeyId: config.s3.access_key_id,
            s3SecretAccessKey: config.s3.secret_access_key,
            s3Region: config.s3.region,
            s3BucketName: config.s3.bucket_name
          });
        } else if (uploadStrategy === 'mediaDescription') {
          result = await uploadFromMediaDescriptionId({
            ...commonParams,
            mediaDescriptionId: config.media_description_id,
            backendBaseUrl: config.backend.base_url,
            backendUsername: config.backend.username,
            backendPassword: config.backend.password,
            muxTokenId: config.auth.mux_token_id,
            muxTokenSecret: config.auth.mux_token_secret,
            s3AccessKeyId: config.s3.access_key_id,
            s3SecretAccessKey: config.s3.secret_access_key,
            s3Region: config.s3.region,
            s3BucketName: config.s3.bucket_name
          });
        }

        results.push({
          success: true,
          subtitle,
          index: i,
          ...result
        });

        logger.info?.(`[uploadFromJson] Subtitle ${i + 1} uploaded successfully`);

      } catch (error) {
        const errorResult = {
          success: false,
          subtitle,
          index: i,
          error: error.message,
          errorStack: error.stack
        };
        results.push(errorResult);
        errors.push(`Subtitle ${i + 1} (${subtitle.language_code}): ${error.message}`);

        logger.error?.(`[uploadFromJson] Subtitle ${i + 1} failed: ${error.message}`);
      }
    }

    // Step 7: Compile summary
    const totalTimeMs = Date.now() - startTime;
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const summary = {
      success: failed.length === 0,
      strategy: uploadStrategy,
      totalSubtitles: results.length,
      successful: successful.length,
      failed: failed.length,
      totalTimeMs,
      results,
      errors: failed.length > 0 ? errors : undefined
    };

    if (summary.success) {
      logger.info?.(`[uploadFromJson] All ${successful.length} subtitle(s) uploaded successfully in ${totalTimeMs}ms`);
    } else {
      logger.warn?.(`[uploadFromJson] Completed with ${failed.length} failure(s) out of ${results.length} subtitle(s)`);
    }

    return summary;

  } catch (error) {
    const totalTimeMs = Date.now() - startTime;
    logger.error?.(`[uploadFromJson] Fatal error: ${error.message}`);

    throw {
      success: false,
      error: error.message,
      errorStack: error.stack,
      totalTimeMs
    };
  }
}

/**
 * Validate required credentials based on upload strategy
 */
function validateCredentials(config, strategy) {
  // Common validations
  if (!config.auth?.mux_token_id || !config.auth?.mux_token_secret) {
    throw new Error('Invalid JSON configuration: "auth" section must contain mux_token_id and mux_token_secret');
  }

  if (!config.s3?.access_key_id || !config.s3?.secret_access_key || !config.s3?.region || !config.s3?.bucket_name) {
    throw new Error('Invalid JSON configuration: "s3" section must contain access_key_id, secret_access_key, region, and bucket_name');
  }

  // Strategy-specific validations
  if (strategy === 'videoFile' || strategy === 'mediaDescription') {
    if (!config.backend?.base_url || !config.backend?.username || !config.backend?.password) {
      throw new Error('Invalid JSON configuration: "backend" section required with base_url, username, and password for this strategy');
    }
  }

  // Validate subtitles
  for (let i = 0; i < config.subtitles.length; i++) {
    const sub = config.subtitles[i];
    if (!sub.file_path) {
      throw new Error(`Invalid JSON configuration: subtitle ${i} missing required "file_path"`);
    }
    if (!sub.language_code) {
      throw new Error(`Invalid JSON configuration: subtitle ${i} missing required "language_code"`);
    }
  }
}

export default { uploadFromJson };
