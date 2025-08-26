const ffmpeg = require('fluent-ffmpeg');
const winston = require('winston');

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

// Configuration des binaires FFmpeg embarqués (pour l'exe)
try {
    const ffmpegPath = require('ffmpeg-static');
    const ffprobePath = require('ffprobe-static').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
} catch (e) {
    // Utiliser FFmpeg système si les packages static ne sont pas installés
    logger.debug('Using system FFmpeg/FFprobe');
}

/**
 * Reader for video metadata using FFmpeg
 */
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

module.exports = MetadataReader;