/**
 * Upload from Video File ID with INI Configuration
 * Wrapper that loads credentials from INI file and calls core uploadFromVideoFileId
 */

import { uploadFromVideoFileId } from '../core/uploadFromVideoFileId.js';
import { readIniFile, iniToStandardConfig } from '../../../shared/utils/iniParser.js';

/**
 * Upload subtitle using video file ID and INI configuration file
 *
 * @param {string} videoFileId - Video file UUID from backend
 * @param {string} subtitlePath - Full path to subtitle file
 * @param {string} language - BCP 47 language code
 * @param {string} iniPath - Full path to INI configuration file
 * @param {Object} [options] - Optional override settings (see uploadFromAssetIdWithIni)
 *
 * @returns {Promise<Object>} Upload result (see core/uploadFromVideoFileId)
 *
 * @throws {Error} If INI file not found or invalid
 * @throws {Error} If required INI sections missing (backend, mux, s3)
 * @throws {Error} If upload fails
 *
 * @example
 * const result = await uploadFromVideoFileIdWithIni(
 *   'uuid-video-file-id',
 *   '/path/to/subtitle_en.srt',
 *   'en',
 *   '/path/to/config.ini',
 *   { isDefault: true }
 * );
 */
export async function uploadFromVideoFileIdWithIni(videoFileId, subtitlePath, language, iniPath, options = {}) {
  const logger = options.logger || console;

  // Step 1: Read and parse INI file
  logger.info?.(`[uploadFromVideoFileIdWithIni] Reading INI configuration from ${iniPath}`);
  const iniConfig = await readIniFile(iniPath);
  const config = iniToStandardConfig(iniConfig);

  // Step 2: Validate required sections
  if (!config.backend?.baseUrl || !config.backend?.username || !config.backend?.password) {
    throw new Error('INI file missing required backend configuration ([backend] section with baseUrl, username, password)');
  }

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
    videoFileId,
    subtitlePath,
    language,

    // Backend from INI
    backendBaseUrl: config.backend.baseUrl,
    backendUsername: config.backend.username,
    backendPassword: config.backend.password,

    // Mux from INI
    muxTokenId: config.mux.tokenId,
    muxTokenSecret: config.mux.tokenSecret,

    // S3 from INI
    s3AccessKeyId: config.s3.accessKeyId,
    s3SecretAccessKey: config.s3.secretAccessKey,
    s3Region: config.s3.region,
    s3BucketName,

    // Optional
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
    logger.info?.('[uploadFromVideoFileIdWithIni] DRY RUN - Configuration validated successfully');
    return {
      dryRun: true,
      success: true,
      message: 'Configuration is valid. No upload performed.',
      config: uploadParams
    };
  }

  // Step 5: Call core upload function
  logger.info?.('[uploadFromVideoFileIdWithIni] Calling core upload function...');
  const result = await uploadFromVideoFileId(uploadParams);

  logger.info?.('[uploadFromVideoFileIdWithIni] Upload completed successfully');
  return result;
}

export default { uploadFromVideoFileIdWithIni };
