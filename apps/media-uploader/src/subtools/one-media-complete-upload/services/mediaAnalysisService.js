import path from 'path';
import stringSimilarity from 'string-similarity';
import { detectLanguageFromFilename, getLanguageDisplayName } from '../../../shared/utils/languageUtils.js';
import { getSubtitleDuration } from '../../../shared/utils/subtitleDurationParser.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Config = require('../../media-analyzer/config.js');

export class MediaAnalysisService {
  constructor(logger) {
    this.logger = logger;
    this.config = new Config();
  }

  /**
   * Analyze videos to identify main video, trailers, and extracts
   */
  analyzeVideos(videos) {
    if (videos.length === 0) return { mainVideo: null, trailers: [], extracts: [], ignoredVideos: [] };

    // Sort videos by size (largest first) to find main video
    const sortedVideos = [...videos].sort((a, b) => b.size - a.size);
    const mainVideo = sortedVideos[0];
    
    this.logger.info(`Identified main video: ${mainVideo.name} (${this.formatFileSize(mainVideo.size)})`);

    // Get main video format (extension)
    const mainFormat = mainVideo.extension.toLowerCase();
    
    // Filter videos by same format as main video
    const sameFormatVideos = videos.filter(video => 
      video.extension.toLowerCase() === mainFormat
    );
    
    const ignoredVideos = videos.filter(video => 
      video.extension.toLowerCase() !== mainFormat
    );
    
    if (ignoredVideos.length > 0) {
      this.logger.info(`Ignoring ${ignoredVideos.length} videos with different formats: ${ignoredVideos.map(v => v.name).join(', ')}`);
    }

    // Categorize remaining videos (excluding main video)
    const otherVideos = sameFormatVideos.filter(video => video !== mainVideo);
    const trailers = [];
    const extracts = [];

    for (const video of otherVideos) {
      const fileName = video.name.toLowerCase();
      
      // Check for trailer indicators (case-insensitive "trailer" or uppercase "BA")
      if (fileName.includes('trailer') || video.name.includes('BA')) {
        trailers.push(video);
      } else {
        extracts.push(video);
      }
    }

    this.logger.info(`Video categorization: Main(1), Trailers(${trailers.length}), Extracts(${extracts.length}), Ignored(${ignoredVideos.length})`);

    return {
      mainVideo,
      trailers,
      extracts,
      ignoredVideos
    };
  }

  /**
   * Analyze images and match them to template format rows
   */
  analyzeImages(images, mainVideoName) {
    const formatMappings = {};
    
    // Define expected formats from template
    const expectedFormats = [
      '1920_1080', '1920_720', '1080_1080', '810_1080', '1080_1920'
    ];

    for (const format of expectedFormats) {
      formatMappings[format] = null;
    }

    // Process each image
    for (const image of images) {
      const fileName = image.name.toLowerCase();
      
      // Extract dimensions from filename with flexible pattern matching
      for (const format of expectedFormats) {
        const formatPattern = format.replace('_', 'x'); // 1920_1080 -> 1920x1080
        const altFormatPattern = format; // 1920_1080

        // Create flexible regex pattern to match various separators with optional spaces
        // Supports: 1920x1080, 1920_1080, 1920-1080, 1920 - 1080, 1920- 1080, 1920 -1080, etc.
        const dimensionParts = format.split('_');
        const flexiblePattern = new RegExp(
          dimensionParts[0] + '[\\s]*[-_x×][\\s]*' + dimensionParts[1],
          'i'
        );

        if (fileName.includes(formatPattern) ||
            fileName.includes(altFormatPattern) ||
            flexiblePattern.test(fileName)) {
          // Check if we already have a match for this format
          if (formatMappings[format] === null) {
            formatMappings[format] = image;
            this.logger.info(`Matched image ${image.name} to format ${format}`);
          } else {
            // Apply priority rules
            const currentMatch = formatMappings[format];
            const newMatch = this.selectBestImageMatch(currentMatch, image, format, mainVideoName);
            
            if (newMatch !== currentMatch) {
              formatMappings[format] = newMatch;
              this.logger.info(`Updated image match for ${format}: ${newMatch.name} (better priority)`);
            }
          }
          break; // Don't match this image to multiple formats
        }
      }
    }

    return formatMappings;
  }

  /**
   * Select the best image match based on priority rules
   */
  selectBestImageMatch(currentImage, newImage, format, mainVideoName) {
    const formatPattern = format.replace('_', 'x');
    
    // Priority 1: Image with nothing but the format in name
    const currentIsFormatOnly = this.isFormatOnlyName(currentImage.name, format);
    const newIsFormatOnly = this.isFormatOnlyName(newImage.name, format);
    
    if (newIsFormatOnly && !currentIsFormatOnly) return newImage;
    if (currentIsFormatOnly && !newIsFormatOnly) return currentImage;
    
    // Priority 2: Closest to main video filename
    if (mainVideoName) {
      const mainVideoBaseName = path.parse(mainVideoName).name;
      const currentSimilarity = stringSimilarity.compareTwoStrings(
        path.parse(currentImage.name).name, 
        mainVideoBaseName
      );
      const newSimilarity = stringSimilarity.compareTwoStrings(
        path.parse(newImage.name).name, 
        mainVideoBaseName
      );
      
      if (newSimilarity > currentSimilarity) return newImage;
    }
    
    return currentImage;
  }

  /**
   * Check if filename contains only the format (and extension)
   */
  isFormatOnlyName(fileName, format) {
    const baseName = path.parse(fileName).name.toLowerCase();
    const formatLower = format.toLowerCase();
    const formatAlt = format.replace('_', 'x').toLowerCase();
    
    // Check if the base name is exactly the format or very similar
    return baseName === formatLower || 
           baseName === formatAlt || 
           baseName === `image_${formatLower}` ||
           baseName === `poster_${formatLower}` ||
           baseName === `poster_${formatAlt}`;
  }

  /**
   * Check if a video is an extract based on filename patterns
   */
  isExtractVideo(video, videoAnalysis) {
    // Check if video is in the extracts array
    if (videoAnalysis && videoAnalysis.extracts) {
      const isInExtracts = videoAnalysis.extracts.some(extract => extract.name === video.name);
      if (isInExtracts) return true;
    }

    // Also check filename patterns for "EX" or other extract markers
    const fileName = video.name;
    return this.config.CLIP_PATTERNS.some(pattern => pattern.test(fileName));
  }

  /**
   * Check if subtitle filename has extract/clip markers
   */
  hasExtractMarker(subtitleFileName) {
    return this.config.CLIP_PATTERNS.some(pattern => pattern.test(subtitleFileName));
  }

  /**
   * Calculate duration difference bonus/penalty for scoring
   */
  calculateDurationScore(subtitleDuration, videoDuration) {
    if (!subtitleDuration || !videoDuration) {
      return 0; // No bonus/penalty if duration not available
    }

    const diff = Math.abs(videoDuration - subtitleDuration);
    const thresholds = this.config.DURATION_MATCH_THRESHOLDS;
    const scoring = this.config.SCORING_CONFIG;

    if (diff < thresholds.PERFECT) {
      return scoring.DURATION_PERFECT_BONUS;
    } else if (diff < thresholds.GOOD) {
      return scoring.DURATION_GOOD_BONUS;
    } else if (diff < thresholds.ACCEPTABLE) {
      return scoring.DURATION_ACCEPTABLE_BONUS;
    } else {
      return -scoring.DURATION_MISMATCH_PENALTY;
    }
  }

  /**
   * Analyze subtitles and associate them with videos
   */
  async analyzeSubtitles(subtitles, videoAnalysis) {
    const { mainVideo, trailers, extracts } = videoAnalysis;
    const allVideos = [mainVideo, ...trailers, ...extracts].filter(Boolean);
    
    const subtitleMappings = {
      fr: new Map(),
      en: new Map(),
      ko: new Map()
    };

    // Extract duration for each subtitle (async operation)
    this.logger.info('[analyzeSubtitles] Extracting subtitle durations...');
    const subtitleDurations = new Map();
    for (const subtitle of subtitles) {
      try {
        const duration = await getSubtitleDuration(subtitle.fullPath);
        subtitleDurations.set(subtitle.name, duration);
        if (duration > 0) {
          this.logger.debug(`Subtitle ${subtitle.name}: ${duration}s`);
        }
      } catch (error) {
        this.logger.warn(`Failed to extract duration for subtitle ${subtitle.name}: ${error.message}`);
        subtitleDurations.set(subtitle.name, 0);
      }
    }

    // Extract language from subtitle filenames using shared utilities
    for (const subtitle of subtitles) {
      const fileName = subtitle.name;

      // Use shared language detection function
      const detectedLanguage = detectLanguageFromFilename(fileName);

      if (!detectedLanguage) {
        this.logger.warn(`Could not detect language for subtitle: ${subtitle.name}`);
        continue;
      }

      const subtitleDuration = subtitleDurations.get(subtitle.name) || 0;

      this.logger.info(`[analyzeSubtitles] Matching subtitle '${subtitle.name}' (${detectedLanguage}, ${subtitleDuration}s)`);

      // Find best matching video for this subtitle
      let bestMatch = null;
      let bestScore = -Infinity;
      const scoringDetails = []; // For detailed logging

      for (const video of allVideos) {
        // Special handling for trailers - strict basename containment required
        if (this.isTrailerVideo(video, videoAnalysis)) {
          const videoBaseName = path.parse(video.name).name;
          const subtitleBaseName = path.parse(subtitle.name).name;

          // For trailers, the complete video base name MUST be contained in subtitle filename
          if (!subtitleBaseName.toLowerCase().includes(videoBaseName.toLowerCase())) {
            this.logger.debug(`Rejecting subtitle ${subtitle.name} for trailer ${video.name} - base name "${videoBaseName}" not found in subtitle`);
            continue; // Skip this trailer, don't consider it as a match
          }

          this.logger.debug(`Accepting subtitle ${subtitle.name} for trailer ${video.name} - base name "${videoBaseName}" found in subtitle`);
        }

        // Base string similarity
        const similarity = stringSimilarity.compareTwoStrings(
          path.parse(subtitle.name).name,
          path.parse(video.name).name
        );

        // Size correlation factor (closer sizes get bonus)
        const sizeFactor = this.calculateSizeCorrelation(subtitle.size, video.size);
        const sizeScore = sizeFactor * this.config.SCORING_CONFIG.SIZE_CORRELATION_WEIGHT;

        // Start with base score
        let totalScore = similarity + sizeScore;

        // Main video bonus
        let mainVideoBonus = 0;
        if (video === mainVideo) {
          mainVideoBonus = this.config.SCORING_CONFIG.MAIN_VIDEO_BONUS;
          totalScore += mainVideoBonus;
        }

        // Extract video penalty (unless subtitle has extract marker)
        let extractPenalty = 0;
        if (this.isExtractVideo(video, videoAnalysis) && !this.hasExtractMarker(subtitle.name)) {
          extractPenalty = this.config.SCORING_CONFIG.EXTRACT_PENALTY;
          totalScore -= extractPenalty;
        }

        // Duration matching bonus/penalty
        const videoDuration = video.duration_seconds || 0;
        const durationScore = this.calculateDurationScore(subtitleDuration, videoDuration);
        totalScore += durationScore;

        // Store scoring details for logging
        const durationDiff = Math.abs(videoDuration - subtitleDuration);
        scoringDetails.push({
          videoName: video.name,
          videoDuration,
          similarity,
          sizeScore,
          mainVideoBonus,
          extractPenalty,
          durationScore,
          durationDiff,
          totalScore
        });

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMatch = video;
        }
      }

      // Log detailed scoring breakdown
      if (scoringDetails.length > 0) {
        this.logger.info(`  Scoring breakdown:`);
        scoringDetails.forEach(detail => {
          const markers = [];
          if (detail.videoName === mainVideo?.name) markers.push('MAIN');
          if (this.isExtractVideo({ name: detail.videoName }, videoAnalysis)) markers.push('EXTRACT');

          this.logger.info(`    - ${detail.videoName}${markers.length > 0 ? ` [${markers.join(', ')}]` : ''} (${detail.videoDuration}s):`);
          this.logger.info(`      • String similarity: ${detail.similarity.toFixed(3)}`);
          this.logger.info(`      • Size correlation: ${detail.sizeScore.toFixed(3)}`);
          if (detail.mainVideoBonus > 0) this.logger.info(`      • Main video bonus: +${detail.mainVideoBonus.toFixed(3)}`);
          if (detail.extractPenalty > 0) this.logger.info(`      • Extract penalty: -${detail.extractPenalty.toFixed(3)}`);
          if (detail.durationScore !== 0) {
            this.logger.info(`      • Duration match (diff: ${detail.durationDiff}s): ${detail.durationScore > 0 ? '+' : ''}${detail.durationScore.toFixed(1)}`);
          }
          this.logger.info(`      • TOTAL SCORE: ${detail.totalScore.toFixed(3)}`);
        });

        if (bestMatch) {
          this.logger.info(`  ✓ Best match: ${bestMatch.name} (score: ${bestScore.toFixed(3)})`);
        }
      }

      if (bestMatch) {
        // Validate duration match - block if mismatch is too large
        const videoDuration = bestMatch.duration_seconds || 0;
        const durationDiff = Math.abs(videoDuration - subtitleDuration);

        if (durationDiff > this.config.DURATION_MATCH_THRESHOLDS.BLOCK && subtitleDuration > 0 && videoDuration > 0) {
          const errorMsg = `Duration mismatch too large for subtitle ${subtitle.name} and video ${bestMatch.name}. ` +
            `Subtitle duration: ${subtitleDuration}s, Video duration: ${videoDuration}s, Difference: ${durationDiff}s ` +
            `(max allowed: ${this.config.DURATION_MATCH_THRESHOLDS.BLOCK}s). This subtitle likely belongs to a different video.`;
          this.logger.error(errorMsg);
          throw new Error(errorMsg);
        }

        // Check if this video already has a subtitle for this language
        const currentSubtitle = subtitleMappings[detectedLanguage].get(bestMatch);

        if (!currentSubtitle) {
          // No subtitle yet for this video in this language - assign it
          subtitleMappings[detectedLanguage].set(bestMatch, subtitle);
          this.logger.info(`✓ Associated ${detectedLanguage} subtitle ${subtitle.name} with video ${bestMatch.name} (score: ${bestScore.toFixed(3)})`);
        } else {
          // Video already has a subtitle for this language - check if this one is better
          const currentScore = stringSimilarity.compareTwoStrings(
            path.parse(currentSubtitle.name).name,
            path.parse(bestMatch.name).name
          );
          
          if (bestScore > currentScore) {
            subtitleMappings[detectedLanguage].set(bestMatch, subtitle);
            this.logger.info(`Replaced ${detectedLanguage} subtitle for ${bestMatch.name}: ${subtitle.name} (better score: ${bestScore.toFixed(3)} vs ${currentScore.toFixed(3)})`);
          }
          
          // Give main video priority in case of ties
          if (bestScore === currentScore && bestMatch === mainVideo) {
            subtitleMappings[detectedLanguage].set(bestMatch, subtitle);
            this.logger.info(`Main video priority: assigned ${detectedLanguage} subtitle ${subtitle.name} to ${bestMatch.name}`);
          }
        }
      } else {
        // No match found - default to main video if available
        if (videoAnalysis.mainVideo) {
          const currentSubtitle = subtitleMappings[detectedLanguage].get(videoAnalysis.mainVideo);

          if (!currentSubtitle) {
            subtitleMappings[detectedLanguage].set(videoAnalysis.mainVideo, subtitle);
            this.logger.info(`No specific match found for ${detectedLanguage} subtitle ${subtitle.name}, defaulting to main video: ${videoAnalysis.mainVideo.name}`);
          } else {
            this.logger.warn(`No match found for ${detectedLanguage} subtitle ${subtitle.name}, and main video already has a subtitle assigned`);
          }
        } else {
          this.logger.warn(`No match found for ${detectedLanguage} subtitle ${subtitle.name}, and no main video available`);
        }
      }
    }

    return subtitleMappings;
  }

  /**
   * Calculate size correlation between subtitle and video
   */
  calculateSizeCorrelation(subtitleSize, videoSize) {
    if (videoSize === 0) return 0;

    // Longer videos typically have larger subtitle files
    // This is a rough heuristic
    const ratio = subtitleSize / videoSize;
    const expectedRatio = 0.001; // Rough estimate: 1KB subtitle per 1MB video

    return Math.max(0, 1 - Math.abs(ratio - expectedRatio) / expectedRatio);
  }

  /**
   * Check if a video is a trailer based on the video analysis results
   */
  isTrailerVideo(video, videoAnalysis) {
    return videoAnalysis.trailers.some(trailer => trailer.name === video.name);
  }

  /**
   * Generate complete file mappings for Excel template
   */
  async generateFileMappings(mediaFiles) {
    this.logger.info('Starting media analysis for auto-fill...');

    const videoAnalysis = this.analyzeVideos(mediaFiles.videos);
    const imageAnalysis = this.analyzeImages(mediaFiles.images, videoAnalysis.mainVideo?.name);
    const subtitleAnalysis = await this.analyzeSubtitles(mediaFiles.subtitles, videoAnalysis);

    // Build mappings for Excel template rows
    const mappings = {
      Video: {
        fileName: videoAnalysis.mainVideo?.name || '',
        poster: '',
        frSubtitle: subtitleAnalysis.fr.get(videoAnalysis.mainVideo)?.name || '',
        enSubtitle: subtitleAnalysis.en.get(videoAnalysis.mainVideo)?.name || '',
        koSubtitle: subtitleAnalysis.ko.get(videoAnalysis.mainVideo)?.name || ''
      }
    };

    // Add trailers
    videoAnalysis.trailers.forEach((trailer, index) => {
      const trailerKey = `Trailer ${index + 1}`;
      mappings[trailerKey] = {
        fileName: trailer.name,
        poster: '',
        frSubtitle: subtitleAnalysis.fr.get(trailer)?.name || '',
        enSubtitle: subtitleAnalysis.en.get(trailer)?.name || '',
        koSubtitle: subtitleAnalysis.ko.get(trailer)?.name || ''
      };
    });

    // Add extracts
    videoAnalysis.extracts.forEach((extract, index) => {
      const extractKey = `Extract ${index + 1}`;
      mappings[extractKey] = {
        fileName: extract.name,
        poster: '',
        frSubtitle: subtitleAnalysis.fr.get(extract)?.name || '',
        enSubtitle: subtitleAnalysis.en.get(extract)?.name || '',
        koSubtitle: subtitleAnalysis.ko.get(extract)?.name || ''
      };
    });

    // Add image format mappings
    Object.entries(imageAnalysis).forEach(([format, image]) => {
      const imageKey = `image_${format}`;
      if (image) {
        mappings[imageKey] = {
          fileName: image.name,  // Image filename goes in fileName column
          poster: '',            // Poster column stays empty for image rows
          frSubtitle: '',
          enSubtitle: '',
          koSubtitle: ''
        };
      }
    });

    this.logger.info(`Generated mappings for ${Object.keys(mappings).length} template rows`);
    return mappings;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}