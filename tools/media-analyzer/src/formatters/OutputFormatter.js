/**
 * Formatter for analysis output
 */
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

module.exports = OutputFormatter;