const MediaFile = require('./MediaFile');

/**
 * Subtitle file with language and format information
 */
class SubtitleFile extends MediaFile {
    constructor(data) {
        super(data);
        this.languageCode = data.languageCode || 'unknown';
        this.languageName = data.languageName || 'Unknown';
        this.format = data.format || this.extension.substring(1);
        this.isForced = data.isForced || false;
        this.isSDH = data.isSDH || false;
        this.isCommentary = data.isCommentary || false;
    }
}

module.exports = SubtitleFile;