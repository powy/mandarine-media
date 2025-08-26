import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';

/**
 * Check if a file exists and is accessible
 * @param {string} filePath - Path to the file to check
 * @returns {Promise<boolean>} - True if file exists and is readable
 */
export async function checkFileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Get image metadata using Sharp
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Object>} - Image metadata including dimensions and size
 */
export async function getImageMetadata(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const metadata = await sharp(filePath).metadata();
    
    return {
      fileName: path.basename(filePath),
      fileSizeBytes: stats.size,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
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