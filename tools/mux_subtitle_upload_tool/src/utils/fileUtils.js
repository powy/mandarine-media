import fs from 'fs-extra';
import path from 'path';

/**
 * Load and parse configuration file
 */
export async function loadConfigFile(configPath) {
  try {
    // Resolve relative paths
    const resolvedPath = path.resolve(configPath);
    
    // Check if file exists
    if (!await fs.pathExists(resolvedPath)) {
      throw new Error(`Configuration file not found: ${resolvedPath}`);
    }
    
    // Read and parse JSON
    const configContent = await fs.readFile(resolvedPath, 'utf8');
    let config;
    
    try {
      config = JSON.parse(configContent);
    } catch (parseError) {
      throw new Error(`Invalid JSON in configuration file: ${parseError.message}`);
    }
    
    return {
      config: config,
      configPath: resolvedPath
    };
    
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error.message}`);
  }
}

/**
 * Ensure directory exists, create if not
 */
export async function ensureDirectory(dirPath) {
  try {
    await fs.ensureDir(dirPath);
    return true;
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Get file extension and validate it's a subtitle format
 */
export function validateSubtitleExtension(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const supportedFormats = ['.srt', '.vtt', '.sbv'];
  
  return {
    extension: extension,
    isSupported: supportedFormats.includes(extension),
    supportedFormats: supportedFormats
  };
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get basic file information
 */
export async function getFileInfo(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    return {
      path: filePath,
      name: path.basename(filePath),
      extension: extension,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      modified: stats.mtime,
      created: stats.birthtime
    };
  } catch (error) {
    throw new Error(`Failed to get file info for ${filePath}: ${error.message}`);
  }
}

/**
 * Validate subtitle file content (basic check)
 */
export async function validateSubtitleContent(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const extension = path.extname(filePath).toLowerCase();
    
    const validation = {
      isEmpty: content.trim().length === 0,
      hasTimecodes: false,
      hasProperFormat: false,
      lineCount: content.split('\n').length
    };
    
    // Basic format checks
    switch (extension) {
      case '.srt':
        validation.hasTimecodes = content.includes('-->');
        validation.hasProperFormat = /^\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(content);
        break;
        
      case '.vtt':
        validation.hasTimecodes = content.includes('-->');
        validation.hasProperFormat = content.startsWith('WEBVTT');
        break;
        
      case '.sbv':
        validation.hasTimecodes = content.includes(',');
        validation.hasProperFormat = /\d{1,2}:\d{2}:\d{2}\.\d{3},\d{1,2}:\d{2}:\d{2}\.\d{3}/.test(content);
        break;
    }
    
    return validation;
  } catch (error) {
    throw new Error(`Failed to validate subtitle content: ${error.message}`);
  }
}