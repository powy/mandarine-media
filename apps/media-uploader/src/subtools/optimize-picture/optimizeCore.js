/**
 * Core optimization functions (config-based, no file I/O)
 * For automatic integration into picture upload flows
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { S3Service } from './services/s3Service.js';
import { ApiService } from './services/apiService.js';
import { createOptimizedVariants, generateVariantKey } from './utils/imageProcessor.js';

/**
 * Optimize a single picture by creating WebP variants (config object version)
 * This version accepts config as object (not file path) for integration with other tools
 *
 * @param {string} pictureId - UUID of the picture to optimize
 * @param {string} resolution - Resolution format (e.g., '1920x1080')
 * @param {Object} config - Configuration object (not file path)
 * @param {Object} config.s3 - S3 configuration
 * @param {Object} config.cloudfront - CloudFront configuration
 * @param {Object} config.api - API configuration
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @param {Function} [options.logger] - Custom logger function
 * @returns {Promise<Object>} - Optimization result
 */
export async function optimizePictureCore(pictureId, resolution, config, options = {}) {
  let tempDir = null;
  const { verbose = false, logger } = options;

  const log = (msg) => {
    if (logger) {
      logger(msg);
    } else if (verbose) {
      console.log(msg);
    }
  };

  try {
    // Initialize services
    const s3Service = new S3Service({
      ...config.s3,
      cloudfrontDomain: config.cloudfront?.domain || 'www.kyool.eu'
    });
    const apiService = new ApiService(config.api);

    // Get picture from API
    log(`[Optimize] Fetching picture: ${pictureId}`);
    const picture = await apiService.getPicture(pictureId);
    log(`[Optimize] Picture found: ${picture.image_url}`);

    // Check if already optimized
    if (picture.large_image_url && picture.small_image_url) {
      log(`[Optimize] Picture already has variants - skipping`);
      return {
        success: true,
        skipped: true,
        reason: 'Already optimized',
        pictureId
      };
    }

    // Extract S3 key from URL
    const originalKey = s3Service.urlToKey(picture.image_url);
    if (!originalKey) {
      throw new Error(`Could not extract S3 key from URL: ${picture.image_url}`);
    }

    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'optimize-picture-'));
    const originalFileName = path.basename(originalKey);
    const originalPath = path.join(tempDir, originalFileName);

    // Download original from S3
    log(`[Optimize] Downloading original from S3: ${originalKey}`);
    await s3Service.downloadFile(originalKey, originalPath);

    // Create optimized variants
    log(`[Optimize] Creating WebP variants for ${resolution}...`);
    const baseName = path.basename(originalKey, path.extname(originalKey));
    const variants = await createOptimizedVariants(
      originalPath,
      tempDir,
      resolution,
      baseName
    );

    // Generate S3 keys for variants
    const largeKey = generateVariantKey(originalKey, 'large');
    const smallKey = generateVariantKey(originalKey, 'small');

    // Upload large variant
    log(`[Optimize] Uploading large variant: ${largeKey}`);
    const largeResult = await s3Service.uploadFile(variants.largePath, largeKey, 'image/webp');

    // Upload small variant
    log(`[Optimize] Uploading small variant: ${smallKey}`);
    const smallResult = await s3Service.uploadFile(variants.smallPath, smallKey, 'image/webp');

    // Update picture in API
    log(`[Optimize] Updating picture record with variant URLs...`);
    await apiService.updatePicture(pictureId, {
      large_image_url: largeResult.url,
      small_image_url: smallResult.url
    });

    log(`[Optimize] Optimization completed successfully`);

    return {
      success: true,
      pictureId,
      originalUrl: picture.image_url,
      largeUrl: largeResult.url,
      smallUrl: smallResult.url
    };

  } catch (error) {
    log(`[Optimize] Optimization failed: ${error.message}`);
    throw error;
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      try {
        await fs.remove(tempDir);
      } catch (e) {
        // Best effort cleanup
      }
    }
  }
}

/**
 * Helper: Convert picture format (underscore notation) to resolution (colon notation)
 * Examples: '1920_1080' -> '1920x1080', '810_1080' -> '810x1080'
 *
 * @param {string} format - Format in underscore notation
 * @returns {string} - Resolution in colon notation
 */
export function formatToResolution(format) {
  return format.replace('_', 'x');
}

export default {
  optimizePictureCore,
  formatToResolution
};
