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
 * - Default: use %APPDATA%\Kyool\MediaUploader (production behavior)
 * - Set KYOOL_USE_LOCAL=true to use local directory (for development)
 */
function getBaseDataDir() {
  if (process.env.KYOOL_DATA_DIR) {
    return process.env.KYOOL_DATA_DIR;
  }

  // Use local directory only if explicitly requested (development mode)
  if (process.env.KYOOL_USE_LOCAL === 'true') {
    return path.join(__dirname, '..');
  }

  // Default: Use %APPDATA%\Kyool\MediaUploader on Windows
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Kyool', 'MediaUploader');
  }

  // For non-Windows platforms, use home directory
  return path.join(os.homedir(), '.kyool', 'media-uploader');
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
      function: 'resendSubtitles2',
      description: 'Reload all subtitles for single media (V2 - proper backend chain)',
      requiredParams: ['config', 'folder']
    },
    'upload-subtitle-by-media-desc-id': {
      function: 'uploadSubtitleByMediaDescriptionId',
      description: 'Upload subtitle using media description ID from backend',
      requiredParams: ['config', 'mediaDescriptionId', 'subtitle', 'language']
    },
    'upload-subtitle-by-mux-asset-id': {
      function: 'uploadSubtitleByMuxAssetId',
      description: 'Upload subtitle directly to Mux asset by asset ID',
      requiredParams: ['config', 'muxAssetId', 'subtitle', 'language']
    },
    'upload-subtitles-by-id-and-folder': {
      function: 'uploadSubtitlesFromFolderByIdWithIni',
      description: 'Upload subtitles from folder using media description ID (auto-detects main video subtitles)',
      requiredParams: ['config', 'mediaDescriptionId', 'folder']
    },
    'upload-subtitles-by-season-folder': {
      function: 'uploadSubtitlesBySeasonFolder',
      description: 'Upload subtitles for all episodes in a season from numbered folders',
      requiredParams: ['config', 'mediaDescriptionId', 'parentFolder']
    },
    'upload-picture-with-ini': {
      function: 'uploadPictureWithIni',
      description: 'Upload picture with known format and media description ID',
      requiredParams: ['config', 'picture', 'format', 'mediaDescriptionId']
    },
    'upload-picture-with-format-detection': {
      function: 'uploadPictureWithFormatDetection',
      description: 'Upload picture with automatic format detection',
      requiredParams: ['config', 'picture', 'mediaDescriptionId']
    },
    'upload-pictures-in-folder-with-ini': {
      function: 'uploadPicturesInFolderWithIni',
      description: 'Batch upload all images in folder',
      requiredParams: ['config', 'folderPath', 'mediaDescriptionId']
    },
    'optimize-media-description-pictures': {
      function: 'optimizeMediaDescriptionPictures',
      description: 'Optimize all pictures of a media description (create WebP variants)',
      requiredParams: ['config', 'mediaDescriptionId']
    },
    'delete-subtitle-by-media-desc-id': {
      function: 'deleteSubtitleByMediaDescriptionId',
      description: 'Delete subtitle track using media description ID from backend',
      requiredParams: ['config', 'mediaDescriptionId', 'language']
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
      function: 'resendSubtitles2Batch',
      description: 'Reload subtitles for all media (V2 - proper backend chain)',
      requiredParams: ['config', 'parentFolder']
    },
    'propagate-season-data-batch': {
      function: 'propagateSeasonDataBatch',
      description: 'Propagate SEASON data to episodes from parent folder Excel file',
      requiredParams: ['config', 'parentFolder']
    },
    'propagate-by-media-description-id': {
      function: 'propagateSeasonDataFromMediaDescriptionWithIni',
      description: 'Propagate season data to episodes by media description ID',
      requiredParams: ['config', 'mediaDescriptionId']
    },
    'propagate-by-season-entity-id': {
      function: 'propagateSeasonDataFromSeasonIdWithIni',
      description: 'Propagate season data to episodes by season entity ID',
      requiredParams: ['config', 'seasonEntityId']
    },

    // Excel edition by Column A description
    'edit-excel-single-by-desc': {
      function: 'editExcelSingleByDescription',
      description: 'Modify one Excel file by Column A description in treated folder',
      requiredParams: ['config', 'folder', 'descriptionText', 'newValue']
    },
    'edit-excel-batch-by-desc': {
      function: 'editExcelBatchByDescription',
      description: 'Modify all Excel files by Column A description in parent folder and subfolders',
      requiredParams: ['config', 'parentFolder', 'descriptionText', 'newValue']
    },
    'regenerate-episode-names': {
      function: 'regenerateEpisodeNames',
      description: 'Regenerate episode names from season name and folder structure',
      requiredParams: ['config', 'parentFolder']
    },

    // Mux reports and diagnostics
    'generate-mux-report': {
      function: 'generateMuxReport',
      description: 'Generate comprehensive Mux asset report',
      requiredParams: ['config']
    }
  },

  // Excel Column A description texts for dropdown
  EXCEL_COLUMN_A_DESCRIPTIONS: [
    "Sécurité (public, drm, signed)",
    "Type (video, season, program)",
    "Titre du programme",
    "Titre de la saison",
    "Catégories",
    "Themes",
    "Description courte",
    "Synopsis",
    "nom pour le lien direct",
    "Année de production",
    "Date de diffusion originale",
    "Détenteur des droits",
    "Propriétaire des droits d'auteur",
    "Langue originale",
    "Liste des acteurs",
    "Liste des réalisateurs",
    "Liste des producteurs",
    "Liste des auteurs",
    "Pays disponibles",
    "Catégories de public",
    "Hashtags",
    "Mots-clés"
  ],

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
