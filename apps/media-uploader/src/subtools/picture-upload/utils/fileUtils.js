import fs from 'fs-extra';
import path from 'path';
import Jimp from 'jimp';

/**
 * Sanitize file path by removing invisible Unicode characters
 * @param {string} filePath - Path to sanitize
 * @returns {string} Cleaned path
 */
export function sanitizePath(filePath) {
  if (!filePath) return filePath;

  return filePath
    .trim()  // Remove leading/trailing whitespace
    .normalize('NFC')  // Normalize Unicode to composed form
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u206F\uFEFF]/g, '');  // Remove all Unicode control characters
}

/**
 * Check if a file exists and is accessible
 * @param {string} filePath - Path to the file to check
 * @returns {Promise<boolean>} - True if file exists and is readable
 */
export async function checkFileExists(filePath) {
  try {
    const cleanPath = sanitizePath(filePath);
    await fs.access(cleanPath, fs.constants.F_OK | fs.constants.R_OK);
    const stats = await fs.stat(cleanPath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Get image metadata using Jimp
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Object>} - Image metadata including dimensions and size
 */
export async function getImageMetadata(filePath) {
  try {
    const cleanPath = sanitizePath(filePath);
    const stats = await fs.stat(cleanPath);
    const image = await Jimp.read(cleanPath);

    // Map Jimp MIME type to format name
    const formatMap = {
      'image/png': 'png',
      'image/jpeg': 'jpeg',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff',
      'image/gif': 'gif'
    };

    return {
      fileName: path.basename(cleanPath),
      fileSizeBytes: stats.size,
      width: image.getWidth(),
      height: image.getHeight(),
      format: formatMap[image.getMIME()] || 'unknown'
    };
  } catch (error) {
    throw new Error(`Failed to read image metadata: ${error.message}`);
  }
}

/**
 * Load and parse JSON configuration file
 * @param {string} configPath - Path to the JSON config file
 * @returns {Promise<Object>} - Parsed configuration object
 */
export async function loadConfigFile(configPath) {
  try {
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Configuration file not found: ${configPath}`);
    } else if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file: ${error.message}`);
    }
    throw new Error(`Failed to load configuration: ${error.message}`);
  }
}