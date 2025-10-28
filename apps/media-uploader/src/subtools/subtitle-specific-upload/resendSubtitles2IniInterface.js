/**
 * Resend Subtitles INI Interface V2
 * Simple wrapper that takes only INI path and folder path
 * Parses INI configuration and calls the batch resend function
 */

import fs from 'fs-extra';
import { resendSubtitles2 } from './resendSubtitles2.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';

/**
 * Resend subtitles from INI configuration file
 * This is the simplest interface - just provide INI path and folder path
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} folderPath - Folder path containing Excel file and subtitle files
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {boolean} [options.dryRun=false] - Dry run mode
 * @returns {Promise<Object>} Resend results
 *
 * @example
 * // Resend all subtitles from Excel in folder
 * const result = await resendSubtitles2FromIni(
 *   './config.ini',
 *   '/path/to/folder',
 *   { verbose: true }
 * );
 *
 * @example
 * // Dry run to preview
 * const result = await resendSubtitles2FromIni(
 *   './config.ini',
 *   '/path/to/folder',
 *   { dryRun: true, verbose: true }
 * );
 */
export async function resendSubtitles2FromIni(iniFilePath, folderPath, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate folder exists
  if (!await fs.pathExists(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
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

  // Build Backend API configuration from INI
  const backendConfig = {
    baseUrl: standardConfig.backend?.baseUrl,
    username: standardConfig.backend?.username,
    password: standardConfig.backend?.password
  };

  // Validate Backend configuration
  if (!backendConfig.baseUrl || !backendConfig.username || !backendConfig.password) {
    throw new Error('Backend API configuration is incomplete in INI file. Required: backend.baseUrl, backend.username, backend.password');
  }

  // Build final configuration for resend function
  const resendConfig = {
    folderPath,
    mux: muxConfig,
    s3: s3Config,
    backend: backendConfig,

    // Upload options
    options: {
      retry: options.retry ?? 3
    },

    // Execution flags
    dryRun: options.dryRun ?? false,
    verbose: options.verbose ?? standardConfig.verbose ?? false,

    // Preserve INI file path for reference
    _iniFilePath: iniFilePath
  };

  // Execute resend function
  return await resendSubtitles2(resendConfig);
}

export default {
  resendSubtitles2FromIni
};
