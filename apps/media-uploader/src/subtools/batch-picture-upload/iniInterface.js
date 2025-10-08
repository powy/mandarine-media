/**
 * Batch Picture Upload INI Interface
 * INI config file wrapper for batch picture upload
 */

import fs from 'fs-extra';
import { batchPictureUploadCore } from './core.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';

/**
 * Batch picture upload from INI configuration
 * Uploads a picture once, then associates it to all subfolder media descriptions
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} picturePath - Path to picture file
 * @param {string} parentFolderPath - Parent folder containing subfolders
 * @param {Object} options - Additional options
 * @param {string} [options.pattern='0_desc'] - Excel file pattern to match
 * @param {boolean} [options.continueOnError=true] - Continue on association errors
 * @param {boolean} [options.verbose] - Verbose logging
 * @param {boolean} [options.dryRun] - Dry run mode
 * @returns {Promise<Object>} Upload result
 *
 * @example
 * // Upload picture and associate to all episodes in a season folder
 * const result = await batchPictureUploadFromIni(
 *   './config.ini',
 *   '/path/to/poster.jpg',
 *   '/path/to/season/folder',
 *   { verbose: true }
 * );
 *
 * @example
 * // Dry run to preview what would be uploaded
 * const result = await batchPictureUploadFromIni(
 *   './config.ini',
 *   '/path/to/poster.jpg',
 *   '/path/to/season/folder',
 *   { dryRun: true, verbose: true }
 * );
 */
export async function batchPictureUploadFromIni(iniFilePath, picturePath, parentFolderPath, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate picture file exists
  if (!await fs.pathExists(picturePath)) {
    throw new Error(`Picture file not found: ${picturePath}`);
  }

  // Validate parent folder exists
  if (!await fs.pathExists(parentFolderPath)) {
    throw new Error(`Parent folder not found: ${parentFolderPath}`);
  }

  // Read and parse INI file
  const iniConfig = await readIniFile(iniFilePath);

  // Convert to standard JSON format
  const standardConfig = iniToStandardConfig(iniConfig);

  // Build S3 configuration from INI
  const s3Config = {
    accessKeyId: standardConfig.s3?.accessKeyId,
    secretAccessKey: standardConfig.s3?.secretAccessKey,
    region: standardConfig.s3?.region || 'us-east-1',
    bucket: standardConfig.s3?.pictures?.bucket,
    keyPrefix: standardConfig.s3?.pictures?.keyPrefix || 'pictures/'
  };

  // Validate S3 configuration
  if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucket) {
    throw new Error('S3 configuration is incomplete in INI file. Required: s3.accessKeyId, s3.secretAccessKey, s3.pictures.bucket');
  }

  // Build CloudFront configuration (required for picture-upload subtool)
  // Note: CloudFront domain should be in [cloudfront] section
  const cloudfrontConfig = {
    domain: iniConfig.cloudfront?.domain || standardConfig.cloudfront?.domain
  };

  if (!cloudfrontConfig.domain) {
    throw new Error('CloudFront domain is required but not found in INI file. Add [cloudfront] section with domain=your-cloudfront-domain.cloudfront.net');
  }

  // Build API configuration from INI
  const apiConfig = {
    baseUrl: standardConfig.backend?.baseUrl,
    username: standardConfig.backend?.username,
    password: standardConfig.backend?.password
  };

  // Validate API configuration
  if (!apiConfig.baseUrl || !apiConfig.username || !apiConfig.password) {
    throw new Error('Backend API configuration is incomplete in INI file. Required: backend.baseUrl, backend.username, backend.password');
  }

  // Build final configuration for core function
  const coreConfig = {
    picturePath,
    parentFolderPath,
    s3: s3Config,
    cloudfront: cloudfrontConfig,
    api: apiConfig,

    // Upload options
    options: {
      pattern: options.pattern ?? '0_desc',
      continueOnError: options.continueOnError ?? true
    },

    // Custom metadata if provided
    ...(options.metadata && { metadata: options.metadata }),

    // Execution flags
    dryRun: options.dryRun ?? false,
    verbose: options.verbose ?? standardConfig.verbose ?? false,

    // Preserve INI file path for reference
    _iniFilePath: iniFilePath
  };

  // Execute core function
  return await batchPictureUploadCore(coreConfig);
}

export default {
  batchPictureUploadFromIni
};
