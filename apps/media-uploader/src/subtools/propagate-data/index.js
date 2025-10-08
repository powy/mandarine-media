#!/usr/bin/env node

import { Command } from 'commander';
import { propagateSeasonData } from './wrapper.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

/**
 * Propagate Data Tool
 * Propagates missing data from a season media description to all its episodes
 */
class PropagateDataTool {
  constructor() {
    this.program = new Command();
  }

  setupCLI() {
    this.program
      .name('propagate-data')
      .description('Propagate missing data from season to episodes')
      .version('1.0.0')
      .requiredOption('--season-id <id>', 'Season media description ID')
      .requiredOption('-c, --config <path>', 'Configuration JSON file path')
      .option('--dry-run', 'Preview changes without updating')
      .option('-v, --verbose', 'Verbose output')
      .helpOption('-h, --help', 'Display help for command');

    this.program.parse();
    return this.program.opts();
  }

  async run() {
    try {
      const options = this.setupCLI();

      console.log(chalk.blue.bold('🔄 Propagate Data Tool v1.0.0'));
      console.log(chalk.blue.bold('=====================================\n'));

      const result = await propagateSeasonData(options);

      if (result.success) {
        console.log(chalk.green.bold('\n✅ Process completed successfully!'));
        process.exit(0);
      } else {
        console.log(chalk.yellow.bold('\n⚠️  Process completed with errors'));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Process failed!'));
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  }
}

// Export for integration
export { propagateSeasonData };
export { PropagationService } from './services/propagationService.js';

// Command line execution
async function main() {
  const tool = new PropagateDataTool();
  await tool.run();
}

// Only run main if this file is executed directly (not imported)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export default PropagateDataTool;
