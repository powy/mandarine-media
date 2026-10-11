import Joi from 'joi';

const subtitleSchema = Joi.object({
  url: Joi.alternatives().try(
    Joi.string().uri(), // HTTP/HTTPS URLs
    Joi.string().min(1)  // Local file paths (any non-empty string)
  ).required(),
  language_code: Joi.string().required(),
  name: Joi.string().required(),
  text_type: Joi.string().valid('subtitles', 'captions').default('subtitles'),
  closed_captions: Joi.boolean().default(false),
  passthrough: Joi.string().optional()
});

const drmSchema = Joi.object({
  enabled: Joi.boolean().required(),
  configuration_id: Joi.string().when('enabled', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  license_url: Joi.string().uri().optional(),
  certificate_url: Joi.string().uri().optional()
});

const staticRenditionSchema = Joi.object({
  files: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    ext: Joi.string().valid('mp4', 'webm').default('mp4'),
    resolution_tier: Joi.string().valid('720p', '1080p', '1440p', '2160p').required(),
    passthrough: Joi.string().optional()
  })).optional()
});

const watermarkSchema = Joi.object({
  url: Joi.string().uri().required(),
  overlay_settings: Joi.object({
    vertical_align: Joi.string().valid('top', 'middle', 'bottom').default('bottom'),
    vertical_margin: Joi.string().pattern(/^\d+%?$/).default('10%'),
    horizontal_align: Joi.string().valid('left', 'center', 'right').default('right'),
    horizontal_margin: Joi.string().pattern(/^\d+%?$/).default('10%'),
    width: Joi.string().pattern(/^\d+%?$/).default('10%'),
    opacity: Joi.string().pattern(/^\d+%?$/).default('50%')
  }).optional()
});

const databaseSchema = Joi.object({
  type: Joi.string().valid('postgresql', 'mysql', 'sqlite').required(),
  connection: Joi.object({
    host: Joi.string().when('...type', {
      is: Joi.valid('postgresql', 'mysql'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    port: Joi.number().integer().when('...type', {
      is: Joi.valid('postgresql', 'mysql'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    database: Joi.string().required(),
    user: Joi.string().when('...type', {
      is: Joi.valid('postgresql', 'mysql'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    password: Joi.string().when('...type', {
      is: Joi.valid('postgresql', 'mysql'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    filename: Joi.string().when('...type', {
      is: 'sqlite',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }).required(),
  table: Joi.string().default('mux_assets'),
  save_playback_ids: Joi.boolean().default(true),
  save_tracks: Joi.boolean().default(true),
  save_metadata: Joi.boolean().default(true)
});

const loggingSchema = Joi.object({
  enabled: Joi.boolean().default(true),
  level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  file: Joi.string().optional(),
  console: Joi.boolean().default(true),
  format: Joi.string().valid('json', 'simple').default('json')
});

const webhookSchema = Joi.object({
  enabled: Joi.boolean().default(false),
  url: Joi.string().uri().when('enabled', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  events: Joi.array().items(
    Joi.string().valid(
      'video.asset.ready',
      'video.asset.errored',
      'video.asset.created',
      'video.asset.updated',
      'video.asset.deleted',
      'video.upload.asset_created',
      'video.upload.errored',
      'video.upload.cancelled'
    )
  ).default(['video.asset.ready', 'video.asset.errored'])
});

const optionsSchema = Joi.object({
  // Legacy options (maintained for backward compatibility)
  timeout: Joi.number().integer().min(60000).default(43200000), // 1 min minimum, no maximum
  retry_attempts: Joi.number().integer().min(1).max(10).default(3),
  retry_delay: Joi.number().integer().min(1000).max(30000).default(5000), // 1-30 seconds
  chunk_size: Joi.number().integer().min(1048576).max(104857600).default(31457280), // 1MB to 100MB (legacy)
  concurrent_uploads: Joi.number().integer().min(1).max(5).default(1),

  // Enhanced upload options
  upload_method: Joi.string().valid('auto', 'upchunk', 'custom').default('auto'),
  chunk_size_mb: Joi.number().min(1).max(50).default(5), // New chunk size in MB
  memory_threshold_mb: Joi.number().min(50).max(1000).default(100), // Memory threshold for method selection
  enable_resume: Joi.boolean().default(true), // Resume capability
  max_chunk_retries: Joi.number().integer().min(1).max(10).default(5), // Per-chunk retry attempts
  retry_delay_base: Joi.number().integer().min(100).max(10000).default(1000), // Base retry delay in ms
  chunk_timeout: Joi.number().integer().min(30000).max(600000).default(120000), // Per-chunk timeout (30s-10min)
  dynamic_chunk_size: Joi.boolean().default(false), // Enable dynamic chunk sizing

  // Advanced options
  validate_before_upload: Joi.boolean().default(true), // Validate before starting upload
  network_quality_monitoring: Joi.boolean().default(false), // Monitor network quality
  adaptive_retry_delay: Joi.boolean().default(true) // Use adaptive retry delays
});

export const configSchema = Joi.object({
  auth: Joi.object({
    mux_token_id: Joi.string().required(),
    mux_token_secret: Joi.string().required()
  }).required(),
  
  backend: Joi.object({
    server_address: Joi.string().uri().required(),
    user: Joi.string().required(),
    password: Joi.string().required()
  }).optional(),

  no_server: Joi.boolean().optional(),
  
  video: Joi.object({
    filepath: Joi.string().required(),
    title: Joi.string().optional(),
    description: Joi.string().optional()
  }).required(),
  
  settings: Joi.object({
    playback_policy: Joi.array().items(
      Joi.string().valid('public', 'signed', 'drm')
    ).default(['public']),
    video_quality: Joi.string().valid('basic', 'plus').default('basic'),
    max_resolution_tier: Joi.string().valid('720p', '1080p', '1440p', '2160p').default('1080p'),
    normalize_audio: Joi.boolean().default(false),
    master_access: Joi.string().valid('none', 'temporary', 'full').default('none'),
    mp4_support: Joi.string().valid('none', 'capped-1080p', 'audio-only', 'standard').default('none'),
    passthrough: Joi.string().optional(),
    cors_origin: Joi.string().default('*'),
    environment_text: Joi.string().optional()
  }).optional(),
  
  metadata: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.array().items(Joi.string()) // Allow arrays of strings (like tags)
    )
  ).optional(),
  
  subtitles: Joi.array().items(subtitleSchema).optional(),
  drm: drmSchema.optional(),
  static_renditions: staticRenditionSchema.optional(),
  watermark: watermarkSchema.optional(),
  database: databaseSchema.optional(),
  logging: loggingSchema.optional(),
  webhook: webhookSchema.optional(),
  options: optionsSchema.optional(),
  
  // Internal CLI options (added by the CLI tool)
  _cli: Joi.object({
    debug: Joi.boolean().optional(),
    timeout: Joi.number().optional(),
    retry: Joi.number().optional(),
    dryRun: Joi.boolean().optional(),
    progress: Joi.boolean().optional(),
    verbose: Joi.boolean().optional(),
    quiet: Joi.boolean().optional()
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
    BACKEND_SERVER_ADDRESS: Joi.string().uri().optional(),
    BACKEND_USER: Joi.string().optional(),
    BACKEND_PASSWORD: Joi.string().optional(),
    DB_TYPE: Joi.string().valid('postgresql', 'mysql', 'sqlite').optional(),
    DB_HOST: Joi.string().optional(),
    DB_PORT: Joi.number().integer().optional(),
    DB_NAME: Joi.string().optional(),
    DB_USER: Joi.string().optional(),
    DB_PASSWORD: Joi.string().optional(),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').optional(),
    LOG_FILE: Joi.string().optional(),
    UPLOAD_TIMEOUT: Joi.number().integer().optional(),
    RETRY_ATTEMPTS: Joi.number().integer().optional(),
    RETRY_DELAY: Joi.number().integer().optional(),
    CHUNK_SIZE: Joi.number().integer().optional(),
    WEBHOOK_URL: Joi.string().uri().optional(),
    WEBHOOK_EVENTS: Joi.string().optional()
  });
  
  const { error, value } = envSchema.validate(env, { allowUnknown: true });
  
  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }
  
  return value;
}