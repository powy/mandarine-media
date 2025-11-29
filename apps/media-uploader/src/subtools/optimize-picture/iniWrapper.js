/**
 * INI-based wrapper for optimize-picture subtool
 * Loads credentials from INI file and calls the core functions
 */

import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';
import { optimizeMediaDescriptionPictures, optimizePicture } from './wrapper.js';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

/**
 * Optimize all pictures of a media description using INI config
 * @param {string} mediaDescriptionId - UUID of the media description
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} options - Additional options
 * @param {boolean} [options.verbose] - Verbose output
 * @param {boolean} [options.dryRun] - Dry run mode
 * @param {Object} [options.logger] - Logger object
 * @returns {Promise<Object>} - Optimization results
 */
export async function optimizeMediaDescriptionPicturesWithIni(mediaDescriptionId, iniFilePath, options = {}) {
  const { verbose = false, dryRun = false, logger } = options;

  const log = (msg) => {
    if (logger) logger.info(msg);
    else if (verbose) console.log(msg);
  };

  try {
    log(`Loading INI configuration from: ${iniFilePath}`);

    // Read and parse INI file
    const iniConfig = await readIniFile(iniFilePath);
    const standardConfig = iniToStandardConfig(iniConfig);

    // Build JSON config for optimize-picture
    const jsonConfig = buildOptimizeConfig(standardConfig, iniConfig);

    // Add mediaDescriptionId to config
    jsonConfig.mediaDescriptionId = mediaDescriptionId;

    // Create temporary config file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'optimize-picture-'));
    const tempConfigPath = path.join(tempDir, 'config.json');
    await fs.writeJson(tempConfigPath, jsonConfig);

    log('Configuration built successfully');
    log(`Media Description ID: ${mediaDescriptionId}`);

    try {
      // Call the core function
      const result = await optimizeMediaDescriptionPictures({
        config: tempConfigPath,
        verbose,
        dryRun
      });

      return result;
    } finally {
      // Cleanup temp config
      try {
        await fs.remove(tempDir);
      } catch (e) {
        // Best effort cleanup
      }
    }

  } catch (error) {
    const errorMsg = `Failed to optimize media description pictures: ${error.message}`;
    if (logger) logger.error(errorMsg);
    else console.error(errorMsg);
    throw error;
  }
}

/**
 * Optimize a single picture using INI config
 * @param {string} pictureId - UUID of the picture
 * @param {string} resolution - Resolution format (e.g., '1920x1080')
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Optimization result
 */
export async function optimizePictureWithIni(pictureId, resolution, iniFilePath, options = {}) {
  const { verbose = false, dryRun = false, logger } = options;

  const log = (msg) => {
    if (logger) logger.info(msg);
    else if (verbose) console.log(msg);
  };

  try {
    log(`Loading INI configuration from: ${iniFilePath}`);

    // Read and parse INI file
    const iniConfig = await readIniFile(iniFilePath);
    const standardConfig = iniToStandardConfig(iniConfig);

    // Build JSON config for optimize-picture
    const jsonConfig = buildOptimizeConfig(standardConfig, iniConfig);

    // Add picture-specific params
    jsonConfig.pictureId = pictureId;
    jsonConfig.resolution = resolution;

    // Create temporary config file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'optimize-picture-'));
    const tempConfigPath = path.join(tempDir, 'config.json');
    await fs.writeJson(tempConfigPath, jsonConfig);

    log('Configuration built successfully');
    log(`Picture ID: ${pictureId}`);
    log(`Resolution: ${resolution}`);

    try {
      // Call the core function
      const result = await optimizePicture({
        config: tempConfigPath,
        verbose,
        dryRun
      });

      return result;
    } finally {
      // Cleanup temp config
      try {
        await fs.remove(tempDir);
      } catch (e) {
        // Best effort cleanup
      }
    }

  } catch (error) {
    const errorMsg = `Failed to optimize picture: ${error.message}`;
    if (logger) logger.error(errorMsg);
    else console.error(errorMsg);
    throw error;
  }
}

/**
 * Build optimize-picture config from INI standard config
 * @param {Object} standardConfig - Parsed standard config from iniToStandardConfig
 * @param {Object} iniConfig - Raw parsed INI config (for accessing s3.pictures)
 * @returns {Object} - Config object for optimize-picture
 */
function buildOptimizeConfig(standardConfig, iniConfig) {
  // Get CloudFront domain from various possible locations
  const cloudfrontDomain =
    iniConfig.cloudfront?.domain ||
    iniConfig['s3.pictures']?.cloudfrontDomain ||
    standardConfig.cloudfront?.domain ||
    'www.kyool.eu';

  return {
    s3: {
      accessKeyId: standardConfig.s3?.accessKeyId,
      secretAccessKey: standardConfig.s3?.secretAccessKey,
      region: standardConfig.s3?.region || 'eu-west-3',
      bucket: standardConfig.s3?.pictures?.bucket || iniConfig['s3.pictures']?.bucket,
      keyPrefix: standardConfig.s3?.pictures?.keyPrefix || iniConfig['s3.pictures']?.keyPrefix || 'images/visuals/'
    },
    cloudfront: {
      domain: cloudfrontDomain
    },
    api: {
      baseUrl: standardConfig.backend?.baseUrl,
      username: standardConfig.backend?.username,
      password: standardConfig.backend?.password
    }
  };
}

export default {
  optimizeMediaDescriptionPicturesWithIni,
  optimizePictureWithIni
};
