import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';

// Resolution mapping: original resolution -> small resolution
const SMALL_RESOLUTION_MAP = {
  '1920x1080': { width: 480, height: 270 },
  '1920x720': { width: 480, height: 180 },
  '1080x1080': { width: 270, height: 270 },
  '810x1080': { width: 270, height: 360 },
  '1080x1920': { width: 270, height: 480 }
};

// Original resolution dimensions
const ORIGINAL_RESOLUTION_MAP = {
  '1920x1080': { width: 1920, height: 1080 },
  '1920x720': { width: 1920, height: 720 },
  '1080x1080': { width: 1080, height: 1080 },
  '810x1080': { width: 810, height: 1080 },
  '1080x1920': { width: 1080, height: 1920 }
};

/**
 * Process an image and create optimized WebP variants using Sharp
 * @param {string} inputPath - Path to input image
 * @param {string} outputDir - Directory for output files
 * @param {string} resolution - Original resolution format (e.g., '1920x1080')
 * @param {string} baseName - Base name for output files
 * @returns {Promise<Object>} - Paths to created files with sizes
 */
export async function createOptimizedVariants(inputPath, outputDir, resolution, baseName) {
  // Validate resolution
  if (!SMALL_RESOLUTION_MAP[resolution]) {
    throw new Error(`Unsupported resolution: ${resolution}`);
  }

  // Ensure output directory exists
  await fs.ensureDir(outputDir);

  // Get target dimensions
  const originalDims = ORIGINAL_RESOLUTION_MAP[resolution];
  const smallDims = SMALL_RESOLUTION_MAP[resolution];

  // Create large variant (same resolution, WebP quality 80)
  const largePath = path.join(outputDir, `${baseName}_large.webp`);
  await sharp(inputPath)
    .resize(originalDims.width, originalDims.height, {
      fit: 'cover',
      kernel: 'lanczos3'
    })
    .webp({ quality: 80 })
    .toFile(largePath);

  // Create small variant (reduced resolution, WebP quality 65)
  const smallPath = path.join(outputDir, `${baseName}_small.webp`);
  await sharp(inputPath)
    .resize(smallDims.width, smallDims.height, {
      fit: 'cover',
      kernel: 'lanczos3'
    })
    .webp({ quality: 65 })
    .toFile(smallPath);

  // Get file sizes
  const largeStats = await fs.stat(largePath);
  const smallStats = await fs.stat(smallPath);

  return {
    largePath,
    smallPath,
    largeSize: largeStats.size,
    smallSize: smallStats.size
  };
}

/**
 * Generate variant S3 key from original key
 * @param {string} originalKey - Original S3 key
 * @param {string} suffix - Variant suffix ('large' or 'small')
 * @returns {string} - Variant S3 key
 */
export function generateVariantKey(originalKey, suffix) {
  const ext = path.extname(originalKey);
  const baseKey = originalKey.slice(0, -ext.length);
  return `${baseKey}_${suffix}.webp`;
}

export { SMALL_RESOLUTION_MAP, ORIGINAL_RESOLUTION_MAP };
