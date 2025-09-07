const MediaFile = require('./MediaFile');

/**
 * Image file with type and dimension information
 */
class ImageFile extends MediaFile {
    constructor(data) {
        super(data);
        this.imageType = data.imageType || 'unknown';
        this.dimensions = data.dimensions || null;
    }
}

module.exports = ImageFile;