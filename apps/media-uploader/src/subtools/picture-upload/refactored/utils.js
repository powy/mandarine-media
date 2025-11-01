import { SUPPORTED_FORMATS, FORMAT_TO_FIELD_MAP } from './types.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Validates that a format is one of the 5 supported formats
 * @param {string} format - Format to validate (e.g., '1920_1080')
 * @throws {Error} If format is not supported
 */
export function validatePictureFormat(format) {
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw new Error(
      `Invalid picture format: "${format}". ` +
      `Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
    );
  }
}

/**
 * Gets the media description field name for a given format
 * @param {string} format - Picture format (e.g., '1920_1080')
 * @returns {string} Field name (e.g., 'image_1920_1080_id')
 */
export function getMediaDescriptionFieldName(format) {
  validatePictureFormat(format);
  return FORMAT_TO_FIELD_MAP[format];
}

/**
 * Normalizes format string to underscore separator
 * Handles: '1920x1080' -> '1920_1080', '1920_1080' -> '1920_1080'
 * @param {string} format - Format string with 'x' or '_'
 * @returns {string} Normalized format with underscore
 */
export function normalizeFormat(format) {
  return format.replace('x', '_').replace('×', '_').replace('-', '_');
}

/**
 * Scans a folder for image files (png, jpg, jpeg, webp)
 * @param {string} folderPath - Folder to scan
 * @returns {Promise<string[]>} Array of absolute image file paths
 */
export async function scanFolderForImages(folderPath) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const imagePaths = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (imageExtensions.includes(ext)) {
          imagePaths.push(path.join(folderPath, entry.name));
        }
      }
    }

    return imagePaths;
  } catch (error) {
    throw new Error(`Failed to scan folder for images: ${error.message}`);
  }
}

/**
 * Validates that required config sections exist
 * @param {Object} config - Configuration object
 * @param {string[]} requiredSections - Required top-level keys
 * @throws {Error} If any required section is missing
 */
export function validateConfig(config, requiredSections = ['s3', 'api']) {
  for (const section of requiredSections) {
    if (!config[section]) {
      throw new Error(`Missing required config section: ${section}`);
    }
  }

  // Validate S3 pictures section
  if (config.s3 && !config.s3.pictures) {
    throw new Error('Missing required config section: s3.pictures');
  }
}

/**
 * Generates a random ID for placeholder URLs
 * @returns {string} 8-character alphanumeric string
 */
export function generateRandomId() {
  return Math.random().toString(36).substring(2, 10);
}
