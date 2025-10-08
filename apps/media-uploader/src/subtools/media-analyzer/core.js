/**
 * Media Analyzer Core Function
 * Pure function interface that accepts JSON configuration
 */

import fs from 'fs/promises';
import winston from 'winston';
import { fileURLToPath } from 'url';
import path from 'path';

// Import existing classes (converted to ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For now, we'll import the existing CommonJS modules
// In a full refactor, these would be converted to ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const Config = require('./config');
const FileScanner = require('./analyzers/FileScanner');
const StructureDetector = require('./analyzers/StructureDetector');
const MovieTrailerAnalyzer = require('./analyzers/MovieTrailerAnalyzer');
const MetadataReader = require('./analyzers/MetadataReader');
const FileAssociator = require('./associators/FileAssociator');
const GlobalImageIdentifier = require('./associators/GlobalImageIdentifier');
const OutputFormatter = require('./formatters/OutputFormatter');
const ContentValidator = require('./validators/ContentValidator');

/**
 * Core media analyzer function
 * @param {Object} config - Configuration object
 * @param {string|Object} config.paths - Paths to analyze (string for legacy, object for multi-path)
 * @param {string} [config.paths.videoPath] - Path to video folder
 * @param {string} [config.paths.subtitlePath] - Path to subtitle folder
 * @param {string} [config.paths.imagePath] - Path to image folder
 * @param {boolean} [config.readMetadata=true] - Whether to read video metadata
 * @param {number} [config.minScore=60] - Minimum association score
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @param {boolean} [config.debug=false] - Debug logging
 * @param {string} [config.outputFile] - Output file path (for analyzeAndSave)
 * @param {boolean} [config.exportForUpload=false] - Export format optimized for upload
 * @returns {Promise<Object>} Analysis result
 */
export async function mediaAnalyzerCore(config) {
  // Set up logging
  const logger = createLogger(config);

  try {
    // Validate configuration
    validateConfig(config);

    // Create configuration object
    const analyzerConfig = new Config();
    if (config.minScore) {
      analyzerConfig.MIN_MATCH_SCORE = config.minScore;
    }

    // Create analyzer instance
    const scanner = new FileScanner(analyzerConfig);
    const structureDetector = new StructureDetector();
    const movieTrailerAnalyzer = new MovieTrailerAnalyzer(analyzerConfig);
    const associator = new FileAssociator(analyzerConfig);
    const imageIdentifier = new GlobalImageIdentifier();
    const formatter = new OutputFormatter();
    const metadataReader = new MetadataReader();
    const validator = new ContentValidator(analyzerConfig);

    // Prepare paths for analysis
    const { paths: analyzePaths, rootPath, scanPaths } = preparePaths(config.paths, logger);

    // 1. Scanner les fichiers
    logger.info('Step 1: Scanning files...');
    const files = await scanner.scanDirectory(scanPaths);

    // 2. Détecter la structure
    logger.info('Step 2: Detecting structure...');
    const structureType = structureDetector.detectStructure(files, rootPath);
    logger.info(`Detected structure: ${structureType}`);

    // 3. Détecter le type de média
    logger.info('Step 3: Detecting media type...');
    const mediaType = structureDetector.detectMediaType(files.videos);
    logger.info(`Detected media type: ${mediaType}`);

    // 4. Lire les métadonnées (optionnel)
    if (config.readMetadata !== false) {
      logger.info('Step 4: Reading video metadata...');
      files.videos = await metadataReader.readAllVideoMetadata(files.videos, config);
    }

    // 4.5. Analyse movie/trailer/clip pour les cas appropriés
    let movieTrailerInfo = null;
    if (mediaType === 'movie' || mediaType === 'movie_collection') {
      logger.info('Step 4.5: Analyzing movie/trailer classification...');
      movieTrailerInfo = movieTrailerAnalyzer.analyzeMovieTrailer(files.videos);
      logger.info(`Movie/Trailer analysis result: ${movieTrailerInfo.type}`);
    } else if (mediaType === 'series') {
      // For series, we still need to detect trailers and clips
      logger.info('Step 4.5: Analyzing trailer/clip classification for series...');
      classifyTrailersAndClipsInSeries(files.videos, movieTrailerAnalyzer, logger);
    }

    // 5. Créer les associations
    logger.info('Step 5: Creating associations...');
    const associations = await associator.createAssociations(files, mediaType, movieTrailerInfo);
    logger.info(`Created ${associations.length} associations`);

    // 6. Identifier les images globales
    logger.info('Step 6: Identifying global images...');
    const globalImages = imageIdentifier.identifyGlobalImages(files.images, associations);
    logger.info(`Found ${globalImages.length} global images`);

    // 7. Formater la sortie
    logger.info('Step 7: Formatting output...');
    const result = formatter.formatOutput(
      associations, globalImages, mediaType,
      structureType, rootPath, files, movieTrailerInfo
    );

    // 8. Validate content for missing elements
    logger.info('Step 8: Validating content completeness...');
    const validationResults = validator.validate(result);
    result.validation = validationResults;

    // Add path information to result
    if (typeof scanPaths === 'object') {
      result.input_paths = scanPaths;
    }

    // Add timestamp information
    result.analysis_timestamp = new Date().toISOString();
    result.generated_at = new Date().toLocaleString();

    logger.info('Analysis completed successfully');
    return result;

  } catch (error) {
    logger.error(`Error during analysis: ${error.message}`);
    throw error;
  }
}

/**
 * Core function with file save capability
 * @param {Object} config - Configuration object (same as mediaAnalyzerCore)
 * @returns {Promise<Object>} Object with result and outputFile
 */
export async function mediaAnalyzerCoreWithSave(config) {
  // Analyze first
  const result = await mediaAnalyzerCore(config);

  // Determine output file
  let outputFile = config.outputFile;
  if (!outputFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    outputFile = `media_analysis_${timestamp}.json`;
  }

  // Save result
  await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf8');

  // Handle export for upload format if requested
  if (config.exportForUpload) {
    const uploadFormat = {
      uploads: []
    };

    for (const item of result.media_items) {
      // Add video
      uploadFormat.uploads.push({
        type: 'video',
        path: item.video.filepath,
        metadata: {
          episode: item.episode_number,
          season: item.season_number,
          title: item.title
        }
      });

      // Add subtitles
      for (const sub of item.subtitles) {
        uploadFormat.uploads.push({
          type: 'subtitle',
          path: sub.filepath,
          language: sub.language_code,
          video_ref: item.video.filepath
        });
      }
    }

    const uploadFile = outputFile.replace('.json', '_upload.json');
    await fs.writeFile(uploadFile, JSON.stringify(uploadFormat, null, 2), 'utf8');

    return {
      result,
      outputFile,
      uploadFile,
      message: `Results saved to: ${outputFile}${config.exportForUpload ? ` and upload format to: ${uploadFile}` : ''}`
    };
  }

  return {
    result,
    outputFile,
    message: `Results saved to: ${outputFile}`
  };
}

/**
 * Helper function to create logger based on config
 */
function createLogger(config) {
  const level = config.debug ? 'debug' : (config.verbose ? 'info' : 'warn');

  return winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
}

/**
 * Validate configuration object
 */
function validateConfig(config) {
  if (!config) {
    throw new Error('Configuration object is required');
  }

  if (!config.paths) {
    throw new Error('paths property is required in configuration');
  }

  // Validate paths structure
  if (typeof config.paths === 'object' && config.paths !== null) {
    const { videoPath, subtitlePath, imagePath } = config.paths;
    if (!videoPath && !subtitlePath && !imagePath) {
      throw new Error('At least one path must be provided when using object format');
    }
  } else if (typeof config.paths !== 'string') {
    throw new Error('paths must be a string or object with videoPath/subtitlePath/imagePath');
  }
}

/**
 * Prepare paths for analysis
 */
function preparePaths(paths, logger) {
  let rootPath, scanPaths;

  if (typeof paths === 'string') {
    // Legacy single path
    rootPath = paths;
    scanPaths = paths;
    logger.info(`Starting analysis of: ${rootPath}`);
  } else {
    // New multi-path API
    const { videoPath, subtitlePath, imagePath } = paths;
    scanPaths = { videoPath, subtitlePath, imagePath };
    rootPath = videoPath || subtitlePath || imagePath || 'multi-path';
    logger.info(`Starting multi-path analysis: videos=${videoPath}, subtitles=${subtitlePath}, images=${imagePath}`);
  }

  return { paths, rootPath, scanPaths };
}

/**
 * Helper function for series trailer/clip classification
 */
function classifyTrailersAndClipsInSeries(videos, movieTrailerAnalyzer, logger) {
  for (const video of videos) {
    const isTrailerByName = movieTrailerAnalyzer.isTrailerByFilename(video.filename);
    const isClipByName = movieTrailerAnalyzer.isClipByFilename(video.filename);

    if (isTrailerByName) {
      video.videoType = 'trailer';
      video.isTrailer = true;
      video.isAbsoluteTrailer = true;
      logger.debug(`Classified ${video.filename} as absolute trailer`);
    } else if (isClipByName) {
      video.videoType = 'clip';
      video.isClip = true;
      video.isAbsoluteClip = true;
      logger.debug(`Classified ${video.filename} as absolute clip`);
    } else if (video.episodeNumber !== null) {
      video.videoType = 'episode';
      logger.debug(`Classified ${video.filename} as episode`);
    }
  }
}