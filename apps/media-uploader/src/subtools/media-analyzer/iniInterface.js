/**
 * Media Analyzer INI Interface
 * Reads INI file and converts to JSON for core function
 */

import { mediaAnalyzerCore, mediaAnalyzerCoreWithSave } from './core.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';
import fs from 'fs-extra';

/**
 * Execute media analyzer from INI configuration
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} options - Additional options
 * @param {string|Object} options.paths - Paths to analyze (required)
 * @param {string} [options.paths.videoPath] - Path to video folder
 * @param {string} [options.paths.subtitlePath] - Path to subtitle folder
 * @param {string} [options.paths.imagePath] - Path to image folder
 * @param {boolean} [options.saveToFile=false] - Whether to save results to file
 * @param {string} [options.outputFile] - Output file path (auto-generated if not provided)
 * @param {boolean} [options.exportForUpload=false] - Export format optimized for upload
 * @returns {Promise<Object>} Analysis result or result with file info
 */
export async function mediaAnalyzerFromIni(iniFilePath, options = {}) {
  try {
    // Validate INI file exists
    if (!await fs.pathExists(iniFilePath)) {
      throw new Error(`INI configuration file not found: ${iniFilePath}`);
    }

    // Read and parse INI file
    const iniConfig = await readIniFile(iniFilePath);

    // Convert to standard JSON format
    const standardConfig = iniToStandardConfig(iniConfig);

    // Validate that paths are provided in options
    if (!options.paths) {
      throw new Error('paths option is required when using INI interface');
    }

    // Build final configuration for core function
    const coreConfig = {
      ...standardConfig,
      paths: options.paths,
      outputFile: options.outputFile,
      exportForUpload: options.exportForUpload || false,
      readMetadata: options.readMetadata !== false,
      minScore: options.minScore || standardConfig.minScore || 60,
      verbose: options.verbose || standardConfig.verbose || false,
      debug: options.debug || standardConfig.debug || false,
      _iniFilePath: iniFilePath,
    };

    // Execute core function
    if (options.saveToFile) {
      return await mediaAnalyzerCoreWithSave(coreConfig);
    } else {
      const result = await mediaAnalyzerCore(coreConfig);
      return { result };
    }

  } catch (error) {
    throw new Error(`Media Analyzer INI execution failed: ${error.message}`);
  }
}

/**
 * Convenience function for single path analysis from INI
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} mediaPath - Path to analyze
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Analysis result
 */
export async function mediaAnalyzerFromIniSinglePath(iniFilePath, mediaPath, options = {}) {
  return mediaAnalyzerFromIni(iniFilePath, {
    ...options,
    paths: mediaPath,
  });
}

/**
 * Convenience function for multi-path analysis from INI
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} paths - Paths object
 * @param {string} [paths.videoPath] - Path to video folder
 * @param {string} [paths.subtitlePath] - Path to subtitle folder
 * @param {string} [paths.imagePath] - Path to image folder
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Analysis result
 */
export async function mediaAnalyzerFromIniMultiPath(iniFilePath, paths, options = {}) {
  return mediaAnalyzerFromIni(iniFilePath, {
    ...options,
    paths,
  });
}

/**
 * Execute media analyzer from INI and save to file
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string|Object} paths - Paths to analyze
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result with file paths
 */
export async function mediaAnalyzerFromIniAndSave(iniFilePath, paths, options = {}) {
  return mediaAnalyzerFromIni(iniFilePath, {
    ...options,
    paths,
    saveToFile: true,
  });
}