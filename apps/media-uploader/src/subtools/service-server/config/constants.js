/**
 * Configuration Constants for Service-Server
 */

import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get base directory for data storage
 * - If KYOOL_DATA_DIR env var is set, use that
 * - On Windows with installed service, use %APPDATA%\Kyool\MediaUploader
 * - Otherwise, use local directory (for development)
 */
function getBaseDataDir() {
  if (process.env.KYOOL_DATA_DIR) {
    return process.env.KYOOL_DATA_DIR;
  }

  // Check if running as Windows service (common indicator: no USER env var or running from Program Files)
  const isWindowsService = process.platform === 'win32' &&
    (process.env.PROGRAMFILES && __dirname.includes(process.env.PROGRAMFILES));

  if (isWindowsService || process.env.KYOOL_USE_APPDATA === 'true') {
    // Use %APPDATA%\Kyool\MediaUploader on Windows
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Kyool', 'MediaUploader');
  }

  // Development mode: use local directory
  return path.join(__dirname, '..');
}

const BASE_DATA_DIR = getBaseDataDir();

export const CONFIG = {
  // Server settings
  SERVER: {
    PORT: process.env.PORT || 3011,
    HOST: process.env.HOST || 'localhost',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3010'
  },

  // Task management
  TASKS: {
    MAX_CONCURRENT: 1000,
    HEARTBEAT_INTERVAL: 60000, // 1 minute
    HEARTBEAT_TIMEOUT: 600000, // 10 minutes
    MAX_TASK_DURATION: 86400000, // 24 hours
    LOG_RETENTION: null // Indefinite (no automatic cleanup)
  },

  // Process settings
  PROCESS: {
    MAX_OLD_SPACE_SIZE: 4096, // 4GB memory for spawned processes
    IPC_ENABLED: true
  },

  // Paths
  PATHS: {
    DATA_DIR: path.join(BASE_DATA_DIR, 'data'),
    LOGS_DIR: path.join(BASE_DATA_DIR, 'logs'),
    TEMP_DIR: path.join(BASE_DATA_DIR, 'temp')
  },

  // Task types mapping to functions
  TASK_TYPES: {
    // Single media operations
    'prepare-excel-single': {
      function: 'prepareExcel',
      description: 'Prepare Excel for single media',
      requiredParams: ['config', 'folder']
    },
    'upload-media-single': {
      function: 'oneMediaCompleteUpload',
      description: 'Upload single media (complete flow)',
      requiredParams: ['config', 'folder']
    },
    'upload-picture-single': {
      function: 'uploadPicture',
      description: 'Upload picture for single media',
      requiredParams: ['config', 'folder', 'picture', 'resolution']
    },
    'upload-subtitle-single': {
      function: 'uploadSubtitleSpecific',
      description: 'Upload specific subtitle for single media',
      requiredParams: ['config', 'folder', 'subtitle', 'language']
    },
    'reload-subtitles-single': {
      function: 'uploadSubtitlesToMux',
      description: 'Reload all subtitles for single media',
      requiredParams: ['config', 'folder']
    },

    // Batch operations
    'prepare-excel-batch': {
      function: 'prepareExcelBatch',
      description: 'Prepare Excel files for multiple media',
      requiredParams: ['config', 'parentFolder']
    },
    'upload-media-batch': {
      function: 'cliMultiUpload',
      description: 'Upload multiple media',
      requiredParams: ['config', 'parentFolder']
    },
    'upload-picture-batch': {
      function: 'batchPictureUpload',
      description: 'Upload picture to all media in folder',
      requiredParams: ['config', 'parentFolder', 'picture', 'resolution']
    },
    'reload-subtitles-batch': {
      function: 'uploadSubtitlesToMuxBatch',
      description: 'Reload subtitles for all media',
      requiredParams: ['config', 'parentFolder']
    }
  },

  // Resolution options
  RESOLUTIONS: {
    '1920x1080': { width: 1920, height: 1080, label: 'Full HD Landscape' },
    '1920x720': { width: 1920, height: 720, label: 'HD Landscape' },
    '1080x1080': { width: 1080, height: 1080, label: 'Square' },
    '810x1080': { width: 810, height: 1080, label: 'Portrait' },
    '1080x1920': { width: 1080, height: 1920, label: 'Full Portrait' }
  },

  // Language options
  LANGUAGES: {
    'fr': 'Français',
    'en': 'English',
    'ko': '한국어'
  },

  // File validation
  VALIDATION: {
    CONFIG_EXTENSIONS: ['.ini'],
    IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    SUBTITLE_EXTENSIONS: ['.vtt', '.srt'],
    VIDEO_EXTENSIONS: ['.mp4', '.mov', '.avi', '.mkv', '.webm']
  }
};

export default CONFIG;
