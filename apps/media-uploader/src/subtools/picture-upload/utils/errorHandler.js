export class PictureUploadError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', originalError = null) {
    super(message);
    this.name = 'PictureUploadError';
    this.code = code;
    this.originalError = originalError;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PictureUploadError);
    }
  }
}

export const ErrorCodes = {
  // Existing error codes
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_NOT_READABLE: 'FILE_NOT_READABLE',
  INVALID_IMAGE: 'INVALID_IMAGE',
  S3_UPLOAD_FAILED: 'S3_UPLOAD_FAILED',
  API_AUTH_FAILED: 'API_AUTH_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  CONFIG_VALIDATION_FAILED: 'CONFIG_VALIDATION_FAILED',
  METADATA_READ_FAILED: 'METADATA_READ_FAILED',

  // New error codes for refactored functions
  FORMAT_NOT_SUPPORTED: 'FORMAT_NOT_SUPPORTED',
  MEDIA_DESCRIPTION_ID_NOT_FOUND: 'MEDIA_DESCRIPTION_ID_NOT_FOUND',
  MEDIA_DESCRIPTION_UPDATE_FAILED: 'MEDIA_DESCRIPTION_UPDATE_FAILED',
  URL_NOT_ACCESSIBLE: 'URL_NOT_ACCESSIBLE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  UPLOAD_AND_LINK_FAILED: 'UPLOAD_AND_LINK_FAILED',
  INI_UPLOAD_FAILED: 'INI_UPLOAD_FAILED',
  EXCEL_UPLOAD_FAILED: 'EXCEL_UPLOAD_FAILED',
  FORMAT_DETECTION_UPLOAD_FAILED: 'FORMAT_DETECTION_UPLOAD_FAILED',
  BATCH_UPLOAD_FAILED: 'BATCH_UPLOAD_FAILED',
  INI_FORMAT_DETECTION_UPLOAD_FAILED: 'INI_FORMAT_DETECTION_UPLOAD_FAILED',
  BATCH_INI_UPLOAD_FAILED: 'BATCH_INI_UPLOAD_FAILED'
};

export function handleError(error, context = 'Unknown operation') {
  const timestamp = new Date().toISOString();
  
  if (error instanceof PictureUploadError) {
    console.error(`[${timestamp}] ${context}: ${error.message} (Code: ${error.code})`);
    if (error.originalError) {
      console.error(`Original error: ${error.originalError.message}`);
    }
  } else {
    console.error(`[${timestamp}] ${context}: ${error.message}`);
    console.error(`Stack trace:`, error.stack);
  }
}