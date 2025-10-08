/**
 * Subtitle-Specific Upload INI Interface
 * INI config file wrapper for subtitle-specific upload
 */

import fs from 'fs-extra';
import { subtitleSpecificUploadCore } from './core.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';

/**
 * Subtitle-specific upload from INI configuration
 * Uploads a single subtitle file for a specific media description
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} subtitlePath - Path to subtitle file
 * @param {string} folderPath - Folder path for Excel lookup (to find media description ID)
 * @param {string} [language=null] - Language code (BCP 47) - auto-detected if not provided
 * @param {Object} options - Additional options
 * @param {boolean} [options.autoDetectLanguage=true] - Auto-detect language from filename
 * @param {boolean} [options.closedCaptions=false] - Mark as closed captions
 * @param {string} [options.name] - Custom subtitle track name
 * @param {number} [options.retry=3] - Number of retry attempts
 * @param {boolean} [options.verbose] - Verbose logging
 * @param {boolean} [options.dryRun] - Dry run mode
 * @returns {Promise<Object>} Upload result
 *
 * @example
 * // Upload subtitle with auto-detected language
 * const result = await uploadSubtitleSpecificFromIni(
 *   './config.ini',
 *   '/path/to/movie_en.srt',
 *   '/path/to/movie/folder',
 *   null,  // auto-detect language
 *   { verbose: true }
 * );
 *
 * @example
 * // Upload subtitle with explicit language
 * const result = await uploadSubtitleSpecificFromIni(
 *   './config.ini',
 *   '/path/to/subtitle.srt',
 *   '/path/to/movie/folder',
 *   'fr',  // French
 *   { verbose: true, closedCaptions: true }
 * );
 *
 * @example
 * // Dry run to preview
 * const result = await uploadSubtitleSpecificFromIni(
 *   './config.ini',
 *   '/path/to/movie_ko.srt',
 *   '/path/to/movie/folder',
 *   null,
 *   { dryRun: true, verbose: true }
 * );
 */
export async function uploadSubtitleSpecificFromIni(iniFilePath, subtitlePath, folderPath, language = null, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate subtitle file exists
  if (!await fs.pathExists(subtitlePath)) {
    throw new Error(`Subtitle file not found: ${subtitlePath}`);
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

  // Build final configuration for core function
  const coreConfig = {
    subtitlePath,
    language: language || undefined,  // Let auto-detection work if null
    folderPath,  // For media description ID lookup
    // Don't set mediaDescriptionId - let it be looked up from Excel
    mux: muxConfig,
    s3: s3Config,
    backend: backendConfig,

    // Upload options
    options: {
      autoDetectLanguage: options.autoDetectLanguage ?? true,
      autoLookupMediaId: true,  // Always lookup from Excel for INI interface
      retry: options.retry ?? 3,
      closedCaptions: options.closedCaptions ?? false,
      name: options.name || undefined
    },

    // Execution flags
    dryRun: options.dryRun ?? false,
    verbose: options.verbose ?? standardConfig.verbose ?? false,

    // Preserve INI file path for reference
    _iniFilePath: iniFilePath
  };

  // Execute core function
  return await subtitleSpecificUploadCore(coreConfig);
}

export default {
  uploadSubtitleSpecificFromIni
};
