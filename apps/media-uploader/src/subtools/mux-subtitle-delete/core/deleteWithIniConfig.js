import chalk from 'chalk';
import { deleteFromMediaDescriptionId } from './deleteFromMediaDescriptionId.js';
import { readIniFile, iniToStandardConfig, validateRequiredSections } from '../../../shared/utils/iniParser.js';

/**
 * Layer 4: Delete subtitle tracks using INI configuration file
 * Reads INI file for backend and Mux credentials, then deletes subtitle by language
 *
 * @param {Object} params - Parameters
 * @param {string} params.mediaDescriptionId - Media description UUID from backend
 * @param {string} params.language - Language code (e.g., 'en', 'fr', 'es')
 * @param {string} params.iniFilePath - Path to INI configuration file
 * @param {boolean} [params.dryRun=false] - If true, only simulate deletion
 * @param {Object} [params.logger=console] - Logger instance
 * @returns {Promise<Object>} Deletion results
 */
export async function deleteWithIniConfig({
  mediaDescriptionId,
  language,
  iniFilePath,
  dryRun = false,
  logger = console
}) {
  // Validate required parameters
  if (!mediaDescriptionId) {
    throw new Error('mediaDescriptionId is required');
  }
  if (!language) {
    throw new Error('language is required');
  }
  if (!iniFilePath) {
    throw new Error('iniFilePath is required');
  }

  logger.info(chalk.blue('=== Delete Subtitle with INI Configuration ==='));
  logger.info(`INI File: ${iniFilePath}`);
  logger.info(`Media Description ID: ${mediaDescriptionId}`);
  logger.info(`Language: ${language}`);
  if (dryRun) {
    logger.info(chalk.yellow('[DRY RUN MODE]'));
  }
  logger.info('');

  try {
    // Step 1: Read and parse INI file
    logger.info('Reading INI configuration file...');
    const iniConfig = await readIniFile(iniFilePath);
    const config = iniToStandardConfig(iniConfig);
    logger.info(chalk.green('✓ Configuration loaded'));
    logger.info('');

    // Step 2: Validate required sections
    logger.info('Validating configuration...');
    const requiredSections = ['backend.baseUrl', 'backend.username', 'backend.password', 'mux.tokenId', 'mux.tokenSecret'];
    validateRequiredSections(config, requiredSections);
    logger.info(chalk.green('✓ Configuration validated'));
    logger.info('');

    // Step 3: Extract configuration values
    const {
      backend: { baseUrl: backendUrl, username: backendUsername, password: backendPassword },
      mux: { tokenId: muxTokenId, tokenSecret: muxTokenSecret }
    } = config;

    // Step 4: Delete subtitle from media description (Layer 3)
    const result = await deleteFromMediaDescriptionId({
      mediaDescriptionId,
      language,
      backendUrl,
      backendUsername,
      backendPassword,
      muxTokenId,
      muxTokenSecret,
      dryRun,
      logger
    });

    // Add INI file path to result
    return {
      ...result,
      iniFilePath
    };
  } catch (error) {
    logger.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}

export default deleteWithIniConfig;
