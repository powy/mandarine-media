/**
 * One Media Complete Upload INI Interface
 * Provides INI config file wrappers for all one-media-complete-upload functions
 */

import fs from 'fs-extra';
import { prepareExcel, executeUpload } from './wrapper.js';

/**
 * Prepare Excel from INI configuration
 * Creates and fills Excel description file for a single media folder
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} folderPath - Folder containing media files
 * @param {Object} options - Additional options
 * @param {boolean} [options.verbose] - Verbose logging
 * @returns {Promise<Object>} Preparation result
 *
 * @example
 * const result = await prepareExcelFromIni(
 *   './config.ini',
 *   '/path/to/media/folder',
 *   { verbose: true }
 * );
 */
export async function prepareExcelFromIni(iniFilePath, folderPath, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate folder exists
  if (!await fs.pathExists(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  // Call existing wrapper with INI path
  // The wrapper already handles INI files via loadJsonFile() utility
  return await prepareExcel({
    config: iniFilePath,
    folder: folderPath,
    mode: 'prepare',
    verbose: options.verbose ?? false,
    ...options
  });
}

/**
 * Execute single upload from INI configuration
 * Complete upload of a media from a folder with files and filled description Excel
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} folderPath - Folder containing media files and Excel
 * @param {Object} options - Additional options
 * @param {boolean} [options.verbose] - Verbose logging
 * @param {boolean} [options.dryRun] - Dry run mode
 * @returns {Promise<Object>} Upload result
 *
 * @example
 * const result = await singleUploadFromIni(
 *   './config.ini',
 *   '/path/to/media/folder',
 *   { verbose: true }
 * );
 */
export async function singleUploadFromIni(iniFilePath, folderPath, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate folder exists
  if (!await fs.pathExists(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  // Call existing wrapper with INI path
  // Mode 'auto' will prepare Excel if needed, then upload
  return await executeUpload({
    config: iniFilePath,
    folder: folderPath,
    mode: 'upload',
    verbose: options.verbose ?? false,
    dryRun: options.dryRun ?? false,
    ...options
  });
}

/**
 * Batch prepare Excel files from INI configuration
 * Creates and fills description Excel files for a season folder and all its episode subfolders
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} parentFolderPath - Parent folder containing subfolders (season with episodes)
 * @param {Object} options - Additional options
 * @param {boolean} [options.verbose] - Verbose logging
 * @returns {Promise<Object>} Batch preparation result
 *
 * @example
 * const result = await batchPrepareExcelFromIni(
 *   './config.ini',
 *   '/path/to/season/folder',
 *   { verbose: true }
 * );
 */
export async function batchPrepareExcelFromIni(iniFilePath, parentFolderPath, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate parent folder exists
  if (!await fs.pathExists(parentFolderPath)) {
    throw new Error(`Parent folder not found: ${parentFolderPath}`);
  }

  // For batch operations, we use the processBatchFolder function from wrapper.js
  // Import it dynamically to avoid circular dependencies
  const { default: wrapperModule } = await import('./wrapper.js');

  // The wrapper's main() function handles --batch-folder with --prepare-only
  // We need to simulate that by calling the internal processBatchFolder function
  // However, that function is not exported. We need to use the CLI approach.

  // Alternative: Use prepareExcel for parent folder, then for each subfolder
  const path = await import('path');
  const items = await fs.readdir(parentFolderPath);
  const stats = await Promise.all(
    items.map(item => fs.stat(path.join(parentFolderPath, item)))
  );

  const subfolders = items.filter((item, index) => stats[index].isDirectory());

  const results = {
    success: true,
    parentFolder: parentFolderPath,
    processedCount: 0,
    totalFolders: subfolders.length + 1, // +1 for parent/season folder
    results: []
  };

  // Track season Excel path to use as template for episodes
  let seasonExcelPath = null;

  // Process parent folder (season) first
  try {
    const parentResult = await prepareExcel({
      config: iniFilePath,
      folder: parentFolderPath,
      mode: 'prepare',
      verbose: options.verbose ?? false,
      isSeasonLevel: true,
      logFile: options.logFile
    });

    // Save season Excel path for episode templates
    if (parentResult.success && parentResult.excelPath) {
      seasonExcelPath = parentResult.excelPath;
      if (options.verbose) {
        console.log(`📝 Season Excel path saved for episode templates: ${seasonExcelPath}`);
      }
    }

    results.processedCount++;
    results.results.push({
      folder: path.basename(parentFolderPath),
      type: 'season',
      result: parentResult
    });
  } catch (error) {
    results.results.push({
      folder: path.basename(parentFolderPath),
      type: 'season',
      result: { success: false, error: error.message }
    });
  }

  // Process each subfolder (episodes)
  for (const subfolder of subfolders) {
    const subfolderPath = path.join(parentFolderPath, subfolder);

    try {
      const subfolderResult = await prepareExcel({
        config: iniFilePath,
        folder: subfolderPath,
        mode: 'prepare',
        verbose: options.verbose ?? false,
        isSeasonLevel: false,
        seasonExcelPath: seasonExcelPath,  // Pass season Excel path to use as template
        logFile: options.logFile
      });

      results.processedCount++;
      results.results.push({
        folder: subfolder,
        type: 'episode',
        result: subfolderResult
      });
    } catch (error) {
      results.results.push({
        folder: subfolder,
        type: 'episode',
        result: { success: false, error: error.message }
      });
    }
  }

  return results;
}

/**
 * Batch upload from INI configuration
 * Complete upload of media from a season folder and all its episode subfolders
 *
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {string} parentFolderPath - Parent folder containing subfolders (season with episodes)
 * @param {Object} options - Additional options
 * @param {boolean} [options.verbose] - Verbose logging
 * @param {boolean} [options.parallel=false] - Use parallel processing
 * @param {number} [options.maxConcurrent=10] - Max concurrent uploads (parallel mode)
 * @returns {Promise<Object>} Batch upload result
 *
 * @example
 * // Sequential batch upload
 * const result = await batchUploadFromIni(
 *   './config.ini',
 *   '/path/to/season/folder',
 *   { verbose: true }
 * );
 *
 * // Parallel batch upload
 * const result = await batchUploadFromIni(
 *   './config.ini',
 *   '/path/to/season/folder',
 *   { verbose: true, parallel: true, maxConcurrent: 5 }
 * );
 */
export async function batchUploadFromIni(iniFilePath, parentFolderPath, options = {}) {
  // Validate INI file exists
  if (!await fs.pathExists(iniFilePath)) {
    throw new Error(`INI configuration file not found: ${iniFilePath}`);
  }

  // Validate parent folder exists
  if (!await fs.pathExists(parentFolderPath)) {
    throw new Error(`Parent folder not found: ${parentFolderPath}`);
  }

  const path = await import('path');
  const items = await fs.readdir(parentFolderPath);
  const stats = await Promise.all(
    items.map(item => fs.stat(path.join(parentFolderPath, item)))
  );

  const subfolders = items.filter((item, index) => stats[index].isDirectory());

  const results = {
    success: true,
    parentFolder: parentFolderPath,
    processedCount: 0,
    totalFolders: subfolders.length + 1, // +1 for parent/season folder
    parallel: options.parallel ?? false,
    maxConcurrent: options.maxConcurrent ?? 10,
    results: []
  };

  // Sequential mode
  if (!options.parallel) {
    // Process parent folder (season) first
    try {
      const parentResult = await executeUpload({
        config: iniFilePath,
        folder: parentFolderPath,
        mode: 'auto',
        verbose: options.verbose ?? false,
        isSeasonLevel: true,
        logFile: options.logFile
      });

      results.processedCount++;
      results.results.push({
        folder: path.basename(parentFolderPath),
        type: 'season',
        result: parentResult
      });
    } catch (error) {
      results.results.push({
        folder: path.basename(parentFolderPath),
        type: 'season',
        result: { success: false, error: error.message }
      });
    }

    // Process each subfolder (episodes) sequentially
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(parentFolderPath, subfolder);

      try {
        const subfolderResult = await executeUpload({
          config: iniFilePath,
          folder: subfolderPath,
          mode: 'auto',
          verbose: options.verbose ?? false,
          isSeasonLevel: false,
          logFile: options.logFile
        });

        results.processedCount++;
        results.results.push({
          folder: subfolder,
          type: 'episode',
          result: subfolderResult
        });
      } catch (error) {
        results.results.push({
          folder: subfolder,
          type: 'episode',
          result: { success: false, error: error.message }
        });
      }
    }
  } else {
    // Parallel mode with worker pool
    const maxConcurrent = options.maxConcurrent ?? 10;

    // Process parent folder (season) first
    try {
      const parentResult = await executeUpload({
        config: iniFilePath,
        folder: parentFolderPath,
        mode: 'auto',
        verbose: options.verbose ?? false,
        isSeasonLevel: true,
        logFile: options.logFile
      });

      results.processedCount++;
      results.results.push({
        folder: path.basename(parentFolderPath),
        type: 'season',
        result: parentResult
      });
    } catch (error) {
      results.results.push({
        folder: path.basename(parentFolderPath),
        type: 'season',
        result: { success: false, error: error.message }
      });
    }

    // Process subfolders in parallel with concurrency limit
    const folderQueue = [...subfolders];
    const activeUploads = new Map();
    let completedCount = 0;

    const processFolder = async (subfolder) => {
      const subfolderPath = path.join(parentFolderPath, subfolder);

      try {
        const subfolderResult = await executeUpload({
          config: iniFilePath,
          folder: subfolderPath,
          mode: 'auto',
          verbose: options.verbose ?? false,
          isSeasonLevel: false,
          logFile: options.logFile
        });

        results.processedCount++;
        results.results.push({
          folder: subfolder,
          type: 'episode',
          result: subfolderResult
        });
      } catch (error) {
        results.results.push({
          folder: subfolder,
          type: 'episode',
          result: { success: false, error: error.message }
        });
      }

      completedCount++;
      activeUploads.delete(subfolder);

      // Start next upload if queue has folders
      if (folderQueue.length > 0) {
        const nextFolder = folderQueue.shift();
        const promise = processFolder(nextFolder);
        activeUploads.set(nextFolder, promise);
        promise.catch(() => {}); // Prevent unhandled rejection
      }
    };

    // Start initial batch
    const initialBatch = Math.min(maxConcurrent, subfolders.length);
    for (let i = 0; i < initialBatch; i++) {
      const folder = folderQueue.shift();
      if (folder) {
        const promise = processFolder(folder);
        activeUploads.set(folder, promise);
        promise.catch(() => {}); // Prevent unhandled rejection
      }
    }

    // Wait for all uploads to complete
    while (completedCount < subfolders.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

export default {
  prepareExcelFromIni,
  singleUploadFromIni,
  batchPrepareExcelFromIni,
  batchUploadFromIni
};
