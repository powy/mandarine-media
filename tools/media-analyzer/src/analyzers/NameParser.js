const Config = require('../config');

/**
 * Parser for extracting information from filenames
 */
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

module.exports = NameParser;