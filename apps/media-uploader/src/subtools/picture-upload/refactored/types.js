/**
 * Picture format enum - 5 supported formats
 * Uses underscore separator internally
 */
export const PictureFormat = {
  FORMAT_1920_1080: '1920_1080',
  FORMAT_1920_720: '1920_720',
  FORMAT_1080_1080: '1080_1080',
  FORMAT_810_1080: '810_1080',
  FORMAT_1080_1920: '1080_1920'
};

export const SUPPORTED_FORMATS = Object.values(PictureFormat);

/**
 * Mapping format to media description field names
 */
export const FORMAT_TO_FIELD_MAP = {
  '1920_1080': 'image_1920_1080_id',
  '1920_720': 'image_1920_720_id',
  '1080_1080': 'image_1080_1080_id',
  '810_1080': 'image_810_1080_id',
  '1080_1920': 'image_1080_1920_id'
};

/**
 * @typedef {Object} UploadConfig
 * @property {Object} s3 - S3 configuration
 * @property {string} s3.accessKeyId
 * @property {string} s3.secretAccessKey
 * @property {string} s3.region
 * @property {Object} s3.pictures
 * @property {string} s3.pictures.bucket
 * @property {string} s3.pictures.keyPrefix
 * @property {Object} api - API configuration
 * @property {string} api.baseUrl
 * @property {string} api.username
 * @property {string} api.password
 * @property {Object} [cloudfront] - CloudFront configuration (optional)
 * @property {string} [cloudfront.domain]
 */

/**
 * @typedef {Object} PictureUploadResult
 * @property {string} pictureId - Backend picture record ID
 * @property {string} s3Url - CloudFront/S3 URL
 * @property {string} s3Key - S3 object key
 * @property {string} bucket - S3 bucket name
 */

/**
 * @typedef {Object} MediaLinkResult
 * @property {string} pictureId - Picture ID
 * @property {string} s3Url - Picture URL
 * @property {string} mediaDescriptionId - Media description ID
 * @property {string} format - Picture format (e.g., '1920_1080')
 * @property {string} fieldUpdated - Field name that was updated (e.g., 'image_1920_1080_id')
 */

/**
 * @typedef {Object} BatchUploadResult
 * @property {MediaLinkResult[]} uploaded - Successfully uploaded pictures
 * @property {FailedUpload[]} failed - Failed uploads
 * @property {UploadSummary} summary - Upload statistics
 */

/**
 * @typedef {Object} FailedUpload
 * @property {string} file - File path that failed
 * @property {string} fileName - File name
 * @property {string} reason - Error message
 */

/**
 * @typedef {Object} UploadSummary
 * @property {number} total - Total files processed
 * @property {number} succeeded - Number of successes
 * @property {number} failed - Number of failures
 */
