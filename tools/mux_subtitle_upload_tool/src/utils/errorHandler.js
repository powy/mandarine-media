export const ErrorCodes = {
  AUTH_FAILED: 'AUTH_FAILED',
  CONFIG_INVALID: 'CONFIG_INVALID',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_INVALID: 'FILE_INVALID',
  S3_UPLOAD_FAILED: 'S3_UPLOAD_FAILED',
  S3_ACCESS_DENIED: 'S3_ACCESS_DENIED',
  MUX_ASSET_NOT_FOUND: 'MUX_ASSET_NOT_FOUND',
  MUX_TRACK_CREATION_FAILED: 'MUX_TRACK_CREATION_FAILED',
  MUX_PROCESSING_TIMEOUT: 'MUX_PROCESSING_TIMEOUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

export class SubtitleUploadError extends Error {
  constructor(message, code = ErrorCodes.UNKNOWN_ERROR, details = {}) {
    super(message);
    this.name = 'SubtitleUploadError';
    this.code = code;
    this.details = details;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SubtitleUploadError);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Wrap common errors with appropriate error codes
 */
export function wrapError(error, context = {}) {
  // If already a SubtitleUploadError, just return it
  if (error instanceof SubtitleUploadError) {
    return error;
  }
  
  let code = ErrorCodes.UNKNOWN_ERROR;
  let message = error.message;
  let details = { ...context, originalError: error.message };
  
  // Determine error code based on error message/type
  if (error.message.includes('ENOENT') || error.message.includes('not found')) {
    code = ErrorCodes.FILE_NOT_FOUND;
  } else if (error.message.includes('Access Denied') || error.message.includes('AccessDenied')) {
    code = ErrorCodes.S3_ACCESS_DENIED;
  } else if (error.message.includes('ValidationException') || error.message.includes('validation failed')) {
    code = ErrorCodes.VALIDATION_ERROR;
  } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
    code = ErrorCodes.AUTH_FAILED;
  } else if (error.message.includes('Asset not found') || error.message.includes('404')) {
    code = ErrorCodes.MUX_ASSET_NOT_FOUND;
  } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
    code = ErrorCodes.MUX_PROCESSING_TIMEOUT;
  } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
    code = ErrorCodes.NETWORK_ERROR;
  }
  
  return new SubtitleUploadError(message, code, details);
}

/**
 * Handle and categorize different types of errors
 */
export function handleError(error, logger, context = {}) {
  const wrappedError = wrapError(error, context);
  
  // Log the error with appropriate level
  if (wrappedError.code === ErrorCodes.VALIDATION_ERROR || 
      wrappedError.code === ErrorCodes.FILE_NOT_FOUND) {
    logger.error('User error', wrappedError.toJSON());
  } else if (wrappedError.code === ErrorCodes.NETWORK_ERROR ||
             wrappedError.code === ErrorCodes.MUX_PROCESSING_TIMEOUT) {
    logger.warn('Transient error', wrappedError.toJSON());
  } else {
    logger.error('System error', wrappedError.toJSON());
  }
  
  return wrappedError;
}

/**
 * Get user-friendly error messages
 */
export function getErrorMessage(error) {
  if (!(error instanceof SubtitleUploadError)) {
    return error.message;
  }
  
  const messages = {
    [ErrorCodes.AUTH_FAILED]: 'Authentication failed. Please check your Mux API credentials.',
    [ErrorCodes.CONFIG_INVALID]: 'Configuration file is invalid. Please check the format and required fields.',
    [ErrorCodes.FILE_NOT_FOUND]: 'Subtitle file not found. Please check the file path.',
    [ErrorCodes.FILE_INVALID]: 'Subtitle file is invalid or corrupted.',
    [ErrorCodes.S3_UPLOAD_FAILED]: 'Failed to upload subtitle to S3. Please check your AWS configuration.',
    [ErrorCodes.S3_ACCESS_DENIED]: 'Access denied to S3 bucket. Please check your AWS credentials and permissions.',
    [ErrorCodes.MUX_ASSET_NOT_FOUND]: 'Mux asset not found. Please verify the asset ID.',
    [ErrorCodes.MUX_TRACK_CREATION_FAILED]: 'Failed to create subtitle track in Mux.',
    [ErrorCodes.MUX_PROCESSING_TIMEOUT]: 'Subtitle processing timed out. The track may still be processing.',
    [ErrorCodes.VALIDATION_ERROR]: 'Input validation failed. Please check your configuration.',
    [ErrorCodes.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
    [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred.'
  };
  
  return messages[error.code] || error.message;
}

/**
 * Get suggestions for fixing errors
 */
export function getErrorSuggestions(error) {
  if (!(error instanceof SubtitleUploadError)) {
    return [];
  }
  
  const suggestions = {
    [ErrorCodes.AUTH_FAILED]: [
      'Verify your MUX_TOKEN_ID and MUX_TOKEN_SECRET are correct',
      'Check if your Mux API key has the necessary permissions',
      'Ensure you are using the correct environment (development/production) tokens'
    ],
    [ErrorCodes.CONFIG_INVALID]: [
      'Check the JSON syntax in your configuration file',
      'Verify all required fields are provided',
      'Use the configuration examples as a template'
    ],
    [ErrorCodes.FILE_NOT_FOUND]: [
      'Verify the subtitle file path is correct',
      'Ensure the file exists and is readable',
      'Use absolute file paths to avoid confusion'
    ],
    [ErrorCodes.S3_ACCESS_DENIED]: [
      'Check your AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)',
      'Verify the S3 bucket name is correct',
      'Ensure your AWS user has the required S3 permissions',
      'Check if the bucket exists and is in the correct region'
    ],
    [ErrorCodes.MUX_ASSET_NOT_FOUND]: [
      'Verify the Mux asset ID is correct',
      'Check if the asset exists in your Mux account',
      'Ensure the asset is in a ready state'
    ],
    [ErrorCodes.MUX_PROCESSING_TIMEOUT]: [
      'Try increasing the monitoring timeout in options',
      'Check the Mux dashboard to see if processing completed',
      'Large subtitle files may take longer to process'
    ],
    [ErrorCodes.NETWORK_ERROR]: [
      'Check your internet connection',
      'Verify firewall settings allow outbound connections',
      'Try again after a few moments'
    ]
  };
  
  return suggestions[error.code] || [
    'Check the logs for more detailed error information',
    'Try running with verbose logging enabled',
    'Contact support if the problem persists'
  ];
}