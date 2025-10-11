/**
 * CLI Multi-Upload Core Module
 * Handles multi-folder uploads with subprocess-based parallel execution and staggered starts
 */

import { fork } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.log(chalk.yellow(`\n⚠️  Skipping ${invalidFolders.length} invalid paths:`));
    invalidFolders.forEach(({ path, reason }) => {
      console.log(chalk.gray(`  • ${path} - ${reason}`));
    });
  }

  console.log(chalk.blue.bold(`\n🚀 Multi-Upload: ${validFolders.length} folders\n`));
  console.log(chalk.gray(`Delay between starts: ${options.delay || 10} seconds`));
  if (maxConcurrent) {
    console.log(chalk.gray(`Max concurrent: ${maxConcurrent} processes`));
  }
  console.log('');

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

      console.log(chalk.cyan(`📦 [${index + 1}/${validFolders.length}] Starting: ${folderName}`));
      if (verbose) {
        console.log(chalk.gray(`   Path: ${folderPath}`));
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
            console.log(chalk.gray(`   [${folderName}] ${line}`));
          });
        });
      }

      // Handle stderr if verbose
      if (verbose && childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          const lines = data.toString().split('\n').filter(line => line.trim());
          lines.forEach(line => {
            console.log(chalk.red(`   [${folderName}] ERR: ${line}`));
          });
        });
      }

      // Handle messages from worker
      childProcess.on('message', (message) => {
        if (message.type === 'progress' && verbose) {
          console.log(chalk.gray(`   [${folderName}] ${message.message}`));
        } else if (message.type === 'result') {
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);

          runningCount--;
          completedCount++;

          if (message.success) {
            successCount++;
            console.log(chalk.green(`✅ [${completedCount}/${validFolders.length}] Success: ${folderName} (${duration}s)`));
            if (message.mediaDescriptionId) {
              console.log(chalk.gray(`   Media ID: ${message.mediaDescriptionId}`));
            }
          } else {
            failedCount++;
            console.log(chalk.red(`❌ [${completedCount}/${validFolders.length}] Failed: ${folderName} (${duration}s)`));
            console.log(chalk.red(`   Error: ${message.error || 'Unknown error'}`));
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

        console.log(chalk.red(`❌ [${completedCount}/${validFolders.length}] Process Error: ${folderName} (${duration}s)`));
        console.log(chalk.red(`   Error: ${error.message}`));

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

            console.log(chalk.red(`❌ [${completedCount}/${validFolders.length}] Exit Error: ${folderName} (${duration}s)`));
            console.log(chalk.red(`   Exit code: ${code}, Signal: ${signal || 'none'}`));

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
        console.log(chalk.gray(`⏱️  Waiting ${options.delay || 10}s before next start...\n`));
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
    console.log(chalk.red.bold('\n❌ Failed Folders:'));
    results
      .filter(result => !result.success)
      .forEach(result => {
        console.log(chalk.red(`  ${result.folderName}`));
      });
  }

  // Print summary
  console.log(chalk.blue.bold('\n📊 Upload Summary:'));
  console.log(chalk.green(`✅ Successful: ${successCount}/${validFolders.length}`));
  console.log(chalk.red(`❌ Failed: ${failedCount}/${validFolders.length}`));
  if (invalidFolders.length > 0) {
    console.log(chalk.yellow(`⚠️  Skipped: ${invalidFolders.length}`));
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
        console.log(chalk.yellow(`⚠️  Skipping ${item}: ${error.message}`));
      }
    }
  }

  if (subfolders.length === 0) {
    throw new Error(`No subfolders found in: ${parentFolderPath}`);
  }

  console.log(chalk.blue(`🔍 Found ${subfolders.length} subfolders in: ${path.basename(parentFolderPath)}\n`));

  // Use multiUploadFromList to process subfolders
  return await multiUploadFromList(iniFilePath, subfolders, options);
}

export default {
  multiUploadFromList,
  multiUploadFromParent
};
