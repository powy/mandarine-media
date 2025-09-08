import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { MuxUploadError, ErrorCodes, handleFileError } from './errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function validateVideoFile(filepath) {
  try {
    // Check if file exists and is readable
    await fs.access(filepath, fs.constants.F_OK | fs.constants.R_OK);
    
    // Get file stats
    const stats = await fs.stat(filepath);
    
    // Check if it's actually a file
    if (!stats.isFile()) {
      throw new MuxUploadError(
        `Path is not a file: ${filepath}`,
        ErrorCodes.INVALID_FILE_FORMAT,
        { filepath, isDirectory: stats.isDirectory() }
      );
    }
    
    // Check file size (minimum 1KB, maximum 100GB)
    const fileSize = stats.size;
    const minSize = 1024; // 1KB
    const maxSize = 100 * 1024 * 1024 * 1024; // 100GB
    
    if (fileSize < minSize) {
      throw new MuxUploadError(
        `File too small: ${filepath} (${fileSize} bytes). Minimum size is ${minSize} bytes.`,
        ErrorCodes.INVALID_FILE_FORMAT,
        { filepath, fileSize, minSize }
      );
    }
    
    if (fileSize > maxSize) {
      throw new MuxUploadError(
        `File too large: ${filepath} (${fileSize} bytes). Maximum size is ${maxSize} bytes.`,
        ErrorCodes.FILE_TOO_LARGE,
        { filepath, fileSize, maxSize }
      );
    }
    
    // Check file extension
    const ext = path.extname(filepath).toLowerCase();
    const supportedExtensions = [
      '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm',
      '.m4v', '.3gp', '.3g2', '.f4v', '.asf', '.rm', '.rmvb',
      '.vob', '.ogv', '.dv', '.ts', '.mts', '.m2ts'
    ];
    
    if (!supportedExtensions.includes(ext)) {
      throw new MuxUploadError(
        `Unsupported file format: ${ext}. Supported formats: ${supportedExtensions.join(', ')}`,
        ErrorCodes.INVALID_FILE_FORMAT,
        { filepath, extension: ext, supportedExtensions }
      );
    }
    
    return {
      filepath: path.resolve(filepath),
      filename: path.basename(filepath),
      extension: ext,
      size: fileSize,
      sizeFormatted: formatFileSize(fileSize),
      lastModified: stats.mtime.toISOString()
    };
    
  } catch (error) {
    if (error instanceof MuxUploadError) {
      throw error;
    }
    handleFileError(error, filepath, 'File validation');
  }
}

export async function loadConfigFile(configPath) {
  try {
    // Check if config file exists
    await fs.access(configPath, fs.constants.F_OK | fs.constants.R_OK);
    
    // Read and parse JSON config
    const configContent = await fs.readFile(configPath, 'utf8');
    
    try {
      const config = JSON.parse(configContent);
      return {
        config,
        configPath: path.resolve(configPath),
        configDir: path.dirname(path.resolve(configPath))
      };
    } catch (parseError) {
      throw new MuxUploadError(
        `Invalid JSON in config file: ${configPath}`,
        ErrorCodes.CONFIG_PARSE_ERROR,
        { configPath, parseError: parseError.message }
      );
    }
    
  } catch (error) {
    if (error instanceof MuxUploadError) {
      throw error;
    }
    
    if (error.code === 'ENOENT') {
      throw new MuxUploadError(
        `Configuration file not found: ${configPath}`,
        ErrorCodes.CONFIG_NOT_FOUND,
        { configPath }
      );
    }
    
    handleFileError(error, configPath, 'Configuration loading');
  }
}

export function createReadStream(filepath, options = {}) {
  try {
    const stream = fs.createReadStream(filepath, {
      highWaterMark: options.chunkSize || 64 * 1024, // 64KB default
      ...options
    });
    
    // Handle stream errors
    stream.on('error', (error) => {
      handleFileError(error, filepath, 'File stream creation');
    });
    
    return stream;
  } catch (error) {
    handleFileError(error, filepath, 'File stream creation');
  }
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return 'Unknown';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export function sanitizeFilename(filename) {
  // Remove or replace invalid characters for filesystem
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

export function resolveRelativePath(basePath, relativePath) {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  
  return path.resolve(path.dirname(basePath), relativePath);
}

export async function ensureDirectoryExists(dirPath) {
  try {
    await fs.ensureDir(dirPath);
    return dirPath;
  } catch (error) {
    throw new MuxUploadError(
      `Failed to create directory: ${dirPath}`,
      ErrorCodes.FILE_ACCESS_DENIED,
      { dirPath, error: error.message }
    );
  }
}

export async function createTempFile(prefix = 'mux_upload_', suffix = '.tmp') {
  const tempDir = path.join(__dirname, '../../temp');
  await ensureDirectoryExists(tempDir);
  
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const filename = `${prefix}${timestamp}_${random}${suffix}`;
  
  return path.join(tempDir, filename);
}

export async function cleanupTempFiles(tempDir = null) {
  const targetDir = tempDir || path.join(__dirname, '../../temp');
  
  try {
    if (await fs.pathExists(targetDir)) {
      const files = await fs.readdir(targetDir);
      const tempFiles = files.filter(file => 
        file.startsWith('mux_upload_') && file.endsWith('.tmp')
      );
      
      for (const file of tempFiles) {
        const filePath = path.join(targetDir, file);
        const stats = await fs.stat(filePath);
        
        // Remove temp files older than 24 hours
        const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) {
          await fs.remove(filePath);
        }
      }
    }
  } catch (error) {
    // Don't throw errors for cleanup operations
    console.warn('Warning: Could not cleanup temp files:', error.message);
  }
}

export function getFileInfoFromPath(filepath) {
  const resolved = path.resolve(filepath);
  const parsed = path.parse(resolved);
  
  return {
    absolutePath: resolved,
    directory: parsed.dir,
    filename: parsed.name,
    extension: parsed.ext,
    basename: parsed.base
  };
}

export async function validateSubtitleUrl(url) {
  const validExtensions = ['.srt', '.vtt'];
  
  try {
    // First check if it's a local file path
    if (!url.includes('://')) {
      // Treat as local file path
      const stats = await fs.stat(url);
      if (!stats.isFile()) {
        throw new MuxUploadError(
          `Subtitle path is not a file: ${url}`,
          ErrorCodes.SUBTITLE_FORMAT_INVALID,
          { url }
        );
      }
      
      // Check file extension
      const extension = path.extname(url).toLowerCase();
      if (!validExtensions.includes(extension)) {
        throw new MuxUploadError(
          `Invalid subtitle file extension: ${extension}. Supported formats: ${validExtensions.join(', ')}`,
          ErrorCodes.SUBTITLE_FORMAT_INVALID,
          { url, validExtensions }
        );
      }
      
      return {
        url: url,
        isLocal: true,
        extension: extension,
        size: stats.size
      };
    }
    
    // Handle as URL
    const urlObj = new URL(url);
    
    // Check if URL uses HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new MuxUploadError(
        `Invalid subtitle URL protocol: ${urlObj.protocol}. Only HTTP and HTTPS are supported.`,
        ErrorCodes.SUBTITLE_URL_INVALID,
        { url, protocol: urlObj.protocol }
      );
    }
    
    // Check if URL has a valid subtitle file extension
    const pathname = urlObj.pathname.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
    
    if (!hasValidExtension) {
      throw new MuxUploadError(
        `Invalid subtitle file extension. Supported formats: ${validExtensions.join(', ')}`,
        ErrorCodes.SUBTITLE_FORMAT_INVALID,
        { url, validExtensions }
      );
    }
    
    return {
      url: url,
      isLocal: false,
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      extension: validExtensions.find(ext => pathname.endsWith(ext))
    };
    
  } catch (error) {
    if (error instanceof MuxUploadError) {
      throw error;
    }
    
    throw new MuxUploadError(
      `Invalid subtitle URL: ${url}`,
      ErrorCodes.SUBTITLE_URL_INVALID,
      { url, error: error.message }
    );
  }
}

export default {
  validateVideoFile,
  loadConfigFile,
  createReadStream,
  formatFileSize,
  formatDuration,
  sanitizeFilename,
  resolveRelativePath,
  ensureDirectoryExists,
  createTempFile,
  cleanupTempFiles,
  getFileInfoFromPath,
  validateSubtitleUrl
};