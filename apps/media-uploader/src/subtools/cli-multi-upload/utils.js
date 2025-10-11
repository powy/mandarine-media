/**
 * CLI Multi-Upload Utility Functions
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Parse folder paths from a text file
 * @param {string} filePath - Path to text file containing folder paths (one per line)
 * @returns {Promise<string[]>} Array of folder paths
 */
export async function parseFoldersFromFile(filePath) {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`Folders file not found: ${filePath}`);
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  // Filter out empty lines and comments (lines starting with #)
  const folders = lines
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (folders.length === 0) {
    throw new Error(`No folder paths found in file: ${filePath}`);
  }

  return folders;
}

/**
 * Parse comma-separated folder paths
 * @param {string} foldersString - Comma-separated folder paths
 * @returns {string[]} Array of folder paths
 */
export function parseFoldersFromString(foldersString) {
  const folders = foldersString
    .split(',')
    .map(folder => folder.trim())
    .filter(folder => folder.length > 0);

  if (folders.length === 0) {
    throw new Error('No folder paths provided');
  }

  return folders;
}

/**
 * Resolve folder paths to absolute paths
 * @param {string[]} folderPaths - Array of folder paths (can be relative or absolute)
 * @param {string} basePath - Base path for resolving relative paths (default: cwd)
 * @returns {string[]} Array of absolute folder paths
 */
export function resolveFolderPaths(folderPaths, basePath = process.cwd()) {
  return folderPaths.map(folderPath => {
    if (path.isAbsolute(folderPath)) {
      return folderPath;
    }
    return path.resolve(basePath, folderPath);
  });
}

/**
 * Validate and filter folder paths
 * @param {string[]} folderPaths - Array of folder paths
 * @returns {Promise<Object>} Object with valid and invalid folders
 */
export async function validateFolderPaths(folderPaths) {
  const valid = [];
  const invalid = [];

  for (const folderPath of folderPaths) {
    try {
      if (await fs.pathExists(folderPath)) {
        const stat = await fs.stat(folderPath);
        if (stat.isDirectory()) {
          valid.push(folderPath);
        } else {
          invalid.push({ path: folderPath, reason: 'Not a directory' });
        }
      } else {
        invalid.push({ path: folderPath, reason: 'Path does not exist' });
      }
    } catch (error) {
      invalid.push({ path: folderPath, reason: error.message });
    }
  }

  return { valid, invalid };
}

/**
 * Format duration in human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Create a summary report of upload results
 * @param {Object} results - Upload results object
 * @returns {string} Formatted summary report
 */
export function createSummaryReport(results) {
  const lines = [];

  lines.push('');
  lines.push('='.repeat(60));
  lines.push('UPLOAD SUMMARY REPORT');
  lines.push('='.repeat(60));
  lines.push('');

  lines.push(`Total Folders: ${results.totalFolders}`);
  lines.push(`Successful: ${results.successCount}`);
  lines.push(`Failed: ${results.failedCount}`);
  if (results.skippedCount > 0) {
    lines.push(`Skipped: ${results.skippedCount}`);
  }
  lines.push('');

  if (results.results && results.results.length > 0) {
    lines.push('DETAILED RESULTS:');
    lines.push('-'.repeat(60));

    results.results.forEach((result, index) => {
      const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
      const duration = result.duration || 'N/A';

      lines.push(`${index + 1}. ${status} - ${result.folderName} (${duration}s)`);
      lines.push(`   Path: ${result.folder}`);

      if (result.success && result.result?.mediaDescriptionId) {
        lines.push(`   Media ID: ${result.result.mediaDescriptionId}`);
      }

      if (!result.success && result.error) {
        lines.push(`   Error: ${result.error}`);
      }

      lines.push('');
    });
  }

  if (results.invalidFolders && results.invalidFolders.length > 0) {
    lines.push('SKIPPED FOLDERS:');
    lines.push('-'.repeat(60));

    results.invalidFolders.forEach((invalid, index) => {
      lines.push(`${index + 1}. ${path.basename(invalid.path)}`);
      lines.push(`   Path: ${invalid.path}`);
      lines.push(`   Reason: ${invalid.reason}`);
      lines.push('');
    });
  }

  lines.push('='.repeat(60));
  lines.push('');

  return lines.join('\n');
}

export default {
  parseFoldersFromFile,
  parseFoldersFromString,
  resolveFolderPaths,
  validateFolderPaths,
  formatDuration,
  createSummaryReport
};
