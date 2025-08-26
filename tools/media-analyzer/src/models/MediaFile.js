const path = require('path');

/**
 * Base class for media files
 */
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

module.exports = MediaFile;