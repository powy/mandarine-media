const stringSimilarity = require('string-similarity');
const winston = require('winston');

const Config = require('../config');
const NameParser = require('../analyzers/NameParser');
const MediaAssociation = require('../models/MediaAssociation');

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
 * File associator for matching subtitles and images to videos
 */
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

        // Special handling for trailers and clips - strict filename matching required
        if (video.isTrailer || video.videoType === 'trailer' || video.isClip || video.videoType === 'clip') {
            const videoBaseName = this.getBaseName(video.filename);
            const subtitleFileName = subtitle.filename.toLowerCase();

            // For trailers/clips, the complete video base name must be contained in the subtitle filename
            // Example: MyTrailerVideo.mp4 should only match MyTrailerVideo_en.srt or MyTrailerVideo_blablabla_en.srt
            if (!subtitleFileName.includes(videoBaseName.toLowerCase())) {
                logger.debug(`Rejecting subtitle ${subtitle.filename} for ${video.videoType} ${video.filename} - base name not found in subtitle`);
                return 0; // No match for trailers/clips without exact filename matching
            }

            // If base name is found, continue with normal scoring but with higher requirements
            logger.debug(`Accepting subtitle ${subtitle.filename} for ${video.videoType} ${video.filename} - base name found`);
        }

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

module.exports = FileAssociator;