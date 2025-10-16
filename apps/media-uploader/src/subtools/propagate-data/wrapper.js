// Function wrapper for propagate-data tool
import { PropagationService } from './services/propagationService.js';
import { loadJsonFile } from '../one-media-complete-upload/utils/fileUtils.js';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

/**
 * Propagate Season Data Function Wrapper
 * @param {Object} options - Propagation options
 * @param {string} options.seasonId - Season media description ID
 * @param {string} options.config - Configuration file path
 * @param {boolean} options.verbose - Verbose output
 * @param {boolean} options.dryRun - Preview changes without updating
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Propagation results
 */
export async function propagateSeasonData(options) {
  let restoreConsole = null;

  if (options.logFile) {
    const logger = createFileLogger({
      logFile: options.logFile,
      verbose: options.verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  try {
    console.log(chalk.blue.bold('🔄 Season Data Propagation Tool\n'));

    // Load configuration
    console.log(chalk.gray(`Loading configuration from: ${options.config}`));
    const config = await loadJsonFile(options.config);
    console.log(chalk.green('✅ Configuration loaded\n'));

    if (options.verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Backend: ${config.backend.baseUrl}`));
      console.log(chalk.gray(`  Username: ${config.backend.username}`));
      console.log('');
    }

    // Validate season ID
    if (!options.seasonId) {
      throw new Error('Season ID is required');
    }

    console.log(chalk.cyan(`Season ID: ${options.seasonId}\n`));

    // Show dry run warning
    if (options.dryRun) {
      console.log(chalk.yellow('⚠️  DRY RUN MODE - No changes will be made\n'));
    }

    // Create propagation service
    const logger = {
      info: (msg) => options.verbose && console.log(chalk.gray(msg)),
      warn: (msg) => console.log(chalk.yellow(msg)),
      error: (msg) => console.error(chalk.red(msg))
    };

    const propagationService = new PropagationService(config, logger);

    // Execute propagation (with dry run flag)
    const result = await propagationService.propagateMissingFromSeasonToEpisodes(
      options.seasonId,
      options.dryRun
    );

    // Display results
    if (options.dryRun) {
      console.log(chalk.yellow.bold('\n🔍 Dry Run Complete - No changes were made'));
    } else if (result.success) {
      console.log(chalk.green.bold('\n✅ Propagation completed successfully!'));
    } else {
      console.log(chalk.yellow.bold('\n⚠️  Propagation completed with errors'));
    }

    console.log(chalk.cyan(`\n📊 Results:`));
    if (options.dryRun) {
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

    if (options.verbose && result.details) {
      console.log(chalk.gray('\n📋 Detailed Results:'));
      console.log(JSON.stringify(result.details, null, 2));
    }

    // Generate dry-run report if requested
    if (options.dryRun) {
      await generateDryRunReport(options.seasonId, result);
    }

    return result;

  } catch (error) {
    console.error(chalk.red(`\n❌ Propagation failed: ${error.message}`));
    if (options.verbose && error.stack) {
      console.error(chalk.gray(error.stack));
    }
    throw error;
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

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

export default { propagateSeasonData };
