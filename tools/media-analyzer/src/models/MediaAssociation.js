/**
 * Association between video, subtitles, and images
 */
class MediaAssociation {
    constructor(video, subtitles = [], images = []) {
        this.video = video;
        this.subtitles = subtitles;
        this.images = images;
        this.episodeInfo = {
            season: video.seasonNumber,
            episode: video.episodeNumber,
            title: video.title
        };
    }
}

module.exports = MediaAssociation;