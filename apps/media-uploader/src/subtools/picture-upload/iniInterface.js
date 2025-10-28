/**
 * Picture Upload INI Interface
 * Reads INI file and converts to JSON for wrapper function
 */

import { uploadPicture } from './wrapper.js';
import { loadConfigFile } from './utils/fileUtils.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

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
      bucket: standardConfig.s3?.pictures?.bucket,
      keyPrefix: standardConfig.s3?.pictures?.keyPrefix || 'pictures/',
    };

    // Validate S3 configuration
    if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucket) {
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

    // Build CloudFront configuration from INI (with default)
    const cloudfrontConfig = {
      domain: standardConfig.cloudfront?.domain || 'www.kyool.eu'
    };

    // Build final configuration for wrapper function
    const config = {
      picturePath: options.picturePath,
      s3: s3Config,
      cloudfront: cloudfrontConfig,
      api: apiConfig,

      // Custom metadata if provided
      ...(options.metadata && { metadata: options.metadata })
    };

    // Create temp JSON config file
    const tempDir = os.tmpdir();
    const tempConfigPath = path.join(tempDir, `picture-upload-${Date.now()}.json`);

    try {
      await fs.writeJson(tempConfigPath, config, { spaces: 2 });

      // Call wrapper function with temp config file
      const result = await uploadPicture({
        config: tempConfigPath,
        verbose: options.verbose || false,
        dryRun: options.dryRun || false,
        logFile: options.logFile
      });

      return result;

    } finally {
      // Clean up temp config file
      try {
        if (await fs.pathExists(tempConfigPath)) {
          await fs.remove(tempConfigPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

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