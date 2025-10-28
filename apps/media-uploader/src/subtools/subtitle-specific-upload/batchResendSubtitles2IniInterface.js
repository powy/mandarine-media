/**
 * Batch Resend Subtitles INI Interface V2
 * Process multiple folders from INI configuration
 */

import fs from 'fs-extra';
import { batchResendSubtitles2 } from './batchResendSubtitles2.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';

/**
 * Batch resend subtitles from INI configuration
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} parentFolder - Parent folder containing subfolders
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {boolean} [options.dryRun=false] - Dry run mode
 * @returns {Promise<Object>} Batch processing results
 *
 * @example
 * // Resend all subtitles in all subfolders
 * const result = await batchResendSubtitles2FromIni(
 *   './config.ini',
 *   '/path/to/parent/folder',
 *   { verbose: true }
 * );
 */
export async function batchResendSubtitles2FromIni(iniFilePath, parentFolder, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate parent folder exists
  if (!await fs.pathExists(parentFolder)) {
    throw new Error(`Parent folder not found: ${parentFolder}`);
  }

  // Read and parse INI file
  const iniConfig = await readIniFile(iniFilePath);

  // Convert to standard JSON format
  const standardConfig = iniToStandardConfig(iniConfig);

  // Build Mux configuration
  const muxConfig = {
    tokenId: standardConfig.mux?.tokenId,
    tokenSecret: standardConfig.mux?.tokenSecret
  };

  if (!muxConfig.tokenId || !muxConfig.tokenSecret) {
    throw new Error('Mux configuration is incomplete in INI file');
  }

  // Build S3 configuration
  const s3Config = {
    accessKeyId: standardConfig.s3?.accessKeyId,
    secretAccessKey: standardConfig.s3?.secretAccessKey,
    region: standardConfig.s3?.region || 'us-east-1',
    bucket: standardConfig.s3?.subtitles?.bucket,
    keyPrefix: standardConfig.s3?.subtitles?.keyPrefix || 'subtitles/'
  };

  if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucket) {
    throw new Error('S3 configuration is incomplete in INI file');
  }

  // Build Backend configuration
  const backendConfig = {
    baseUrl: standardConfig.backend?.baseUrl,
    username: standardConfig.backend?.username,
    password: standardConfig.backend?.password
  };

  if (!backendConfig.baseUrl || !backendConfig.username || !backendConfig.password) {
    throw new Error('Backend API configuration is incomplete in INI file');
  }

  // Build batch configuration
  const batchConfig = {
    parentFolder,
    mux: muxConfig,
    s3: s3Config,
    backend: backendConfig,
    options: {
      retry: options.retry ?? 3
    },
    dryRun: options.dryRun ?? false,
    verbose: options.verbose ?? standardConfig.verbose ?? false,
    _iniFilePath: iniFilePath
  };

  // Execute batch processing
  return await batchResendSubtitles2(batchConfig);
}

export default {
  batchResendSubtitles2FromIni
};
