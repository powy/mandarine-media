/**
 * Mux Report Generator - INI Wrapper
 * Entry point for generating Mux asset reports with INI config file
 */

import { readIniFile, iniToStandardConfig } from '../../shared/utils/iniParser.js';
import { generateMuxReport } from './core/muxReportCore.js';

/**
 * Generate Mux asset report using INI configuration file
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Object} options - Options
 * @param {Object} options.logger - Logger instance
 * @param {Function} options.progressCallback - Progress callback
 * @param {boolean} options.verbose - Verbose logging
 * @returns {Promise<Object>} Result object
 */
export async function generateMuxReportWithIni(iniFilePath, options = {}) {
  const logger = options.logger || {
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
  };

  try {
    logger.info('Loading INI configuration file...');
    logger.info(`INI file path: ${iniFilePath}`);

    // Read and parse INI file
    const iniConfig = await readIniFile(iniFilePath);
    const config = iniToStandardConfig(iniConfig);

    // Validate Mux credentials
    if (!config.mux || !config.mux.tokenId || !config.mux.tokenSecret) {
      throw new Error(
        'Mux credentials not found in INI file. Please ensure [mux] section contains tokenId and tokenSecret.'
      );
    }

    logger.info('Mux credentials loaded successfully');

    // Call core report generation function
    return await generateMuxReport(config, options);

  } catch (error) {
    logger.error(`Failed to generate Mux report: ${error.message}`);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export core function as well for direct use
export { generateMuxReport } from './core/muxReportCore.js';

// Default export
export default generateMuxReportWithIni;
