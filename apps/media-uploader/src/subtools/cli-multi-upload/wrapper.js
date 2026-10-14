/**
 * CLI Multi-Upload Wrapper
 * External API for programmatic usage of multi-upload functionality
 */

import { multiUploadFromList, multiUploadFromParent } from './multiUpload.js';
import {
  parseFoldersFromFile,
  parseFoldersFromString,
  resolveFolderPaths
} from './utils.js';
import { createFileLogger, redirectConsoleToLogger } from '../../shared/utils/fileLogger.js';

/**
 * Multi-upload from explicit folder list
 * @param {Object} options - Upload options
 * @param {string} options.config - Path to INI configuration file
 * @param {string[]} options.folders - Array of folder paths
 * @param {number} [options.delay=10] - Delay in seconds between starts
 * @param {number} [options.maxConcurrent] - Maximum concurrent uploads
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Upload results
 *
 * @example
 * const result = await cliMultiUpload({
 *   config: './config.ini',
 *   folders: ['/path/folder1', '/path/folder2'],
 *   delay: 10,
 *   verbose: true
 * });
 */
export async function cliMultiUpload(options) {
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
    if (!options.config) {
      throw new Error('config path is required');
    }

    if (!options.folders || !Array.isArray(options.folders)) {
      throw new Error('folders array is required');
    }

    // Resolve folder paths to absolute
    const resolvedFolders = resolveFolderPaths(options.folders);

    return await multiUploadFromList(options.config, resolvedFolders, {
      delay: options.delay || 10,
      maxConcurrent: options.maxConcurrent || null,
      verbose: options.verbose || false
    });
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

/**
 * Multi-upload from parent folder (auto-detect subfolders)
 * @param {Object} options - Upload options
 * @param {string} options.config - Path to INI configuration file
 * @param {string} options.parentFolder - Parent folder path
 * @param {number} [options.delay=10] - Delay in seconds between starts
 * @param {number} [options.maxConcurrent] - Maximum concurrent uploads
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Upload results
 *
 * @example
 * const result = await cliMultiUploadFromParent({
 *   config: './config.ini',
 *   parentFolder: '/path/to/season',
 *   delay: 10,
 *   verbose: true
 * });
 */
export async function cliMultiUploadFromParent(options) {
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
    if (!options.config) {
      throw new Error('config path is required');
    }

    if (!options.parentFolder) {
      throw new Error('parentFolder path is required');
    }

    return await multiUploadFromParent(options.config, options.parentFolder, {
      delay: options.delay || 10,
      maxConcurrent: options.maxConcurrent || null,
      verbose: options.verbose || false
    });
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

/**
 * Multi-upload from text file containing folder paths
 * @param {Object} options - Upload options
 * @param {string} options.config - Path to INI configuration file
 * @param {string} options.foldersFile - Path to text file with folder paths
 * @param {number} [options.delay=10] - Delay in seconds between starts
 * @param {number} [options.maxConcurrent] - Maximum concurrent uploads
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Upload results
 *
 * @example
 * const result = await cliMultiUploadFromFile({
 *   config: './config.ini',
 *   foldersFile: './folders.txt',
 *   delay: 10,
 *   verbose: true
 * });
 */
export async function cliMultiUploadFromFile(options) {
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
    if (!options.config) {
      throw new Error('config path is required');
    }

    if (!options.foldersFile) {
      throw new Error('foldersFile path is required');
    }

    // Parse folders from file
    const folderPaths = await parseFoldersFromFile(options.foldersFile);

    // Resolve to absolute paths
    const resolvedFolders = resolveFolderPaths(folderPaths);

    return await multiUploadFromList(options.config, resolvedFolders, {
      delay: options.delay || 10,
      maxConcurrent: options.maxConcurrent || null,
      verbose: options.verbose || false
    });
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

/**
 * Multi-upload from comma-separated folder list string
 * @param {Object} options - Upload options
 * @param {string} options.config - Path to INI configuration file
 * @param {string} options.foldersString - Comma-separated folder paths
 * @param {number} [options.delay=10] - Delay in seconds between starts
 * @param {number} [options.maxConcurrent] - Maximum concurrent uploads
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Upload results
 *
 * @example
 * const result = await cliMultiUploadFromString({
 *   config: './config.ini',
 *   foldersString: '/path/folder1,/path/folder2,/path/folder3',
 *   delay: 10,
 *   verbose: true
 * });
 */
export async function cliMultiUploadFromString(options) {
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
    if (!options.config) {
      throw new Error('config path is required');
    }

    if (!options.foldersString) {
      throw new Error('foldersString is required');
    }

    // Parse folders from string
    const folderPaths = parseFoldersFromString(options.foldersString);

    // Resolve to absolute paths
    const resolvedFolders = resolveFolderPaths(folderPaths);

    return await multiUploadFromList(options.config, resolvedFolders, {
      delay: options.delay || 10,
      maxConcurrent: options.maxConcurrent || null,
      verbose: options.verbose || false
    });
  } finally {
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

export default {
  cliMultiUpload,
  cliMultiUploadFromParent,
  cliMultiUploadFromFile,
  cliMultiUploadFromString
};

// ============================================================================
// CLI Interface (standalone entry point; originally built for the Tauri app)
// ============================================================================

/**
 * CLI main function for command-line invocation
 * Supports all four multi-upload modes
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    config: null,
    delay: 10,
    maxConcurrent: 3,
    verbose: false,
    logFile: null
  };

  let mode = null; // 'parent', 'file', 'string', 'list'
  let parentFolder = null;
  let foldersFile = null;
  let foldersString = null;
  let folders = [];

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
        options.config = args[i + 1];
        i++;
        break;
      case '--parent-folder':
        mode = 'parent';
        parentFolder = args[i + 1];
        i++;
        break;
      case '--folders-file':
        mode = 'file';
        foldersFile = args[i + 1];
        i++;
        break;
      case '--folders-string':
        mode = 'string';
        foldersString = args[i + 1];
        i++;
        break;
      case '--folders':
        mode = 'list';
        folders = args[i + 1].split(',');
        i++;
        break;
      case '--delay':
        options.delay = parseInt(args[i + 1]);
        i++;
        break;
      case '--max-concurrent':
        options.maxConcurrent = parseInt(args[i + 1]);
        i++;
        break;
      case '--log-file':
        options.logFile = args[i + 1];
        i++;
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }

  try {
    let result;

    switch (mode) {
      case 'parent':
        result = await cliMultiUploadFromParent({
          ...options,
          parentFolder
        });
        break;
      case 'file':
        result = await cliMultiUploadFromFile({
          ...options,
          foldersFile
        });
        break;
      case 'string':
        result = await cliMultiUploadFromString({
          ...options,
          foldersString
        });
        break;
      case 'list':
        result = await cliMultiUpload({
          ...options,
          folders
        });
        break;
      default:
        throw new Error('Mode not specified. Use --parent-folder, --folders-file, --folders-string, or --folders');
    }

    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }, null, 2));
    process.exit(1);
  }
}

// Run CLI if executed directly
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const isMainModule = process.argv[1] && (
  import.meta.url === pathToFileURL(process.argv[1]).href ||
  fileURLToPath(import.meta.url) === process.argv[1]
);

if (isMainModule) {
  main();
}
