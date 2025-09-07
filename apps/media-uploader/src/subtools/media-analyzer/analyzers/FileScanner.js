const fs = require('fs').promises;
const path = require('path');
const glob = require('glob-promise');
const winston = require('winston');

const Config = require('../config');
const VideoFile = require('../models/VideoFile');
const SubtitleFile = require('../models/SubtitleFile');
const ImageFile = require('../models/ImageFile');
const MediaFile = require('../models/MediaFile');

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
 * File scanner for discovering media files
 */
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

module.exports = FileScanner;