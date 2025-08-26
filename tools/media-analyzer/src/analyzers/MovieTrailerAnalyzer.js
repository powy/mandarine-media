const winston = require('winston');
const Config = require('../config');
const NameParser = require('./NameParser');

const logger = winston.createLogger({
    level: 'info',
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

/**
 * Analyzer for distinguishing movies, trailers, and clips
 */
class MovieTrailerAnalyzer {
    constructor(config = new Config()) {
        this.config = config;
        this.parser = new NameParser(config);
    }
    
    analyzeMovieTrailer(videos) {
        if (!videos || videos.length === 0) {
            return { type: 'unknown', videos: [] };
        }
        
        // Single video = movie
        if (videos.length === 1) {
            videos[0].videoType = 'movie';
            videos[0].isTrailer = false;
            return { type: 'single_movie', videos: videos };
        }
        
        // Multiple videos without episode info = potential movie + trailers
        const parser = new NameParser();
        let episodeCount = 0;
        
        for (const video of videos) {
            const info = parser.parseEpisodeInfo(video.filename);
            if (info.episode !== null) {
                episodeCount++;
            }
        }
        
        // If most videos have episode info, treat as series
        if (episodeCount >= videos.length * 0.7) {
            for (const video of videos) {
                video.videoType = 'episode';
                video.isTrailer = false;
            }
            return { type: 'series', videos: videos };
        }
        
        // If no episodes, analyze for movie + trailers
        if (episodeCount === 0) {
            return this.classifyMovieAndTrailers(videos);
        }
        
        // Mixed case
        for (const video of videos) {
            video.videoType = 'unknown';
            video.isTrailer = false;
        }
        return { type: 'mixed', videos: videos };
    }
    
    classifyMovieAndTrailers(videos) {
        const classified = [];
        
        for (const video of videos) {
            // Check filename patterns first
            const isTrailerByName = this.isTrailerByFilename(video.filename);
            const isClipByName = this.isClipByFilename(video.filename);
            
            if (isTrailerByName) {
                // Absolute trailer detection - cannot be overridden
                video.videoType = 'trailer';
                video.isTrailer = true;
                video.isAbsoluteTrailer = true; // Mark as absolutely detected
            } else if (isClipByName) {
                video.videoType = 'clip';
                video.isClip = true;
                video.isAbsoluteClip = true; // Mark as absolutely detected
            } else {
                // Initially assume movie, will be refined by duration
                video.videoType = 'movie';
                video.isTrailer = false;
                video.isClip = false;
            }
            
            classified.push(video);
        }
        
        // Refine classification using duration if available
        const videosWithDuration = classified.filter(v => v.duration !== null);
        
        if (videosWithDuration.length > 0) {
            this.refineByDuration(classified);
        }
        
        // Final validation and adjustment
        this.validateMovieTrailerClassification(classified);
        
        return { type: 'movie_with_trailers', videos: classified };
    }
    
    isTrailerByFilename(filename) {
        const cleanName = filename.toLowerCase();
        
        for (const pattern of this.config.TRAILER_PATTERNS) {
            if (pattern.test(cleanName)) {
                return true;
            }
        }
        
        return false;
    }
    
    isClipByFilename(filename) {
        const cleanName = filename.toLowerCase();
        
        // Define default patterns if config is corrupted
        const clipPatterns = this.config.CLIP_PATTERNS || [
            /^EX /i,                  // Files starting with "EX "
            /clip/i,
            /excerpt/i,
            /sample/i,
            /_clip$/i,
            /-clip/i,
            /\[clip\]/i,
            /\(clip\)/i
        ];
        
        for (const pattern of clipPatterns) {
            if (pattern.test(cleanName)) {
                return true;
            }
        }
        
        return false;
    }
    
    refineByDuration(videos) {
        // Sort by duration (longest first)
        const videosWithDuration = videos
            .filter(v => v.duration !== null)
            .sort((a, b) => (b.duration || 0) - (a.duration || 0));
        
        if (videosWithDuration.length === 0) return;
        
        for (const video of videosWithDuration) {
            const durationMinutes = video.duration / 60;
            
            // Skip if already absolutely classified by filename
            if (video.isAbsoluteTrailer || video.isAbsoluteClip) {
                logger.debug(`Skipping ${video.filename} - absolute classification by filename (${video.videoType})`);
                continue;
            }
            
            // Very short = likely trailer
            if (video.duration <= this.config.TRAILER_MAX_DURATION) {
                if (video.videoType !== 'trailer') {
                    logger.debug(`Reclassifying ${video.filename} as trailer based on duration (${Math.round(durationMinutes)} min)`);
                }
                video.videoType = 'trailer';
                video.isTrailer = true;
            }
            // Long enough = likely movie
            else if (video.duration >= this.config.MOVIE_MIN_DURATION) {
                if (video.videoType !== 'movie') {
                    logger.debug(`Reclassifying ${video.filename} as movie based on duration (${Math.round(durationMinutes)} min)`);
                }
                video.videoType = 'movie';
                video.isTrailer = false;
                video.isClip = false;
            }
            // Medium duration - keep filename-based classification or use position
            else {
                // If not already classified by filename, use duration ranking
                if (video.videoType === 'unknown') {
                    // Longest video is likely the movie
                    if (video === videosWithDuration[0]) {
                        video.videoType = 'movie';
                        video.isTrailer = false;
                        video.isClip = false;
                    } else {
                        video.videoType = 'trailer';
                        video.isTrailer = true;
                        video.isClip = false;
                    }
                }
            }
        }
    }
    
    validateMovieTrailerClassification(videos) {
        const movies = videos.filter(v => v.videoType === 'movie');
        const trailers = videos.filter(v => v.videoType === 'trailer');
        const clips = videos.filter(v => v.videoType === 'clip');
        
        // Ensure at least one movie exists
        if (movies.length === 0 && videos.length > 0) {
            // Find the longest video that's not absolutely classified and make it a movie
            const candidates = videos.filter(v => !v.isAbsoluteTrailer && !v.isAbsoluteClip);
            if (candidates.length > 0) {
                const longest = candidates.reduce((prev, current) => {
                    const prevDuration = prev.duration || 0;
                    const currentDuration = current.duration || 0;
                    return currentDuration > prevDuration ? current : prev;
                });
                
                longest.videoType = 'movie';
                longest.isTrailer = false;
                longest.isClip = false;
                logger.info(`Auto-designated ${longest.filename} as movie (longest non-absolute video)`);
            }
        }
        
        // Log classification results
        logger.info(`Movie/Trailer/Clip classification: ${movies.length} movies, ${trailers.length} trailers, ${clips.length} clips`);
    }
}

module.exports = MovieTrailerAnalyzer;