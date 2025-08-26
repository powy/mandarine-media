import Joi from 'joi';

export const configSchema = Joi.object({
  // Picture file path
  picturePath: Joi.string()
    .required()
    .description('Path to the picture file'),

  // S3 Configuration
  s3: Joi.object({
    accessKeyId: Joi.string().required(),
    secretAccessKey: Joi.string().required(),
    region: Joi.string().required(),
    bucket: Joi.string().required(),
    keyPrefix: Joi.string().default('pictures/').description('S3 key prefix for uploaded files')
  }).required(),

  // Backend API Configuration
  api: Joi.object({
    baseUrl: Joi.string().uri().required().description('Backend API base URL'),
    username: Joi.string().required().description('Admin username for authentication'),
    password: Joi.string().required().description('Admin password for authentication')
  }).required(),

  // Picture metadata (optional)
  metadata: Joi.object({
    fileName: Joi.string().optional(),
    altText: Joi.string().optional()
  }).optional()
});

export const validateConfig = (config) => {
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    allowUnknown: false
  });

  if (error) {
    const details = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Configuration validation failed: ${details}`);
  }

  return value;
};