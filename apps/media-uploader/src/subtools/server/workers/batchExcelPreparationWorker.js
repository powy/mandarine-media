/**
 * Batch Excel Preparation Worker
 * Worker for preparing Excel files in multiple subfolders (batch mode)
 * Iterates through immediate subfolders and prepares Excel file for each
 */

import BaseWorker from './baseWorker.js';
import { execFilePromise } from '../utils/processUtils.js';
import path from 'path';

class BatchExcelPreparationWorker extends BaseWorker {
  constructor() {
    super();
    this.logInfo('Batch Excel Preparation Worker initialized');
  }

  async execute(taskData) {
    this.validateTaskData(taskData, ['parentFolderPath']);

    const { parentFolderPath, config, options = {} } = taskData;

    this.logInfo('Starting batch Excel preparation', { parentFolderPath, options });
    this.updateProgress(5, 'Initializing batch Excel preparation...');

    // Validate parent folder path
    if (!(await this.isDirectory(parentFolderPath))) {
      throw new Error(`Parent folder path does not exist or is not a directory: ${parentFolderPath}`);
    }

    this.updateProgress(10, 'Parent folder validated, scanning for subfolders...');

    try {
      const scriptPath = this.getToolPath('subtools/one-media-complete-upload/wrapper.js');

      if (!(await this.fileExists(scriptPath))) {
        throw new Error(`Upload script not found: ${scriptPath}`);
      }

      this.updateProgress(20, 'Executing batch Excel preparation using season-aware logic...');

      // Use --batch-folder to leverage the season-aware logic in wrapper.js
      // This will detect season Excel in parent folder and copy fields to episode Excels
      const args = [
        '--batch-folder', parentFolderPath,
        '--prepare-only'
      ];

      if (config && config.configPath) {
        args.push('--config', config.configPath);
      }

      if (options.verbose) {
        args.push('--verbose');
      }

      this.logInfo('Executing batch Excel preparation with season-aware logic', {
        command: `node ${scriptPath} ${args.join(' ')}`,
        parentFolderPath
      });

      try {
        const result = await execFilePromise('node', [scriptPath, ...args], {
          timeout: options.timeout || 600000, // 10 minutes for all folders
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          env: { ...process.env }
        });

        this.updateProgress(80, 'Parsing batch preparation results...');

        // Parse result
        let preparationResult;
        try {
          const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            preparationResult = JSON.parse(jsonMatch[0]);
          } else {
            preparationResult = this.parsePreparationOutput(result.stdout, result.stderr);
          }
        } catch (parseError) {
          this.logWarn('Failed to parse batch result', {
            parseError: parseError.message
          });
          preparationResult = this.parsePreparationOutput(result.stdout, result.stderr);
        }

        this.updateProgress(90, 'Batch preparation completed, finalizing...');

        const success = preparationResult.success || result.exitCode === 0;
        const processedCount = preparationResult.processedCount || 0;
        const totalFolders = preparationResult.totalFolders || 0;
        const failedFolders = preparationResult.failedFolders || [];
        const successfulFolders = preparationResult.results?.filter(r => r.success).map(r => r.folderName) || [];

        this.updateProgress(100, `Batch Excel preparation completed: ${processedCount}/${totalFolders} successful`);

        return {
          success,
          parentFolderPath,
          metadata: {
            parentFolderPath,
            processedCount,
            totalFolders,
            failedFolders,
            successfulFolders,
            successRate: totalFolders > 0 ? (processedCount / totalFolders) * 100 : 0,
            preparationTime: Date.now() - this.startTime,
            message: `Batch Excel preparation completed: ${processedCount}/${totalFolders} successful`,
            usingSeasonAwareLogic: true
          }
        };

      } catch (error) {
        this.logError('Batch Excel preparation execution failed', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }

    } catch (error) {
      this.logError('Batch Excel preparation failed', {
        parentFolderPath,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`Batch Excel preparation failed: ${error.message}`);
    }
  }

  /**
   * Parse Excel preparation output
   * @param {string} stdout - Standard output
   * @param {string} stderr - Standard error
   * @returns {Object} Parsed result
   */
  parsePreparationOutput(stdout, stderr) {
    const result = {
      success: false,
      message: stdout,
      error: stderr
    };

    // Look for Excel file creation patterns
    const excelMatch = stdout.match(/Excel file created:\s*(.+)/);
    if (excelMatch) {
      result.excel_path = excelMatch[1].trim();
      result.success = true;
    }

    // Check for completion indicators
    if (stdout.includes('Excel preparation completed') ||
        stdout.includes('preparation completed successfully') ||
        stdout.includes('Excel file is ready') ||
        stdout.includes('Batch processing completed')) {
      result.success = true;
    }

    return result;
  }

  async cleanup() {
    this.logInfo('Cleaning up Batch Excel Preparation worker');
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
      new BatchExcelPreparationWorker();
    } catch (error) {
      console.error('Failed to initialize BatchExcelPreparationWorker:', error.message);
      process.exit(1);
    }
  }, 10);
}

export default BatchExcelPreparationWorker;