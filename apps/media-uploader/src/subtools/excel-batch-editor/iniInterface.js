/**
 * Excel Batch Editor INI Interface
 * Provides INI config file wrapper for batch Excel editing
 */

import fs from 'fs-extra';
import { batchUpdateExcel } from './wrapper.js';
import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';

/**
 * Batch edit Excel files from INI configuration
 * Updates a specific field in Excel files across all subfolders
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} folderPath - Parent folder containing subfolders with Excel files
 * @param {string} fieldName - Field name to update (e.g., "policy", "status")
 * @param {string} newValue - New value for the field
 * @param {Object} options - Additional options
 * @param {string} [options.pattern='0_desc'] - File pattern to match
 * @param {boolean} [options.dryRun=false] - Dry run mode (preview only)
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @returns {Promise<Object>} Batch edit result
 *
 * @example
 * // Update policy field in all subfolders
 * const result = await batchEditFromIni(
 *   './config.ini',
 *   '/path/to/season/folder',
 *   'policy',
 *   'public',
 *   { dryRun: true, verbose: true }
 * );
 *
 * @example
 * // Use folder placeholders
 * const result = await batchEditFromIni(
 *   './config.ini',
 *   '/path/to/season/folder',
 *   'title',
 *   '{{folder_name}} - Episode',
 *   { verbose: true }
 * );
 */
export async function batchEditFromIni(iniFilePath, folderPath, fieldName, newValue, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate folder exists
  if (!await fs.pathExists(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  // Validate field name and value are provided
  if (!fieldName || typeof fieldName !== 'string') {
    throw new Error('Field name is required and must be a string');
  }

  if (newValue === undefined || newValue === null) {
    throw new Error('Field value is required');
  }

  // Read and parse INI for general settings
  const iniConfig = await readIniFile(iniFilePath);
  const standardConfig = iniToStandardConfig(iniConfig);

  // Merge INI settings with options
  const mergedOptions = {
    verbose: options.verbose ?? standardConfig.verbose ?? false,
    dryRun: options.dryRun ?? false,
    pattern: options.pattern ?? '0_desc',
    ...options
  };

  // Call existing wrapper
  return await batchUpdateExcel({
    folder: folderPath,
    field: fieldName,
    value: String(newValue),
    ...mergedOptions
  });
}

export default {
  batchEditFromIni
};
