import fs from 'fs-extra';
import path from 'path';
import glob from 'glob-promise';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.mpg', '.mpeg'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'];
const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.ass', '.ssa', '.sub', '.sbv'];

export async function scanFolder(folderPath) {
  try {
    await fs.ensureDir(folderPath);
    
    const files = {
      videos: [],
      images: [],
      subtitles: [],
      other: []
    };
    
    const allFiles = await glob('**/*', {
      cwd: folderPath,
      nodir: true,
      absolute: false
    });
    
    for (const file of allFiles) {
      const ext = path.extname(file).toLowerCase();
      const fullPath = path.join(folderPath, file);
      const stats = await fs.stat(fullPath);
      
      const fileInfo = {
        name: path.basename(file),
        path: file,
        fullPath: fullPath,
        size: stats.size,
        extension: ext,
        modifiedTime: stats.mtime
      };
      
      if (VIDEO_EXTENSIONS.includes(ext)) {
        files.videos.push(fileInfo);
      } else if (IMAGE_EXTENSIONS.includes(ext)) {
        files.images.push(fileInfo);
      } else if (SUBTITLE_EXTENSIONS.includes(ext)) {
        files.subtitles.push(fileInfo);
      } else {
        files.other.push(fileInfo);
      }
    }
    
    return files;
  } catch (error) {
    throw new Error(`Failed to scan folder ${folderPath}: ${error.message}`);
  }
}

export async function loadJsonFile(filePath) {
  try {
    // Check if it's an INI file - support direct INI loading
    if (filePath.endsWith('.ini')) {
      // Import ConfigReader dynamically to avoid circular dependencies
      const { ConfigReader } = await import('../../upload-gui/config/configReader.js');
      return ConfigReader.readConfig(filePath);
    }

    // Load JSON file
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load config file ${filePath}: ${error.message}`);
  }
}

export async function checkFileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function findExcelFiles(folderPath, prefix = '0_desc') {
  try {
    // First try to find files with the new 0_desc pattern
    let pattern = `${prefix}*.xlsx`;
    let files = await glob(pattern, {
      cwd: folderPath,
      nodir: true,
      absolute: false
    });

    // If no 0_desc files found and we're using the default prefix, fall back to 0_list for backward compatibility
    if (files.length === 0 && prefix === '0_desc') {
      console.log('No 0_desc files found, checking for legacy 0_list files...');
      pattern = `0_list*.xlsx`;
      files = await glob(pattern, {
        cwd: folderPath,
        nodir: true,
        absolute: false
      });

      if (files.length > 0) {
        console.log(`Found ${files.length} legacy 0_list file(s). Consider renaming to 0_desc pattern.`);
      }
    }

    return files.map(file => ({
      name: file,
      fullPath: path.join(folderPath, file)
    }));
  } catch (error) {
    throw new Error(`Failed to find Excel files: ${error.message}`);
  }
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileType(extension) {
  const ext = extension.toLowerCase();
  
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (SUBTITLE_EXTENSIONS.includes(ext)) return 'subtitle';
  
  return 'other';
}

export async function ensureDirectoryExists(dirPath) {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}