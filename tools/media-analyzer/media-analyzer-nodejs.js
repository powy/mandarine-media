#!/usr/bin/env node
/**
 * Media Analyzer Tool - Node.js Version
 * Analyse et associe automatiquement les fichiers vidéo, sous-titres et images
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { program } = require('commander');
const glob = require('glob-promise');
const stringSimilarity = require('string-similarity');
const ffmpeg = require('fluent-ffmpeg');
const winston = require('winston');

// Configuration des binaires FFmpeg embarqués (pour l'exe)
try {
    const ffmpegPath = require('ffmpeg-static');
    const ffprobePath = require('ffprobe-static').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
} catch (e) {
    // Utiliser FFmpeg système si les packages static ne sont pas installés
    console.log('Using system FFmpeg/FFprobe');
}

// ============================================================================
// CONFIGURATION
// ============================================================================

class Config {
    constructor() {
        // Extensions de fichiers
        this.VIDEO_EXTENSIONS = new Set([
            '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', 
            '.m4v', '.mpg', '.mpeg', '.m2ts', '.ts', '.vob', '.3gp'
        ]);
        
        this.SUBTITLE_EXTENSIONS = new Set([
            '.srt', '.vtt', '.ass', '.ssa', '.sub', '.idx', '.smi', 
            '.ttml', '.sbv', '.dfxp'
        ]);
        
        this.IMAGE_EXTENSIONS = new Set([
            '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', 
            '.tif', '.tiff', '.svg'
        ]);
        
        // Patterns pour détecter les épisodes
        this.EPISODE_PATTERNS = [
            { regex: /[Ss](\d+)[Ee](\d+)/, type: 'season_episode' },           // S01E01
            { regex: /(\d+)x(\d+)/, type: 'season_episode' },                   // 1x01
            { regex: /[Ss]eason\s*(\d+)\s*[Ee]pisode\s*(\d+)/i, type: 'season_episode' },
            { regex: /[Ee]pisode\s*(\d+)/i, type: 'episode_only' },            // Episode 01
            { regex: /[Ee]p\s*(\d+)/i, type: 'episode_only' },                 // Ep 01
            { regex: /EP(\d+)/, type: 'episode_only' },                        // EP01
            { regex: /E(\d+)/, type: 'episode_only' },                         // E01
            { regex: /\[(\d+)\]/, type: 'episode_only' },                      // [01]
            { regex: /Part\s*(\d+)/i, type: 'episode_only' },                  // Part 1
            { regex: /(\d{4})-(\d{2})-(\d{2})/, type: 'date' },                // 2024-01-15
        ];
        
        // Codes de langues
        this.LANGUAGE_CODES = {
            // ISO 639-1
            'en': 'English', 'fr': 'French', 'es': 'Spanish', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'ja': 'Japanese', 'ko': 'Korean',
            'zh': 'Chinese', 'ru': 'Russian', 'ar': 'Arabic', 'hi': 'Hindi',
            'nl': 'Dutch', 'sv': 'Swedish', 'no': 'Norwegian', 'da': 'Danish',
            'fi': 'Finnish', 'pl': 'Polish', 'tr': 'Turkish', 'el': 'Greek',
            'he': 'Hebrew', 'cs': 'Czech', 'hu': 'Hungarian', 'ro': 'Romanian',
            'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian', 'ms': 'Malay',
            // ISO 639-2
            'eng': 'English', 'fra': 'French', 'spa': 'Spanish', 'ger': 'German',
            'deu': 'German', 'ita': 'Italian', 'por': 'Portuguese', 'jpn': 'Japanese',
            'kor': 'Korean', 'chi': 'Chinese', 'zho': 'Chinese', 'rus': 'Russian',
            'ara': 'Arabic', 'hin': 'Hindi', 'nld': 'Dutch', 'dut': 'Dutch',
        };
        
        // Patterns pour détecter les langues
        this.LANGUAGE_PATTERNS = [
            /\.([a-z]{2,3})\./i,     // .en. .fra.
            /\.([a-z]{2,3})_/i,      // .en_
            /_([a-z]{2,3})\./i,      // _en.
            /\[([a-z]{2,3})\]/i,     // [en]
            /\.([A-Za-z]+)\.(?:srt|vtt|ass|ssa)/i,  // .English.srt
        ];
        
        // Tags spéciaux pour sous-titres
        this.SUBTITLE_TAGS = {
            forced: ['forced', 'forc'],
            sdh: ['sdh', 'cc', 'hi', 'hearing', 'impaired'],
            commentary: ['commentary', 'comm', 'comment'],
        };
        
        // Types d'images
        this.IMAGE_TYPES = {
            poster: ['poster', 'cover', 'folder'],
            fanart: ['fanart', 'backdrop', 'background'],
            banner: ['banner'],
            logo: ['logo', 'clearlogo'],
            thumbnail: ['thumb', 'thumbnail', 'preview'],
        };
        
        // Patterns pour détecter les trailers
        this.TRAILER_PATTERNS = [
            /trailer/i,
            /teaser/i, 
            /preview/i,
            /promo/i,
            /bande[_\s-]?annonce/i,  // French
            /_tr$/i,                  // _tr suffix
            /-trailer/i,              // -trailer suffix
            /\[trailer\]/i,           // [trailer] tag
            /\(trailer\)/i            // (trailer) tag
        ];
        
        // Patterns pour détecter les clips (starting with "EX ")
        this.CLIP_PATTERNS = [
            /^EX /i,                  // Files starting with "EX "
            /clip/i,
            /excerpt/i,
            /sample/i,
            /_clip$/i,                // _clip suffix
            /-clip/i,                 // -clip suffix
            /\[clip\]/i,              // [clip] tag
            /\(clip\)/i               // (clip) tag
        ];
        
        // Seuils pour la détection movie/trailer
        this.TRAILER_MAX_DURATION = 600;  // 10 minutes max for trailers
        this.MOVIE_MIN_DURATION = 1800;   // 30 minutes min for movies
        
        // Patterns pour détecter les dimensions d'images (à ignorer dans l'analyse d'épisodes)
        this.IMAGE_DIMENSION_PATTERNS = [
            /\b(\d{3,4})[-\s.x_](\d{3,4})\b/gi,     // 1920x1080, 1920-1080, 1920 1080, etc.
            /\b(\d{3,4})p\b/gi,                      // 1080p, 720p, etc.
            /\b(\d{2,4})\s*[x×]\s*(\d{2,4})\b/gi    // Various x separators
        ];
        
        // Seuils
        this.MIN_MATCH_SCORE = 60;
        this.SIMILARITY_THRESHOLD = 0.7;
    }
}

// ============================================================================
// LOGGER
// ============================================================================

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

// ============================================================================
// MODELES DE DONNEES
// ============================================================================

class MediaFile {
    constructor(data) {
        this.filepath = data.filepath;
        this.filename = data.filename;
        this.extension = data.extension;
        this.size = data.size || 0;
        this.episodeNumber = data.episodeNumber || null;
        this.seasonNumber = data.seasonNumber || null;
        this.title = data.title || null;
        this.parentDir = data.parentDir || path.dirname(data.filepath);
    }
}

class VideoFile extends MediaFile {
    constructor(data) {
        super(data);
        this.duration = data.duration || null;
        this.resolution = data.resolution || null;
        this.codec = data.codec || null;
        this.bitrate = data.bitrate || null;
        this.videoType = data.videoType || 'unknown'; // 'movie', 'trailer', 'clip', 'episode', 'unknown'
        this.isTrailer = data.isTrailer || false;
        this.isClip = data.isClip || false;
        this.associatedEpisode = data.associatedEpisode || null; // For clips associated with episodes
    }
}

class SubtitleFile extends MediaFile {
    constructor(data) {
        super(data);
        this.languageCode = data.languageCode || 'unknown';
        this.languageName = data.languageName || 'Unknown';
        this.format = data.format || this.extension.substring(1);
        this.isForced = data.isForced || false;
        this.isSDH = data.isSDH || false;
        this.isCommentary = data.isCommentary || false;
    }
}

class ImageFile extends MediaFile {
    constructor(data) {
        super(data);
        this.imageType = data.imageType || 'unknown';
        this.dimensions = data.dimensions || null;
    }
}

class MediaAssociation {
    constructor(video, subtitles = [], images = []) {
        this.video = video;
        this.subtitles = subtitles;
        this.images = images;
        this.episodeInfo = {
            season: video.seasonNumber,
            episode: video.episodeNumber,
            title: video.title
        };
    }
}

// ============================================================================
// SCANNER DE FICHIERS
// ============================================================================

class FileScanner {
    constructor(config = new Config()) {
        this.config = config;
    }
    
    async scanDirectory(rootPath) {
        // Support for legacy single path usage
        if (typeof rootPath === 'string') {
            return this.scanSingleDirectory(rootPath);
        }
        
        // New multi-directory scanning
        const { videoPath, subtitlePath, imagePath } = rootPath;
        logger.info(`Scanning directories: videos=${videoPath}, subtitles=${subtitlePath}, images=${imagePath}`);
        
        const files = {
            videos: [],
            subtitles: [],
            images: [],
            others: []
        };
        
        try {
            // Scan video directory
            if (videoPath) {
                const videoFiles = await this.scanDirectoryForType(videoPath, 'video');
                files.videos.push(...videoFiles);
            }
            
            // Scan subtitle directory
            if (subtitlePath) {
                const subtitleFiles = await this.scanDirectoryForType(subtitlePath, 'subtitle');
                files.subtitles.push(...subtitleFiles);
            }
            
            // Scan image directory
            if (imagePath) {
                const imageFiles = await this.scanDirectoryForType(imagePath, 'image');
                files.images.push(...imageFiles);
            }
            
            logger.info(`Found: ${files.videos.length} videos, ${files.subtitles.length} subtitles, ${files.images.length} images`);
            return files;
            
        } catch (err) {
            logger.error(`Error scanning directories: ${err.message}`);
            throw err;
        }
    }
    
    async scanSingleDirectory(rootPath) {
        logger.info(`Scanning single directory: ${rootPath}`);
        
        const files = {
            videos: [],
            subtitles: [],
            images: [],
            others: []
        };
        
        try {
            // Utiliser glob pour scanner récursivement
            const allFiles = await glob('**/*', {
                cwd: rootPath,
                nodir: true,
                dot: false
            });
            
            for (const file of allFiles) {
                const filepath = path.join(rootPath, file);
                const filename = path.basename(file);
                const extension = path.extname(filename).toLowerCase();
                
                // Ignorer les fichiers cachés
                if (filename.startsWith('.')) continue;
                
                try {
                    const stats = await fs.stat(filepath);
                    const fileData = {
                        filepath,
                        filename,
                        extension,
                        size: stats.size,
                        parentDir: path.dirname(filepath)
                    };
                    
                    if (this.config.VIDEO_EXTENSIONS.has(extension)) {
                        files.videos.push(new VideoFile(fileData));
                    } else if (this.config.SUBTITLE_EXTENSIONS.has(extension)) {
                        files.subtitles.push(new SubtitleFile(fileData));
                    } else if (this.config.IMAGE_EXTENSIONS.has(extension)) {
                        files.images.push(new ImageFile(fileData));
                    } else {
                        files.others.push(new MediaFile(fileData));
                    }
                } catch (err) {
                    logger.warn(`Error processing file ${filepath}: ${err.message}`);
                }
            }
            
            logger.info(`Found: ${files.videos.length} videos, ${files.subtitles.length} subtitles, ${files.images.length} images`);
            return files;
            
        } catch (err) {
            logger.error(`Error scanning directory: ${err.message}`);
            throw err;
        }
    }
    
    async scanDirectoryForType(dirPath, fileType) {
        if (!dirPath) return [];
        
        logger.info(`Scanning ${fileType} directory: ${dirPath}`);
        const result = [];
        
        try {
            // Check if directory exists
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                logger.warn(`Path is not a directory: ${dirPath}`);
                return result;
            }
            
            // Scan recursively
            const allFiles = await glob('**/*', {
                cwd: dirPath,
                nodir: true,
                dot: false
            });
            
            for (const file of allFiles) {
                const filepath = path.join(dirPath, file);
                const filename = path.basename(file);
                const extension = path.extname(filename).toLowerCase();
                
                // Ignorer les fichiers cachés
                if (filename.startsWith('.')) continue;
                
                try {
                    const fileStats = await fs.stat(filepath);
                    const fileData = {
                        filepath,
                        filename,
                        extension,
                        size: fileStats.size,
                        parentDir: path.dirname(filepath)
                    };
                    
                    // Filter by file type
                    if (fileType === 'video' && this.config.VIDEO_EXTENSIONS.has(extension)) {
                        result.push(new VideoFile(fileData));
                    } else if (fileType === 'subtitle' && this.config.SUBTITLE_EXTENSIONS.has(extension)) {
                        result.push(new SubtitleFile(fileData));
                    } else if (fileType === 'image' && this.config.IMAGE_EXTENSIONS.has(extension)) {
                        result.push(new ImageFile(fileData));
                    }
                } catch (err) {
                    logger.warn(`Error processing file ${filepath}: ${err.message}`);
                }
            }
            
            logger.info(`Found ${result.length} ${fileType} files in ${dirPath}`);
            return result;
            
        } catch (err) {
            logger.warn(`Error scanning ${fileType} directory ${dirPath}: ${err.message}`);
            return result;
        }
    }
}

// ============================================================================
// ANALYSEUR DE NOMS
// ============================================================================

class NameParser {
    constructor(config = new Config()) {
        this.config = config;
    }
    
    parseEpisodeInfo(filename) {
        const info = {
            season: null,
            episode: null,
            title: null,
            year: null,
            date: null
        };
        
        // Remove dimension patterns first, then clean the filename
        const noDimensionsName = this.removeDimensionPatterns(filename);
        const cleanName = this.cleanFilename(noDimensionsName);
        
        // Chercher les patterns d'épisode
        for (const pattern of this.config.EPISODE_PATTERNS) {
            const match = cleanName.match(pattern.regex);
            if (match) {
                if (pattern.type === 'season_episode') {
                    info.season = parseInt(match[1]);
                    info.episode = parseInt(match[2]);
                } else if (pattern.type === 'episode_only') {
                    info.episode = parseInt(match[1]);
                } else if (pattern.type === 'date') {
                    info.date = `${match[1]}-${match[2]}-${match[3]}`;
                    info.year = parseInt(match[1]);
                }
                break;
            }
        }
        
        // Extraire le titre
        if (info.episode !== null) {
            let title = cleanName;
            // Retirer les patterns d'épisode
            title = title.replace(/[Ss]\d+[Ee]\d+/g, '');
            title = title.replace(/\d+x\d+/g, '');
            title = title.replace(/[Ee]pisode\s*\d+/gi, '');
            title = title.replace(/[Ee]p\s*\d+/gi, '');
            title = title.trim().replace(/^[-._\s]+|[-._\s]+$/g, '');
            
            if (title) {
                info.title = title;
            }
        }
        
        return info;
    }
    
    parseLanguage(filename) {
        const cleanName = filename.toLowerCase();
        
        // Chercher les patterns de langue
        for (const pattern of this.config.LANGUAGE_PATTERNS) {
            const match = cleanName.match(pattern);
            if (match) {
                const potentialCode = match[1].toLowerCase();
                
                // Vérifier si c'est un code valide
                if (this.config.LANGUAGE_CODES[potentialCode]) {
                    return {
                        code: potentialCode,
                        name: this.config.LANGUAGE_CODES[potentialCode]
                    };
                }
                
                // Vérifier si c'est un nom de langue complet
                for (const [code, name] of Object.entries(this.config.LANGUAGE_CODES)) {
                    if (potentialCode === name.toLowerCase()) {
                        return { code, name };
                    }
                }
            }
        }
        
        // Chercher les noms de langues complets
        for (const [code, name] of Object.entries(this.config.LANGUAGE_CODES)) {
            if (cleanName.includes(name.toLowerCase())) {
                return { code, name };
            }
        }
        
        return { code: 'unknown', name: 'Unknown' };
    }
    
    parseSubtitleTags(filename) {
        const tags = {
            forced: false,
            sdh: false,
            commentary: false
        };
        
        const cleanName = filename.toLowerCase();
        
        for (const [tagType, keywords] of Object.entries(this.config.SUBTITLE_TAGS)) {
            for (const keyword of keywords) {
                if (cleanName.includes(keyword)) {
                    tags[tagType] = true;
                    break;
                }
            }
        }
        
        return tags;
    }
    
    parseImageType(filename) {
        const cleanName = filename.toLowerCase();
        
        for (const [imgType, keywords] of Object.entries(this.config.IMAGE_TYPES)) {
            for (const keyword of keywords) {
                if (cleanName.includes(keyword)) {
                    return imgType;
                }
            }
        }
        
        return 'unknown';
    }
    
    cleanFilename(filename) {
        // Retirer l'extension
        let name = filename.replace(/\.[^.]+$/, '');
        
        // Retirer les tags de qualité et source
        const qualityTags = [
            '720p', '1080p', '2160p', '4K', 'HD', 'FHD', 'UHD',
            'BluRay', 'WEB-DL', 'WEBRip', 'DVDRip', 'BDRip', 'HDTV',
            'x264', 'x265', 'h264', 'h265', 'HEVC', 'AAC', 'AC3', 'DTS',
            'REMUX', 'PROPER', 'REPACK'
        ];
        
        for (const tag of qualityTags) {
            const regex = new RegExp(`\\b${tag}\\b`, 'gi');
            name = name.replace(regex, '');
        }
        
        // Retirer les crochets et parenthèses (sauf numéros d'épisode)
        name = name.replace(/\[[^\]]*\]/g, (match) => {
            // Garder si c'est un numéro d'épisode
            if (/\[\d+\]/.test(match)) return match;
            return '';
        });
        name = name.replace(/\([^)]*\)/g, '');
        
        // Remplacer les séparateurs
        name = name.replace(/[._-]+/g, ' ');
        
        return name.trim();
    }
    
    removeDimensionPatterns(filename) {
        let cleanName = filename;
        
        // Supprimer les patterns de dimensions d'images
        // Define default patterns if config is corrupted
        const dimensionPatterns = this.config.IMAGE_DIMENSION_PATTERNS || [
            /\b(\d{3,4})[-\s.x_](\d{3,4})\b/gi,     // 1920x1080, 1920-1080, 1920 1080, etc.
            /\b(\d{3,4})p\b/gi,                      // 1080p, 720p, etc.
            /\b(\d{2,4})\s*[x×]\s*(\d{2,4})\b/gi    // Various x separators
        ];
        
        for (const pattern of dimensionPatterns) {
            cleanName = cleanName.replace(pattern, ' ');
        }
        
        // Nettoyer les espaces multiples
        return cleanName.replace(/\s+/g, ' ').trim();
    }
}

// ============================================================================
// LECTEUR DE METADONNEES
// ============================================================================

class MetadataReader {
    async readVideoMetadata(videoFile) {
        return new Promise((resolve) => {
            ffmpeg.ffprobe(videoFile.filepath, (err, metadata) => {
                if (err) {
                    logger.warn(`Could not read metadata for ${videoFile.filename}: ${err.message}`);
                    resolve(videoFile);
                    return;
                }
                
                try {
                    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                    
                    if (videoStream) {
                        videoFile.duration = metadata.format.duration;
                        videoFile.resolution = [videoStream.width, videoStream.height];
                        videoFile.codec = videoStream.codec_name;
                        videoFile.bitrate = metadata.format.bit_rate;
                    }
                    
                    resolve(videoFile);
                } catch (e) {
                    logger.warn(`Error parsing metadata for ${videoFile.filename}: ${e.message}`);
                    resolve(videoFile);
                }
            });
        });
    }
    
    async readAllVideoMetadata(videos, options = {}) {
        if (!options.readMetadata) {
            return videos;
        }
        
        logger.info('Reading video metadata...');
        
        // Limiter le nombre de lectures simultanées
        const batchSize = 5;
        const results = [];
        
        for (let i = 0; i < videos.length; i += batchSize) {
            const batch = videos.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(video => this.readVideoMetadata(video))
            );
            results.push(...batchResults);
        }
        
        return results;
    }
}

// ============================================================================
// DETECTEUR DE STRUCTURE
// ============================================================================

// ============================================================================
// ANALYSEUR MOVIE/TRAILER
// ============================================================================

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
class StructureDetector {
    detectStructure(files, rootPath) {
        const videos = files.videos || [];
        if (videos.length === 0) {
            return 'empty';
        }
        
        // Analyser les chemins
        const videoDepths = videos.map(video => {
            const relPath = path.relative(rootPath, video.filepath);
            return relPath.split(path.sep).length - 1;
        });
        
        // Vérifier les patterns de dossiers
        const seasonFolders = new Set();
        const episodeFolders = new Set();
        let hasVideoFolder = false;
        let hasSubtitleFolder = false;
        
        for (const video of videos) {
            const parent = path.basename(video.parentDir);
            
            // Pattern de saison
            if (/[Ss]eason\s*\d+/i.test(parent) || /[Ss]\d+/i.test(parent)) {
                seasonFolders.add(parent);
            }
            
            // Pattern d'épisode
            if (/[Ee]pisode\s*\d+/i.test(parent) || /[Ee]p\s*\d+/i.test(parent)) {
                episodeFolders.add(parent);
            }
        }
        
        // Vérifier la structure hybride
        try {
            const rootContents = fsSync.readdirSync(rootPath);
            hasVideoFolder = rootContents.some(item => 
                /^videos?$/i.test(item) && fsSync.statSync(path.join(rootPath, item)).isDirectory()
            );
            hasSubtitleFolder = rootContents.some(item => 
                /^(subtitles?|subs?)$/i.test(item) && fsSync.statSync(path.join(rootPath, item)).isDirectory()
            );
        } catch (e) {
            // Ignorer les erreurs
        }
        
        // Déterminer la structure
        if (Math.max(...videoDepths) === 0) {
            return 'flat';
        } else if (seasonFolders.size > 0) {
            return 'by_season';
        } else if (episodeFolders.size > 0) {
            return 'by_episode';
        } else if (hasVideoFolder || hasSubtitleFolder) {
            return 'hybrid';
        } else {
            return 'mixed';
        }
    }
    
    detectMediaType(videos) {
        if (!videos || videos.length === 0) {
            return 'unknown';
        }
        
        const parser = new NameParser();
        let episodeCount = 0;
        
        for (const video of videos) {
            const info = parser.parseEpisodeInfo(video.filename);
            if (info.episode !== null) {
                episodeCount++;
            }
        }
        
        // Décision basée sur le ratio
        if (videos.length === 1) {
            return episodeCount === 0 ? 'movie' : 'series';
        } else if (episodeCount >= videos.length * 0.7) {
            return 'series';
        } else if (episodeCount === 0) {
            return 'movie_collection';
        } else {
            return 'mixed';
        }
    }
}

// ============================================================================
// ASSOCIATEUR DE FICHIERS
// ============================================================================

class FileAssociator {
    constructor(config = new Config()) {
        this.config = config;
        this.parser = new NameParser(config);
    }
    
    async createAssociations(files, mediaType, movieTrailerInfo = null) {
        const videos = files.videos || [];
        const subtitles = files.subtitles || [];
        const images = files.images || [];
        
        // Parser tous les fichiers
        this.parseAllFiles(videos, subtitles, images);
        
        // Associate clips with episodes if applicable
        this.associateClipsWithEpisodes(videos, mediaType);
        
        // Create optimal subtitle-video associations (prevent over-association)
        const subtitleAssignments = this.createOptimalSubtitleAssignments(videos, subtitles);
        
        const associations = [];
        
        for (const video of videos) {
            // Get assigned subtitles for this video
            const matchedSubs = subtitleAssignments[video.filepath] || [];
            
            // Trouver les images associées
            const matchedImgs = this.matchImages(video, images, mediaType);
            
            // Créer l'association
            const association = new MediaAssociation(video, matchedSubs, matchedImgs);
            associations.push(association);
        }
        
        return associations;
    }
    
    createOptimalSubtitleAssignments(videos, subtitles) {
        const assignments = {};
        const usedSubtitles = new Set();
        
        // Initialize assignments for all videos
        for (const video of videos) {
            assignments[video.filepath] = [];
        }
        
        // For each subtitle, find the best matching video
        for (const subtitle of subtitles) {
            if (usedSubtitles.has(subtitle.filepath)) continue;
            
            let bestMatch = null;
            let bestScore = 0;
            
            for (const video of videos) {
                const score = this.calculateMatchScore(video, subtitle);
                if (score >= this.config.MIN_MATCH_SCORE && score > bestScore) {
                    bestScore = score;
                    bestMatch = video;
                }
            }
            
            // Assign subtitle to best matching video
            if (bestMatch) {
                assignments[bestMatch.filepath].push(subtitle);
                usedSubtitles.add(subtitle.filepath);
                logger.debug(`Matched subtitle ${subtitle.filename} to video ${bestMatch.filename} (score: ${bestScore})`);
            }
        }
        
        return assignments;
    }
    
    associateClipsWithEpisodes(videos, mediaType) {
        if (mediaType !== 'series') return; // Only for series
        
        const clips = videos.filter(v => v.videoType === 'clip');
        const episodes = videos.filter(v => v.videoType === 'episode' || (v.episodeNumber !== null && v.videoType !== 'clip'));
        
        for (const clip of clips) {
            let bestMatch = null;
            let bestScore = 0;
            
            // Try to match clip with episodes based on filename similarity and episode numbers
            for (const episode of episodes) {
                let score = 0;
                
                // Same episode number gets high score
                if (clip.episodeNumber !== null && clip.episodeNumber === episode.episodeNumber) {
                    score += 50;
                }
                
                // Same season gets moderate score
                if (clip.seasonNumber !== null && clip.seasonNumber === episode.seasonNumber) {
                    score += 20;
                }
                
                // Same directory gets low score
                if (clip.parentDir === episode.parentDir) {
                    score += 10;
                }
                
                // Filename similarity
                const similarity = this.calculateNameSimilarity(
                    this.getBaseName(clip.filename),
                    this.getBaseName(episode.filename)
                );
                score += Math.floor(similarity * 30);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = episode;
                }
            }
            
            // Associate clip with best matching episode if score is reasonable
            if (bestMatch && bestScore >= 30) {
                clip.associatedEpisode = {
                    filepath: bestMatch.filepath,
                    filename: bestMatch.filename,
                    season: bestMatch.seasonNumber,
                    episode: bestMatch.episodeNumber,
                    score: bestScore
                };
                logger.debug(`Associated clip ${clip.filename} with episode ${bestMatch.filename} (score: ${bestScore})`);
            }
        }
    }
    
    parseAllFiles(videos, subtitles, images) {
        // Parser les vidéos
        for (const video of videos) {
            const info = this.parser.parseEpisodeInfo(video.filename);
            video.seasonNumber = info.season;
            video.episodeNumber = info.episode;
            video.title = info.title;
        }
        
        // Parser les sous-titres
        for (const sub of subtitles) {
            // Infos d'épisode
            const info = this.parser.parseEpisodeInfo(sub.filename);
            sub.seasonNumber = info.season;
            sub.episodeNumber = info.episode;
            sub.title = info.title;
            
            // Langue
            const lang = this.parser.parseLanguage(sub.filename);
            sub.languageCode = lang.code;
            sub.languageName = lang.name;
            
            // Tags spéciaux
            const tags = this.parser.parseSubtitleTags(sub.filename);
            sub.isForced = tags.forced;
            sub.isSDH = tags.sdh;
            sub.isCommentary = tags.commentary;
        }
        
        // Parser les images
        for (const img of images) {
            const info = this.parser.parseEpisodeInfo(img.filename);
            img.seasonNumber = info.season;
            img.episodeNumber = info.episode;
            img.title = info.title;
            img.imageType = this.parser.parseImageType(img.filename);
        }
    }
    
    matchSubtitles(video, subtitles) {
        const matched = [];
        
        for (const sub of subtitles) {
            const score = this.calculateMatchScore(video, sub);
            
            if (score >= this.config.MIN_MATCH_SCORE) {
                matched.push(sub);
                logger.debug(`Matched subtitle ${sub.filename} to video ${video.filename} (score: ${score})`);
            }
        }
        
        // Trier par langue
        matched.sort((a, b) => {
            if (a.languageCode === 'unknown' && b.languageCode !== 'unknown') return 1;
            if (a.languageCode !== 'unknown' && b.languageCode === 'unknown') return -1;
            return a.languageName.localeCompare(b.languageName);
        });
        
        return matched;
    }
    
    matchImages(video, images, mediaType) {
        const matched = [];
        
        for (const img of images) {
            // Pour les séries
            if (mediaType === 'series') {
                if (img.episodeNumber === video.episodeNumber) {
                    if (img.seasonNumber === null || img.seasonNumber === video.seasonNumber) {
                        matched.push(img);
                    }
                }
            }
            // Pour les films
            else if (video.parentDir === img.parentDir) {
                const similarity = this.calculateNameSimilarity(
                    this.getBaseName(video.filename),
                    this.getBaseName(img.filename)
                );
                if (similarity > this.config.SIMILARITY_THRESHOLD) {
                    matched.push(img);
                }
            }
        }
        
        return matched;
    }
    
    calculateMatchScore(video, subtitle) {
        let score = 0;
        
        // Même dossier
        if (video.parentDir === subtitle.parentDir) {
            score += 10;
        }
        
        // Même numéro d'épisode
        if (video.episodeNumber !== null && video.episodeNumber === subtitle.episodeNumber) {
            score += 30;
        }
        
        // Même numéro de saison
        if (video.seasonNumber !== null && video.seasonNumber === subtitle.seasonNumber) {
            score += 20;
        }
        
        // Similarité du nom
        const videoBase = this.getBaseName(video.filename);
        let subBase = this.getBaseName(subtitle.filename);
        
        // Retirer la langue du nom du sous-titre
        for (const code of Object.keys(this.config.LANGUAGE_CODES)) {
            subBase = subBase.replace(new RegExp(`\\.${code}$`, 'i'), '');
            subBase = subBase.replace(new RegExp(`_${code}$`, 'i'), '');
        }
        
        const similarity = this.calculateNameSimilarity(videoBase, subBase);
        score += Math.floor(similarity * 50);
        
        return score;
    }
    
    getBaseName(filename) {
        let base = filename.replace(/\.[^.]+$/, '');
        
        // Retirer les tags de langue
        for (const code of Object.keys(this.config.LANGUAGE_CODES)) {
            base = base.replace(new RegExp(`\\.${code}$`, 'i'), '');
            base = base.replace(new RegExp(`_${code}$`, 'i'), '');
        }
        
        // Retirer les tags spéciaux
        for (const tags of Object.values(this.config.SUBTITLE_TAGS)) {
            for (const tag of tags) {
                base = base.replace(new RegExp(`\\.${tag}$`, 'i'), '');
                base = base.replace(new RegExp(`_${tag}$`, 'i'), '');
            }
        }
        
        return base.toLowerCase();
    }
    
    calculateNameSimilarity(name1, name2) {
        return stringSimilarity.compareTwoStrings(name1.toLowerCase(), name2.toLowerCase());
    }
}

// ============================================================================
// IDENTIFICATEUR D'IMAGES GLOBALES
// ============================================================================

class GlobalImageIdentifier {
    identifyGlobalImages(images, associations) {
        // Collecter les images déjà associées
        const associatedImages = new Set();
        for (const assoc of associations) {
            for (const img of assoc.images) {
                associatedImages.add(img.filepath);
            }
        }
        
        // Images globales
        const globalImages = [];
        
        for (const img of images) {
            if (!associatedImages.has(img.filepath)) {
                // Image globale par son type
                if (['poster', 'fanart', 'banner', 'logo'].includes(img.imageType)) {
                    globalImages.push(img);
                }
                // Ou sans numéro d'épisode
                else if (img.episodeNumber === null) {
                    globalImages.push(img);
                }
            }
        }
        
        return globalImages;
    }
}

// ============================================================================
// FORMATEUR DE SORTIE
// ============================================================================

class OutputFormatter {
    formatOutput(associations, globalImages, mediaType, structureType, rootPath, allFiles, movieTrailerInfo = null) {
        // Calculer les statistiques
        const totalVideos = associations.length;
        const totalSubtitles = (allFiles.subtitles || []).length;
        const totalImages = (allFiles.images || []).length;
        
        let matchedSubtitles = 0;
        const languagesFound = new Set();
        const subtitleFormats = new Set();
        
        for (const assoc of associations) {
            matchedSubtitles += assoc.subtitles.length;
            for (const sub of assoc.subtitles) {
                if (sub.languageCode !== 'unknown') {
                    languagesFound.add(sub.languageCode);
                }
                subtitleFormats.add(sub.format);
            }
        }
        
        // Identifier les fichiers non matchés
        const matchedSubPaths = new Set();
        const matchedImgPaths = new Set();
        
        for (const assoc of associations) {
            for (const sub of assoc.subtitles) {
                matchedSubPaths.add(sub.filepath);
            }
            for (const img of assoc.images) {
                matchedImgPaths.add(img.filepath);
            }
        }
        
        for (const img of globalImages) {
            matchedImgPaths.add(img.filepath);
        }
        
        const unmatchedSubs = (allFiles.subtitles || [])
            .filter(s => !matchedSubPaths.has(s.filepath))
            .map(s => s.filepath);
        
        const unmatchedImgs = (allFiles.images || [])
            .filter(i => !matchedImgPaths.has(i.filepath))
            .map(i => i.filepath);
        
        // Statistiques movie/trailer
        const movieCount = (allFiles.videos || [])
            .filter(v => v.videoType === 'movie').length;
        const trailerCount = (allFiles.videos || [])
            .filter(v => v.videoType === 'trailer').length;
        const clipCount = (allFiles.videos || [])
            .filter(v => v.videoType === 'clip').length;
        
        // Construire le résultat
        return {
            analysis_date: new Date().toISOString(),
            root_path: rootPath,
            media_type: mediaType,
            structure_type: structureType,
            global_images: globalImages.map(img => this.formatImage(img)),
            media_items: associations.map(assoc => this.formatAssociation(assoc)),
            statistics: {
                total_videos: totalVideos,
                total_subtitles: totalSubtitles,
                total_images: totalImages,
                matched_subtitles: matchedSubtitles,
                unmatched_subtitles: totalSubtitles - matchedSubtitles,
                languages_found: Array.from(languagesFound).sort(),
                subtitle_formats: Array.from(subtitleFormats).sort()
            },
            unmatched_files: {
                subtitles: unmatchedSubs,
                images: unmatchedImgs
            }
        };
    }
    
    formatAssociation(association) {
        return {
            episode_number: association.video.episodeNumber,
            season_number: association.video.seasonNumber,
            title: association.video.title,
            video: this.formatVideo(association.video),
            subtitles: association.subtitles.map(sub => this.formatSubtitle(sub)),
            images: association.images.map(img => this.formatImage(img))
        };
    }
    
    formatVideo(video) {
        return {
            filepath: video.filepath,
            filename: video.filename,
            size: video.size,
            duration: video.duration,
            resolution: video.resolution,
            codec: video.codec,
            bitrate: video.bitrate,
            video_type: video.videoType || 'unknown',
            is_trailer: video.isTrailer || false,
            is_clip: video.isClip || false,
            associated_episode: video.associatedEpisode || null
        };
    }
    
    formatSubtitle(subtitle) {
        return {
            filepath: subtitle.filepath,
            filename: subtitle.filename,
            language_code: subtitle.languageCode,
            language_name: subtitle.languageName,
            format: subtitle.format,
            is_forced: subtitle.isForced,
            is_sdh: subtitle.isSDH,
            is_commentary: subtitle.isCommentary,
            size: subtitle.size
        };
    }
    
    formatImage(image) {
        return {
            filepath: image.filepath,
            filename: image.filename,
            type: image.imageType,
            dimensions: image.dimensions,
            size: image.size
        };
    }
}

// ============================================================================
// ANALYSEUR PRINCIPAL
// ============================================================================

class MediaAnalyzer {
    constructor(config = null) {
        this.config = config || new Config();
        this.scanner = new FileScanner(this.config);
        this.structureDetector = new StructureDetector();
        this.movieTrailerAnalyzer = new MovieTrailerAnalyzer(this.config);
        this.associator = new FileAssociator(this.config);
        this.imageIdentifier = new GlobalImageIdentifier();
        this.formatter = new OutputFormatter();
        this.metadataReader = new MetadataReader();
    }
    
    async analyze(paths, options = {}) {
        try {
            // Handle both old and new API
            let rootPath, scanPaths;
            
            if (typeof paths === 'string') {
                // Legacy single path
                rootPath = paths;
                scanPaths = paths;
                
                // Vérifier que le dossier existe
                const stats = await fs.stat(rootPath);
                if (!stats.isDirectory()) {
                    throw new Error(`Path is not a directory: ${rootPath}`);
                }
                logger.info(`Starting analysis of: ${rootPath}`);
            } else {
                // New multi-path API
                const { videoPath, subtitlePath, imagePath } = paths;
                scanPaths = { videoPath, subtitlePath, imagePath };
                rootPath = videoPath || subtitlePath || imagePath || 'multi-path';
                
                // Validate that at least one path exists
                const pathsToCheck = [videoPath, subtitlePath, imagePath].filter(p => p);
                if (pathsToCheck.length === 0) {
                    throw new Error('At least one path must be provided');
                }
                
                // Verify directories exist
                for (const checkPath of pathsToCheck) {
                    try {
                        const stats = await fs.stat(checkPath);
                        if (!stats.isDirectory()) {
                            logger.warn(`Path is not a directory: ${checkPath}`);
                        }
                    } catch (err) {
                        logger.warn(`Cannot access path: ${checkPath}`);
                    }
                }
                
                logger.info(`Starting multi-path analysis: videos=${videoPath}, subtitles=${subtitlePath}, images=${imagePath}`);
            }
            
            // 1. Scanner les fichiers
            logger.info('Step 1: Scanning files...');
            const files = await this.scanner.scanDirectory(scanPaths);
            
            // 2. Détecter la structure
            logger.info('Step 2: Detecting structure...');
            const structureType = this.structureDetector.detectStructure(files, rootPath);
            logger.info(`Detected structure: ${structureType}`);
            
            // 3. Détecter le type de média
            logger.info('Step 3: Detecting media type...');
            const mediaType = this.structureDetector.detectMediaType(files.videos);
            logger.info(`Detected media type: ${mediaType}`);
            
            // 4. Lire les métadonnées (optionnel)
            if (options.readMetadata) {
                logger.info('Step 4: Reading video metadata...');
                files.videos = await this.metadataReader.readAllVideoMetadata(files.videos, options);
            }
            
            // 4.5. Analyse movie/trailer/clip pour les cas appropriés
            let movieTrailerInfo = null;
            if (mediaType === 'movie' || mediaType === 'movie_collection') {
                logger.info('Step 4.5: Analyzing movie/trailer classification...');
                movieTrailerInfo = this.movieTrailerAnalyzer.analyzeMovieTrailer(files.videos);
                logger.info(`Movie/Trailer analysis result: ${movieTrailerInfo.type}`);
            } else if (mediaType === 'series') {
                // For series, we still need to detect trailers and clips
                logger.info('Step 4.5: Analyzing trailer/clip classification for series...');
                this.classifyTrailersAndClipsInSeries(files.videos);
            }
            
            // 5. Créer les associations
            logger.info('Step 5: Creating associations...');
            const associations = await this.associator.createAssociations(files, mediaType, movieTrailerInfo);
            logger.info(`Created ${associations.length} associations`);
            
            // 6. Identifier les images globales
            logger.info('Step 6: Identifying global images...');
            const globalImages = this.imageIdentifier.identifyGlobalImages(
                files.images, associations
            );
            logger.info(`Found ${globalImages.length} global images`);
            
            // 7. Formater la sortie
            logger.info('Step 7: Formatting output...');
            const result = this.formatter.formatOutput(
                associations, globalImages, mediaType,
                structureType, rootPath, files, movieTrailerInfo
            );
            
            // Add path information to result
            if (typeof scanPaths === 'object') {
                result.input_paths = scanPaths;
            }
            
            logger.info('Analysis completed successfully');
            return result;
            
        } catch (err) {
            logger.error(`Error during analysis: ${err.message}`);
            throw err;
        }
    }
    
    classifyTrailersAndClipsInSeries(videos) {
        for (const video of videos) {
            const isTrailerByName = this.movieTrailerAnalyzer.isTrailerByFilename(video.filename);
            const isClipByName = this.movieTrailerAnalyzer.isClipByFilename(video.filename);
            
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
    
    async analyzeAndSave(paths, outputFile = null, options = {}) {
        // Analyser
        const result = await this.analyze(paths, options);
        
        // Déterminer le fichier de sortie
        if (!outputFile) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            outputFile = `media_analysis_${timestamp}.json`;
        }
        
        // Sauvegarder
        await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf8');
        
        logger.info(`Results saved to: ${outputFile}`);
        return outputFile;
    }
}

// ============================================================================
// INTERFACE CLI
// ============================================================================

async function main() {
    // Configuration de la ligne de commande
    program
        .name('media-analyzer')
        .description('Analyse et associe automatiquement les fichiers vidéo, sous-titres et images')
        .version('1.0.0')
        .argument('[path]', 'Chemin du dossier à analyser (mode legacy)')
        .option('-v, --video-path <path>', 'Chemin du dossier contenant les vidéos')
        .option('-s, --subtitle-path <path>', 'Chemin du dossier contenant les sous-titres')
        .option('-i, --image-path <path>', 'Chemin du dossier contenant les images')
        .option('-o, --output <file>', 'Fichier de sortie JSON')
        .option('--verbose', 'Mode verbose pour plus de détails')
        .option('--min-score <score>', 'Score minimum pour l\'association (défaut: 60)', parseInt)
        .option('--no-metadata', 'Ne pas lire les métadonnées vidéo (plus rapide)')
        .option('--export-for-upload', 'Format optimisé pour l\'upload')
        .parse();
    
    const options = program.opts();
    const [legacyPath] = program.args;
    
    // Determine if using new multi-path mode or legacy single path
    let analyzePaths;
    if (options.videoPath || options.subtitlePath || options.imagePath) {
        // New multi-path mode
        analyzePaths = {
            videoPath: options.videoPath,
            subtitlePath: options.subtitlePath,
            imagePath: options.imagePath
        };
        
        if (!options.videoPath && !options.subtitlePath && !options.imagePath) {
            console.error('❌ At least one path must be specified when using separate folder options');
            process.exit(1);
        }
    } else if (legacyPath) {
        // Legacy single path mode
        analyzePaths = legacyPath;
    } else {
        console.error('❌ You must specify either a single path or use the separate folder options');
        console.error('\nExamples:');
        console.error('  Legacy mode: media-analyzer /path/to/media');
        console.error('  New mode:    media-analyzer -v /videos -s /subtitles -i /images');
        process.exit(1);
    }
    
    // Configurer le logging
    if (options.verbose) {
        logger.level = 'debug';
    }
    
    // Créer la configuration
    const config = new Config();
    if (options.minScore) {
        config.MIN_MATCH_SCORE = options.minScore;
    }
    
    // Créer l'analyseur
    const analyzer = new MediaAnalyzer(config);
    
    try {
        // Options d'analyse
        const analyzeOptions = {
            readMetadata: options.metadata !== false
        };
        
        // Lancer l'analyse
        const outputFile = await analyzer.analyzeAndSave(analyzePaths, options.output, analyzeOptions);
        
        // Afficher le résumé
        const result = JSON.parse(await fs.readFile(outputFile, 'utf8'));
        
        console.log('\n✅ Analyse terminée avec succès!');
        console.log(`📄 Résultats sauvegardés dans: ${outputFile}`);
        
        console.log('\n📊 Résumé:');
        console.log(`  - Type de média: ${result.media_type}`);
        console.log(`  - Structure: ${result.structure_type}`);
        console.log(`  - Vidéos trouvées: ${result.statistics.total_videos}`);
        console.log(`  - Sous-titres: ${result.statistics.total_subtitles} (${result.statistics.matched_subtitles} associés)`);
        console.log(`  - Images: ${result.statistics.total_images}`);
        
        if (result.statistics.languages_found.length > 0) {
            console.log(`  - Langues détectées: ${result.statistics.languages_found.join(', ')}`);
        }
        
        if (result.unmatched_files.subtitles.length > 0) {
            console.log(`\n⚠️  ${result.unmatched_files.subtitles.length} sous-titres non associés`);
        }
        
        // Format pour upload si demandé
        if (options.exportForUpload) {
            const uploadFormat = {
                uploads: []
            };
            
            for (const item of result.media_items) {
                // Ajouter la vidéo
                uploadFormat.uploads.push({
                    type: 'video',
                    path: item.video.filepath,
                    metadata: {
                        episode: item.episode_number,
                        season: item.season_number,
                        title: item.title
                    }
                });
                
                // Ajouter les sous-titres
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
            console.log(`\n📤 Format upload sauvegardé dans: ${uploadFile}`);
        }
        
    } catch (err) {
        console.error(`\n❌ Erreur lors de l'analyse: ${err.message}`);
        if (options.verbose) {
            console.error(err.stack);
        }
        process.exit(1);
    }
}

// ============================================================================
// API EXPORT
// ============================================================================

module.exports = {
    MediaAnalyzer,
    Config,
    FileScanner,
    NameParser,
    StructureDetector,
    FileAssociator,
    OutputFormatter,
    MediaFile,
    VideoFile,
    SubtitleFile,
    ImageFile,
    MediaAssociation
};

// Point d'entrée si exécuté directement
if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}