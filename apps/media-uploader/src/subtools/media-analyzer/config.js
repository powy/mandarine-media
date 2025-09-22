/**
 * Configuration class for media analyzer
 */

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
        // Enhanced patterns to support various separators with optional spaces
        this.IMAGE_DIMENSION_PATTERNS = [
            /\b(\d{3,4})\s*[-_x×]\s*(\d{3,4})\b/gi,  // Flexible separator with spaces: 1920x1080, 1920-1080, 1920 - 1080, etc.
            /\b(\d{3,4})p\b/gi,                       // 1080p, 720p, etc.
        ];
        
        // Seuils
        this.MIN_MATCH_SCORE = 60;
        this.SIMILARITY_THRESHOLD = 0.7;
    }
}

module.exports = Config;