/**
 * Configuration Constants for Mux Report Generator
 */

export const REPORT_CONFIG = {
  // Mux API Settings
  MUX_API: {
    ASSETS_PER_PAGE: 100,           // Max allowed by Mux API
    PAGE_DELAY_MS: 200,             // Delay between page fetches to avoid rate limiting
    MAX_RETRIES: 3,                 // Maximum API call retries on failure
    RETRY_BACKOFF_MS: 1000          // Base retry delay (exponential backoff)
  },

  // Subtitle Languages to analyze
  SUBTITLE_LANGUAGES: ['fr', 'en', 'ko'],

  // Subtitle Status Values
  SUBTITLE_STATUS: {
    NONE: 'none',
    OK: 'OK (1 subtitle)',
    BROKEN: 'broken',
    DUPLICATED: 'duplicated (several subtitles)'
  },

  // Playback Policy Types
  PLAYBACK_POLICIES: {
    PUBLIC: 'public',
    SIGNED: 'signed',
    DRM: 'drm'
  },

  // Output File Configuration
  OUTPUT: {
    FILENAME_SUFFIX: '_mux-full-report.xlsx',
    DIRECTORY_NAME: 'mux_reports'
  },

  // Excel Formatting Configuration
  EXCEL: {
    SHEET_NAME: 'Mux Assets',

    COLUMNS: [
      { header: 'file name', key: 'fileName', width: 40 },
      { header: 'status', key: 'status', width: 15 },
      { header: 'fr subtitle', key: 'frSubtitle', width: 25 },
      { header: 'en subtitle', key: 'enSubtitle', width: 25 },
      { header: 'ko subtitle', key: 'koSubtitle', width: 25 },
      { header: 'public playback url', key: 'publicUrl', width: 60 },
      { header: 'signed playback url', key: 'signedUrl', width: 60 },
      { header: 'drm playback url', key: 'drmUrl', width: 60 },
      { header: 'asset id', key: 'assetId', width: 30 },
      { header: 'creation date', key: 'createdAt', width: 20 }
    ],

    HEADER_STYLE: {
      font: { bold: true },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }  // Light gray background
      }
    }
  }
};

export default REPORT_CONFIG;
