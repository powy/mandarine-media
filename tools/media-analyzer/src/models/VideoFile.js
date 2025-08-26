const MediaFile = require('./MediaFile');

/**
 * Video file with additional metadata
 */
class VideoFile extends MediaFile {
    constructor(data) {
        super(data);
        this.duration = data.duration || null;
        this.resolution = data.resolution || null;
        this.codec = data.codec || null;
        this.bitrate = data.bitrate || null;
        this.videoType = data.videoType || 'unknown'; // 'movie', 'trailer', 'clip', 'episode', 'unknown'
        this.isTrailer = data.isTrailer || false;
        this.isClip = data.isClip || false;
        this.associatedEpisode = data.associatedEpisode || null; // For clips associated with episodes
    }
}

module.exports = VideoFile;