import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs-extra';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic dependencies - will be loaded at runtime
let OneMediaCompleteUpload, ConfigReader;

/**
 * Resolve module path for both development and production environments
 */
function resolveModulePath(relativePath, productionSubpath) {
  // Try the normal relative path first
  const normalPath = path.resolve(__dirname, relativePath);

  if (fs.existsSync(normalPath)) {
    return normalPath;
  }

  // For production builds, try alternative path structures
  const productionPaths = [
    // Current working directory relative
    path.resolve(process.cwd(), 'src', 'subtools', productionSubpath),
    // Fallback to development-style path in bundle
    path.resolve(process.cwd(), 'kyool-media', 'apps', 'media-uploader', 'src', 'subtools', productionSubpath)
  ];

  for (const testPath of productionPaths) {
    if (fs.existsSync(testPath)) {
      console.log(`🔍 Wrapper using module from: ${testPath}`);
      return testPath;
    }
  }

  console.warn(`⚠️  Module not found, using original path: ${normalPath}`);
  return normalPath;
}

/**
 * Dynamically import wrapper dependencies with path resolution for production builds
 */
async function importDependencies() {
  try {
    // Dynamic import for OneMediaCompleteUpload
    const indexPath = resolveModulePath('./index.js', 'one-media-complete-upload/index.js');
    const moduleURL1 = pathToFileURL(indexPath).href;
    console.log(`🔍 Importing OneMediaCompleteUpload from URL: ${moduleURL1}`);
    const indexModule = await import(moduleURL1);

    // Dynamic import for ConfigReader
    const configReaderPath = resolveModulePath('../../shared/config/configReader.js', '../shared/config/configReader.js');
    const moduleURL2 = pathToFileURL(configReaderPath).href;
    console.log(`🔍 Importing ConfigReader from URL: ${moduleURL2}`);
    const configReaderModule = await import(moduleURL2);

    return {
      OneMediaCompleteUpload: indexModule.default || indexModule.OneMediaCompleteUpload,
      ConfigReader: configReaderModule.default || configReaderModule.ConfigReader
    };
  } catch (error) {
    console.error(`❌ Failed to import wrapper dependencies:`, error.message);
    throw error;
  }
}

// Import dependencies at module level
const dependenciesPromise = importDependencies().then(deps => {
  OneMediaCompleteUpload = deps.OneMediaCompleteUpload;
  ConfigReader = deps.ConfigReader;
});

// Removed prepareConfig() and cleanupConfig() functions
// INI files are now handled directly by loadJsonFile() in fileUtils.js

/**
 * Prepare Excel file with template and auto-fill Files sheet
 * @param {Object} options - Preparation options
 * @param {string} options.config - Configuration file path
 * @param {string} options.folder - Folder path containing media files
 * @param {boolean} options.verbose - Verbose output
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Excel preparation results
 */
export async function prepareExcel(options) {
  let restoreConsole = null;

  // Initialize file logger if logFile is provided
  if (options.logFile) {
    const logger = createFileLogger({
      logFile: options.logFile,
      verbose: options.verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  console.error(`🔍 DEBUG: prepareExcel called with folder: ${options.folder}`);
  try {
    // Ensure dependencies are loaded
    await dependenciesPromise;
    console.error(`🔍 DEBUG: Dependencies loaded successfully`);

    if (options.verbose) {
      console.error(`🔍 DEBUG: prepareExcel config: ${options.config}`);
    }

    const uploader = new OneMediaCompleteUpload({
      ...options,
      mode: 'prepare'
    });
    console.error(`🔍 DEBUG: prepareExcel OneMediaCompleteUpload instance created`);

    const result = await uploader.prepareExcel();
    if (options.verbose) {
      console.error(`🔍 DEBUG: prepareExcel result: success=${result.success}, phase=${result.phase || 'completed'}`);
    }

    return result;

  } catch (error) {
    console.error('❌ Excel preparation failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }

    return {
      success: false,
      error: error.message,
      phase: 'prepare-wrapper-error',
      context: {
        options,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      }
    };
  } finally {
    // Restore console if redirected
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

/**
 * Execute upload process (assumes Excel file already exists and is filled)
 * @param {Object} options - Upload options
 * @param {string} options.config - Configuration file path
 * @param {string} options.folder - Folder path containing media files
 * @param {boolean} options.verbose - Verbose output
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Upload results
 */
export async function executeUpload(options) {
  let restoreConsole = null;

  // Initialize file logger if logFile is provided
  if (options.logFile) {
    const logger = createFileLogger({
      logFile: options.logFile,
      verbose: options.verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  try {
    // Ensure dependencies are loaded
    await dependenciesPromise;
    console.error(`🔍 DEBUG: Dependencies loaded successfully`);

    const uploader = new OneMediaCompleteUpload({
      ...options,
      mode: 'upload'
    });
    const result = await uploader.executeUpload();

    return result;

  } catch (error) {
    console.error('❌ Upload execution failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }

    return {
      success: false,
      error: error.message,
      phase: 'upload-wrapper-error',
      context: {
        options,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      }
    };
  } finally {
    // Restore console if redirected
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

/**
 * One Media Complete Upload Function Wrapper (backward compatible)
 * @param {Object} options - Upload options
 * @param {string} options.config - Configuration file path
 * @param {string} options.folder - Folder path containing media files
 * @param {boolean} options.verbose - Verbose output
 * @param {boolean} options.dryRun - Validate configuration without uploading
 * @param {string} options.mode - Operation mode: 'auto', 'prepare', or 'upload'
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Upload results with detailed context
 */
export async function oneMediaCompleteUpload(options) {
  let restoreConsole = null;

  // Initialize file logger if logFile is provided
  if (options.logFile) {
    const logger = createFileLogger({
      logFile: options.logFile,
      verbose: options.verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  try {
    // Ensure dependencies are loaded
    await dependenciesPromise;

    const uploader = new OneMediaCompleteUpload({
      ...options
    });
    const result = await uploader.run();

    return result;

  } catch (error) {
    console.error('❌ Complete upload failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }

    // Return comprehensive error context instead of throwing
    return {
      success: false,
      error: error.message,
      phase: 'wrapper-error',
      context: {
        options,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        },
        summary: {
          phase: 'wrapper-execution-failed',
          configProvided: !!options.config,
          folderProvided: !!options.folder
        }
      }
    };
  } finally {
    // Restore console if redirected
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

/**
 * Safe JSON stringifier that handles circular references and non-serializable objects
 * @param {*} obj Object to stringify
 * @returns {string} JSON string
 */
function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    // Skip workbook-related properties that cause circular references
    if (key === 'workbook' || key === '_workbook' || key === '_worksheets' || key === '_worksheet') {
      return undefined;
    }
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
}

/**
 * CLI entry point, spawned by the server workers (originally for the Tauri app)
 */
async function main() {
  const args = process.argv.slice(2);

  // Default config path - check multiple locations
  let configPath = null;

  // Try to find config.ini in various locations
  const configLocations = [
    'config.ini',
    path.join(process.cwd(), 'config.ini'),
    path.join(__dirname, '../../config.ini'),
    path.join(__dirname, '../../../config.ini'),
    path.join(__dirname, '../../../../config.ini')
  ];

  for (const location of configLocations) {
    try {
      const { existsSync } = await import('fs');
      if (existsSync(location)) {
        configPath = location;
        break;
      }
    } catch (err) {
      // Continue to next location
    }
  }

  // Parse command line arguments
  const options = {
    config: configPath,
    verbose: false  // Only enable with --verbose flag
  };

  let folderPath = null;
  let batchFolderPath = null;
  let prepareOnly = false;
  let parallel = false;
  let maxConcurrent = 3; // Default concurrent uploads

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder':
        folderPath = args[i + 1];
        i++;
        break;
      case '--batch-folder':
        batchFolderPath = args[i + 1];
        i++;
        break;
      case '--config':
        options.config = args[i + 1];
        i++;
        break;
      case '--prepare-only':
        prepareOnly = true;
        break;
      case '--parallel':
        parallel = true;
        break;
      case '--max-concurrent':
        maxConcurrent = parseInt(args[i + 1]) || 3;
        i++;
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }

  try {
    let result;

    if (batchFolderPath) {
      // Batch operation
      if (parallel && !prepareOnly) {
        result = await processBatchFolderParallel(batchFolderPath, options, maxConcurrent);
      } else {
        result = await processBatchFolder(batchFolderPath, prepareOnly, options);
      }
    } else if (folderPath) {
      // Single folder operation
      options.folder = folderPath;

      if (prepareOnly) {
        options.mode = 'prepare';
        result = await prepareExcel(options);
      } else {
        options.mode = 'auto';
        result = await oneMediaCompleteUpload(options);
      }
    } else {
      throw new Error('No folder specified. Use --folder or --batch-folder');
    }

    // Output result as JSON for the calling process to parse (using safe stringify to avoid circular references)
    console.log(safeStringify(result));
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message,
      phase: 'cli-wrapper-error',
      context: {
        args,
        options,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      }
    };

    console.log(safeStringify(errorResult));
    process.exit(1);
  }
}

/**
 * Check if a folder has Excel files
 */
async function hasExcelFiles(folderPath) {
  const { readdirSync } = await import('fs');
  try {
    const files = readdirSync(folderPath);
    const excelFiles = files.filter(file =>
      file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls')
    );
    return {
      hasExcel: excelFiles.length > 0,
      excelFiles,
      count: excelFiles.length
    };
  } catch (error) {
    console.error(`❌ Error checking Excel files in ${folderPath}: ${error.message}`);
    return {
      hasExcel: false,
      excelFiles: [],
      count: 0,
      error: error.message
    };
  }
}

/**
 * Process batch folder operation with proper worker pool parallel uploads
 */
async function processBatchFolderParallel(parentFolderPath, options, maxConcurrent = 3) {
  const { readdirSync, statSync } = await import('fs');
  const path = await import('path');

  try {

    const items = readdirSync(parentFolderPath);
    const subfolders = items.filter(item => {
      const itemPath = path.join(parentFolderPath, item);
      return statSync(itemPath).isDirectory();
    });

    if (subfolders.length === 0) {
      console.log(`⚠️ No subfolders found in: ${parentFolderPath}`);
      return {
        success: false,
        error: 'No subfolders found in the specified directory',
        processedCount: 0,
        totalSubfolders: 0,
        failedFolders: null,
        skippedFolders: 0,
        parallel: true
      };
    }

    console.log(`🔍 Validating Excel files in ${subfolders.length} folders...`);

    // Validate Excel files in each subfolder before processing
    const validFolders = [];
    const skippedFolders = [];

    for (const subfolder of subfolders) {
      const subfolderPath = path.join(parentFolderPath, subfolder);
      const excelCheck = await hasExcelFiles(subfolderPath);

      if (excelCheck.hasExcel) {
        validFolders.push(subfolder);
        console.log(`✅ ${subfolder} has ${excelCheck.count} Excel file(s): ${excelCheck.excelFiles.join(', ')}`);
      } else {
        skippedFolders.push(subfolder);
        console.log(`⚠️ Skipping ${subfolder}: No Excel files found`);
      }
    }

    if (validFolders.length === 0) {
      console.log(`❌ No folders with Excel files found. Skipped ${skippedFolders.length} folders: ${skippedFolders.join(', ')}`);
      return {
        success: false,
        error: `No folders with Excel files found. Skipped ${skippedFolders.length} folders: ${skippedFolders.join(', ')}`,
        processedCount: 0,
        totalSubfolders: subfolders.length,
        validFolders: 0,
        skippedFolders: skippedFolders.length,
        skippedFolderNames: skippedFolders,
        failedFolders: null,
        parallel: true
      };
    }

    console.log(`🚀 Starting proper worker pool parallel batch upload for ${validFolders.length} valid folders (max ${maxConcurrent} concurrent)`);
    if (skippedFolders.length > 0) {
      console.log(`⚠️ Skipped ${skippedFolders.length} folders without Excel files: ${skippedFolders.join(', ')}`);
    }

    // Worker pool implementation
    const results = [];
    const failedFolders = [];
    let processedCount = 0;
    let completedCount = 0;
    let runningWorkers = 0;
    const folderQueue = [...validFolders]; // Copy of folders to process
    const activeUploads = new Map(); // Track active uploads

    // Function to start a single upload
    const startUpload = async (subfolder) => {
      const subfolderPath = path.join(parentFolderPath, subfolder);
      runningWorkers++;
      activeUploads.set(subfolder, { startTime: Date.now(), status: 'running' });

      console.log(`🚀 Starting upload: ${subfolder} (${runningWorkers} workers active, ${folderQueue.length} queued)`);

      const subfolderOptions = {
        ...options,
        folder: subfolderPath,
        mode: 'auto'
      };

      try {
        const result = await oneMediaCompleteUpload(subfolderOptions);

        runningWorkers--;
        completedCount++;
        activeUploads.delete(subfolder);
        const overallProgress = Math.round((completedCount / validFolders.length) * 100);

        if (result.success) {
          processedCount++;
          console.log(`✅ Successfully uploaded: ${subfolder} (${completedCount}/${validFolders.length} - ${overallProgress}%)`);
          results.push({
            folder: subfolder,
            result,
            status: 'completed'
          });
        } else {
          failedFolders.push(subfolder);
          console.log(`❌ Failed to upload: ${subfolder} - ${result.error} (${completedCount}/${validFolders.length} - ${overallProgress}%)`);
          results.push({
            folder: subfolder,
            result,
            status: 'failed'
          });
        }
      } catch (error) {
        runningWorkers--;
        completedCount++;
        activeUploads.delete(subfolder);
        failedFolders.push(subfolder);
        const overallProgress = Math.round((completedCount / validFolders.length) * 100);
        console.log(`❌ Error uploading: ${subfolder} - ${error.message} (${completedCount}/${validFolders.length} - ${overallProgress}%)`);
        results.push({
          folder: subfolder,
          result: {
            success: false,
            error: error.message
          },
          status: 'error'
        });
      }

      // Start next upload if queue has folders and we're under the limit
      if (folderQueue.length > 0 && runningWorkers < maxConcurrent) {
        const nextFolder = folderQueue.shift();
        // Don't await here - let it run concurrently
        startUpload(nextFolder).catch(console.error);
      }
    };

    // Start initial batch of uploads
    const initialBatchSize = Math.min(maxConcurrent, validFolders.length);
    console.log(`📋 Starting initial batch of ${initialBatchSize} uploads...`);

    for (let i = 0; i < initialBatchSize; i++) {
      const folder = folderQueue.shift();
      if (folder) {
        // Don't await here - let them run concurrently
        startUpload(folder).catch(console.error);
      }
    }

    // Wait for all uploads to complete
    while (completedCount < validFolders.length) {
      // Log current status every 5 seconds
      const activeCount = runningWorkers;
      const queueCount = folderQueue.length;
      console.log(`📊 Status update: ${activeCount} active, ${queueCount} queued, ${completedCount}/${validFolders.length} completed (${Math.round((completedCount / validFolders.length) * 100)}%)`);

      if (activeUploads.size > 0) {
        const activeList = Array.from(activeUploads.keys()).join(', ');
        console.log(`⏳ Currently uploading: ${activeList}`);
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    // Final summary - detailed episode-by-episode breakdown
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 BATCH UPLOAD SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);

    console.log(`Episode Results:\n`);

    // Show successful episodes
    results.forEach((item) => {
      if (item.status === 'completed') {
        console.log(`  ✅ ${item.folder} - Success`);
      }
    });

    // Show failed episodes with brief error message
    results.forEach((item) => {
      if (item.status === 'failed' || item.status === 'error') {
        const errorMsg = item.result?.error || item.result?.message || 'Unknown error';
        // Truncate long error messages to ~60 characters
        const briefError = errorMsg.length > 60 ? errorMsg.substring(0, 57) + '...' : errorMsg;
        console.log(`  ❌ ${item.folder} - Failed: ${briefError}`);
      }
    });

    // Show skipped episodes
    skippedFolders.forEach((folder) => {
      console.log(`  ⚠️  ${folder} - Skipped (No Excel file)`);
    });

    // Display totals
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 TOTALS: ${processedCount} Success | ${skippedFolders.length} Skipped | ${failedFolders.length} Failed`);
    console.log(`${'='.repeat(60)}\n`);

    const successMessage = skippedFolders.length > 0
      ? `Worker pool parallel processing completed: ${processedCount} successful, ${failedFolders.length} failed, ${skippedFolders.length} skipped`
      : `Worker pool parallel processing completed: ${processedCount} successful, ${failedFolders.length} failed`;

    return {
      success: processedCount > 0,
      message: successMessage,
      processedCount: processedCount,
      totalSubfolders: subfolders.length,
      validFolders: validFolders.length,
      skippedFolders: skippedFolders.length,
      skippedFolderNames: skippedFolders,
      taskIds: validFolders,
      failedFolders: failedFolders.length > 0 ? failedFolders : null,
      parallel: true,
      maxConcurrent: maxConcurrent,
      results
    };

  } catch (error) {
    console.error(`❌ Parallel batch processing error: ${error.message}`);
    console.error(`❌ Error stack: ${error.stack}`);
    return {
      success: false,
      error: error.message,
      phase: 'parallel-batch-processing-error',
      processedCount: 0,
      totalSubfolders: 0,
      failedFolders: null,
      parallel: true
    };
  }
}

/**
 * Process batch folder operation
 */
async function processBatchFolder(parentFolderPath, prepareOnly, options) {
  const { readdirSync, statSync } = await import('fs');
  const path = await import('path');

  try {
    if (options.verbose) {
      console.error(`🔍 DEBUG: processBatchFolder called with: ${parentFolderPath}, prepareOnly: ${prepareOnly}`);
      console.error(`🔍 DEBUG: Config: ${options.config}`);
    }

    const items = readdirSync(parentFolderPath);
    if (options.verbose) {
      console.error(`🔍 DEBUG: Found ${items.length} items in parent folder: ${items.join(', ')}`);
    }

    // Check if main folder has Excel files (season level)
    const mainFolderFiles = items.filter(item => {
      const itemPath = path.join(parentFolderPath, item);
      const isFile = !statSync(itemPath).isDirectory();
      const isExcel = item.startsWith('0_desc') && item.endsWith('.xlsx');
      return isFile && isExcel;
    });

    const hasSeasonExcel = mainFolderFiles.length > 0;
    if (options.verbose) {
      console.error(`🔍 DEBUG: Found ${mainFolderFiles.length} Excel files in main folder (season level): ${mainFolderFiles.join(', ')}`);
    }

    const subfolders = items.filter(item => {
      const itemPath = path.join(parentFolderPath, item);
      const isDir = statSync(itemPath).isDirectory();
      if (options.verbose) {
        console.error(`🔍 DEBUG: Item ${item} -> ${itemPath} -> isDirectory: ${isDir}`);
      }
      return isDir;
    });

    // Build processing queue: main folder first (always try as season), then subfolders
    const foldersToProcess = [];

    // Always try to process main folder as season-level first
    foldersToProcess.push({
      path: parentFolderPath,
      name: path.basename(parentFolderPath),
      isSeasonLevel: true
    });
    if (options.verbose) {
      console.error(`🔍 DEBUG: Added main folder as season-level: ${path.basename(parentFolderPath)} ${hasSeasonExcel ? '(with Excel)' : '(without Excel)'}`);
    }
    console.error(`🎯 Season folder will be processed first, even if it fails`);

    for (const subfolder of subfolders) {
      foldersToProcess.push({
        path: path.join(parentFolderPath, subfolder),
        name: subfolder,
        isSeasonLevel: false
      });
    }

    if (options.verbose) {
      console.error(`🔍 DEBUG: Found ${subfolders.length} subfolders: ${subfolders.join(', ')}`);
    }
    console.error(`🚀 Starting batch ${prepareOnly ? 'preparation' : 'upload'} for ${foldersToProcess.length} folders (1 season + ${subfolders.length} episodes)`);

    const results = [];
    const failedFolders = [];
    let processedCount = 0;
    let seasonExcelPath = null;

    for (let i = 0; i < foldersToProcess.length; i++) {
      const folderInfo = foldersToProcess[i];
      const progress = Math.round(((i + 1) / foldersToProcess.length) * 100);

      const folderType = folderInfo.isSeasonLevel ? 'SEASON' : 'EPISODE';
      console.error(`📋 Processing ${folderType} folder ${i + 1}/${foldersToProcess.length} (${progress}%): ${folderInfo.name}`);
      if (options.verbose) {
        console.error(`🔍 DEBUG: folderPath: ${folderInfo.path}`);
      }

      const folderOptions = {
        ...options,
        folder: folderInfo.path,
        mode: prepareOnly ? 'prepare' : 'auto',
        isSeasonLevel: folderInfo.isSeasonLevel,  // Pass season level info
        seasonExcelPath: seasonExcelPath  // Pass season Excel path to episodes
      };

      if (options.verbose) {
        console.error(`🔍 DEBUG: folderOptions:`, safeStringify(folderOptions));
      }

      try {
        if (options.verbose) {
          console.error(`🔍 DEBUG: About to call ${prepareOnly ? 'prepareExcel' : 'oneMediaCompleteUpload'} for ${folderType} ${folderInfo.name}`);
        }

        let result;
        if (prepareOnly) {
          result = await prepareExcel(folderOptions);
        } else {
          result = await oneMediaCompleteUpload(folderOptions);
        }

        // After processing season, save the Excel path for episodes to use as template
        if (folderInfo.isSeasonLevel && result.success && result.excelPath) {
          seasonExcelPath = result.excelPath;
          if (options.verbose) {
            console.error(`🔍 DEBUG: Season Excel path saved: ${seasonExcelPath}`);
          }
        }

        if (options.verbose) {
          console.error(`🔍 DEBUG: Result for ${folderType} ${folderInfo.name}: success=${result.success}, phase=${result.phase || 'completed'}`);
        }

        if (result.success) {
          processedCount++;
          console.error(`✅ Successfully processed ${folderType}: ${folderInfo.name}`);
        } else {
          failedFolders.push(folderInfo.name);
          const errorMsg = result.error || 'Unknown error';
          console.error(`❌ Failed to process ${folderType}: ${folderInfo.name} - ${errorMsg}`);
          if (folderInfo.isSeasonLevel) {
            console.error(`⚠️  Season upload failed but continuing with episode uploads...`);
          }
        }
        results.push({
          folder: folderInfo.name,
          result,
          isSeasonLevel: folderInfo.isSeasonLevel
        });

      } catch (error) {
        if (options.verbose) {
          console.error(`🔍 DEBUG: Exception caught for ${folderType} ${folderInfo.name}:`, error);
        }
        failedFolders.push(folderInfo.name);
        console.error(`❌ Error processing ${folderType}: ${folderInfo.name} - ${error.message}`);
        if (folderInfo.isSeasonLevel) {
          console.error(`⚠️  Season upload failed but continuing with episode uploads...`);
        }
        results.push({
          folder: folderInfo.name,
          result: {
            success: false,
            error: error.message
          },
          isSeasonLevel: folderInfo.isSeasonLevel
        });
      }

      if (options.verbose) {
        console.error(`🔍 DEBUG: Completed iteration ${i + 1}, processedCount: ${processedCount}, failedFolders: ${failedFolders.length}`);
      }
    }

    // Final summary
    const seasonCount = 1; // Always process 1 season (main folder)
    const episodeCount = subfolders.length;
    console.error(`🎉 Batch processing completed: ${processedCount}/${foldersToProcess.length} successful, ${failedFolders.length} failed (${seasonCount} season + ${episodeCount} episodes)`);
    if (failedFolders.length > 0) {
      console.error(`❌ Failed folders: ${failedFolders.join(', ')}`);
    }

    return {
      success: processedCount > 0 && failedFolders.length === 0,
      message: `Batch processing completed`,
      processedCount: processedCount,
      totalFolders: foldersToProcess.length,
      seasonCount: seasonCount,
      episodeCount: episodeCount,
      totalSubfolders: subfolders.length,  // Keep for backward compatibility
      failedFolders: failedFolders.length > 0 ? failedFolders : null,
      results
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      phase: 'batch-processing-error',
      processedCount: 0,
      totalSubfolders: 0,
      failedFolders: null
    };
  }
}

// Run CLI if this file is executed directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}