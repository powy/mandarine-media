const fs = require('fs').promises;
const winston = require('winston');

const Config = require('./config');
const FileScanner = require('./analyzers/FileScanner');
const StructureDetector = require('./analyzers/StructureDetector');
const MovieTrailerAnalyzer = require('./analyzers/MovieTrailerAnalyzer');
const MetadataReader = require('./analyzers/MetadataReader');
const FileAssociator = require('./associators/FileAssociator');
const GlobalImageIdentifier = require('./associators/GlobalImageIdentifier');
const OutputFormatter = require('./formatters/OutputFormatter');
const ContentValidator = require('./validators/ContentValidator');

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
 * Main media analyzer class
 */
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
        this.validator = new ContentValidator(this.config);
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
            
            // 8. Validate content for missing elements
            logger.info('Step 8: Validating content completeness...');
            const validationResults = this.validator.validate(result);
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

module.exports = MediaAnalyzer;