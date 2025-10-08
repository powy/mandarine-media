/**
 * Propagate Season Data Worker
 * Propagates missing data from a season to all its episodes
 */

import BaseWorker from './baseWorker.js';
import { propagateSeasonData } from '../../propagate-data/wrapper.js';

class PropagateSeasonDataWorker extends BaseWorker {
  constructor() {
    super();
    this.logInfo('Propagate Season Data Worker initialized');
  }

  async execute(taskData) {
    this.validateTaskData(taskData, ['seasonId', 'config']);

    const { seasonId, config, options = {} } = taskData;

    this.logInfo('Starting season data propagation', { seasonId, options });
    this.updateProgress(5, 'Initializing propagation...');

    // Validate config file path exists
    if (!config.configPath) {
      throw new Error('Configuration file path is required');
    }

    this.updateProgress(10, 'Configuration path validated...');

    try {
      this.updateProgress(20, 'Starting propagation from season to episodes...');

      // Call the propagateSeasonData function - it will load and validate the config itself
      // Note: dryRun is always false (no dry-run option in UI)
      const result = await propagateSeasonData({
        seasonId: seasonId,
        config: config.configPath,
        verbose: options.verbose || false,
        dryRun: false // Always false - no dry-run option in UI
      });

      this.updateProgress(90, 'Propagation completed, preparing results...');

      if (!result.success) {
        throw new Error('Season data propagation completed with errors');
      }

      this.updateProgress(100, `Propagated data to ${result.updated} episode(s)`);

      return {
        success: true,
        seasonId,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors || [],
        propagationResult: {
          success: result.success,
          updated: result.updated,
          skipped: result.skipped,
          details: result.details || {},
          message: `Successfully propagated data from season to ${result.updated} episode(s). ${result.skipped} episode(s) skipped.`
        },
        metadata: {
          seasonId,
          updated: result.updated,
          skipped: result.skipped,
          hasErrors: (result.errors && result.errors.length > 0),
          propagationTime: Date.now() - this.startTime
        }
      };

    } catch (error) {
      this.logError('Season data propagation failed', {
        seasonId,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`Season data propagation failed: ${error.message}`);
    }
  }

  async cleanup() {
    this.logInfo('Cleaning up propagate season data worker');
  }
}

// Check if this module is being run directly (as main module in child process)
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = resolve(process.argv[1]) === __filename;

if (isMainModule) {
  // Small delay to ensure IPC is fully established in forked process
  setTimeout(() => {
    try {
      new PropagateSeasonDataWorker();
    } catch (error) {
      console.error('Failed to initialize PropagateSeasonDataWorker:', error.message);
      process.exit(1);
    }
  }, 10);
}

export default PropagateSeasonDataWorker;
