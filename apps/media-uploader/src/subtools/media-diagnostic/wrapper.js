/**
 * Wrapper functions for Media Diagnostic Tool
 * Provides simplified interface for main CLI integration
 */

import {
  verifyMediaDescriptionDirect,
  verifySeasonDirect,
  verifyBatchNonReady
} from './core.js';
import {
  verifyMediaDescriptionFromIni,
  verifySeasonFromIni,
  verifyBatchNonReadyFromIni
} from './iniInterface.js';

/**
 * Main diagnostic wrapper function
 * Routes to appropriate function based on command and options
 *
 * @param {string} command - Subcommand (verify, verify-ini, verify-season, verify-season-ini, verify-batch, verify-batch-ini)
 * @param {Object} options - Command options
 * @returns {Promise<Object>} Diagnostic result
 */
export async function runDiagnostic(command, options) {
  switch (command) {
    case 'verify':
      return await verifyMediaDescriptionDirect({
        baseUrl: options.url,
        username: options.username,
        password: options.password,
        mediaDescriptionId: options.id,
        verbose: options.verbose || false,
        timeout: options.timeout || 30000
      });

    case 'verify-ini':
      return await verifyMediaDescriptionFromIni(
        options.config,
        options.id,
        {
          verbose: options.verbose,
          timeout: options.timeout
        }
      );

    case 'verify-season':
      return await verifySeasonDirect({
        baseUrl: options.url,
        username: options.username,
        password: options.password,
        seasonId: options.seasonId,
        verbose: options.verbose || false,
        continueOnError: options.continueOnError !== false,
        timeout: options.timeout || 30000
      });

    case 'verify-season-ini':
      return await verifySeasonFromIni(
        options.config,
        options.seasonId,
        {
          verbose: options.verbose,
          continueOnError: options.continueOnError !== false,
          timeout: options.timeout
        }
      );

    case 'verify-batch':
      return await verifyBatchNonReady({
        baseUrl: options.url,
        username: options.username,
        password: options.password,
        verbose: options.verbose || false,
        continueOnError: options.continueOnError !== false,
        limit: options.limit || 1000,
        timeout: options.timeout || 30000
      });

    case 'verify-batch-ini':
      return await verifyBatchNonReadyFromIni(
        options.config,
        {
          verbose: options.verbose,
          continueOnError: options.continueOnError !== false,
          limit: options.limit,
          timeout: options.timeout
        }
      );

    default:
      throw new Error(`Unknown diagnostic command: ${command}`);
  }
}

export default {
  runDiagnostic,
  verifyMediaDescriptionDirect,
  verifyMediaDescriptionFromIni,
  verifySeasonDirect,
  verifySeasonFromIni,
  verifyBatchNonReady,
  verifyBatchNonReadyFromIni
};
