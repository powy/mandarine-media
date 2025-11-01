// Function wrappers for propagate-data tool
// Implements 9-level hierarchy for maximum flexibility

import { PropagationService } from './services/propagationService.js';
import { loadJsonFile } from '../one-media-complete-upload/utils/fileUtils.js';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';

/**
 * Create a simple logger based on verbose flag
 * @private
 */
function createLogger(verbose) {
  return {
    info: (msg) => verbose && console.log(chalk.gray(msg)),
    warn: (msg) => console.log(chalk.yellow(msg)),
    error: (msg) => console.error(chalk.red(msg))
  };
}

/**
 * Display propagation results to console
 * @private
 */
function displayResults(result, options) {
  const { dryRun = false, verbose = false } = options;

  // Display results
  if (dryRun) {
    console.log(chalk.yellow.bold('\n🔍 Dry Run Complete - No changes were made'));
  } else if (result.success) {
    console.log(chalk.green.bold('\n✅ Propagation completed successfully!'));
  } else {
    console.log(chalk.yellow.bold('\n⚠️  Propagation completed with errors'));
  }

  console.log(chalk.cyan(`\n📊 Results:`));
  if (dryRun) {
    console.log(chalk.yellow(`   Would update: ${result.updated} episode(s)`));
  } else {
    console.log(chalk.green(`   Updated: ${result.updated} episode(s)`));
  }
  console.log(chalk.gray(`   Skipped: ${result.skipped} episode(s)`));

  if (result.errors.length > 0) {
    console.log(chalk.red(`   Errors: ${result.errors.length} episode(s)`));
    console.log(chalk.red('\nFailed episodes:'));
    result.errors.forEach(err => {
      console.log(chalk.red(`  • ${err.title || err.id}: ${err.error}`));
    });
  }

  if (verbose && result.details) {
    console.log(chalk.gray('\n📋 Detailed Results:'));
    console.log(JSON.stringify(result.details, null, 2));
  }
}

// ============================================================
// LEVEL 1: CORE - Direct parameters, no files
// ============================================================

/**
 * LEVEL 1: Core propagation function with direct parameters
 *
 * @param {string} seasonId - Season entity ID
 * @param {string} seasonMediaDescriptionId - Season media description ID (general description)
 * @param {Object} auth - Authentication credentials
 * @param {string} auth.username - Backend username
 * @param {string} auth.password - Backend password
 * @param {Object} addresses - Backend addresses
 * @param {string} addresses.baseUrl - Backend base URL
 * @param {Object} options - Optional parameters
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {boolean} [options.dryRun=false] - Preview mode
 * @param {string} [options.logFile] - Optional log file path
 * @returns {Promise<Object>} Propagation results
 *
 * @example
 * const result = await propagateSeasonDataCore(
 *   'season-entity-123',
 *   'season-description-456',
 *   { username: 'user', password: 'pass' },
 *   { baseUrl: 'https://api.example.com' },
 *   { dryRun: true }
 * );
 */
export async function propagateSeasonDataCore(
  seasonId,
  seasonMediaDescriptionId,
  auth,
  addresses,
  options = {}
) {
  const { verbose = false, dryRun = false, logFile = null } = options;

  let restoreConsole = null;

  if (logFile) {
    const logger = createFileLogger({
      logFile,
      verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  try {
    console.log(chalk.blue.bold('🔄 Season Data Propagation Tool\n'));
    console.log(chalk.cyan(`Season Entity ID: ${seasonId}`));
    console.log(chalk.cyan(`Season Media Description ID: ${seasonMediaDescriptionId}\n`));

    if (verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Backend: ${addresses.baseUrl}`));
      console.log(chalk.gray(`  Username: ${auth.username}`));
      console.log('');
    }

    if (dryRun) {
      console.log(chalk.yellow('⚠️  DRY RUN MODE - No changes will be made\n'));
    }

    const config = {
      backend: {
        baseUrl: addresses.baseUrl,
        username: auth.username,
        password: auth.password
      }
    };

    const logger = createLogger(verbose);
    const propagationService = new PropagationService(config, logger);

    const result = await propagationService.propagateSeasonDataCore(
      seasonId,
      seasonMediaDescriptionId,
      dryRun
    );

    displayResults(result, options);

    if (dryRun) {
      await generateDryRunReport(seasonMediaDescriptionId, result);
    }

    return result;

  } catch (error) {
    console.error(chalk.red(`\n❌ Propagation failed: ${error.message}`));
    if (verbose && error.stack) {
      console.error(chalk.gray(error.stack));
    }
    throw error;
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

// ============================================================
// LEVEL 2: CORE + INI
// ============================================================

/**
 * LEVEL 2: Core propagation with INI configuration file
 *
 * @param {string} seasonId - Season entity ID
 * @param {string} seasonMediaDescriptionId - Season media description ID
 * @param {string} iniPath - Path to INI configuration file
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Propagation results
 *
 * @example
 * const result = await propagateSeasonDataCoreWithIni(
 *   'season-123',
 *   'desc-456',
 *   './config.ini',
 *   { dryRun: true }
 * );
 */
export async function propagateSeasonDataCoreWithIni(
  seasonId,
  seasonMediaDescriptionId,
  iniPath,
  options = {}
) {
  console.log(chalk.gray(`Loading configuration from: ${iniPath}`));
  const config = await loadJsonFile(iniPath);
  console.log(chalk.green('✅ Configuration loaded\n'));

  const auth = {
    username: config.backend.username,
    password: config.backend.password
  };

  const addresses = {
    baseUrl: config.backend.baseUrl
  };

  return await propagateSeasonDataCore(
    seasonId,
    seasonMediaDescriptionId,
    auth,
    addresses,
    options
  );
}

// ============================================================
// LEVEL 3: FROM MEDIA DESCRIPTION
// ============================================================

/**
 * LEVEL 3: Propagate from media description ID (resolves to season entity)
 *
 * @param {string} mediaDescriptionId - Media description ID
 * @param {Object} auth - Authentication credentials
 * @param {Object} addresses - Backend addresses
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Propagation results
 *
 * @example
 * const result = await propagateSeasonDataFromMediaDescription(
 *   'desc-456',
 *   { username: 'user', password: 'pass' },
 *   { baseUrl: 'https://api.example.com' }
 * );
 */
export async function propagateSeasonDataFromMediaDescription(
  mediaDescriptionId,
  auth,
  addresses,
  options = {}
) {
  const { verbose = false, dryRun = false, logFile = null } = options;

  let restoreConsole = null;

  if (logFile) {
    const logger = createFileLogger({
      logFile,
      verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  try {
    console.log(chalk.blue.bold('🔄 Season Data Propagation Tool\n'));
    console.log(chalk.cyan(`Media Description ID: ${mediaDescriptionId}\n`));

    if (verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Backend: ${addresses.baseUrl}`));
      console.log(chalk.gray(`  Username: ${auth.username}`));
      console.log('');
    }

    if (dryRun) {
      console.log(chalk.yellow('⚠️  DRY RUN MODE - No changes will be made\n'));
    }

    const config = {
      backend: {
        baseUrl: addresses.baseUrl,
        username: auth.username,
        password: auth.password
      }
    };

    const logger = createLogger(verbose);
    const propagationService = new PropagationService(config, logger);

    const result = await propagationService.propagateSeasonDataFromMediaDescription(
      mediaDescriptionId,
      dryRun
    );

    displayResults(result, options);

    if (dryRun) {
      await generateDryRunReport(mediaDescriptionId, result);
    }

    return result;

  } catch (error) {
    console.error(chalk.red(`\n❌ Propagation failed: ${error.message}`));
    if (verbose && error.stack) {
      console.error(chalk.gray(error.stack));
    }
    throw error;
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

// ============================================================
// LEVEL 4: FROM MEDIA DESCRIPTION + INI
// ============================================================

/**
 * LEVEL 4: Propagate from media description ID with INI configuration
 *
 * @param {string} mediaDescriptionId - Media description ID
 * @param {string} iniPath - Path to INI configuration file
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Propagation results
 *
 * @example
 * const result = await propagateSeasonDataFromMediaDescriptionWithIni(
 *   'desc-456',
 *   './config.ini',
 *   { dryRun: true }
 * );
 */
export async function propagateSeasonDataFromMediaDescriptionWithIni(
  mediaDescriptionId,
  iniPath,
  options = {}
) {
  console.log(chalk.gray(`Loading configuration from: ${iniPath}`));
  const config = await loadJsonFile(iniPath);
  console.log(chalk.green('✅ Configuration loaded\n'));

  const auth = {
    username: config.backend.username,
    password: config.backend.password
  };

  const addresses = {
    baseUrl: config.backend.baseUrl
  };

  return await propagateSeasonDataFromMediaDescription(
    mediaDescriptionId,
    auth,
    addresses,
    options
  );
}

// ============================================================
// LEVEL 5: FROM SEASON ID
// ============================================================

/**
 * LEVEL 5: Propagate from season entity ID (resolves to media description)
 *
 * @param {string} seasonId - Season entity ID
 * @param {Object} auth - Authentication credentials
 * @param {Object} addresses - Backend addresses
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Propagation results
 *
 * @example
 * const result = await propagateSeasonDataFromSeasonId(
 *   'season-123',
 *   { username: 'user', password: 'pass' },
 *   { baseUrl: 'https://api.example.com' }
 * );
 */
export async function propagateSeasonDataFromSeasonId(
  seasonId,
  auth,
  addresses,
  options = {}
) {
  const { verbose = false, dryRun = false, logFile = null } = options;

  let restoreConsole = null;

  if (logFile) {
    const logger = createFileLogger({
      logFile,
      verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  try {
    console.log(chalk.blue.bold('🔄 Season Data Propagation Tool\n'));
    console.log(chalk.cyan(`Season Entity ID: ${seasonId}\n`));

    if (verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Backend: ${addresses.baseUrl}`));
      console.log(chalk.gray(`  Username: ${auth.username}`));
      console.log('');
    }

    if (dryRun) {
      console.log(chalk.yellow('⚠️  DRY RUN MODE - No changes will be made\n'));
    }

    const config = {
      backend: {
        baseUrl: addresses.baseUrl,
        username: auth.username,
        password: auth.password
      }
    };

    const logger = createLogger(verbose);
    const propagationService = new PropagationService(config, logger);

    const result = await propagationService.propagateSeasonDataFromSeasonId(
      seasonId,
      dryRun
    );

    displayResults(result, options);

    if (dryRun) {
      await generateDryRunReport(seasonId, result);
    }

    return result;

  } catch (error) {
    console.error(chalk.red(`\n❌ Propagation failed: ${error.message}`));
    if (verbose && error.stack) {
      console.error(chalk.gray(error.stack));
    }
    throw error;
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

// ============================================================
// LEVEL 6: FROM SEASON ID + INI
// ============================================================

/**
 * LEVEL 6: Propagate from season entity ID with INI configuration
 *
 * @param {string} seasonId - Season entity ID
 * @param {string} iniPath - Path to INI configuration file
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Propagation results
 *
 * @example
 * const result = await propagateSeasonDataFromSeasonIdWithIni(
 *   'season-123',
 *   './config.ini',
 *   { dryRun: true }
 * );
 */
export async function propagateSeasonDataFromSeasonIdWithIni(
  seasonId,
  iniPath,
  options = {}
) {
  console.log(chalk.gray(`Loading configuration from: ${iniPath}`));
  const config = await loadJsonFile(iniPath);
  console.log(chalk.green('✅ Configuration loaded\n'));

  const auth = {
    username: config.backend.username,
    password: config.backend.password
  };

  const addresses = {
    baseUrl: config.backend.baseUrl
  };

  return await propagateSeasonDataFromSeasonId(
    seasonId,
    auth,
    addresses,
    options
  );
}

// ============================================================
// LEVEL 7: FROM EXCEL
// ============================================================

/**
 * LEVEL 7: Propagate from Excel file (extracts media description ID)
 *
 * @param {string} excelPath - Path to Excel file
 * @param {Object} auth - Authentication credentials
 * @param {Object} addresses - Backend addresses
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Propagation results
 *
 * @example
 * const result = await propagateSeasonDataFromExcel(
 *   './season-data.xlsx',
 *   { username: 'user', password: 'pass' },
 *   { baseUrl: 'https://api.example.com' }
 * );
 */
export async function propagateSeasonDataFromExcel(
  excelPath,
  auth,
  addresses,
  options = {}
) {
  const { verbose = false } = options;

  try {
    if (verbose) {
      console.log(chalk.gray(`Reading Excel file: ${excelPath}`));
    }

    // Parse Excel to extract media description ID
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const descriptionSheet = workbook.getWorksheet('Description');
    if (!descriptionSheet) {
      throw new Error('No Description sheet found in Excel file');
    }

    let mediaType = null;
    let mediaDescriptionId = null;

    descriptionSheet.eachRow((row, rowNumber) => {
      const field = row.getCell(2).value;
      const value = row.getCell(3).value;

      if (field === 'media_type') {
        mediaType = value;
      }
      if (field === 'id') {
        mediaDescriptionId = value;
      }
    });

    if (verbose) {
      console.log(chalk.gray(`  Media Type: ${mediaType}`));
      console.log(chalk.gray(`  ID: ${mediaDescriptionId}`));
    }

    if (mediaType !== 'season') {
      throw new Error(`Media type is "${mediaType}", not "season"`);
    }

    if (!mediaDescriptionId) {
      throw new Error('Season ID not found in Excel file');
    }

    console.log(chalk.cyan(`\n🔄 Season detected - propagating data to episodes...`));

    return await propagateSeasonDataFromMediaDescription(
      mediaDescriptionId,
      auth,
      addresses,
      options
    );

  } catch (error) {
    throw error;
  }
}

// ============================================================
// LEVEL 8: FROM EXCEL + INI
// ============================================================

/**
 * LEVEL 8: Propagate from Excel file with INI configuration
 *
 * @param {string} excelPath - Path to Excel file
 * @param {string} iniPath - Path to INI configuration file
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Propagation results
 *
 * @example
 * const result = await propagateSeasonDataFromExcelWithIni(
 *   './season-data.xlsx',
 *   './config.ini',
 *   { dryRun: true }
 * );
 */
export async function propagateSeasonDataFromExcelWithIni(
  excelPath,
  iniPath,
  options = {}
) {
  console.log(chalk.gray(`Loading configuration from: ${iniPath}`));
  const config = await loadJsonFile(iniPath);
  console.log(chalk.green('✅ Configuration loaded\n'));

  const auth = {
    username: config.backend.username,
    password: config.backend.password
  };

  const addresses = {
    baseUrl: config.backend.baseUrl
  };

  return await propagateSeasonDataFromExcel(
    excelPath,
    auth,
    addresses,
    options
  );
}

// ============================================================
// LEVEL 9: ORIGINAL FUNCTION - Backward compatibility wrapper
// ============================================================

/**
 * LEVEL 9: Original propagate season data function (backward compatibility)
 *
 * @param {Object} options - Propagation options
 * @param {string} options.seasonId - Season media description ID
 * @param {string} options.config - Configuration file path (INI or JSON)
 * @param {boolean} options.verbose - Verbose output
 * @param {boolean} options.dryRun - Preview changes without updating
 * @param {string} [options.logFile] - Optional log file path
 * @returns {Promise<Object>} Propagation results
 *
 * @example
 * const result = await propagateSeasonData({
 *   seasonId: 'desc-456',
 *   config: './config.ini',
 *   dryRun: true,
 *   verbose: true
 * });
 */
export async function propagateSeasonData(options) {
  // Validate season ID
  if (!options.seasonId) {
    throw new Error('Season ID is required');
  }

  // For backward compatibility, treat seasonId as media description ID
  return await propagateSeasonDataFromMediaDescriptionWithIni(
    options.seasonId,
    options.config,
    {
      verbose: options.verbose,
      dryRun: options.dryRun,
      logFile: options.logFile
    }
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate a detailed dry-run report
 * @param {string} seasonId - Season ID
 * @param {Object} result - Propagation result
 */
async function generateDryRunReport(seasonId, result) {
  try {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '');
    const reportFilename = `${timestamp}_propagation_dryrun_report.md`;

    // Find the journal folder - go up from current location
    const currentDir = process.cwd();
    const journalDir = path.join(currentDir, 'journal');

    // Create journal directory if it doesn't exist
    try {
      await fs.mkdir(journalDir, { recursive: true });
    } catch (error) {
      console.log(chalk.yellow(`Could not create journal directory: ${error.message}`));
      return;
    }

    const reportPath = path.join(journalDir, reportFilename);

    // Generate report content
    let reportContent = `# Season Data Propagation - Dry Run Report\n\n`;
    reportContent += `**Date:** ${now.toISOString()}\n`;
    reportContent += `**Season ID:** ${seasonId}\n`;
    reportContent += `**Mode:** DRY RUN (Preview Only)\n\n`;
    reportContent += `---\n\n`;

    reportContent += `## Summary\n\n`;
    reportContent += `- **Episodes that would be updated:** ${result.updated}\n`;
    reportContent += `- **Episodes that would be skipped:** ${result.skipped}\n`;
    reportContent += `- **Total episodes processed:** ${result.updated + result.skipped}\n\n`;

    if (result.details && result.details.updated && result.details.updated.length > 0) {
      reportContent += `## Episodes That Would Be Updated\n\n`;

      for (const episode of result.details.updated) {
        reportContent += `### Episode: ${episode.title || episode.id}\n\n`;
        reportContent += `**Episode ID:** \`${episode.id}\`\n`;
        reportContent += `**Fields to be copied:** ${episode.fieldsCopied.join(', ')}\n`;
        reportContent += `**Total fields:** ${episode.updateCount}\n\n`;

        if (episode.updates) {
          reportContent += `**Detailed Changes:**\n\n`;

          // Group changes by type
          const textFields = [];
          const arrayFields = [];
          const relationshipFields = [];
          const imageFields = [];

          for (const [key, value] of Object.entries(episode.updates)) {
            if (key.includes('image_') && key.endsWith('_id')) {
              imageFields.push({ key, value });
            } else if (key.endsWith('_ids')) {
              relationshipFields.push({ key, value });
            } else if (Array.isArray(value)) {
              arrayFields.push({ key, value });
            } else {
              textFields.push({ key, value });
            }
          }

          if (textFields.length > 0) {
            reportContent += `**Text Fields:**\n`;
            textFields.forEach(({ key, value }) => {
              reportContent += `- \`${key}\`: "${value}"\n`;
            });
            reportContent += `\n`;
          }

          if (arrayFields.length > 0) {
            reportContent += `**Array Fields:**\n`;
            arrayFields.forEach(({ key, value }) => {
              reportContent += `- \`${key}\`: [${value.join(', ')}]\n`;
            });
            reportContent += `\n`;
          }

          if (relationshipFields.length > 0) {
            reportContent += `**Relationship IDs:**\n`;
            relationshipFields.forEach(({ key, value }) => {
              reportContent += `- \`${key}\`: [${value.length} items]\n`;
            });
            reportContent += `\n`;
          }

          if (imageFields.length > 0) {
            reportContent += `**Images (MOST IMPORTANT):**\n`;
            imageFields.forEach(({ key, value }) => {
              reportContent += `- \`${key}\`: \`${value}\`\n`;
            });
            reportContent += `\n`;
          }
        }

        reportContent += `---\n\n`;
      }
    }

    if (result.details && result.details.skipped && result.details.skipped.length > 0) {
      reportContent += `## Episodes That Would Be Skipped\n\n`;

      for (const episode of result.details.skipped) {
        reportContent += `- **${episode.title || episode.id}** (\`${episode.id}\`) - ${episode.reason}\n`;
      }
      reportContent += `\n`;
    }

    reportContent += `## Conclusion\n\n`;
    reportContent += `This was a **DRY RUN** - no actual changes were made to the database.\n\n`;
    reportContent += `To apply these changes, run the same command without the \`--dry-run\` flag.\n`;

    // Write report to file
    await fs.writeFile(reportPath, reportContent, 'utf-8');

    console.log(chalk.green(`\n📄 Dry-run report saved to: ${reportPath}`));

  } catch (error) {
    console.log(chalk.yellow(`\n⚠️  Could not generate dry-run report: ${error.message}`));
  }
}

export default {
  propagateSeasonData,
  propagateSeasonDataCore,
  propagateSeasonDataCoreWithIni,
  propagateSeasonDataFromMediaDescription,
  propagateSeasonDataFromMediaDescriptionWithIni,
  propagateSeasonDataFromSeasonId,
  propagateSeasonDataFromSeasonIdWithIni,
  propagateSeasonDataFromExcel,
  propagateSeasonDataFromExcelWithIni
};
