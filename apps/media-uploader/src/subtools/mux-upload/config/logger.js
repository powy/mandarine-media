import winston from 'winston';
import fs from 'fs-extra';
import path from 'path';

export function createLogger(config = {}, context = {}) {
  const transports = [];

  // Console transport
  if (config.logging?.console !== false) {
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} [${level}]: ${message}${metaString}`;
        })
      ),
      level: config.logging?.level || 'info'
    }));
  }

  // Auto-generate timestamped log file if video filepath is provided
  let logFilePath = config.logging?.file;
  if (config.video?.filepath && !logFilePath) {
    const videoBasename = path.basename(config.video.filepath, path.extname(config.video.filepath));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const logsDir = path.join(process.cwd(), 'logs', 'mux-logs');

    // Create unique log filename based on context (taskId for batch uploads, or timestamp for direct uploads)
    if (context.taskId) {
      logFilePath = path.join(logsDir, `mux_upload_${context.taskId}_${timestamp}_${videoBasename}.log`);
    } else {
      logFilePath = path.join(logsDir, `upload_log_${timestamp}_${videoBasename}.log`);
    }
  }
  
  // File transport
  if (logFilePath) {
    // Ensure log directory exists
    const logDir = path.dirname(logFilePath);
    fs.ensureDirSync(logDir);
    
    transports.push(new winston.transports.File({
      filename: logFilePath,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        config.logging?.format === 'simple' 
          ? winston.format.simple()
          : winston.format.json()
      ),
      level: config.logging?.level || 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }));
  }
  
  const logger = winston.createLogger({
    level: config.logging?.level || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports,
    exceptionHandlers: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ],
    rejectionHandlers: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ],
    exitOnError: false
  });
  
  // Add convenience methods for structured logging
  logger.logUploadStart = (filepath, fileSize, uploadId) => {
    logger.info('Upload started', {
      event: 'upload_started',
      videoFile: filepath,
      fileSize: fileSize,
      uploadId: uploadId,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logUploadProgress = (uploadId, progress, bytesUploaded, totalBytes) => {
    logger.debug('Upload progress', {
      event: 'upload_progress',
      uploadId: uploadId,
      progress: `${progress.toFixed(2)}%`,
      bytesUploaded: bytesUploaded,
      totalBytes: totalBytes
    });
  };
  
  logger.logUploadComplete = (uploadId, assetId, duration) => {
    logger.info('Upload completed successfully', {
      event: 'upload_completed',
      uploadId: uploadId,
      assetId: assetId,
      duration: duration,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logUploadError = (uploadId, error, retryCount = 0) => {
    logger.error('Upload failed', {
      event: 'upload_failed',
      uploadId: uploadId,
      error: error.message,
      errorCode: error.code,
      stack: error.stack,
      retryCount: retryCount,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logDirectUploadCreated = (upload) => {
    logger.debug('Direct upload created', {
      event: 'direct_upload_created',
      uploadId: upload.id,
      uploadUrl: upload.url ? `${upload.url.substring(0, 50)}...` : 'N/A',
      assetSettings: upload.new_asset_settings
    });
  };
  
  logger.logSubtitleAdded = (assetId, subtitle, trackId) => {
    logger.info('Subtitle track added', {
      event: 'subtitle_added',
      assetId: assetId,
      trackId: trackId,
      language: subtitle.language_code,
      name: subtitle.name,
      textType: subtitle.text_type
    });
  };
  
  logger.logSubtitleError = (assetId, subtitle, error) => {
    logger.error('Subtitle upload failed', {
      event: 'subtitle_failed',
      assetId: assetId,
      language: subtitle.language_code,
      name: subtitle.name,
      error: error.message,
      url: subtitle.url
    });
  };
  
  logger.logDatabaseSave = (assetId, table) => {
    logger.info('Asset saved to database', {
      event: 'database_saved',
      assetId: assetId,
      table: table,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logDatabaseError = (error, operation) => {
    logger.error('Database operation failed', {
      event: 'database_error',
      operation: operation,
      error: error.message,
      stack: error.stack
    });
  };
  
  logger.logConfigValidation = (configPath, valid) => {
    logger.info(`Configuration ${valid ? 'validated successfully' : 'validation failed'}`, {
      event: 'config_validation',
      configPath: configPath,
      valid: valid
    });
  };
  
  logger.logRetryAttempt = (operation, attempt, maxAttempts, delay) => {
    logger.warn(`Retry attempt ${attempt} of ${maxAttempts} for ${operation}`, {
      event: 'retry_attempt',
      operation: operation,
      attempt: attempt,
      maxAttempts: maxAttempts,
      delay: delay
    });
  };
  
  logger.logWebhookRegistered = (webhookId, url, events) => {
    logger.info('Webhook registered', {
      event: 'webhook_registered',
      webhookId: webhookId,
      url: url,
      events: events
    });
  };
  
  // New logging methods for backend integration
  logger.logVideoFileCheck = (filepath, exists, fileSize) => {
    logger.info(`Video file check: ${exists ? 'found' : 'not found'}`, {
      event: 'video_file_check',
      filepath: filepath,
      exists: exists,
      fileSize: fileSize || null,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logBackendConnection = (serverAddress, success, error) => {
    const logLevel = success ? 'info' : 'error';
    const message = success ? 'Backend connection successful' : 'Backend connection failed';
    logger[logLevel](message, {
      event: 'backend_connection',
      serverAddress: serverAddress,
      success: success,
      error: error || null,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logVideoMetadataExtracted = (filepath, metadata) => {
    logger.info('Video metadata extracted', {
      event: 'video_metadata_extracted',
      filepath: filepath,
      metadata: metadata,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logLanguageListFetched = (count, success, error) => {
    const logLevel = success ? 'info' : 'error';
    const message = success ? `Language list fetched: ${count} languages` : 'Failed to fetch language list';
    logger[logLevel](message, {
      event: 'language_list_fetched',
      count: count || 0,
      success: success,
      error: error || null,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logVideoFileRecordCreated = (uuid, externalId, success, error) => {
    const logLevel = success ? 'info' : 'error';
    const message = success ? 'Video file record created in backend' : 'Failed to create video file record';
    logger[logLevel](message, {
      event: 'video_file_record_created',
      uuid: uuid,
      externalId: externalId,
      success: success,
      error: error || null,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logUploadStatusUpdate = (uuid, status, success, error) => {
    const logLevel = success ? 'info' : 'error';
    const message = success ? `Upload status updated: ${status}` : 'Failed to update upload status';
    logger[logLevel](message, {
      event: 'upload_status_update',
      uuid: uuid,
      status: status,
      success: success,
      error: error || null,
      timestamp: new Date().toISOString()
    });
  };
  
  logger.logMuxStatusMonitoring = (assetId, status, ready) => {
    const logLevel = ready ? 'info' : 'debug';
    const message = ready ? `Mux asset ready: ${assetId}` : `Mux asset status: ${status}`;
    logger[logLevel](message, {
      event: 'mux_status_monitoring',
      assetId: assetId,
      status: status,
      ready: ready,
      timestamp: new Date().toISOString()
    });
  };
  
  // Add compatibility methods and properties for enhanced-chunk-uploader
  logger.startTime = null;
  logger.lastLogTime = Date.now();

  logger.formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  logger.formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Wrapper for logUploadStart with mux-test signature
  const originalLogUploadStart = logger.logUploadStart;
  logger.logUploadStart = (filepath, fileSize, uploadId = null) => {
    logger.startTime = Date.now();
    if (uploadId) {
      // Use existing Winston method
      originalLogUploadStart(filepath, fileSize, uploadId);
    } else {
      // Use mux-test compatible logging
      logger.info(`Starting upload`, {
        file: filepath,
        size: logger.formatBytes(fileSize),
        timestamp: new Date().toISOString()
      });
    }
  };

  // Wrapper for logProgress with mux-test signature
  logger.logProgress = (uploadedBytes, totalBytes, chunkNumber = null) => {
    const now = Date.now();
    const elapsed = now - logger.startTime;
    const progress = (uploadedBytes / totalBytes) * 100;
    const speed = uploadedBytes / (elapsed / 1000);
    const eta = speed > 0 ? (totalBytes - uploadedBytes) / speed : 0;

    const progressInfo = {
      progress: `${progress.toFixed(1)}%`,
      uploaded: logger.formatBytes(uploadedBytes),
      total: logger.formatBytes(totalBytes),
      speed: `${logger.formatBytes(speed)}/s`,
      eta: logger.formatTime(eta)
    };

    if (chunkNumber !== null) {
      progressInfo.chunk = chunkNumber;
    }

    // Log progress every 5% or every 30 seconds
    const timeSinceLastLog = now - logger.lastLogTime;
    if (progress % 5 < 0.1 || timeSinceLastLog > 30000) {
      logger.info(`Upload progress`, progressInfo);
      logger.lastLogTime = now;
    }
  };

  // Wrapper for logUploadComplete with mux-test signature
  const originalLogUploadComplete = logger.logUploadComplete;
  logger.logUploadComplete = (duration, assetId = null, uploadId = null) => {
    if (uploadId) {
      // Use existing Winston method
      originalLogUploadComplete(uploadId, assetId, duration);
    } else {
      // Use mux-test compatible logging
      const completionInfo = {
        duration: logger.formatTime(duration / 1000),
        completedAt: new Date().toISOString()
      };

      if (assetId) {
        completionInfo.assetId = assetId;
      }

      logger.info(`Upload completed successfully`, completionInfo);
    }
  };

  // Store the log file path for reference
  logger.logFilePath = logFilePath;

  return logger;
}

export default createLogger;