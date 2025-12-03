/**
 * INI Interface for Media Diagnostic Tool
 * Wrapper functions that read INI configuration and delegate to core functions
 */

import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';
import {
  verifyMediaDescriptionDirect,
  verifySeasonDirect,
  verifyBatchNonReady
} from './core.js';

/**
 * Function 2: Verify single MediaDescription from INI config
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} mediaDescriptionId - MediaDescription UUID
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.verbose] - Override verbose setting from INI
 * @param {number} [options.timeout] - Override timeout setting
 * @returns {Promise<Object>} { id, diagnostics, is_ready, errors }
 * @throws {Error} If INI file cannot be read or validation fails
 */
export async function verifyMediaDescriptionFromIni(iniFilePath, mediaDescriptionId, options = {}) {
  // Read and parse INI file
  const iniConfig = await readIniFile(iniFilePath);
  const standardConfig = iniToStandardConfig(iniConfig);

  // Validate backend configuration
  if (!standardConfig.backend?.baseUrl) {
    throw new Error('backend.baseUrl not found in INI configuration');
  }
  if (!standardConfig.backend?.username) {
    throw new Error('backend.username not found in INI configuration');
  }
  if (!standardConfig.backend?.password) {
    throw new Error('backend.password not found in INI configuration');
  }

  // Call core function with extracted credentials
  return verifyMediaDescriptionDirect({
    baseUrl: standardConfig.backend.baseUrl,
    username: standardConfig.backend.username,
    password: standardConfig.backend.password,
    mediaDescriptionId,
    verbose: options.verbose !== undefined ? options.verbose : standardConfig.verbose,
    timeout: options.timeout
  });
}

/**
 * Function 4: Verify season from INI config
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} seasonId - Season UUID
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.verbose] - Override verbose setting from INI
 * @param {boolean} [options.continueOnError] - Continue on individual episode errors
 * @param {number} [options.timeout] - Override timeout setting
 * @returns {Promise<Object>} { seasonId, generalResult, episodeResults, summary }
 * @throws {Error} If INI file cannot be read or validation fails
 */
export async function verifySeasonFromIni(iniFilePath, seasonId, options = {}) {
  // Read and parse INI file
  const iniConfig = await readIniFile(iniFilePath);
  const standardConfig = iniToStandardConfig(iniConfig);

  // Validate backend configuration
  if (!standardConfig.backend?.baseUrl) {
    throw new Error('backend.baseUrl not found in INI configuration');
  }
  if (!standardConfig.backend?.username) {
    throw new Error('backend.username not found in INI configuration');
  }
  if (!standardConfig.backend?.password) {
    throw new Error('backend.password not found in INI configuration');
  }

  // Call core function with extracted credentials
  return verifySeasonDirect({
    baseUrl: standardConfig.backend.baseUrl,
    username: standardConfig.backend.username,
    password: standardConfig.backend.password,
    seasonId,
    verbose: options.verbose !== undefined ? options.verbose : standardConfig.verbose,
    continueOnError: options.continueOnError,
    timeout: options.timeout
  });
}

/**
 * Batch verify all non-ready MediaDescriptions from INI config
 * (Function 5 with INI support - bonus function not in original requirements)
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.verbose] - Override verbose setting from INI
 * @param {boolean} [options.continueOnError] - Continue on individual errors
 * @param {number} [options.limit] - Max items to process
 * @param {number} [options.timeout] - Override timeout setting
 * @returns {Promise<Object>} { nonReadyResults, nonReadyPendingResults, summary }
 * @throws {Error} If INI file cannot be read or validation fails
 */
export async function verifyBatchNonReadyFromIni(iniFilePath, options = {}) {
  // Read and parse INI file
  const iniConfig = await readIniFile(iniFilePath);
  const standardConfig = iniToStandardConfig(iniConfig);

  // Validate backend configuration
  if (!standardConfig.backend?.baseUrl) {
    throw new Error('backend.baseUrl not found in INI configuration');
  }
  if (!standardConfig.backend?.username) {
    throw new Error('backend.username not found in INI configuration');
  }
  if (!standardConfig.backend?.password) {
    throw new Error('backend.password not found in INI configuration');
  }

  // Call core function with extracted credentials
  return verifyBatchNonReady({
    baseUrl: standardConfig.backend.baseUrl,
    username: standardConfig.backend.username,
    password: standardConfig.backend.password,
    verbose: options.verbose !== undefined ? options.verbose : standardConfig.verbose,
    continueOnError: options.continueOnError,
    limit: options.limit,
    timeout: options.timeout
  });
}

export default {
  verifyMediaDescriptionFromIni,
  verifySeasonFromIni,
  verifyBatchNonReadyFromIni
};
