export class MuxUploadError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MuxUploadError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MuxUploadError);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export const ErrorCodes = {
  // Authentication errors
  AUTH_FAILED: 'AUTH_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // File errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  
  // Upload errors
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  UPLOAD_TIMEOUT: 'UPLOAD_TIMEOUT',
  UPLOAD_CANCELLED: 'UPLOAD_CANCELLED',
  DIRECT_UPLOAD_CREATION_FAILED: 'DIRECT_UPLOAD_CREATION_FAILED',
  
  // Subtitle errors
  SUBTITLE_FAILED: 'SUBTITLE_FAILED',
  SUBTITLE_URL_INVALID: 'SUBTITLE_URL_INVALID',
  SUBTITLE_FORMAT_INVALID: 'SUBTITLE_FORMAT_INVALID',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  
  // Configuration errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_PARSE_ERROR: 'CONFIG_PARSE_ERROR',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  
  // DRM errors
  DRM_CONFIG_ERROR: 'DRM_CONFIG_ERROR',
  DRM_LICENSE_INVALID: 'DRM_LICENSE_INVALID',
  
  // Asset errors
  ASSET_NOT_FOUND: 'ASSET_NOT_FOUND',
  ASSET_PROCESSING_FAILED: 'ASSET_PROCESSING_FAILED',
  ASSET_DELETED: 'ASSET_DELETED',
  
  // Webhook errors
  WEBHOOK_ERROR: 'WEBHOOK_ERROR',
  WEBHOOK_REGISTRATION_FAILED: 'WEBHOOK_REGISTRATION_FAILED',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  OPERATION_FAILED: 'OPERATION_FAILED',
  INVALID_OPERATION: 'INVALID_OPERATION'
};

export async function retryableOperation(
  operation, 
  logger, 
  maxAttempts = 3, 
  baseDelay = 5000,
  operationName = 'operation'
) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Only log retry attempt if it's actually a retry (attempt > 1)
      if (attempt > 1) {
        logger.logRetryAttempt(operationName, attempt, maxAttempts, baseDelay * attempt);
      }
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      logger.warn(`${operationName} attempt ${attempt} failed`, { 
        error: error.message,
        code: error.code,
        attempt: attempt,
        maxAttempts: maxAttempts
      });
      
      if (attempt < maxAttempts) {
        const delay = calculateRetryDelay(attempt, baseDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new MuxUploadError(
    `${operationName} failed after ${maxAttempts} attempts`,
    ErrorCodes.OPERATION_FAILED,
    { 
      lastError: lastError.message,
      lastErrorCode: lastError.code,
      attempts: maxAttempts,
      operationName: operationName
    }
  );
}

function isNonRetryableError(error) {
  const nonRetryableCodes = [
    ErrorCodes.AUTH_FAILED,
    ErrorCodes.INVALID_CREDENTIALS,
    ErrorCodes.FILE_NOT_FOUND,
    ErrorCodes.FILE_ACCESS_DENIED,
    ErrorCodes.VALIDATION_ERROR,
    ErrorCodes.CONFIG_NOT_FOUND,
    ErrorCodes.CONFIG_PARSE_ERROR,
    ErrorCodes.INVALID_FILE_FORMAT,
    ErrorCodes.DRM_LICENSE_INVALID,
    ErrorCodes.INVALID_OPERATION
  ];
  
  return nonRetryableCodes.includes(error.code) || 
         (error.response && error.response.status >= 400 && error.response.status < 500);
}

function calculateRetryDelay(attempt, baseDelay) {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, 60000); // Max 60 seconds
}

export function handleMuxError(error, operation = 'Mux operation') {
  if (error.response) {
    // HTTP error response
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 401:
        throw new MuxUploadError(
          'Authentication failed. Check your Mux API credentials.',
          ErrorCodes.AUTH_FAILED,
          { status, data, operation }
        );
      case 403:
        throw new MuxUploadError(
          'Access forbidden. Check your API key permissions.',
          ErrorCodes.AUTH_FAILED,
          { status, data, operation }
        );
      case 404:
        throw new MuxUploadError(
          'Resource not found.',
          ErrorCodes.ASSET_NOT_FOUND,
          { status, data, operation }
        );
      case 422:
        throw new MuxUploadError(
          'Invalid request parameters.',
          ErrorCodes.VALIDATION_ERROR,
          { status, data, operation }
        );
      case 429:
        throw new MuxUploadError(
          'Rate limit exceeded. Please retry later.',
          ErrorCodes.NETWORK_ERROR,
          { status, data, operation, retryable: true }
        );
      default:
        throw new MuxUploadError(
          `HTTP ${status} error: ${data?.message || error.message}`,
          ErrorCodes.NETWORK_ERROR,
          { status, data, operation }
        );
    }
  } else if (error.code === 'ECONNREFUSED') {
    throw new MuxUploadError(
      'Connection refused. Check your network connection.',
      ErrorCodes.CONNECTION_REFUSED,
      { originalError: error.message, operation }
    );
  } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    throw new MuxUploadError(
      'Network timeout or DNS resolution failed.',
      ErrorCodes.TIMEOUT_ERROR,
      { originalError: error.message, operation, retryable: true }
    );
  } else {
    throw new MuxUploadError(
      `${operation} failed: ${error.message}`,
      ErrorCodes.OPERATION_FAILED,
      { originalError: error.message, operation }
    );
  }
}

export function handleFileError(error, filepath, operation = 'File operation') {
  switch (error.code) {
    case 'ENOENT':
      throw new MuxUploadError(
        `File not found: ${filepath}`,
        ErrorCodes.FILE_NOT_FOUND,
        { filepath, operation }
      );
    case 'EACCES':
      throw new MuxUploadError(
        `Access denied to file: ${filepath}`,
        ErrorCodes.FILE_ACCESS_DENIED,
        { filepath, operation }
      );
    case 'EISDIR':
      throw new MuxUploadError(
        `Path is a directory, not a file: ${filepath}`,
        ErrorCodes.INVALID_FILE_FORMAT,
        { filepath, operation }
      );
    case 'EMFILE':
    case 'ENFILE':
      throw new MuxUploadError(
        'Too many open files. Please close some files and try again.',
        ErrorCodes.FILE_ACCESS_DENIED,
        { filepath, operation }
      );
    default:
      throw new MuxUploadError(
        `${operation} failed: ${error.message}`,
        ErrorCodes.OPERATION_FAILED,
        { filepath, originalError: error.message, operation }
      );
  }
}

export function handleDatabaseError(error, operation = 'Database operation') {
  if (error.code === 'ECONNREFUSED') {
    throw new MuxUploadError(
      'Database connection refused. Check if the database server is running.',
      ErrorCodes.DATABASE_CONNECTION_FAILED,
      { originalError: error.message, operation }
    );
  } else if (error.code === 'ENOTFOUND') {
    throw new MuxUploadError(
      'Database host not found. Check your database configuration.',
      ErrorCodes.DATABASE_CONNECTION_FAILED,
      { originalError: error.message, operation }
    );
  } else if (error.code === '28P01') {
    throw new MuxUploadError(
      'Database authentication failed. Check your credentials.',
      ErrorCodes.DATABASE_CONNECTION_FAILED,
      { originalError: error.message, operation }
    );
  } else if (error.code === '3D000') {
    throw new MuxUploadError(
      'Database does not exist.',
      ErrorCodes.DATABASE_CONNECTION_FAILED,
      { originalError: error.message, operation }
    );
  } else {
    throw new MuxUploadError(
      `${operation} failed: ${error.message}`,
      ErrorCodes.DATABASE_ERROR,
      { originalError: error.message, operation, sqlState: error.code }
    );
  }
}

export function createErrorContext(operation, details = {}) {
  return {
    operation,
    timestamp: new Date().toISOString(),
    ...details
  };
}

export default {
  MuxUploadError,
  ErrorCodes,
  retryableOperation,
  handleMuxError,
  handleFileError,
  handleDatabaseError,
  createErrorContext
};