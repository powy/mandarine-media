import Joi from 'joi';

const s3ConfigSchema = Joi.object({
  access_key_id: Joi.string().required(),
  secret_access_key: Joi.string().required(),
  region: Joi.string().default('us-east-1'),
  bucket_name: Joi.string().required(),
  presigned_url_expiry: Joi.number().integer().min(300).max(86400).default(3600) // 5 minutes to 24 hours
});

const subtitleSchema = Joi.object({
  file_path: Joi.string().required(),
  language_code: Joi.string().length(2).lowercase().required(), // ISO 639-1 codes
  name: Joi.string().required(),
  text_type: Joi.string().valid('subtitles', 'captions').default('subtitles'),
  closed_captions: Joi.boolean().default(false),
  passthrough: Joi.string().optional()
});

const loggingSchema = Joi.object({
  enabled: Joi.boolean().default(true),
  level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  file: Joi.string().optional(),
  console: Joi.boolean().default(true),
  format: Joi.string().valid('json', 'simple').default('json')
});

const optionsSchema = Joi.object({
  cleanup_delay_minutes: Joi.number().integer().min(1).max(1440).default(120), // 1 minute to 24 hours
  max_retry_attempts: Joi.number().integer().min(1).max(10).default(3),
  retry_delay: Joi.number().integer().min(1000).max(30000).default(5000), // 1-30 seconds
  validate_before_upload: Joi.boolean().default(true),
  monitoring_timeout: Joi.number().integer().min(30000).max(300000).default(60000), // 30s to 5 minutes
  monitoring_interval: Joi.number().integer().min(1000).max(30000).default(5000) // 1-30 seconds
});

export const configSchema = Joi.object({
  auth: Joi.object({
    mux_token_id: Joi.string().required(),
    mux_token_secret: Joi.string().required()
  }).required(),
  
  s3: s3ConfigSchema.required(),
  
  mux_asset_id: Joi.string().required(),
  
  subtitles: Joi.array().items(subtitleSchema).min(1).required(),
  
  logging: loggingSchema.optional(),
  
  options: optionsSchema.optional(),
  
  // Internal CLI options (added by the CLI tool)
  _cli: Joi.object({
    dryRun: Joi.boolean().optional(),
    verbose: Joi.boolean().optional(),
    quiet: Joi.boolean().optional(),
    noCleanup: Joi.boolean().optional()
  }).optional()
});

export function validateConfig(config) {
  const { error, value } = configSchema.validate(config, { 
    allowUnknown: false,
    abortEarly: false 
  });
  
  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));
    
    throw new Error(`Configuration validation failed:\n${details.map(d => `  - ${d.field}: ${d.message}`).join('\n')}`);
  }
  
  return value;
}

export function validateEnvironment(env) {
  const envSchema = Joi.object({
    MUX_TOKEN_ID: Joi.string().optional(),
    MUX_TOKEN_SECRET: Joi.string().optional(),
    AWS_ACCESS_KEY_ID: Joi.string().optional(),
    AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
    AWS_REGION: Joi.string().optional(),
    S3_BUCKET_NAME: Joi.string().optional(),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').optional(),
    LOG_FILE: Joi.string().optional(),
    CLEANUP_DELAY_MINUTES: Joi.number().integer().optional(),
    MAX_RETRY_ATTEMPTS: Joi.number().integer().optional(),
    RETRY_DELAY: Joi.number().integer().optional(),
    PRESIGNED_URL_EXPIRY: Joi.number().integer().optional()
  });
  
  const { error, value } = envSchema.validate(env, { allowUnknown: true });
  
  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }
  
  return value;
}