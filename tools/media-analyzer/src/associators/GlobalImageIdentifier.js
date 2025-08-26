/**
 * Identifier for global images (not associated with specific videos)
 */
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

module.exports = GlobalImageIdentifier;