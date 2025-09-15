import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';

export function createLogger(config) {
  const logDir = path.dirname(config.logging.file);

  // Ensure log directory exists
  fs.ensureDirSync(logDir);

  // Generate timestamped filename
  const originalFilePath = config.logging.file;
  const { dir, name, ext } = path.parse(originalFilePath);
  const timestamp = new Date().toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\.\d{3}Z$/, '');
  const timestampedFilename = `${name}_${timestamp}${ext}`;
  const timestampedFilePath = path.join(dir, timestampedFilename);

  const logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'one-media-complete-upload' },
    transports: []
  });

  // Add file transport if enabled
  if (config.logging.enabled) {
    logger.add(new winston.transports.File({
      filename: timestampedFilePath,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }));
  }

  // Add console transport if enabled
  if (config.logging.console) {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  return logger;
}