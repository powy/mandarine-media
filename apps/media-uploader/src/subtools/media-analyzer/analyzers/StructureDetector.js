const fsSync = require('fs');
const path = require('path');
const NameParser = require('./NameParser');

/**
 * Detector for media structure and type
 */
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

module.exports = StructureDetector;