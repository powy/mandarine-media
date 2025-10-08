/**
 * Picture Upload INI Interface
 * Reads INI file and converts to JSON for core function
 */

import { pictureUploadCore } from './core.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';
import fs from 'fs-extra';

/**
 * Execute picture upload from INI configuration
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} options - Upload options
 * @param {string} options.picturePath - Path to picture file (required)
 * @param {Object} [options.metadata] - Custom metadata
 * @param {string} [options.metadata.fileName] - Custom file name
 * @param {string} [options.metadata.altText] - Alt text for accessibility
 * @param {boolean} [options.dryRun=false] - Dry run mode
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {boolean} [options.debug=false] - Debug logging
 * @returns {Promise<Object>} Upload result
 */
export async function pictureUploadFromIni(iniFilePath, options = {}) {
  try {
    // Validate INI file exists
    if (!await fs.pathExists(iniFilePath)) {
      throw new Error(`INI configuration file not found: ${iniFilePath}`);
    }

    // Validate required picture path
    if (!options.picturePath) {
      throw new Error('picturePath option is required when using INI interface');
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
      bucketName: standardConfig.s3?.pictures?.bucket,
      keyPrefix: standardConfig.s3?.pictures?.keyPrefix || 'pictures/',
    };

    // Validate S3 configuration
    if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName) {
      throw new Error('S3 configuration is incomplete in INI file. Required: s3.accessKeyId, s3.secretAccessKey, s3.pictures.bucket');
    }

    // Build API configuration from INI
    const apiConfig = {
      baseUrl: standardConfig.backend?.baseUrl,
      username: standardConfig.backend?.username,
      password: standardConfig.backend?.password,
    };

    // Validate API configuration
    if (!apiConfig.baseUrl || !apiConfig.username || !apiConfig.password) {
      throw new Error('Backend API configuration is incomplete in INI file. Required: backend.baseUrl, backend.username, backend.password');
    }

    // Build final configuration for core function
    const coreConfig = {
      picturePath: options.picturePath,
      s3: s3Config,
      api: apiConfig,

      // Custom metadata if provided
      ...(options.metadata && { metadata: options.metadata }),

      // CLI flags
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      debug: options.debug || false,

      // Preserve INI file path for reference
      _iniFilePath: iniFilePath,
    };

    // Execute core function
    return await pictureUploadCore(coreConfig);

  } catch (error) {
    throw new Error(`Picture Upload INI execution failed: ${error.message}`);
  }
}

/**
 * Execute picture upload from INI with picture file path
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} picturePath - Path to picture file
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Upload result
 */
export async function pictureUploadFromIniWithPath(iniFilePath, picturePath, options = {}) {
  return pictureUploadFromIni(iniFilePath, {
    ...options,
    picturePath,
  });
}

/**
 * Execute picture upload from INI with custom metadata
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} picturePath - Path to picture file
 * @param {Object} metadata - Custom metadata
 * @param {string} [metadata.fileName] - Custom file name
 * @param {string} [metadata.altText] - Alt text for accessibility
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Upload result
 */
export async function pictureUploadFromIniWithMetadata(iniFilePath, picturePath, metadata, options = {}) {
  return pictureUploadFromIni(iniFilePath, {
    ...options,
    picturePath,
    metadata,
  });
}