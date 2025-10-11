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

/**
 * Multi-upload from explicit folder list
 * @param {Object} options - Upload options
 * @param {string} options.config - Path to INI configuration file
 * @param {string[]} options.folders - Array of folder paths
 * @param {number} [options.delay=10] - Delay in seconds between starts
 * @param {number} [options.maxConcurrent] - Maximum concurrent uploads
 * @param {boolean} [options.verbose=false] - Verbose logging
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
}

/**
 * Multi-upload from parent folder (auto-detect subfolders)
 * @param {Object} options - Upload options
 * @param {string} options.config - Path to INI configuration file
 * @param {string} options.parentFolder - Parent folder path
 * @param {number} [options.delay=10] - Delay in seconds between starts
 * @param {number} [options.maxConcurrent] - Maximum concurrent uploads
 * @param {boolean} [options.verbose=false] - Verbose logging
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
}

/**
 * Multi-upload from text file containing folder paths
 * @param {Object} options - Upload options
 * @param {string} options.config - Path to INI configuration file
 * @param {string} options.foldersFile - Path to text file with folder paths
 * @param {number} [options.delay=10] - Delay in seconds between starts
 * @param {number} [options.maxConcurrent] - Maximum concurrent uploads
 * @param {boolean} [options.verbose=false] - Verbose logging
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
}

/**
 * Multi-upload from comma-separated folder list string
 * @param {Object} options - Upload options
 * @param {string} options.config - Path to INI configuration file
 * @param {string} options.foldersString - Comma-separated folder paths
 * @param {number} [options.delay=10] - Delay in seconds between starts
 * @param {number} [options.maxConcurrent] - Maximum concurrent uploads
 * @param {boolean} [options.verbose=false] - Verbose logging
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
}

export default {
  cliMultiUpload,
  cliMultiUploadFromParent,
  cliMultiUploadFromFile,
  cliMultiUploadFromString
};
