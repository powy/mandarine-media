import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';

export function createLogger(config = {}) {
  const loggingConfig = config.logging || {};
  
  // Create logs directory if it doesn't exist
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const transports = [];

  // Console transport (unless disabled)
  if (loggingConfig.console !== false) {
    transports.push(
      new winston.transports.Console({
        level: loggingConfig.level || 'info',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
          }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let output = `[${timestamp}] ${level}: ${message}`;
            if (Object.keys(meta).length > 0) {
              output += ` ${JSON.stringify(meta)}`;
            }
            return output;
          })
        )
      })
    );
  }

  // File transport (always enabled for subtitle uploads)
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );

  // Main log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'subtitle-uploads.log'),
      level: loggingConfig.level || 'info',
      format: logFormat
    })
  );

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'errors.log'),
      level: 'error',
      format: logFormat
    })
  );

  // Daily log file with date
  const today = new Date().toISOString().split('T')[0];
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, `subtitles-${today}.log`),
      level: loggingConfig.level || 'info',
      format: logFormat
    })
  );

  // Custom log file if specified
  if (loggingConfig.file) {
    transports.push(
      new winston.transports.File({
        filename: loggingConfig.file,
        level: loggingConfig.level || 'info',
        format: logFormat
      })
    );
  }

  const logger = winston.createLogger({
    level: loggingConfig.level || 'info',
    format: logFormat,
    transports: transports
  });

  // Add custom logging methods for subtitle operations
  logger.logStart = (sessionId, config) => {
    logger.info('Subtitle upload session started', {
      sessionId: sessionId,
      muxAssetId: config.mux_asset_id,
      subtitleCount: config.subtitles.length,
      timestamp: new Date().toISOString()
    });
  };

  logger.logSuccess = (sessionId, results) => {
    logger.info('Subtitle upload session completed successfully', {
      sessionId: sessionId,
      totalSubtitles: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      trackIds: results.filter(r => r.success).map(r => r.trackId)
    });
  };

  logger.logError = (sessionId, error, context = {}) => {
    logger.error('Subtitle upload session failed', {
      sessionId: sessionId,
      error: error.message,
      stack: error.stack,
      ...context
    });
  };

  logger.logSubtitleStart = (sessionId, subtitle, index) => {
    logger.info('Starting subtitle upload', {
      sessionId: sessionId,
      subtitleIndex: index,
      language: subtitle.language_code,
      filePath: subtitle.file_path
    });
  };

  logger.logSubtitleSuccess = (sessionId, subtitle, result, index) => {
    logger.info('Subtitle upload successful', {
      sessionId: sessionId,
      subtitleIndex: index,
      language: subtitle.language_code,
      trackId: result.trackId,
      s3Key: result.s3Key,
      uploadTimeMs: result.uploadTimeMs,
      processingTimeMs: result.processingTimeMs
    });
  };

  logger.logSubtitleError = (sessionId, subtitle, error, index) => {
    logger.error('Subtitle upload failed', {
      sessionId: sessionId,
      subtitleIndex: index,
      language: subtitle.language_code,
      filePath: subtitle.file_path,
      error: error.message
    });
  };

  return logger;
}