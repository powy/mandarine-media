import { mediaApi } from '../api/media';
import { seasonsApi } from '../api/seasons';
import { programsApi } from '../api/programs';
import { MediaDescription } from '../types';

// Video screen detailed data function
export const getVideoScreenData = async (mediaDescriptionId: string) => {
  try {
    // Get the main media description
    const mediaDescription = await mediaApi.getMediaDescription(mediaDescriptionId);
    
    // Get associated video file
    const videoFiles = await mediaApi.getVideoFilesByMedia(mediaDescriptionId);
    const mainVideoFile = videoFiles.length > 0 ? videoFiles[0] : null;
    
    let relatedEpisodes: MediaDescription[] = [];
    let program = null;
    let season = null;
    
    // If this media is part of a season, get other episodes and program info
    if (mediaDescription.season_id) {
      // Get season info
      season = await seasonsApi.getById(mediaDescription.season_id);
      
      // Get other episodes in the same season
      const episodesResponse = await mediaApi.getMediaDescriptions({
        skip: 0,
        limit: 100, // Get all episodes
      });
      
      // Filter episodes that belong to the same season
      relatedEpisodes = episodesResponse.data.filter(
        episode => episode.season_id === mediaDescription.season_id && 
                  episode.id !== mediaDescriptionId
      ).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
      
      // If season has a program, get program info
      if (season.program_id) {
        program = await programsApi.getById(season.program_id);
      }
    }
    
    return {
      mediaDescription,
      videoFile: mainVideoFile,
      relatedEpisodes,
      season,
      program,
      hasRelatedContent: relatedEpisodes.length > 0
    };
  } catch (error) {
    throw new Error(`Failed to fetch video screen data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};