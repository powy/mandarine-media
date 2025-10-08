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
 * Validate batch picture upload configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validated configuration
 * @throws {Error} If validation fails
 */
export function validateConfig(config) {
  const { error, value } = batchPictureUploadSchema.validate(config, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Batch picture upload configuration validation failed: ${errors}`);
  }

  return value;
}

export default {
  batchPictureUploadSchema,
  validateConfig
};
