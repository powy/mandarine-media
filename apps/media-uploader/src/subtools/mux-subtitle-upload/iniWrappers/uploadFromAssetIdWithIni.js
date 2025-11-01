/**
 * Upload from Asset ID with INI Configuration
 * Wrapper that loads credentials from INI file and calls core uploadFromAssetId
 */

import { uploadFromAssetId } from '../core/uploadFromAssetId.js';
import { readIniFile, iniToStandardConfig } from '../../../shared/utils/iniParser.js';

/**
 * Upload subtitle to Mux asset using INI configuration file
 *
 * @param {string} assetId - Mux asset ID
 * @param {string} subtitlePath - Full path to subtitle file
 * @param {string} language - BCP 47 language code (e.g., 'en', 'fr', 'ko')
 * @param {string} iniPath - Full path to INI configuration file
 * @param {Object} [options] - Optional override settings
 * @param {string} [options.subtitleName] - Display name for subtitle track
 * @param {boolean} [options.isDefault] - Mark as default subtitle track
 * @param {boolean} [options.closedCaptions] - Mark as closed captions
 * @param {string} [options.textType] - Text type ('subtitles' or 'captions')
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @param {boolean} [options.dryRun] - Validate without uploading
 * @param {number} [options.cleanupDelayMinutes] - S3 cleanup delay
 * @param {boolean} [options.skipCleanup] - Skip S3 cleanup
 * @param {boolean} [options.skipMonitoring] - Skip track status monitoring
 * @param {Object} [options.logger] - Custom logger
 *
 * @returns {Promise<Object>} Upload result (see core/uploadFromAssetId)
 *
 * @throws {Error} If INI file not found or invalid
 * @throws {Error} If required INI sections missing (mux, s3)
 * @throws {Error} If upload fails
 *
 * @example
 * const result = await uploadFromAssetIdWithIni(
 *   'abc123',
 *   '/path/to/subtitle_en.srt',
 *   'en',
 *   '/path/to/config.ini',
 *   { isDefault: true, verbose: true }
 * );
 */
export async function uploadFromAssetIdWithIni(assetId, subtitlePath, language, iniPath, options = {}) {
  const logger = options.logger || console;

  // Step 1: Read and parse INI file
  logger.info?.(`[uploadFromAssetIdWithIni] Reading INI configuration from ${iniPath}`);
  const iniConfig = await readIniFile(iniPath);
  const config = iniToStandardConfig(iniConfig);

  // Step 2: Validate required sections
  if (!config.mux?.tokenId || !config.mux?.tokenSecret) {
    throw new Error('INI file missing required Mux configuration ([mux] section with tokenId and tokenSecret)');
  }

  if (!config.s3?.accessKeyId || !config.s3?.secretAccessKey || !config.s3?.region) {
    throw new Error('INI file missing required S3 configuration ([s3] section with accessKeyId, secretAccessKey, region)');
  }

  const s3BucketName = config.s3.subtitles?.bucket || config.s3.bucket;
  if (!s3BucketName) {
    throw new Error('INI file missing S3 bucket configuration ([s3.subtitles] bucket or [s3] bucket)');
  }

  // Step 3: Build parameters from INI config + options
  const uploadParams = {
    assetId,
    subtitlePath,
    language,

    // From INI
    muxTokenId: config.mux.tokenId,
    muxTokenSecret: config.mux.tokenSecret,
    s3AccessKeyId: config.s3.accessKeyId,
    s3SecretAccessKey: config.s3.secretAccessKey,
    s3Region: config.s3.region,
    s3BucketName,

    // Optional from INI or options (options override INI)
    subtitleName: options.subtitleName,
    isDefault: options.isDefault ?? false,
    closedCaptions: options.closedCaptions ?? false,
    textType: options.textType ?? 'subtitles',
    passthrough: options.passthrough,

    // Upload options
    options: {
      cleanupDelayMinutes: options.cleanupDelayMinutes ?? 120,
      maxRetryAttempts: options.maxRetryAttempts ?? config.retryAttempts ?? 3,
      retryDelay: options.retryDelay ?? config.retryDelay ?? 5000,
      monitoringTimeout: options.monitoringTimeout ?? 60000,
      monitoringInterval: options.monitoringInterval ?? 5000,
      skipCleanup: options.skipCleanup ?? false,
      skipMonitoring: options.skipMonitoring ?? false,
      s3KeyPrefix: config.s3.subtitles?.keyPrefix || 'subtitles'
    },

    logger
  };

  // Step 4: Dry run check
  if (options.dryRun) {
    logger.info?.('[uploadFromAssetIdWithIni] DRY RUN - Configuration validated successfully');
    return {
      dryRun: true,
      success: true,
      message: 'Configuration is valid. No upload performed.',
      config: uploadParams
    };
  }

  // Step 5: Call core upload function
  logger.info?.('[uploadFromAssetIdWithIni] Calling core upload function...');
  const result = await uploadFromAssetId(uploadParams);

  logger.info?.('[uploadFromAssetIdWithIni] Upload completed successfully');
  return result;
}

export default { uploadFromAssetIdWithIni };
