import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs-extra';

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
    // Tauri bundled structure
    path.resolve(process.resourcesPath || process.cwd(), 'src', 'subtools', productionSubpath),
    // Alternative bundled path - this is where Tauri actually puts files
    path.resolve(process.cwd(), '_up_', 'src', 'subtools', productionSubpath),
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
    const configReaderPath = resolveModulePath('../upload-gui/config/configReader.js', 'upload-gui/config/configReader.js');
    const moduleURL2 = pathToFileURL(configReaderPath).href;
    console.log(`🔍 Importing ConfigReader from URL: ${moduleURL2}`);
    const configReaderModule = await import(moduleURL2);

    return {
      OneMediaCompleteUpload: indexModule.OneMediaCompleteUpload,
      ConfigReader: configReaderModule.ConfigReader
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

/**
 * Convert INI config to temporary JSON file for one-media-complete-upload
 * @param {string} configPath - Path to INI or JSON config file
 * @returns {Promise<string|null>} Path to JSON config file (temp or original)
 */
async function prepareConfig(configPath) {
  if (!configPath) return null;

  try {
    // Ensure dependencies are loaded
    await dependenciesPromise;

    // Check if config is INI file
    if (configPath.endsWith('.ini')) {
      // Convert INI to JSON using ConfigReader
      const jsonConfig = ConfigReader.readConfig(configPath);

      // Create temporary JSON file path
      const tempPath = configPath.replace('.ini', '.tmp.json');

      // Write JSON config to temporary file
      await fs.writeJson(tempPath, jsonConfig, { spaces: 2 });

      return tempPath;
    }

    // Already JSON or other format, use as-is
    return configPath;
  } catch (error) {
    console.error(`Failed to prepare config from ${configPath}:`, error.message);
    throw new Error(`Config conversion failed: ${error.message}`);
  }
}

/**
 * Clean up temporary config file
 * @param {string} configPath - Path to temp config file to remove
 */
async function cleanupConfig(configPath) {
  if (configPath && configPath.includes('.tmp.json')) {
    try {
      await fs.remove(configPath);
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Failed to cleanup temp config ${configPath}:`, error.message);
    }
  }
}

/**
 * Prepare Excel file with template and auto-fill Files sheet
 * @param {Object} options - Preparation options
 * @param {string} options.config - Configuration file path
 * @param {string} options.folder - Folder path containing media files
 * @param {boolean} options.verbose - Verbose output
 * @returns {Promise<Object>} Excel preparation results
 */
export async function prepareExcel(options) {
  console.error(`🔍 DEBUG: prepareExcel called with folder: ${options.folder}`);
  let configPath = null;
  try {
    // Ensure dependencies are loaded
    await dependenciesPromise;
    console.error(`🔍 DEBUG: Dependencies loaded successfully`);

    // Convert config if needed
    configPath = await prepareConfig(options.config);
    console.error(`🔍 DEBUG: prepareExcel config prepared: ${configPath}`);

    const uploader = new OneMediaCompleteUpload({
      ...options,
      config: configPath,
      mode: 'prepare'
    });
    console.error(`🔍 DEBUG: prepareExcel OneMediaCompleteUpload instance created`);

    const result = await uploader.prepareExcel();
    console.error(`🔍 DEBUG: prepareExcel result:`, safeStringify(result));

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
    // Config cleanup is handled by the parent processBatchFolder function
  }
}

/**
 * Execute upload process (assumes Excel file already exists and is filled)
 * @param {Object} options - Upload options
 * @param {string} options.config - Configuration file path
 * @param {string} options.folder - Folder path containing media files
 * @param {boolean} options.verbose - Verbose output
 * @returns {Promise<Object>} Upload results
 */
export async function executeUpload(options) {
  let configPath = null;
  try {
    // Ensure dependencies are loaded
    await dependenciesPromise;
    console.error(`🔍 DEBUG: Dependencies loaded successfully`);

    // Convert config if needed
    configPath = await prepareConfig(options.config);

    const uploader = new OneMediaCompleteUpload({
      ...options,
      config: configPath,
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
    // Clean up temporary config file
    await cleanupConfig(configPath);
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
 * @returns {Promise<Object>} Upload results with detailed context
 */
export async function oneMediaCompleteUpload(options) {
  let configPath = null;
  try {
    // Convert config if needed
    configPath = await prepareConfig(options.config);

    const uploader = new OneMediaCompleteUpload({
      ...options,
      config: configPath
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
    // Clean up temporary config file
    await cleanupConfig(configPath);
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
 * CLI interface for Tauri backend calls
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
    verbose: true
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

    // Output result as JSON for Tauri to parse (using safe stringify to avoid circular references)
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
 * Process batch folder operation with parallel uploads
 */
async function processBatchFolderParallel(parentFolderPath, options, maxConcurrent = 3) {
  const { readdirSync, statSync } = await import('fs');
  const path = await import('path');
  let configPath = null;

  try {
    // Convert config once for all subfolders
    configPath = await prepareConfig(options.config);

    const items = readdirSync(parentFolderPath);
    const subfolders = items.filter(item => {
      const itemPath = path.join(parentFolderPath, item);
      return statSync(itemPath).isDirectory();
    });

    console.log(`🚀 Starting parallel batch upload for ${subfolders.length} folders (max ${maxConcurrent} concurrent)`);

    // Process folders in parallel with limited concurrency
    const results = [];
    const failedFolders = [];
    let processedCount = 0;
    let completedCount = 0;

    // Process in chunks based on maxConcurrent
    for (let i = 0; i < subfolders.length; i += maxConcurrent) {
      const chunk = subfolders.slice(i, i + maxConcurrent);
      const chunkNumber = Math.floor(i / maxConcurrent) + 1;
      const totalChunks = Math.ceil(subfolders.length / maxConcurrent);

      console.log(`📋 Processing chunk ${chunkNumber}/${totalChunks}: ${chunk.join(', ')}`);

      const chunkPromises = chunk.map(async (subfolder) => {
        const subfolderPath = path.join(parentFolderPath, subfolder);
        console.log(`🚀 Starting upload: ${subfolder}`);

        const subfolderOptions = {
          ...options,
          config: configPath,
          folder: subfolderPath,
          mode: 'auto'
        };

        try {
          const result = await oneMediaCompleteUpload(subfolderOptions);

          completedCount++;
          const overallProgress = Math.round((completedCount / subfolders.length) * 100);

          if (result.success) {
            processedCount++;
            console.log(`✅ Successfully uploaded: ${subfolder} (${completedCount}/${subfolders.length} - ${overallProgress}%)`);
          } else {
            failedFolders.push(subfolder);
            console.log(`❌ Failed to upload: ${subfolder} - ${result.error || 'Unknown error'} (${completedCount}/${subfolders.length} - ${overallProgress}%)`);
          }

          return { folder: subfolder, result };
        } catch (error) {
          completedCount++;
          const overallProgress = Math.round((completedCount / subfolders.length) * 100);
          failedFolders.push(subfolder);
          console.log(`❌ Error uploading: ${subfolder} - ${error.message} (${completedCount}/${subfolders.length} - ${overallProgress}%)`);
          return {
            folder: subfolder,
            result: {
              success: false,
              error: error.message
            }
          };
        }
      });

      // Wait for current chunk to complete
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      console.log(`📋 Completed chunk ${chunkNumber}/${totalChunks}`);
    }

    // Final summary
    console.log(`🎉 Parallel batch upload completed: ${processedCount}/${subfolders.length} successful, ${failedFolders.length} failed`);
    if (failedFolders.length > 0) {
      console.log(`❌ Failed uploads: ${failedFolders.join(', ')}`);
    }

    return {
      success: processedCount > 0,
      message: `Parallel batch processing completed`,
      processedCount: processedCount,
      totalSubfolders: subfolders.length,
      taskIds: subfolders,
      failedFolders: failedFolders.length > 0 ? failedFolders : null,
      parallel: true,
      maxConcurrent: maxConcurrent,
      results
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      phase: 'parallel-batch-processing-error',
      processedCount: 0,
      totalSubfolders: 0,
      failedFolders: null,
      parallel: true
    };
  } finally {
    // Clean up temporary config file
    await cleanupConfig(configPath);
  }
}

/**
 * Process batch folder operation
 */
async function processBatchFolder(parentFolderPath, prepareOnly, options) {
  const { readdirSync, statSync } = await import('fs');
  const path = await import('path');
  let configPath = null;

  try {
    console.error(`🔍 DEBUG: processBatchFolder called with: ${parentFolderPath}, prepareOnly: ${prepareOnly}`);

    // Convert config once for all subfolders
    configPath = await prepareConfig(options.config);
    console.error(`🔍 DEBUG: Config prepared: ${configPath}`);

    const items = readdirSync(parentFolderPath);
    console.error(`🔍 DEBUG: Found ${items.length} items in parent folder: ${items.join(', ')}`);

    const subfolders = items.filter(item => {
      const itemPath = path.join(parentFolderPath, item);
      const isDir = statSync(itemPath).isDirectory();
      console.error(`🔍 DEBUG: Item ${item} -> ${itemPath} -> isDirectory: ${isDir}`);
      return isDir;
    });

    console.error(`🔍 DEBUG: Found ${subfolders.length} subfolders: ${subfolders.join(', ')}`);
    console.error(`🚀 Starting batch ${prepareOnly ? 'preparation' : 'upload'} for ${subfolders.length} folders`);

    const results = [];
    const failedFolders = [];
    let processedCount = 0;

    for (let i = 0; i < subfolders.length; i++) {
      const subfolder = subfolders[i];
      const subfolderPath = path.join(parentFolderPath, subfolder);
      const progress = Math.round(((i + 1) / subfolders.length) * 100);

      console.error(`📋 Processing folder ${i + 1}/${subfolders.length} (${progress}%): ${subfolder}`);
      console.error(`🔍 DEBUG: subfolderPath: ${subfolderPath}`);

      const subfolderOptions = {
        ...options,
        config: configPath,
        folder: subfolderPath,
        mode: prepareOnly ? 'prepare' : 'auto'
      };

      console.error(`🔍 DEBUG: subfolderOptions:`, safeStringify(subfolderOptions));

      try {
        console.error(`🔍 DEBUG: About to call ${prepareOnly ? 'prepareExcel' : 'oneMediaCompleteUpload'} for ${subfolder}`);

        let result;
        if (prepareOnly) {
          result = await prepareExcel(subfolderOptions);
        } else {
          result = await oneMediaCompleteUpload(subfolderOptions);
        }

        console.error(`🔍 DEBUG: Result for ${subfolder}:`, safeStringify(result));

        if (result.success) {
          processedCount++;
          console.error(`✅ Successfully processed: ${subfolder}`);
        } else {
          failedFolders.push(subfolder);
          console.error(`❌ Failed to process: ${subfolder} - ${result.error || 'Unknown error'}`);
        }
        results.push({ folder: subfolder, result });

      } catch (error) {
        console.error(`🔍 DEBUG: Exception caught for ${subfolder}:`, error);
        failedFolders.push(subfolder);
        console.error(`❌ Error processing: ${subfolder} - ${error.message}`);
        results.push({
          folder: subfolder,
          result: {
            success: false,
            error: error.message
          }
        });
      }

      console.error(`🔍 DEBUG: Completed iteration ${i + 1}, processedCount: ${processedCount}, failedFolders: ${failedFolders.length}`);
    }

    // Final summary
    console.error(`🎉 Batch processing completed: ${processedCount}/${subfolders.length} successful, ${failedFolders.length} failed`);
    if (failedFolders.length > 0) {
      console.error(`❌ Failed folders: ${failedFolders.join(', ')}`);
    }

    return {
      success: processedCount > 0 && failedFolders.length === 0,
      message: `Batch processing completed`,
      processedCount: processedCount,
      totalSubfolders: subfolders.length,
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
  } finally {
    // Clean up temporary config file
    await cleanupConfig(configPath);
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}