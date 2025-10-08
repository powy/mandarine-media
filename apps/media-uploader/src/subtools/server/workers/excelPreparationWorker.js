/**
 * Excel Preparation Worker
 * Worker for preparing Excel files (corresponds to prepare_excel in GUI)
 */

import BaseWorker from './baseWorker.js';
import { execFilePromise } from '../utils/processUtils.js';

class ExcelPreparationWorker extends BaseWorker {
  constructor() {
    super();
    this.logInfo('Excel Preparation Worker initialized');
  }

  async execute(taskData) {
    this.validateTaskData(taskData, ['folderPath']);

    const { folderPath, config, options = {} } = taskData;

    this.logInfo('Starting Excel preparation', { folderPath, options });
    this.updateProgress(5, 'Initializing Excel preparation...');

    // Debug: Log the exact task data received
    this.logDebug('Excel preparation worker received task data', {
      taskData: JSON.stringify(taskData, null, 2),
      folderPath,
      config,
      options
    });

    if (!(await this.isDirectory(folderPath))) {
      throw new Error(`Folder path does not exist or is not a directory: ${folderPath}`);
    }

    this.updateProgress(10, 'Folder validated, starting preparation...');

    try {
      const scriptPath = this.getToolPath('subtools/one-media-complete-upload/wrapper.js');

      // Debug: Log the resolved script path
      this.logDebug('Resolved script path', {
        scriptPath,
        exists: await this.fileExists(scriptPath)
      });

      if (!(await this.fileExists(scriptPath))) {
        throw new Error(`Upload script not found: ${scriptPath}`);
      }

      const args = [
        '--folder', folderPath,
        '--prepare-only'
      ];

      if (config && config.configPath) {
        args.push('--config', config.configPath);
      }

      this.updateProgress(20, 'Starting Excel preparation process...');

      // Debug: Log the exact command that will be executed
      const fullCommand = `node ${scriptPath} ${args.join(' ')}`;
      this.logInfo('Executing Excel preparation subtool command', {
        command: fullCommand,
        scriptPath,
        args,
        workingDirectory: process.cwd(),
        timeout: options.timeout || 300000,
        maxBuffer: 1024 * 1024 * 5
      });

      const result = await execFilePromise('node', [scriptPath, ...args], {
        timeout: options.timeout || 300000, // 5 minutes default
        maxBuffer: 1024 * 1024 * 5, // 5MB buffer
        env: { ...process.env }
      });

      this.updateProgress(80, 'Preparation process completed, processing results...');

      // Debug: Log the raw command execution results
      this.logDebug('Excel preparation subtool execution completed', {
        exitCode: result.exitCode,
        stdoutLength: result.stdout ? result.stdout.length : 0,
        stderrLength: result.stderr ? result.stderr.length : 0,
        stdout: result.stdout ? result.stdout.substring(0, 1000) + (result.stdout.length > 1000 ? '...' : '') : '',
        stderr: result.stderr ? result.stderr.substring(0, 500) + (result.stderr.length > 500 ? '...' : '') : ''
      });

      let preparationResult;
      try {
        const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          preparationResult = JSON.parse(jsonMatch[0]);
          this.logDebug('Parsed JSON result from stdout', { preparationResult });
        } else {
          preparationResult = this.parsePreparationOutput(result.stdout, result.stderr);
          this.logDebug('Parsed result from text output', { preparationResult });
        }
      } catch (parseError) {
        this.logWarn('Failed to parse preparation result as JSON', {
          parseError: parseError.message,
          stdout: result.stdout,
          stderr: result.stderr
        });
        preparationResult = this.parsePreparationOutput(result.stdout, result.stderr);
      }

      if (!preparationResult.success && result.exitCode !== 0) {
        this.logError('Excel preparation failed', {
          exitCode: result.exitCode,
          stderr: result.stderr,
          stdout: result.stdout,
          preparationResult
        });
        throw new Error(`Excel preparation failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`);
      }

      this.updateProgress(100, 'Excel preparation completed successfully');

      return {
        success: true,
        folderPath,
        preparationResult,
        metadata: {
          folderPath,
          exitCode: result.exitCode,
          preparationTime: Date.now() - this.startTime,
          excelPath: preparationResult.excel_path || null
        }
      };

    } catch (error) {
      this.logError('Excel preparation failed', {
        folderPath,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`Excel preparation failed: ${error.message}`);
    }
  }

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
    if (stdout.includes('Excel preparation completed') || stdout.includes('preparation completed successfully')) {
      result.success = true;
    }

    return result;
  }

  async cleanup() {
    this.logInfo('Cleaning up Excel preparation worker');
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
      new ExcelPreparationWorker();
    } catch (error) {
      console.error('Failed to initialize ExcelPreparationWorker:', error.message);
      process.exit(1);
    }
  }, 10);
}

export default ExcelPreparationWorker;