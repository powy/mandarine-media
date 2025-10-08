/**
 * Request validation utility
 * Joi schemas and validation helpers for API requests
 */

import Joi from 'joi';
import { TASK_TYPES } from '../taskManager.js';

// Common schemas
const pathSchema = Joi.string().min(1).max(2048).required()
  .description('File or folder path');

const optionalPathSchema = Joi.string().min(1).max(2048).optional()
  .description('Optional file or folder path');

const configSchema = Joi.object().optional()
  .description('Configuration object');

const timeoutSchema = Joi.number().integer().min(1000).max(86400000).optional()
  .description('Timeout in milliseconds (1 second to 24 hours)');

const retrySchema = Joi.number().integer().min(0).max(10).optional()
  .description('Number of retry attempts');

// Task-specific request schemas
export const taskRequestSchemas = {
  [TASK_TYPES.MEDIA_ANALYZER]: Joi.object({
    folderPath: pathSchema.description('Path to folder containing media files'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      outputFormat: Joi.string().valid('json', 'xlsx').default('json'),
      includeMetadata: Joi.boolean().default(true),
      associateImages: Joi.boolean().default(true),
      validateContent: Joi.boolean().default(true)
    }).optional()
  }),

  [TASK_TYPES.MUX_UPLOAD]: Joi.object({
    videoPath: pathSchema.description('Path to video file'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      retry: retrySchema,
      chunkSize: Joi.number().integer().min(1).max(50).optional()
        .description('Chunk size in MB'),
      uploadMethod: Joi.string().valid('auto', 'upchunk', 'custom').default('auto'),
      validateUpload: Joi.boolean().default(true)
    }).optional()
  }),

  [TASK_TYPES.PICTURE_UPLOAD]: Joi.object({
    imagePath: pathSchema.description('Path to image file'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      retry: retrySchema,
      quality: Joi.number().min(0.1).max(1.0).optional()
        .description('Image quality (0.1 to 1.0)'),
      maxWidth: Joi.number().integer().min(100).max(4096).optional(),
      maxHeight: Joi.number().integer().min(100).max(4096).optional()
    }).optional()
  }),

  [TASK_TYPES.SINGLE_PICTURE_UPLOAD]: Joi.object({
    picturePath: pathSchema.description('Path to specific picture file'),
    folderPath: pathSchema.description('Path to folder containing Excel file'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      retry: retrySchema,
      quality: Joi.number().min(0.1).max(1.0).optional()
        .description('Image quality (0.1 to 1.0)'),
      detectFormat: Joi.boolean().default(true)
        .description('Automatically detect picture format'),
      requireExcelId: Joi.boolean().default(true)
        .description('Require media description ID from Excel'),
      supportedFormats: Joi.array().items(Joi.string()).optional()
        .description('List of supported formats')
    }).optional()
  }),

  [TASK_TYPES.BATCH_PICTURE_UPLOAD]: Joi.object({
    picturePath: pathSchema.description('Path to specific picture file'),
    parentFolderPath: pathSchema.description('Path to parent folder containing subfolders with Excel files'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      retry: retrySchema,
      quality: Joi.number().min(0.1).max(1.0).optional()
        .description('Image quality (0.1 to 1.0)'),
      detectFormat: Joi.boolean().default(true)
        .description('Automatically detect picture format'),
      requireExcelId: Joi.boolean().default(true)
        .description('Require media description ID from Excel'),
      supportedFormats: Joi.array().items(Joi.string()).optional()
        .description('List of supported formats'),
      continueOnError: Joi.boolean().default(true)
        .description('Continue processing other subfolders if one fails'),
      pattern: Joi.string().default('0_desc')
        .description('Excel file pattern to match in subfolders')
    }).optional()
  }),

  [TASK_TYPES.EXCEL_PREPARATION]: Joi.object({
    folderPath: pathSchema.description('Path to folder for Excel preparation'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      prepareOnly: Joi.boolean().default(true)
    }).optional()
  }),

  [TASK_TYPES.BATCH_EXCEL_PREPARATION]: Joi.object({
    parentFolderPath: pathSchema.description('Path to parent folder containing subfolders'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    folderPath: Joi.string().allow('').optional()
      .description('Optional folder path (legacy compatibility)'),
    options: Joi.object({
      timeout: timeoutSchema,
      prepareOnly: Joi.boolean().default(true),
      continueOnError: Joi.boolean().default(true)
    }).optional()
  }),

  [TASK_TYPES.SINGLE_UPLOAD]: Joi.object({
    folderPath: pathSchema.description('Path to folder containing media'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      retry: retrySchema,
      skipValidation: Joi.boolean().default(false)
    }).optional()
  }),

  [TASK_TYPES.BATCH_UPLOAD]: Joi.object({
    parentFolderPath: pathSchema.description('Path to parent folder containing subfolders'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      retry: retrySchema,
      skipValidation: Joi.boolean().default(false),
      continueOnError: Joi.boolean().default(true)
    }).optional()
  }),

  [TASK_TYPES.PARALLEL_UPLOAD]: Joi.object({
    parentFolderPath: pathSchema.description('Path to parent folder containing subfolders'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      retry: retrySchema,
      maxConcurrent: Joi.number().integer().min(1).max(20).default(5)
        .description('Maximum concurrent uploads'),
      skipValidation: Joi.boolean().default(false),
      continueOnError: Joi.boolean().default(true)
    }).optional()
  }),

  [TASK_TYPES.EXCEL_BULK_EDIT]: Joi.object({
    folderPath: pathSchema.description('Path to folder containing Excel files'),
    fieldName: Joi.string().min(1).max(100).required()
      .description('Field name to edit'),
    fieldValue: Joi.string().max(1000).required()
      .description('New field value'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      dryRun: Joi.boolean().default(false),
      pattern: Joi.string().default('0_desc')
        .description('File name pattern to match'),
      backup: Joi.boolean().default(true)
    }).optional()
  }),

  [TASK_TYPES.MUX_SUBTITLE_UPLOAD]: Joi.object({
    subtitlePath: pathSchema.description('Path to subtitle file'),
    videoId: Joi.string().min(1).max(100).required()
      .description('Mux video ID'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      retry: retrySchema,
      language: Joi.string().length(2).optional()
        .description('Subtitle language code (ISO 639-1)')
    }).optional()
  }),

  [TASK_TYPES.SUBTITLE_SPECIFIC_UPLOAD]: Joi.object({
    subtitlePath: pathSchema.description('Path to subtitle file'),
    mediaDescriptionId: Joi.string().min(1).max(100).optional()
      .description('Media description ID from Excel sheet'),
    folderPath: optionalPathSchema.description('Path to folder containing Excel file for ID lookup'),
    config: configSchema,
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    options: Joi.object({
      timeout: timeoutSchema,
      retry: retrySchema,
      detectedLanguage: Joi.string().length(2).optional()
        .description('Auto-detected language code'),
      languageOverride: Joi.string().length(2).optional()
        .description('Manual language override'),
      autoDetectLanguage: Joi.boolean().default(true)
        .description('Whether to auto-detect language from filename'),
      autoLookupMediaId: Joi.boolean().default(true)
        .description('Whether to auto-lookup media ID from Excel')
    }).optional()
  }),

  [TASK_TYPES.PROPAGATE_SEASON_DATA]: Joi.object({
    seasonId: Joi.string().uuid().required()
      .description('Season media description ID (UUID)'),
    // Accept either nested config object OR direct configPath string
    config: configSchema
      .description('Configuration object with configPath'),
    configPath: Joi.string().optional()
      .description('Direct config file path (alternative to config.configPath)'),
    folderPath: Joi.string().allow('').optional()
      .description('Optional folder path (legacy compatibility)'),
    options: Joi.object({
      timeout: timeoutSchema,
      verbose: Joi.boolean().default(false)
        .description('Enable verbose logging')
    }).optional()
  })
};

// Common query parameter schemas
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(50)
  }),

  filtering: Joi.object({
    status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled').optional(),
    type: Joi.string().valid(...Object.values(TASK_TYPES)).optional(),
    since: Joi.date().iso().optional(),
    until: Joi.date().iso().optional()
  }),

  sorting: Joi.object({
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'type', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Task ID parameter schema
export const taskIdSchema = Joi.string().uuid().required()
  .description('Task UUID');

// Validation middleware factory
export function validateRequest(schema, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      ...options
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Request validation failed',
        details
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
}

// Query validation middleware factory
export function validateQuery(schema, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
      ...options
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Query Validation Error',
        message: 'Query parameter validation failed',
        details
      });
    }

    // Replace req.query with validated and sanitized data
    req.query = value;
    next();
  };
}

// Parameter validation middleware factory
export function validateParams(schema, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      ...options
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Parameter Validation Error',
        message: 'URL parameter validation failed',
        details
      });
    }

    // Replace req.params with validated data
    req.params = value;
    next();
  };
}

// Helper to validate task type
export function validateTaskType(taskType) {
  if (!Object.values(TASK_TYPES).includes(taskType)) {
    throw new Error(`Invalid task type: ${taskType}. Valid types: ${Object.values(TASK_TYPES).join(', ')}`);
  }
  return true;
}

// Helper to validate file paths
export function validatePath(path, options = {}) {
  const schema = Joi.string()
    .min(1)
    .max(2048)
    .required()
    .custom((value, helpers) => {
      // Basic path validation - could be extended with filesystem checks
      if (typeof value !== 'string' || value.trim().length === 0) {
        return helpers.error('string.empty');
      }

      // Check for invalid characters (basic check)
      // eslint-disable-next-line no-control-regex
      const invalidChars = /[<>:"|?*\x00-\x1F]/;
      if (invalidChars.test(value)) {
        return helpers.error('string.pattern.base');
      }

      return value;
    }, 'path validation');

  const { error, value } = schema.validate(path);
  if (error) {
    throw new Error(`Invalid path: ${error.message}`);
  }

  return value;
}

// Create combined validation schemas for common use cases
export const combinedSchemas = {
  taskListQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(50),
    status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled').optional(),
    type: Joi.string().valid(...Object.values(TASK_TYPES)).optional(),
    since: Joi.date().iso().optional(),
    until: Joi.date().iso().optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'type', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  taskParams: Joi.object({
    taskId: taskIdSchema
  })
};

export default {
  taskRequestSchemas,
  querySchemas,
  taskIdSchema,
  combinedSchemas,
  validateRequest,
  validateQuery,
  validateParams,
  validateTaskType,
  validatePath
};