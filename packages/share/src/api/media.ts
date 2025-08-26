import { apiClient } from './client';
import { 
  MediaDescription, 
  VideoFile, 
  MediaDescriptionListResponse, 
  VideoFileListResponse,
  MediaFilters,
  VideoFileFilters,
  BulkMediaDescriptionRequest,
  BulkMediaDescriptionResponse,
  DescriptionReport,
  DescriptionReportListResponse
} from '../types';

export const mediaApi = {
  // Media Description endpoints
  async getMediaDescriptions(filters?: MediaFilters): Promise<MediaDescriptionListResponse> {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.media_type) params.append('media_type', filters.media_type);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.is_featured !== undefined) params.append('is_featured', filters.is_featured.toString());
    if (filters?.is_premium !== undefined) params.append('is_premium', filters.is_premium.toString());

    // v1.9: Updated to flat URL structure
    const response = await apiClient.get<MediaDescriptionListResponse>(`/media-descriptions?${params}`);
    return response.data;
  },

  async getMediaDescription(id: string): Promise<MediaDescription> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.get<MediaDescription>(`/media-descriptions/${id}`);
    return response.data;
  },

  async createMediaDescription(data: Partial<MediaDescription>): Promise<MediaDescription> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.post<MediaDescription>('/media-descriptions', data);
    return response.data;
  },

  async updateMediaDescription(id: string, data: Partial<MediaDescription>): Promise<MediaDescription> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.put<MediaDescription>(`/media-descriptions/${id}`, data);
    return response.data;
  },

  async deleteMediaDescription(id: string): Promise<MediaDescription> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.delete<MediaDescription>(`/media-descriptions/${id}`);
    return response.data;
  },

  // Featured and trending content
  async getFeaturedMedia(skip = 0, limit = 20): Promise<MediaDescription[]> {
    const response = await apiClient.get<MediaDescription[]>(`/media-descriptions/featured/list?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async getTrendingMedia(skip = 0, limit = 20): Promise<MediaDescription[]> {
    const response = await apiClient.get<MediaDescription[]>(`/media-descriptions/trending/list?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // User interactions
  async likeMedia(id: string): Promise<MediaDescription> {
    const response = await apiClient.post<MediaDescription>(`/media-descriptions/${id}/like`);
    return response.data;
  },

  async shareMedia(id: string): Promise<MediaDescription> {
    const response = await apiClient.post<MediaDescription>(`/media-descriptions/${id}/share`);
    return response.data;
  },

  // Video File endpoints
  async getVideoFiles(filters?: VideoFileFilters): Promise<VideoFileListResponse> {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());

    // v1.9: Updated to flat URL structure
    const response = await apiClient.get<VideoFileListResponse>(`/video-files?${params}`);
    return response.data;
  },

  async getVideoFile(id: string): Promise<VideoFile> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.get<VideoFile>(`/video-files/${id}`);
    return response.data;
  },

  async createVideoFile(data: Partial<VideoFile>): Promise<VideoFile> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.post<VideoFile>('/video-files', data);
    return response.data;
  },

  async updateVideoFile(id: string, data: Partial<VideoFile>): Promise<VideoFile> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.put<VideoFile>(`/video-files/${id}`, data);
    return response.data;
  },

  async deleteVideoFile(id: string): Promise<VideoFile> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.delete<VideoFile>(`/video-files/${id}`);
    return response.data;
  },

  // Video file management
  async getVideoFilesByMedia(mediaId: string): Promise<VideoFile[]> {
    const response = await apiClient.get<VideoFile[]>(`/video-files/by-media/${mediaId}`);
    return response.data;
  },

  async getUnlinkedVideoFiles(skip = 0, limit = 20): Promise<VideoFile[]> {
    const response = await apiClient.get<VideoFile[]>(`/video-files/unlinked/list?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async linkVideoToMedia(fileId: string, mediaId: string): Promise<VideoFile> {
    const response = await apiClient.post<VideoFile>(`/video-files/${fileId}/link/${mediaId}`);
    return response.data;
  },

  async updateEncodingStatus(id: string, status: string, logs?: string): Promise<VideoFile> {
    const response = await apiClient.put<VideoFile>(`/video-files/${id}/encoding-status`, {
      status,
      logs
    });
    return response.data;
  },

  // File upload (placeholder)
  async uploadVideoFile(file: File): Promise<{ message: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/video-files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Dual upload functionality
  async createVideoFileMetadata(data: {
    file_name: string;
    upload_method: 'new_upload' | 'existing_url';
    media_description_id?: string;
    external_url?: string;
  }): Promise<{
    id: string;
    upload_url?: string;
    upload_status: string;
    message: string;
  }> {
    const response = await apiClient.post('/video-files/create-metadata', data);
    return response.data;
  },

  async createVideoFileWithExistingUrl(data: {
    file_name: string;
    external_url: string;
    media_description_id?: string;
  }): Promise<VideoFile> {
    const response = await apiClient.post<VideoFile>('/video-files/create-with-existing-url', data);
    return response.data;
  },

  async uploadFileToExistingMetadata(fileId: string, file: File): Promise<{
    success: boolean;
    message: string;
    video_file_id: string;
    file_url: string;
    backend?: string;
    upload_status: string;
    encoding_status: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/video-files/${fileId}/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async testVideoFilePlayback(fileId: string): Promise<{
    success: boolean;
    playback_url?: string;
    error_message?: string;
    mux_playback_id?: string;
  }> {
    const response = await apiClient.post(`/video-files/${fileId}/test`);
    return response.data;
  },

  // Bulk Media Description endpoints
  async createBulkMediaDescriptions(data: BulkMediaDescriptionRequest): Promise<BulkMediaDescriptionResponse> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.post<BulkMediaDescriptionResponse>('/media-descriptions/bulk', data);
    return response.data;
  },

  async bulkCreateMediaDescriptions(data: MediaDescription[]): Promise<BulkMediaDescriptionResponse> {
    const response = await apiClient.post<BulkMediaDescriptionResponse>('/media-descriptions/bulk-create', data);
    return response.data;
  },

  async bulkUpdateMediaDescriptions(data: Array<{id: string} & Partial<MediaDescription>>): Promise<BulkMediaDescriptionResponse> {
    const response = await apiClient.put<BulkMediaDescriptionResponse>('/media-descriptions/bulk-update', data);
    return response.data;
  },

  // Description Reports endpoints
  async getDescriptionReports(skip = 0, limit = 20): Promise<DescriptionReportListResponse> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.get<DescriptionReportListResponse>(`/description-reports?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async getDescriptionReport(id: string): Promise<DescriptionReport> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.get<DescriptionReport>(`/description-reports/${id}`);
    return response.data;
  },

  async getDescriptionReportsByBatch(batchId: string): Promise<DescriptionReport[]> {
    const response = await apiClient.get<DescriptionReport[]>(`/description-reports/batch/${batchId}`);
    return response.data;
  },

  async getDescriptionReportsByDescription(descriptionId: string): Promise<DescriptionReport[]> {
    const response = await apiClient.get<DescriptionReport[]>(`/description-reports/description/${descriptionId}`);
    return response.data;
  },
};

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
    let actors: any[] = [];
    let directors: any[] = [];
    let producers: any[] = [];
    let audioLanguages: any[] = [];
    let subtitleLanguages: any[] = [];
    let originCountries: any[] = [];
    
    // If this media is part of a season, get other episodes and program info
    if (mediaDescription.season_id) {
      // Import season and program APIs here to avoid circular dependencies
      const { seasonsApi } = await import('./seasons');
      const { programsApi } = await import('./programs');
      
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
    
    // Get cast and crew information
    if (mediaDescription.actors_id_list?.length || mediaDescription.directors_id_list?.length || mediaDescription.productor_id_list?.length) {
      const { personsApi } = await import('./persons');
      
      // Get actors
      if (mediaDescription.actors_id_list?.length) {
        try {
          actors = await Promise.all(
            mediaDescription.actors_id_list.map(id => personsApi.getById(id).catch(() => null))
          );
          actors = actors.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch actors:', error);
          actors = [];
        }
      }
      
      // Get directors
      if (mediaDescription.directors_id_list?.length) {
        try {
          directors = await Promise.all(
            mediaDescription.directors_id_list.map(id => personsApi.getById(id).catch(() => null))
          );
          directors = directors.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch directors:', error);
          directors = [];
        }
      }
      
      // Get producers
      if (mediaDescription.productor_id_list?.length) {
        try {
          producers = await Promise.all(
            mediaDescription.productor_id_list.map(id => personsApi.getById(id).catch(() => null))
          );
          producers = producers.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch producers:', error);
          producers = [];
        }
      }
    }
    
    // Get language information
    if (mediaDescription.original_languages_id?.length || mainVideoFile?.audio_languages_id_list?.length || mainVideoFile?.subtitle_languages_id_list?.length) {
      const { languagesApi } = await import('./languages');
      
      // Get audio languages
      const audioLanguageIds = mainVideoFile?.audio_languages_id_list || [];
      if (audioLanguageIds.length) {
        try {
          audioLanguages = await Promise.all(
            audioLanguageIds.map(id => languagesApi.getById(id).catch(() => null))
          );
          audioLanguages = audioLanguages.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch audio languages:', error);
          audioLanguages = [];
        }
      }
      
      // Get subtitle languages
      const subtitleLanguageIds = mainVideoFile?.subtitle_languages_id_list || [];
      if (subtitleLanguageIds.length) {
        try {
          subtitleLanguages = await Promise.all(
            subtitleLanguageIds.map(id => languagesApi.getById(id).catch(() => null))
          );
          subtitleLanguages = subtitleLanguages.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch subtitle languages:', error);
          subtitleLanguages = [];
        }
      }
    }
    
    // Get origin countries
    if (mediaDescription.origin_country_id_list?.length) {
      const { countriesApi } = await import('./countries');
      
      try {
        originCountries = await Promise.all(
          mediaDescription.origin_country_id_list.map(id => countriesApi.getById(id).catch(() => null))
        );
        originCountries = originCountries.filter(Boolean);
      } catch (error) {
        console.warn('Failed to fetch origin countries:', error);
        originCountries = [];
      }
    }
    
    return {
      mediaDescription,
      videoFile: mainVideoFile,
      relatedEpisodes,
      season,
      program,
      hasRelatedContent: relatedEpisodes.length > 0,
      actors,
      directors,
      producers,
      audioLanguages,
      subtitleLanguages,
      originCountries
    };
  } catch (error) {
    throw new Error(`Failed to fetch video screen data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Season screen detailed data function
export const getSeasonScreenData = async (seasonId: string) => {
  try {
    console.log('🔍 getSeasonScreenData: Starting for season ID:', seasonId);
    // Import APIs here to avoid circular dependencies
    const { seasonsApi } = await import('./seasons');
    const { programsApi } = await import('./programs');
    
    console.log('🔍 getSeasonScreenData: Fetching season data...');
    // Get the season information
    const season = await seasonsApi.getById(seasonId);
    console.log('✅ getSeasonScreenData: Season data received:', season);
    
    // Get program information
    let program = null;
    if (season.program_id) {
      program = await programsApi.getById(season.program_id);
    }
    
    // Get all episodes for this season
    const episodesResponse = await mediaApi.getMediaDescriptions({
      skip: 0,
      limit: 100, // Get all episodes
    });
    
    // Filter episodes that belong to this season
    const episodes = episodesResponse.data.filter(
      episode => episode.season_id === seasonId
    ).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
    
    // Get next and previous seasons
    let nextSeason = null;
    let previousSeason = null;
    
    if (season.program_id) {
      const programSeasonsResponse = await seasonsApi.getAll({ 
        program_id: season.program_id, 
        skip: 0, 
        limit: 50 
      });
      
      console.log('🔍 getSeasonScreenData: programSeasonsResponse:', programSeasonsResponse);
      
      // Handle different response formats (direct array vs paginated response)
      // Backend returns direct array, not paginated response
      const seasonsData = Array.isArray(programSeasonsResponse) ? programSeasonsResponse : programSeasonsResponse.data || [];
      
      if (Array.isArray(seasonsData) && seasonsData.length > 0) {
        const seasons = seasonsData.sort((a, b) => a.season_number - b.season_number);
        const currentIndex = seasons.findIndex(s => s.id === seasonId);
        
        if (currentIndex > 0) {
          previousSeason = seasons[currentIndex - 1];
        }
        
        if (currentIndex < seasons.length - 1) {
          nextSeason = seasons[currentIndex + 1];
        }
      }
    }
    
    // Extract season image from the first episode that has one
    let seasonImageUrl = null;
    for (const episode of episodes) {
      if (episode.main_thumbnail_url) {
        seasonImageUrl = episode.main_thumbnail_url;
        break;
      }
    }
    
    // Get cast and crew from all episodes (deduplicated)
    let actors: any[] = [];
    let directors: any[] = [];
    let producers: any[] = [];
    let audioLanguages: any[] = [];
    let subtitleLanguages: any[] = [];
    let originCountries: any[] = [];
    
    // Collect unique IDs from all episodes
    const actorIds = new Set<string>();
    const directorIds = new Set<string>();
    const producerIds = new Set<string>();
    const countryIds = new Set<string>();
    
    episodes.forEach(episode => {
      episode.actors_id_list?.forEach(id => actorIds.add(id));
      episode.directors_id_list?.forEach(id => directorIds.add(id));
      episode.productor_id_list?.forEach(id => producerIds.add(id));
      episode.origin_country_id_list?.forEach(id => countryIds.add(id));
    });
    
    // Fetch person and country data if any IDs exist
    if (actorIds.size || directorIds.size || producerIds.size) {
      const { personsApi } = await import('./persons');
      
      if (actorIds.size) {
        try {
          actors = await Promise.all(
            Array.from(actorIds).map(id => personsApi.getById(id).catch(() => null))
          );
          actors = actors.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch actors:', error);
          actors = [];
        }
      }
      
      if (directorIds.size) {
        try {
          directors = await Promise.all(
            Array.from(directorIds).map(id => personsApi.getById(id).catch(() => null))
          );
          directors = directors.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch directors:', error);
          directors = [];
        }
      }
      
      if (producerIds.size) {
        try {
          producers = await Promise.all(
            Array.from(producerIds).map(id => personsApi.getById(id).catch(() => null))
          );
          producers = producers.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch producers:', error);
          producers = [];
        }
      }
    }
    
    if (countryIds.size) {
      const { countriesApi } = await import('./countries');
      
      try {
        originCountries = await Promise.all(
          Array.from(countryIds).map(id => countriesApi.getById(id).catch(() => null))
        );
        originCountries = originCountries.filter(Boolean);
      } catch (error) {
        console.warn('Failed to fetch origin countries:', error);
        originCountries = [];
      }
    }
    
    return {
      season,
      program,
      episodes,
      nextSeason,
      previousSeason,
      seasonImageUrl,
      actors,
      directors,
      producers,
      audioLanguages,
      subtitleLanguages,
      originCountries
    };
  } catch (error) {
    console.error('❌ getSeasonScreenData: Error occurred:', error);
    console.error('❌ getSeasonScreenData: Error details:', {
      message: error?.message,
      response: error?.response,
      status: error?.response?.status,
      data: error?.response?.data
    });
    throw new Error(`Failed to fetch season screen data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Program screen detailed data function
export const getProgramScreenData = async (seasonId: string) => {
  try {
    console.log('🔍 getProgramScreenData: Starting for season ID:', seasonId);
    // Import APIs here to avoid circular dependencies
    const { seasonsApi } = await import('./seasons');
    const { programsApi } = await import('./programs');
    
    console.log('🔍 getProgramScreenData: Fetching season data...');
    // Get the season information to get the program_id
    const season = await seasonsApi.getById(seasonId);
    console.log('✅ getProgramScreenData: Season data received:', season);
    
    if (!season.program_id) {
      throw new Error('Season does not have a program ID');
    }
    
    // Get program information
    const program = await programsApi.getById(season.program_id);
    console.log('✅ getProgramScreenData: Program data received:', program);
    
    // Get all seasons for this program
    const seasonsResponse = await seasonsApi.getAll({ 
      program_id: season.program_id, 
      skip: 0, 
      limit: 50 
    });
    
    // Handle different response formats (direct array vs paginated response)
    const seasonsData = Array.isArray(seasonsResponse) ? seasonsResponse : seasonsResponse.data || [];
    const allSeasons = Array.isArray(seasonsData) ? seasonsData : [];
    
    // Sort seasons by season number
    allSeasons.sort((a, b) => a.season_number - b.season_number);
    
    // Get episodes for each season to find thumbnails and get program image
    let programImageUrl = null;
    const seasonsWithThumbnails = [];
    
    for (const seasonItem of allSeasons) {
      // Get episodes for this season
      const episodesResponse = await mediaApi.getMediaDescriptions({
        skip: 0,
        limit: 100,
      });
      
      // Filter episodes that belong to this season
      const seasonEpisodes = episodesResponse.data.filter(
        episode => episode.season_id === seasonItem.id
      ).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
      
      // Find thumbnail for this season (1920x720 preferred, fallback to any)
      let seasonThumbnailUrl = null;
      for (const episode of seasonEpisodes) {
        if (episode.main_thumbnail_url) {
          seasonThumbnailUrl = episode.main_thumbnail_url;
          break;
        }
      }
      
      // If this is the current season and we don't have a program image yet, 
      // look for 1920x1080 image in media_description
      if (seasonItem.id === seasonId && !programImageUrl) {
        for (const episode of seasonEpisodes) {
          // Check various image fields for 1920x1080 image
          if (episode.image_fullscreen) {
            programImageUrl = episode.image_fullscreen;
            break;
          } else if (episode.main_thumbnail_url) {
            programImageUrl = episode.main_thumbnail_url;
            break;
          }
        }
      }
      
      seasonsWithThumbnails.push({
        ...seasonItem,
        thumbnailUrl: seasonThumbnailUrl,
        episodeCount: seasonEpisodes.length
      });
    }
    
    // Get detailed information from the current season's episodes
    const currentSeasonEpisodesResponse = await mediaApi.getMediaDescriptions({
      skip: 0,
      limit: 100,
    });
    
    // Filter episodes that belong to current season
    const currentSeasonEpisodes = currentSeasonEpisodesResponse.data.filter(
      episode => episode.season_id === seasonId
    ).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
    
    // Get cast and crew information from current season episodes
    let actors: any[] = [];
    let directors: any[] = [];
    let producers: any[] = [];
    let audioLanguages: any[] = [];
    let subtitleLanguages: any[] = [];
    let originCountries: any[] = [];
    
    // Collect unique IDs from all episodes in current season
    const actorIds = new Set<string>();
    const directorIds = new Set<string>();
    const producerIds = new Set<string>();
    const countryIds = new Set<string>();
    
    currentSeasonEpisodes.forEach(episode => {
      episode.actors_id_list?.forEach(id => actorIds.add(id));
      episode.directors_id_list?.forEach(id => directorIds.add(id));
      episode.productor_id_list?.forEach(id => producerIds.add(id));
      episode.origin_country_id_list?.forEach(id => countryIds.add(id));
    });
    
    // Fetch person and country data if any IDs exist
    if (actorIds.size || directorIds.size || producerIds.size) {
      const { personsApi } = await import('./persons');
      
      if (actorIds.size) {
        try {
          actors = await Promise.all(
            Array.from(actorIds).map(id => personsApi.getById(id).catch(() => null))
          );
          actors = actors.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch actors:', error);
          actors = [];
        }
      }
      
      if (directorIds.size) {
        try {
          directors = await Promise.all(
            Array.from(directorIds).map(id => personsApi.getById(id).catch(() => null))
          );
          directors = directors.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch directors:', error);
          directors = [];
        }
      }
      
      if (producerIds.size) {
        try {
          producers = await Promise.all(
            Array.from(producerIds).map(id => personsApi.getById(id).catch(() => null))
          );
          producers = producers.filter(Boolean);
        } catch (error) {
          console.warn('Failed to fetch producers:', error);
          producers = [];
        }
      }
    }
    
    if (countryIds.size) {
      const { countriesApi } = await import('./countries');
      
      try {
        originCountries = await Promise.all(
          Array.from(countryIds).map(id => countriesApi.getById(id).catch(() => null))
        );
        originCountries = originCountries.filter(Boolean);
      } catch (error) {
        console.warn('Failed to fetch origin countries:', error);
        originCountries = [];
      }
    }
    
    // Get synopsis and description from the first episode of current season
    const firstEpisode = currentSeasonEpisodes.length > 0 ? currentSeasonEpisodes[0] : null;
    
    return {
      program,
      currentSeason: season,
      programImageUrl,
      synopsis: firstEpisode?.synopsis_text || null,
      description: firstEpisode?.descriptive_summary_text || null,
      genres: firstEpisode?.themes_and_genres_id_list || [],
      audioLanguages,
      subtitleLanguages,
      releaseDate: firstEpisode?.production_year || null,
      originCountries,
      actors,
      directors,
      producers,
      allSeasons: seasonsWithThumbnails
    };
  } catch (error) {
    console.error('❌ getProgramScreenData: Error occurred:', error);
    console.error('❌ getProgramScreenData: Error details:', {
      message: error?.message,
      response: error?.response,
      status: error?.response?.status,
      data: error?.response?.data
    });
    throw new Error(`Failed to fetch program screen data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getMediaDescription = mediaApi.getMediaDescription;
export const getMediaDescriptions = mediaApi.getMediaDescriptions;
export const getVideoFilesByMediaDescription = (mediaId: string): Promise<{ data: VideoFile[] }> => {
  return mediaApi.getVideoFilesByMedia(mediaId).then(data => ({ data }));
};