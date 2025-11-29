import Joi from 'joi';

// Valid resolution formats
const validResolutions = ['1920x1080', '1920x720', '1080x1080', '810x1080', '1080x1920'];

export const configSchema = Joi.object({
  // For single picture optimization
  pictureId: Joi.string()
    .uuid()
    .optional()
    .description('UUID of the picture to optimize'),

  resolution: Joi.string()
    .valid(...validResolutions)
    .optional()
    .description('Original resolution format of the picture'),

  // For media description batch optimization
  mediaDescriptionId: Joi.string()
    .uuid()
    .optional()
    .description('UUID of the media description to optimize all pictures'),

  // S3 Configuration
  s3: Joi.object({
    accessKeyId: Joi.string().required(),
    secretAccessKey: Joi.string().required(),
    region: Joi.string().required(),
    bucket: Joi.string().required(),
    keyPrefix: Joi.string().default('images/visuals/').description('S3 key prefix')
  }).required(),

  // CloudFront Configuration
  cloudfront: Joi.object({
    domain: Joi.string().default('www.kyool.eu').description('CloudFront domain')
  }).required(),

  // Backend API Configuration
  api: Joi.object({
    baseUrl: Joi.string().uri().required().description('Backend API base URL'),
    username: Joi.string().required().description('Admin username'),
    password: Joi.string().required().description('Admin password')
  }).required()
}).custom((value, helpers) => {
  // Ensure either pictureId+resolution OR mediaDescriptionId is provided
  const hasPicture = value.pictureId && value.resolution;
  const hasMediaDescription = value.mediaDescriptionId;

  if (!hasPicture && !hasMediaDescription) {
    return helpers.error('any.custom', {
      message: 'Either (pictureId + resolution) or mediaDescriptionId must be provided'
    });
  }

  return value;
});

export const validateConfig = (config) => {
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Configuration validation failed: ${details}`);
  }

  return value;
};

export { validResolutions };
