import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { validateConfig } from './schemas/inputSchema.js';
import { S3Service } from './services/s3Service.js';
import { ApiService } from './services/apiService.js';
import { createOptimizedVariants, generateVariantKey } from './utils/imageProcessor.js';

// Resolution to field mapping for MediaDescription
const RESOLUTION_FIELD_MAP = {
  '1920x1080': 'image_1920_1080_id',
  '1920x720': 'image_1920_720_id',
  '1080x1080': 'image_1080_1080_id',
  '810x1080': 'image_810_1080_id',
  '1080x1920': 'image_1080_1920_id'
};

/**
 * Load and validate configuration from file
 * @param {string} configPath - Path to config file
 * @returns {Promise<Object>} - Validated configuration
 */
async function loadConfigFile(configPath) {
  const content = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Optimize a single picture by creating WebP variants
 * @param {Object} options - Options object
 * @param {string} options.config - Path to config file
 * @param {string} [options.pictureId] - Override picture ID from config
 * @param {string} [options.resolution] - Override resolution from config
 * @param {boolean} [options.verbose] - Verbose output
 * @param {boolean} [options.dryRun] - Dry run mode
 * @returns {Promise<Object>} - Optimization result
 */
export async function optimizePicture(options) {
  let tempDir = null;

  try {
    console.log('🖼️  Picture Optimization Tool v1.0.0');
    console.log('=====================================\n');

    // Load and validate config
    console.log(`📄 Loading configuration from: ${options.config}`);
    const rawConfig = await loadConfigFile(options.config);

    // Allow CLI overrides
    if (options.pictureId) rawConfig.pictureId = options.pictureId;
    if (options.resolution) rawConfig.resolution = options.resolution;

    const config = validateConfig(rawConfig);
    console.log('✅ Configuration loaded and validated\n');

    // Initialize services
    const s3Service = new S3Service({
      ...config.s3,
      cloudfrontDomain: config.cloudfront.domain
    });
    const apiService = new ApiService(config.api);

    // Get picture from API
    console.log(`🔍 Fetching picture: ${config.pictureId}`);
    const picture = await apiService.getPicture(config.pictureId);
    console.log(`✅ Picture found: ${picture.image_url}`);

    // Check if already optimized
    if (picture.large_image_url && picture.small_image_url) {
      console.log('⚠️  Picture already has large and small variants - skipping');
      return {
        success: true,
        skipped: true,
        reason: 'Already optimized',
        pictureId: config.pictureId
      };
    }

    if (options.dryRun) {
      console.log('✓ Dry run - would optimize this picture\n');
      return {
        success: true,
        dryRun: true,
        pictureId: config.pictureId,
        resolution: config.resolution
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
    console.log(`☁️  Downloading original from S3: ${originalKey}`);
    await s3Service.downloadFile(originalKey, originalPath);
    console.log('✅ Downloaded successfully');

    // Create optimized variants
    console.log(`🔄 Creating optimized variants for ${config.resolution}...`);
    const baseName = path.basename(originalKey, path.extname(originalKey));
    const variants = await createOptimizedVariants(
      originalPath,
      tempDir,
      config.resolution,
      baseName
    );
    console.log('✅ Variants created');

    // Generate S3 keys for variants
    const largeKey = generateVariantKey(originalKey, 'large');
    const smallKey = generateVariantKey(originalKey, 'small');

    // Upload large variant
    console.log(`☁️  Uploading large variant: ${largeKey}`);
    const largeResult = await s3Service.uploadFile(variants.largePath, largeKey, 'image/webp');
    console.log(`✅ Large variant uploaded: ${largeResult.url}`);

    // Upload small variant
    console.log(`☁️  Uploading small variant: ${smallKey}`);
    const smallResult = await s3Service.uploadFile(variants.smallPath, smallKey, 'image/webp');
    console.log(`✅ Small variant uploaded: ${smallResult.url}`);

    // Update picture in API
    console.log('🔄 Updating picture record with variant URLs...');
    const updatedPicture = await apiService.updatePicture(config.pictureId, {
      large_image_url: largeResult.url,
      small_image_url: smallResult.url
    });
    console.log('✅ Picture record updated');

    console.log('\n✅ Optimization completed successfully!');
    console.log(`  Original: ${picture.image_url}`);
    console.log(`  Large: ${largeResult.url}`);
    console.log(`  Small: ${smallResult.url}`);

    return {
      success: true,
      pictureId: config.pictureId,
      originalUrl: picture.image_url,
      largeUrl: largeResult.url,
      smallUrl: smallResult.url
    };

  } catch (error) {
    console.error(`❌ Optimization failed: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
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
 * Optimize all pictures of a media description
 * @param {Object} options - Options object
 * @param {string} options.config - Path to config file
 * @param {string} [options.mediaDescriptionId] - Override media description ID
 * @param {boolean} [options.verbose] - Verbose output
 * @param {boolean} [options.dryRun] - Dry run mode
 * @returns {Promise<Object>} - Optimization results
 */
export async function optimizeMediaDescriptionPictures(options) {
  try {
    console.log('🖼️  Media Description Picture Optimization v1.0.0');
    console.log('=================================================\n');

    // Load config
    console.log(`📄 Loading configuration from: ${options.config}`);
    const rawConfig = await loadConfigFile(options.config);

    // Allow CLI override
    if (options.mediaDescriptionId) {
      rawConfig.mediaDescriptionId = options.mediaDescriptionId;
    }

    // Basic validation (we'll skip the pictureId/resolution requirement check)
    if (!rawConfig.mediaDescriptionId) {
      throw new Error('mediaDescriptionId is required');
    }

    console.log('✅ Configuration loaded\n');

    // Initialize API service
    const apiService = new ApiService(rawConfig.api);

    // Get media description
    console.log(`🔍 Fetching media description: ${rawConfig.mediaDescriptionId}`);
    const mediaDesc = await apiService.getMediaDescription(rawConfig.mediaDescriptionId);
    console.log(`✅ Media description found: ${mediaDesc.episode_title || mediaDesc.id}\n`);

    // Process each resolution format
    const results = {
      success: true,
      mediaDescriptionId: rawConfig.mediaDescriptionId,
      processed: [],
      skipped: [],
      warnings: [],
      errors: []
    };

    for (const [resolution, fieldName] of Object.entries(RESOLUTION_FIELD_MAP)) {
      const pictureId = mediaDesc[fieldName];

      console.log(`\n--- Processing ${resolution} (${fieldName}) ---`);

      // Check if picture field is set
      if (!pictureId) {
        const warning = `No picture set for ${resolution} (${fieldName})`;
        console.log(`⚠️  ${warning} - skipping`);
        results.warnings.push(warning);
        results.skipped.push({ resolution, reason: 'No picture assigned' });
        continue;
      }

      try {
        // Get the picture to check if already optimized
        const picture = await apiService.getPicture(pictureId);

        // Check if already optimized
        if (picture.large_image_url && picture.small_image_url) {
          const warning = `Picture ${pictureId} (${resolution}) already has variants`;
          console.log(`⚠️  ${warning} - skipping`);
          results.warnings.push(warning);
          results.skipped.push({
            resolution,
            pictureId,
            reason: 'Already optimized'
          });
          continue;
        }

        if (options.dryRun) {
          console.log(`✓ Would optimize picture ${pictureId} for ${resolution}`);
          results.processed.push({
            resolution,
            pictureId,
            dryRun: true
          });
          continue;
        }

        // Call single picture optimization
        const result = await optimizePicture({
          config: options.config,
          pictureId,
          resolution,
          verbose: options.verbose,
          dryRun: false
        });

        if (result.skipped) {
          results.skipped.push({
            resolution,
            pictureId,
            reason: result.reason
          });
        } else {
          results.processed.push({
            resolution,
            pictureId,
            largeUrl: result.largeUrl,
            smallUrl: result.smallUrl
          });
        }

      } catch (error) {
        const errorMsg = `Failed to optimize ${resolution}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push(errorMsg);
        results.success = false;
      }
    }

    // Summary
    console.log('\n=================================================');
    console.log('📊 Optimization Summary');
    console.log('=================================================');
    console.log(`  Processed: ${results.processed.length}`);
    console.log(`  Skipped: ${results.skipped.length}`);
    console.log(`  Warnings: ${results.warnings.length}`);
    console.log(`  Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Completed with errors');
    } else if (results.warnings.length > 0) {
      console.log('\n⚠️  Completed with warnings');
    } else {
      console.log('\n✅ Completed successfully');
    }

    return results;

  } catch (error) {
    console.error(`❌ Media description optimization failed: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    throw error;
  }
}

export default { optimizePicture, optimizeMediaDescriptionPictures };
