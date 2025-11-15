/**
 * CLI Multi-Upload Core Module
 * Handles multi-folder uploads with subprocess-based parallel execution and staggered starts
 */

import { fork } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { createDualLogger } from '../excel-batch-editor/utils/syncFileLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Log to both console and file logger if available
 */
function log(message, logger) {
  console.log(message);
  if (logger) {
    const stripped = typeof message === 'string' ? message.replace(/\u001b\[\d+m/g, '') : String(message);
    logger.info(stripped);
  }
}

/**
 * Upload multiple folders with staggered subprocess execution
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string[]} folderPaths - Array of folder paths to upload
 * @param {Object} options - Upload options
 * @param {number} [options.delay=10] - Delay in seconds between starting each upload
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {number} [options.maxConcurrent] - Maximum concurrent uploads (optional)
 * @returns {Promise<Object>} Upload results
 */
export async function multiUploadFromList(iniFilePath, folderPaths, options = {}) {
  const delay = (options.delay || 10) * 1000; // Convert to milliseconds
  const verbose = options.verbose || false;
  const maxConcurrent = options.maxConcurrent || null;

  // Create logger if logFile is provided
  const logger = options.logFile ? createDualLogger(options.logFile, verbose) : null;

  // Validate INI file
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate all folder paths
  const validFolders = [];
  const invalidFolders = [];

  for (const folderPath of folderPaths) {
    if (await fs.pathExists(folderPath)) {
      const stat = await fs.stat(folderPath);
      if (stat.isDirectory()) {
        validFolders.push(folderPath);
      } else {
        invalidFolders.push({ path: folderPath, reason: 'Not a directory' });
      }
    } else {
      invalidFolders.push({ path: folderPath, reason: 'Path does not exist' });
    }
  }

  if (validFolders.length === 0) {
    throw new Error(`No valid folders found. ${invalidFolders.length} invalid paths.`);
  }

  if (invalidFolders.length > 0 && verbose) {
    log(chalk.yellow(`\n⚠️  Skipping ${invalidFolders.length} invalid paths:`), logger);
    invalidFolders.forEach(({ path, reason }) => {
      log(chalk.gray(`  • ${path} - ${reason}`), logger);
    });
  }

  log(chalk.blue.bold(`\n🚀 Multi-Upload: ${validFolders.length} folders\n`), logger);
  log(chalk.gray(`Delay between starts: ${options.delay || 10} seconds`), logger);
  if (maxConcurrent) {
    log(chalk.gray(`Max concurrent: ${maxConcurrent} processes`), logger);
  }
  log('', logger);

  // Track all processes
  const processes = new Map();
  const results = [];
  let completedCount = 0;
  let successCount = 0;
  let failedCount = 0;
  let runningCount = 0;

  // Process queue
  const queue = [...validFolders];

  /**
   * Start upload for a single folder in a subprocess
   */
  const startUpload = (folderPath, index) => {
    return new Promise((resolve) => {
      const folderName = path.basename(folderPath);
      const startTime = Date.now();

      log(chalk.cyan(`📦 [${index + 1}/${validFolders.length}] Starting: ${folderName}`), logger);
      if (verbose) {
        log(chalk.gray(`   Path: ${folderPath}`), logger);
      }

      runningCount++;

      // Fork a new process to run the upload
      // We'll use a worker script that calls singleUploadFromIni
      const workerPath = path.resolve(__dirname, 'uploadWorker.js');

      const childProcess = fork(workerPath, [], {
        stdio: verbose ? ['ignore', 'pipe', 'pipe', 'ipc'] : ['ignore', 'ignore', 'ignore', 'ipc'],
        env: { ...process.env }
      });

      // Send task data to worker
      childProcess.send({
        iniFilePath,
        folderPath,
        verbose
      });

      // Handle stdout if verbose
      if (verbose && childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          const lines = data.toString().split('\n').filter(line => line.trim());
          lines.forEach(line => {
            log(chalk.gray(`   [${folderName}] ${line}`), logger);
          });
        });
      }

      // Handle stderr if verbose
      if (verbose && childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          const lines = data.toString().split('\n').filter(line => line.trim());
          lines.forEach(line => {
            log(chalk.red(`   [${folderName}] ERR: ${line}`), logger);
          });
        });
      }

      // Handle messages from worker
      childProcess.on('message', (message) => {
        if (message.type === 'progress' && verbose) {
          log(chalk.gray(`   [${folderName}] ${message.message}`), logger);
        } else if (message.type === 'result') {
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);

          runningCount--;
          completedCount++;

          if (message.success) {
            successCount++;
            log(chalk.green(`✅ [${completedCount}/${validFolders.length}] Success: ${folderName} (${duration}s)`), logger);
            if (message.mediaDescriptionId) {
              log(chalk.gray(`   Media ID: ${message.mediaDescriptionId}`), logger);
            }
          } else {
            failedCount++;
            log(chalk.red(`❌ [${completedCount}/${validFolders.length}] Failed: ${folderName} (${duration}s)`), logger);
            log(chalk.red(`   Error: ${message.error || 'Unknown error'}`), logger);
          }

          results.push({
            folder: folderPath,
            folderName,
            success: message.success,
            result: message.result,
            duration,
            index
          });

          processes.delete(folderPath);
          resolve(message);
        }
      });

      // Handle process errors
      childProcess.on('error', (error) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        runningCount--;
        completedCount++;
        failedCount++;

        log(chalk.red(`❌ [${completedCount}/${validFolders.length}] Process Error: ${folderName} (${duration}s)`), logger);
        log(chalk.red(`   Error: ${error.message}`), logger);

        results.push({
          folder: folderPath,
          folderName,
          success: false,
          error: error.message,
          duration,
          index
        });

        processes.delete(folderPath);
        resolve({ success: false, error: error.message });
      });

      // Handle process exit
      childProcess.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);

          // Only count if not already counted by message handler
          if (processes.has(folderPath)) {
            runningCount--;
            completedCount++;
            failedCount++;

            log(chalk.red(`❌ [${completedCount}/${validFolders.length}] Exit Error: ${folderName} (${duration}s)`), logger);
            log(chalk.red(`   Exit code: ${code}, Signal: ${signal || 'none'}`), logger);

            results.push({
              folder: folderPath,
              folderName,
              success: false,
              error: `Process exited with code ${code}`,
              exitCode: code,
              signal,
              duration,
              index
            });

            processes.delete(folderPath);
            resolve({ success: false, error: `Process exited with code ${code}` });
          }
        }
      });

      processes.set(folderPath, { process: childProcess, startTime, folderName });
    });
  };

  /**
   * Process folders with staggered starts and optional concurrency limit
   */
  const processQueue = async () => {
    const promises = [];

    for (let i = 0; i < validFolders.length; i++) {
      const folderPath = validFolders[i];

      // Wait for concurrency limit if specified
      if (maxConcurrent) {
        while (runningCount >= maxConcurrent) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Start upload (don't await here to allow concurrent execution)
      promises.push(startUpload(folderPath, i));

      // Wait for delay before starting next (except for last one)
      if (i < validFolders.length - 1) {
        log(chalk.gray(`⏱️  Waiting ${options.delay || 10}s before next start...\n`), logger);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Wait for all uploads to complete
    await Promise.all(promises);
  };

  // Execute the queue
  await processQueue();

  // Print failed folders list if any
  if (failedCount > 0) {
    log(chalk.red.bold('\n❌ Failed Folders:'), logger);
    results
      .filter(result => !result.success)
      .forEach(result => {
        log(chalk.red(`  ${result.folderName}`), logger);
      });
  }

  // Print summary
  log(chalk.blue.bold('\n📊 Upload Summary:'), logger);
  log(chalk.green(`✅ Successful: ${successCount}/${validFolders.length}`), logger);
  log(chalk.red(`❌ Failed: ${failedCount}/${validFolders.length}`), logger);
  if (invalidFolders.length > 0) {
    log(chalk.yellow(`⚠️  Skipped: ${invalidFolders.length}`), logger);
  }

  return {
    success: successCount > 0,
    totalFolders: validFolders.length,
    successCount,
    failedCount,
    skippedCount: invalidFolders.length,
    results: results.sort((a, b) => a.index - b.index),
    invalidFolders
  };
}

/**
 * Scan parent folder and upload all subfolders
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} parentFolderPath - Parent folder containing subfolders
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload results
 */
export async function multiUploadFromParent(iniFilePath, parentFolderPath, options = {}) {
  const verbose = options.verbose || false;

  // Create logger if logFile is provided
  const logger = options.logFile ? createDualLogger(options.logFile, verbose) : null;

  // Validate parent folder
  if (!await fs.pathExists(parentFolderPath)) {
    throw new Error(`Parent folder not found: ${parentFolderPath}`);
  }

  const stat = await fs.stat(parentFolderPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${parentFolderPath}`);
  }

  // Scan for subfolders
  const items = await fs.readdir(parentFolderPath);
  const subfolders = [];

  for (const item of items) {
    const itemPath = path.join(parentFolderPath, item);
    try {
      const itemStat = await fs.stat(itemPath);
      if (itemStat.isDirectory()) {
        subfolders.push(itemPath);
      }
    } catch (error) {
      // Skip items that can't be accessed
      if (options.verbose) {
        log(chalk.yellow(`⚠️  Skipping ${item}: ${error.message}`), logger);
      }
    }
  }

  // Include parent folder itself in the upload list (at the beginning)
  const allFolders = [parentFolderPath, ...subfolders];

  log(chalk.blue(`🔍 Found ${subfolders.length} subfolders in: ${path.basename(parentFolderPath)}`), logger);
  log(chalk.blue(`📁 Total folders to upload: ${allFolders.length} (including parent folder)\n`), logger);

  // Use multiUploadFromList to process all folders (parent + subfolders)
  return await multiUploadFromList(iniFilePath, allFolders, options);
}

export default {
  multiUploadFromList,
  multiUploadFromParent
};
