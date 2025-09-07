import Joi from 'joi';

export const configSchema = Joi.object({
  backend: Joi.object({
    baseUrl: Joi.string().uri().required(),
    username: Joi.string().email().required(),
    password: Joi.string().required()
  }).required(),
  
  mux: Joi.object({
    tokenId: Joi.string().required(),
    tokenSecret: Joi.string().required()
  }).required(),
  
  s3: Joi.object({
    accessKeyId: Joi.string().required(),
    secretAccessKey: Joi.string().required(),
    region: Joi.string().required(),
    pictures: Joi.object({
      bucket: Joi.string().required(),
      keyPrefix: Joi.string().default('pictures/')
    }).required(),
    subtitles: Joi.object({
      bucket: Joi.string().required(),
      keyPrefix: Joi.string().default('subtitles/')
    }).required()
  }).required(),
  
  settings: Joi.object({
    videoQuality: Joi.string().valid('basic', 'plus').default('plus'),
    playbackPolicy: Joi.array().items(Joi.string().valid('public', 'signed')).default(['public']),
    maxResolutionTier: Joi.string().valid('720p', '1080p', '1440p', '2160p').default('1080p'),
    mp4Support: Joi.string().valid('none', 'standard', 'downloadable').default('standard'),
    masterAccess: Joi.string().valid('none', 'temporary').default('none'),
    environmentText: Joi.string().default('production')
  }).default(),
  
  logging: Joi.object({
    enabled: Joi.boolean().default(true),
    level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    file: Joi.string().default('./logs/one-media-complete-upload.log'),
    console: Joi.boolean().default(true)
  }).default(),
  
  options: Joi.object({
    timeout: Joi.number().integer().positive().default(3600000),
    retryAttempts: Joi.number().integer().min(0).max(5).default(3),
    retryDelay: Joi.number().integer().positive().default(5000),
    chunkSize: Joi.number().integer().positive().default(31457280),
    concurrentUploads: Joi.number().integer().positive().max(5).default(1)
  }).default()
}).required();

export function validateConfig(config) {
  const { error, value } = configSchema.validate(config, { 
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errors = error.details.map(detail => `  - ${detail.message}`).join('\n');
    throw new Error(`Configuration validation failed:\n${errors}`);
  }
  
  return value;
}