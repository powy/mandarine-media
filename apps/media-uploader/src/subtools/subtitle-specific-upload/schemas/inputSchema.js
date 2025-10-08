/**
 * Subtitle-Specific Upload Input Schema
 * Validation schema for subtitle-specific upload configuration
 */

import Joi from 'joi';

/**
 * Subtitle-specific upload configuration schema
 */
export const subtitleSpecificUploadSchema = Joi.object({
  // Required: Subtitle file to upload
  subtitlePath: Joi.string().required()
    .messages({
      'any.required': 'Subtitle path is required',
      'string.empty': 'Subtitle path cannot be empty'
    }),

  // Optional: Language code (auto-detected if not provided)
  language: Joi.string().optional()
    .description('BCP 47 language code (e.g., en, fr, ko, en-US)'),

  // Optional: Media description ID (looked up from Excel if not provided)
  mediaDescriptionId: Joi.string().optional(),

  // Conditional: Folder path (required if mediaDescriptionId not provided)
  folderPath: Joi.string()
    .when('mediaDescriptionId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    })
    .messages({
      'any.required': 'Folder path is required when mediaDescriptionId is not provided'
    }),

  // Required: Mux configuration
  mux: Joi.object({
    tokenId: Joi.string().required(),
    tokenSecret: Joi.string().required()
  }).required()
    .messages({
      'any.required': 'Mux configuration is required'
    }),

  // Required: S3 configuration for subtitle storage
  s3: Joi.object({
    accessKeyId: Joi.string().required(),
    secretAccessKey: Joi.string().required(),
    region: Joi.string().required(),
    bucket: Joi.string().required(),
    keyPrefix: Joi.string().default('subtitles/')
  }).required()
    .messages({
      'any.required': 'S3 configuration is required'
    }),

  // Required: Backend API configuration
  backend: Joi.object({
    baseUrl: Joi.string().uri().required(),
    username: Joi.string().required(),
    password: Joi.string().required()
  }).required()
    .messages({
      'any.required': 'Backend API configuration is required'
    }),

  // Optional: Upload options
  options: Joi.object({
    autoDetectLanguage: Joi.boolean().default(true),
    autoLookupMediaId: Joi.boolean().default(true),
    retry: Joi.number().min(0).max(10).default(3),
    closedCaptions: Joi.boolean().default(false),
    name: Joi.string().optional()
  }).optional(),

  // Optional: Execution modes
  dryRun: Joi.boolean().default(false),
  verbose: Joi.boolean().default(false)
});

/**
 * Validate subtitle-specific upload configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validated configuration
 * @throws {Error} If validation fails
 */
export function validateConfig(config) {
  const { error, value } = subtitleSpecificUploadSchema.validate(config, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Subtitle-specific upload configuration validation failed: ${errors}`);
  }

  return value;
}

export default {
  subtitleSpecificUploadSchema,
  validateConfig
};
