/**
 * Batch Picture Upload Input Schema
 * Validation schema for batch picture upload configuration
 */

import Joi from 'joi';

/**
 * Batch picture upload configuration schema
 */
export const batchPictureUploadSchema = Joi.object({
  // Required: Picture file to upload
  picturePath: Joi.string().required()
    .messages({
      'any.required': 'Picture path is required',
      'string.empty': 'Picture path cannot be empty'
    }),

  // Required: Parent folder containing subfolders with Excel files
  parentFolderPath: Joi.string().required()
    .messages({
      'any.required': 'Parent folder path is required',
      'string.empty': 'Parent folder path cannot be empty'
    }),

  // Required: S3 configuration
  s3: Joi.object({
    accessKeyId: Joi.string().required(),
    secretAccessKey: Joi.string().required(),
    region: Joi.string().required(),
    bucket: Joi.string().required(),
    keyPrefix: Joi.string().default('pictures/')
  }).required()
    .messages({
      'any.required': 'S3 configuration is required'
    }),

  // Required: CloudFront configuration
  cloudfront: Joi.object({
    domain: Joi.string().required()
  }).required()
    .messages({
      'any.required': 'CloudFront configuration is required'
    }),

  // Required: Backend API configuration
  api: Joi.object({
    baseUrl: Joi.string().uri().required(),
    username: Joi.string().required(),
    password: Joi.string().required()
  }).required()
    .messages({
      'any.required': 'API configuration is required'
    }),

  // Optional: Custom metadata
  metadata: Joi.object({
    altText: Joi.string().optional(),
    fileName: Joi.string().optional()
  }).optional(),

  // Optional: Upload options
  options: Joi.object({
    pattern: Joi.string().default('0_desc'),
    continueOnError: Joi.boolean().default(true)
  }).optional(),

  // Optional: Execution modes
  dryRun: Joi.boolean().default(false),
  verbose: Joi.boolean().default(false)
});

/**
 * Batch picture upload FROM ID configuration schema
 * For ID-based workflow without Excel extraction
 */
export const batchPictureUploadFromIdSchema = Joi.object({
  // Required: Picture file to upload
  picturePath: Joi.string().required()
    .messages({
      'any.required': 'Picture path is required',
      'string.empty': 'Picture path cannot be empty'
    }),

  // Required: Media description ID for initial upload (instead of Excel extraction)
  mediaDescriptionId: Joi.string().required()
    .messages({
      'any.required': 'Media description ID is required for ID-based workflow',
      'string.empty': 'Media description ID cannot be empty'
    }),

  // Required: Array of media description IDs for batch association (instead of Excel scanning)
  subfolderMediaDescriptionIds: Joi.array().items(
    Joi.alternatives().try(
      Joi.string(),
      Joi.object({
        mediaDescriptionId: Joi.string().required(),
        folderName: Joi.string().optional(),
        excelPath: Joi.string().optional()
      })
    )
  ).min(0).required()
    .messages({
      'any.required': 'Subfolder media description IDs array is required for ID-based workflow',
      'array.base': 'Subfolder media description IDs must be an array'
    }),

  // Optional: Parent folder path (for informational purposes only)
  parentFolderPath: Joi.string().optional(),

  // Required: S3 configuration
  s3: Joi.object({
    accessKeyId: Joi.string().required(),
    secretAccessKey: Joi.string().required(),
    region: Joi.string().required(),
    bucket: Joi.string().required(),
    keyPrefix: Joi.string().default('pictures/')
  }).required()
    .messages({
      'any.required': 'S3 configuration is required'
    }),

  // Required: CloudFront configuration
  cloudfront: Joi.object({
    domain: Joi.string().required()
  }).required()
    .messages({
      'any.required': 'CloudFront configuration is required'
    }),

  // Required: Backend API configuration
  api: Joi.object({
    baseUrl: Joi.string().uri().required(),
    username: Joi.string().required(),
    password: Joi.string().required()
  }).required()
    .messages({
      'any.required': 'API configuration is required'
    }),

  // Optional: Custom metadata
  metadata: Joi.object({
    altText: Joi.string().optional(),
    fileName: Joi.string().optional()
  }).optional(),

  // Optional: Execution modes
  dryRun: Joi.boolean().default(false),
  verbose: Joi.boolean().default(false)
});

/**
 * Validate batch picture upload configuration
 * Auto-detects whether to use Excel-based or ID-based schema
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validated configuration
 * @throws {Error} If validation fails
 */
export function validateConfig(config) {
  // Determine which schema to use based on presence of mediaDescriptionId field
  const schema = config.mediaDescriptionId
    ? batchPictureUploadFromIdSchema
    : batchPictureUploadSchema;

  const { error, value } = schema.validate(config, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => detail.message).join(', ');
    const workflowType = config.mediaDescriptionId ? 'ID-based' : 'Excel-based';
    throw new Error(`Batch picture upload (${workflowType}) configuration validation failed: ${errors}`);
  }

  return value;
}

export default {
  batchPictureUploadSchema,
  batchPictureUploadFromIdSchema,
  validateConfig
};
