/**
 * Propagate Season Data INI Interface
 * Provides INI config file wrapper for season data propagation
 */

import fs from 'fs-extra';
import { propagateSeasonData } from './wrapper.js';

/**
 * Propagate season data from INI configuration
 * Copies missing data from a TV season to all its episodes
 *
 * This propagates:
 * • Images: All format images (1920x1080, 1920x720, 1080x1080, 810x1080, 1080x1920)
 * • Metadata: Summary, synopsis, production year, rights holder, copyright
 * • Categories: Media categories, hashtags, audience categories, themes
 * • People: Directors, producers, authors, actors
 * • Geography: Origin countries, available countries, languages
 * • Plans: Eligible subscription plans
 *
 * Only empty fields in episodes are filled - existing data is preserved.
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} seasonId - Season media description ID
 * @param {Object} options - Additional options
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {boolean} [options.dryRun=false] - Dry run mode (preview only, no changes)
 * @returns {Promise<Object>} Propagation result
 *
 * @example
 * // Dry run to preview changes
 * const result = await propagateSeasonDataFromIni(
 *   './config.ini',
 *   'season-12345',
 *   { dryRun: true, verbose: true }
 * );
 *
 * @example
 * // Actually propagate the data
 * const result = await propagateSeasonDataFromIni(
 *   './config.ini',
 *   'season-12345',
 *   { verbose: true }
 * );
 */
export async function propagateSeasonDataFromIni(iniFilePath, seasonId, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate season ID is provided
  if (!seasonId || typeof seasonId !== 'string') {
    throw new Error('Season ID is required and must be a string');
  }

  // Call existing wrapper - it already handles INI files via loadJsonFile()
  // The wrapper's loadJsonFile() detects .ini extension and converts to JSON
  return await propagateSeasonData({
    seasonId,
    config: iniFilePath,
    verbose: options.verbose ?? false,
    dryRun: options.dryRun ?? false
  });
}

export default {
  propagateSeasonDataFromIni
};
