/**
 * Batch Resend Subtitles INI Interface
 * INI config file wrapper for batch subtitle resending (originally for the Tauri app; currently not referenced elsewhere)
 */

import fs from 'fs-extra';
import { batchResendSubtitles } from './batchResendSubtitles.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';

/**
 * Batch resend subtitles from INI configuration
 * Processes multiple subfolders, each with its own Excel file
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} parentFolderPath - Parent folder path containing subfolders with Excel files
 * @param {Object} options - Additional options
 * @param {number} [options.maxConcurrent=1] - Max concurrent folders to process
 * @param {boolean} [options.verbose] - Verbose logging
 * @param {boolean} [options.dryRun] - Dry run mode
 * @returns {Promise<Object>} Batch resend results
 *
 * @example
 * // Batch resend all subtitles from subfolders
 * const result = await batchResendSubtitlesFromIni(
 *   './config.ini',
 *   '/path/to/parent/folder',
 *   { verbose: true }
 * );
 *
 * @example
 * // Dry run to preview
 * const result = await batchResendSubtitlesFromIni(
 *   './config.ini',
 *   '/path/to/parent/folder',
 *   { dryRun: true, verbose: true }
 * );
 */
export async function batchResendSubtitlesFromIni(iniFilePath, parentFolderPath, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate parent folder exists
  if (!await fs.pathExists(parentFolderPath)) {
    throw new Error(`Parent folder not found: ${parentFolderPath}`);
  }

  // Read and parse INI file
  const iniConfig = await readIniFile(iniFilePath);

  // Convert to standard JSON format
  const standardConfig = iniToStandardConfig(iniConfig);

  // Build Mux configuration from INI
  const muxConfig = {
    tokenId: standardConfig.mux?.tokenId,
    tokenSecret: standardConfig.mux?.tokenSecret
  };

  // Validate Mux configuration
  if (!muxConfig.tokenId || !muxConfig.tokenSecret) {
    throw new Error('Mux configuration is incomplete in INI file. Required: mux.tokenId, mux.tokenSecret');
  }

  // Build S3 configuration from INI
  const s3Config = {
    accessKeyId: standardConfig.s3?.accessKeyId,
    secretAccessKey: standardConfig.s3?.secretAccessKey,
    region: standardConfig.s3?.region || 'us-east-1',
    bucket: standardConfig.s3?.subtitles?.bucket,
    keyPrefix: standardConfig.s3?.subtitles?.keyPrefix || 'subtitles/'
  };

  // Validate S3 configuration
  if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucket) {
    throw new Error('S3 configuration is incomplete in INI file. Required: s3.accessKeyId, s3.secretAccessKey, s3.subtitles.bucket');
  }

  // Build API configuration from INI
  const backendConfig = {
    baseUrl: standardConfig.backend?.baseUrl,
    username: standardConfig.backend?.username,
    password: standardConfig.backend?.password
  };

  // Validate API configuration
  if (!backendConfig.baseUrl || !backendConfig.username || !backendConfig.password) {
    throw new Error('Backend API configuration is incomplete in INI file. Required: backend.baseUrl, backend.username, backend.password');
  }

  // Build final configuration for batch resend function
  const batchConfig = {
    parentFolderPath,
    mux: muxConfig,
    s3: s3Config,
    backend: backendConfig,

    // Upload options
    options: {
      retry: options.retry ?? 3
    },

    // Processing options
    maxConcurrent: options.maxConcurrent ?? 1,

    // Execution flags
    dryRun: options.dryRun ?? false,
    verbose: options.verbose ?? standardConfig.verbose ?? false,

    // Preserve INI file path for reference
    _iniFilePath: iniFilePath
  };

  // Execute batch resend function
  return await batchResendSubtitles(batchConfig);
}

export default {
  batchResendSubtitlesFromIni
};
