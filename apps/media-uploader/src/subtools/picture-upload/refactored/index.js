// Core functions
export {
  uploadPictureToS3AndCreateEntity,           // Function A
  uploadPictureAndLinkToMedia                 // Function B
} from './core.js';

// INI wrappers
export {
  uploadPictureAndLinkToMediaWithIni,         // Function C
  uploadPictureAndLinkToMediaWithFormatDetectionWithIni  // Function F
} from './withIni.js';

// Excel integration
export {
  uploadPictureAndLinkToMediaWithExcel        // Function D
} from './withExcel.js';

// Format detection
export {
  uploadPictureAndLinkToMediaWithFormatDetection,        // Function E
  uploadPicturesInFolderWithFormatDetection,             // Function G
  uploadPicturesInFolderWithFormatDetectionWithIni       // Function H
} from './withFormatDetection.js';

// Types and utilities
export {
  PictureFormat,
  SUPPORTED_FORMATS,
  FORMAT_TO_FIELD_MAP
} from './types.js';

export {
  validatePictureFormat,
  getMediaDescriptionFieldName,
  scanFolderForImages,
  normalizeFormat
} from './utils.js';
