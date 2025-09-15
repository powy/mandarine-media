import { apiClient } from './client';
import { seasonsApi } from './seasons';
import { programsApi } from './programs';
import { personsApi } from './persons';
import { languagesApi } from './languages';
import { countriesApi } from './countries';
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
  DescriptionReportListResponse,
  Season
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

  async patchMediaDescription(id: string, data: Partial<MediaDescription>): Promise<MediaDescription> {
    const response = await apiClient.patch<MediaDescription>(`/media-descriptions/${id}`, data);
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

  async getMediaDescriptionsByVideo(videoFileId: string): Promise<MediaDescription[]> {
    const response = await apiClient.get<MediaDescription[]>(`/media-descriptions/by-video/${videoFileId}`);
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

  // API 1.13 New video file endpoints
  async destroyVideoFile(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/video-files/${id}/destroy`);
    return response.data;
  },

  async generatePlaybackToken(id: string, expirationMinutes: number = 60): Promise<{
    success: boolean;
    token: string;
    playback_url: string;
    playback_id: string;
    expires_in_minutes: number;
    expires_at: number;
  }> {
    const response = await apiClient.post(`/video-files/${id}/playback-token?expiration_minutes=${expirationMinutes}`);
    return response.data;
  },

  async generateDrmToken(id: string, expirationMinutes: number = 60, drmKeyId?: string): Promise<{
    success: boolean;
    token: string;
    drm_key_id?: string;
    expires_in_minutes: number;
    expires_at: number;
  }> {
    const params = new URLSearchParams();
    params.append('expiration_minutes', expirationMinutes.toString());
    if (drmKeyId) params.append('drm_key_id', drmKeyId);

    const response = await apiClient.post(`/video-files/${id}/drm-token?${params}`);
    return response.data;
  },

  async getTokenInfo(id: string): Promise<{
    token_type: 'playback' | 'drm';
    expires_at: number;
    is_expired: boolean;
    playback_id?: string;
    drm_key_id?: string;
  }> {
    const response = await apiClient.get(`/video-files/${id}/token-info`);
    return response.data;
  },

  async completeFromMux(id: string): Promise<VideoFile> {
    const response = await apiClient.post<VideoFile>(`/video-files/${id}/complete-from-mux`);
    return response.data;
  },

  // Audio language management
  async addAudioLanguage(videoFileId: string, languageId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/video-files/${videoFileId}/audio_languages/${languageId}`);
    return response.data;
  },

  async removeAudioLanguage(videoFileId: string, languageId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/video-files/${videoFileId}/audio_languages/${languageId}`);
    return response.data;
  },

  async updateAllAudioLanguages(videoFileId: string, languageIds: string[]): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put(`/video-files/${videoFileId}/audio_languages`, languageIds);
    return response.data;
  },

  // Bulk Media Description endpoints
  async createBulkMediaDescriptions(data: BulkMediaDescriptionRequest): Promise<BulkMediaDescriptionResponse> {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.post<BulkMediaDescriptionResponse>('/media-descriptions/bulk', data);
    return response.data;
  },

  // API 1.13 Text-to-UUID conversion
  async createMediaDescriptionFromText(data: {
    episode_title: string;
    media_type: 'video' | 'excerpt' | 'trailer' | 'webtoon' | 'season' | 'program';
    file_number?: number;
    program_name?: string;
    season_name?: string;
    actor_names?: string[];
    director_names?: string[];
    producer_names?: string[];
    author_names?: string[];
    theme_names?: string[];
    available_country_names?: string[];
    audience_category_names?: string[];
    image_1920_1080_filename?: string;
    descriptive_summary_text?: string;
    production_year?: number;
    is_featured?: boolean;
    content_status?: 'draft' | 'published' | 'archived' | 'scheduled';
  }): Promise<MediaDescription> {
    const response = await apiClient.post<MediaDescription>('/media-descriptions/from-text', data);
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
    console.log('🔍 getVideoScreenData: Starting data fetch for media ID:', mediaDescriptionId);
    
    // Get the main media description
    console.log('🔍 getVideoScreenData: Fetching media description...');
    const mediaDescription = await mediaApi.getMediaDescription(mediaDescriptionId);
    console.log('✅ getVideoScreenData: Media description received:', {
      id: mediaDescription.id,
      title: mediaDescription.episode_title,
      hasMainVideoFileId: !!mediaDescription.main_video_file_id,
      mainVideoFileId: mediaDescription.main_video_file_id,
      seasonId: mediaDescription.season_id,
      episodeNumber: mediaDescription.episode_number
    });
    
    // Get main video file using the new relationship structure
    let mainVideoFile = null;
    if (mediaDescription.main_video_file_id) {
      try {
        console.log('🔍 getVideoScreenData: Fetching video file:', mediaDescription.main_video_file_id);
        mainVideoFile = await mediaApi.getVideoFile(mediaDescription.main_video_file_id);
        console.log('✅ getVideoScreenData: Video file received:', {
          id: mainVideoFile.id,
          fileName: mainVideoFile.file_name,
          hasExternalUrl: !!mainVideoFile.external_url,
          hasMuxPlaybackId: !!mainVideoFile.mux_playback_id,
          playbackPolicy: mainVideoFile.playback_policy,
          uploadStatus: mainVideoFile.upload_status,
          encodingStatus: mainVideoFile.encoding_status
        });
      } catch (error) {
        console.error('❌ getVideoScreenData: Failed to fetch main video file:', {
          videoFileId: mediaDescription.main_video_file_id,
          error: error instanceof Error ? error.message : error,
          errorDetails: error
        });
        mainVideoFile = null;
      }
    } else {
      console.warn('⚠️ getVideoScreenData: No main_video_file_id found in media description');
    }
    
    let relatedEpisodes: MediaDescription[] = [];
    let program = null;
    let season = null;
    let actors: any[] = [];
    let directors: any[] = [];
    let producers: any[] = [];
    let authors: any[] = [];
    let audioLanguages: any[] = [];
    let subtitleLanguages: any[] = [];
    let originCountries: any[] = [];
    
    // If this media is part of a season, get other episodes and program info
    console.log('🔍 getVideoScreenData: Checking season data...', {
      mediaDescriptionId: mediaDescriptionId,
      hasSeasonId: !!mediaDescription.season_id,
      seasonId: mediaDescription.season_id,
      episodeNumber: mediaDescription.episode_number
    });

    if (mediaDescription.season_id) {
      console.log('🔍 getVideoScreenData: Fetching season and episodes...');
      
      // Get season info
      season = await seasonsApi.getById(mediaDescription.season_id);
      console.log('✅ getVideoScreenData: Season fetched:', season);
      
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

      console.log('✅ getVideoScreenData: Related episodes found:', {
        totalEpisodesInResponse: episodesResponse.data.length,
        filteredForSeason: relatedEpisodes.length,
        episodes: relatedEpisodes.map(ep => ({
          id: ep.id,
          episode_number: ep.episode_number,
          episode_title: ep.episode_title
        }))
      });
      
      // If season has a program, get program info
      if (season.program_id) {
        program = await programsApi.getById(season.program_id);
      }
    } else {
      console.log('⚠️ getVideoScreenData: No season_id found - navigation buttons will not appear');
    }

    // If no program found through season, check for direct program_id
    if (!program && mediaDescription.program_id) {
      try {
        program = await programsApi.getById(mediaDescription.program_id);
      } catch (error) {
        console.warn('Failed to fetch program by direct program_id:', error);
      }
    }
    
    // Get cast and crew information - prioritize API 1.13 relationship objects over legacy ID lists
    console.log('🔍 getVideoScreenData: Checking for cast and crew data...', {
      hasActorsRelation: !!mediaDescription.actors?.length,
      hasDirectorsRelation: !!mediaDescription.directors?.length,
      hasProducersRelation: !!mediaDescription.producers?.length,
      hasAuthorsRelation: !!mediaDescription.authors?.length,
      hasActorsIdList: !!mediaDescription.actors_id_list?.length,
      hasDirectorsIdList: !!mediaDescription.directors_id_list?.length,
      hasProductorsIdList: !!mediaDescription.productors_id_list?.length,
      hasAuthorsIdList: !!mediaDescription.authors_id_list?.length
    });

    // Get actors - prioritize relationship objects
    if (mediaDescription.actors?.length) {
      actors = mediaDescription.actors;
      console.log('✅ getVideoScreenData: Using actors from relationship objects:', actors.length);
    } else if (mediaDescription.actors_id_list?.length) {
      try {
        console.log('🔄 getVideoScreenData: Fetching actors from ID list...', mediaDescription.actors_id_list);
        actors = await Promise.all(
          mediaDescription.actors_id_list.map(id => personsApi.getById(id).catch(() => null))
        );
        actors = actors.filter(Boolean);
        console.log('✅ getVideoScreenData: Fetched actors from ID list:', actors.length);
      } catch (error) {
        console.warn('❌ Failed to fetch actors from ID list:', error);
        actors = [];
      }
    }

    // Get directors - prioritize relationship objects
    if (mediaDescription.directors?.length) {
      directors = mediaDescription.directors;
      console.log('✅ getVideoScreenData: Using directors from relationship objects:', directors.length);
    } else if (mediaDescription.directors_id_list?.length) {
      try {
        console.log('🔄 getVideoScreenData: Fetching directors from ID list...', mediaDescription.directors_id_list);
        directors = await Promise.all(
          mediaDescription.directors_id_list.map(id => personsApi.getById(id).catch(() => null))
        );
        directors = directors.filter(Boolean);
        console.log('✅ getVideoScreenData: Fetched directors from ID list:', directors.length);
      } catch (error) {
        console.warn('❌ Failed to fetch directors from ID list:', error);
        directors = [];
      }
    }

    // Get producers - prioritize relationship objects (note: API uses 'producers' but legacy uses 'productors_id_list')
    if (mediaDescription.producers?.length) {
      producers = mediaDescription.producers;
      console.log('✅ getVideoScreenData: Using producers from relationship objects:', producers.length);
    } else if (mediaDescription.productors_id_list?.length) {
      try {
        console.log('🔄 getVideoScreenData: Fetching producers from ID list...', mediaDescription.productors_id_list);
        producers = await Promise.all(
          mediaDescription.productors_id_list.map(id => personsApi.getById(id).catch(() => null))
        );
        producers = producers.filter(Boolean);
        console.log('✅ getVideoScreenData: Fetched producers from ID list:', producers.length);
      } catch (error) {
        console.warn('❌ Failed to fetch producers from ID list:', error);
        producers = [];
      }
    }

    // Get authors - prioritize relationship objects
    if (mediaDescription.authors?.length) {
      authors = mediaDescription.authors;
      console.log('✅ getVideoScreenData: Using authors from relationship objects:', authors.length);
    } else if (mediaDescription.authors_id_list?.length) {
      try {
        console.log('🔄 getVideoScreenData: Fetching authors from ID list...', mediaDescription.authors_id_list);
        authors = await Promise.all(
          mediaDescription.authors_id_list.map(id => personsApi.getById(id).catch(() => null))
        );
        authors = authors.filter(Boolean);
        console.log('✅ getVideoScreenData: Fetched authors from ID list:', authors.length);
      } catch (error) {
        console.warn('❌ Failed to fetch authors from ID list:', error);
        authors = [];
      }
    }
    
    // Get language information
    if (mediaDescription.original_languages_id?.length || mainVideoFile?.audio_languages_id_list?.length || mainVideoFile?.subtitle_languages_id_list?.length) {
      
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
    
    console.log('✅ getVideoScreenData: Final result summary:', {
      hasMediaDescription: !!mediaDescription,
      hasVideoFile: !!mainVideoFile,
      hasRelatedEpisodes: relatedEpisodes.length > 0,
      hasSeason: !!season,
      hasProgram: !!program,
      actorsCount: actors.length,
      directorsCount: directors.length,
      producersCount: producers.length
    });

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
      authors,
      audioLanguages,
      subtitleLanguages,
      originCountries
    };
  } catch (error) {
    console.error('❌ getVideoScreenData: Critical error occurred:', {
      mediaDescriptionId,
      error: error instanceof Error ? error.message : error,
      errorDetails: error
    });
    throw new Error(`Failed to fetch video screen data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Season screen detailed data function
export const getSeasonScreenData = async (seasonId: string) => {
  try {
    console.log('🔍 getSeasonScreenData: Starting for season ID:', seasonId);
    
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
      episode.productors_id_list?.forEach(id => producerIds.add(id));
      episode.origin_country_id_list?.forEach(id => countryIds.add(id));
    });
    
    // Fetch person and country data if any IDs exist
    if (actorIds.size || directorIds.size || producerIds.size) {
      
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
      episode.productors_id_list?.forEach(id => producerIds.add(id));
      episode.origin_country_id_list?.forEach(id => countryIds.add(id));
    });
    
    // Fetch person and country data if any IDs exist
    if (actorIds.size || directorIds.size || producerIds.size) {
      
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
      genres: firstEpisode?.media_categories_list || [],
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

// Program screen detailed data function by program ID
export const getProgramScreenDataByProgramId = async (programId: string) => {
  try {
    console.log('🔍 getProgramScreenDataByProgramId: Starting for program ID:', programId);
    
    console.log('🔍 getProgramScreenDataByProgramId: Fetching program data...');
    // Get program information directly
    const program = await programsApi.getById(programId);
    console.log('✅ getProgramScreenDataByProgramId: Program data received:', program);
    
    // Get all seasons for this program
    const seasonsResponse = await seasonsApi.getAll({ 
      program_id: programId, 
      skip: 0, 
      limit: 100 // Get all seasons
    });
    console.log('✅ getProgramScreenDataByProgramId: Seasons data received:', seasonsResponse);
    
    const allSeasons = seasonsResponse.data || [];
    
    // Get the first season as the current season (or the first available season)
    let currentSeason: Season | null = null;
    if (allSeasons.length > 0) {
      // Sort seasons by season_number and take the first one
      const sortedSeasons = [...allSeasons].sort((a, b) => a.season_number - b.season_number);
      currentSeason = sortedSeasons[0];
    }

    if (!currentSeason) {
      throw new Error('No seasons found for this program');
    }

    console.log('✅ getProgramScreenDataByProgramId: Current season selected:', currentSeason);

    // Get episodes from the first season to extract metadata
    const mediaDescriptionsResponse = await mediaApi.getMediaDescriptions({
      skip: 0,
      limit: 100,
      season_id: currentSeason.id
    });
    console.log('✅ getProgramScreenDataByProgramId: Media descriptions received:', mediaDescriptionsResponse);
    
    const episodes = mediaDescriptionsResponse.data || [];

    // Extract common metadata from episodes
    const firstEpisode = episodes[0];
    const synopsis = firstEpisode?.synopsis_text || null;
    const description = firstEpisode?.descriptive_summary_text || null;
    const genres = firstEpisode?.media_categories_list || [];
    const releaseDate = firstEpisode?.production_year || null;

    // Get program image from the first episode or season
    const programImageUrl = firstEpisode?.main_thumbnail_url || null;

    // Collect unique person IDs across all roles
    const actorIds = new Set<string>();
    const directorIds = new Set<string>();
    const producerIds = new Set<string>();
    const audioLanguageIds = new Set<string>();
    const subtitleLanguageIds = new Set<string>();
    const originCountryIds = new Set<string>();

    episodes.forEach(episode => {
      // Collect person IDs
      (episode.actors_id_list || []).forEach(id => actorIds.add(id));
      (episode.directors_id_list || []).forEach(id => directorIds.add(id));
      (episode.productors_id_list || []).forEach(id => producerIds.add(id));
      
      // Collect language and country IDs
      (episode.original_languages_id || []).forEach(id => audioLanguageIds.add(id));
      (episode.subtitle_languages_available || []).forEach(lang => subtitleLanguageIds.add(lang));
      (episode.origin_country_id_list || []).forEach(id => originCountryIds.add(id));
    });

    // Use static imports for person, language, and country APIs (resolved import warnings)

    // Fetch actors, directors, and producers
    const [actors, directors, producers] = await Promise.all([
      Promise.all(Array.from(actorIds).map(id => personsApi.getById(id).catch(() => null))),
      Promise.all(Array.from(directorIds).map(id => personsApi.getById(id).catch(() => null))),
      Promise.all(Array.from(producerIds).map(id => personsApi.getById(id).catch(() => null)))
    ]);

    // Fetch languages and countries
    const [audioLanguages, subtitleLanguages, originCountries] = await Promise.all([
      Promise.all(Array.from(audioLanguageIds).map(id => languagesApi.getById(id).catch(() => null))),
      Promise.all(Array.from(subtitleLanguageIds).map(id => languagesApi.getById(id).catch(() => null))),
      Promise.all(Array.from(originCountryIds).map(id => countriesApi.getById(id).catch(() => null)))
    ]);

    // Create enhanced seasons data with thumbnails and episode counts
    const seasonsWithThumbnails = await Promise.all(
      allSeasons.map(async (season) => {
        // Get episodes for this season to calculate episode count and get thumbnail
        const seasonEpisodes = await mediaApi.getMediaDescriptions({
          skip: 0,
          limit: 1, // Just need the first episode for thumbnail
          season_id: season.id
        });
        
        const episodeCount = seasonEpisodes.pagination?.total || 0;
        const thumbnailUrl = seasonEpisodes.data?.[0]?.main_thumbnail_url || null;
        
        return {
          ...season,
          episodeCount,
          thumbnailUrl
        };
      })
    );

    console.log('✅ getProgramScreenDataByProgramId: All data processed successfully');

    return {
      program,
      currentSeason,
      programImageUrl,
      synopsis,
      description,
      genres,
      audioLanguages: audioLanguages.filter(Boolean),
      subtitleLanguages: subtitleLanguages.filter(Boolean),
      releaseDate,
      originCountries: originCountries.filter(Boolean),
      actors: actors.filter(Boolean),
      directors: directors.filter(Boolean),
      producers: producers.filter(Boolean),
      allSeasons: seasonsWithThumbnails
    };
  } catch (error) {
    console.error('❌ getProgramScreenDataByProgramId: Error occurred:', error);
    console.error('❌ getProgramScreenDataByProgramId: Error details:', {
      message: error?.message,
      response: error?.response,
      status: error?.response?.status,
      data: error?.response?.data
    });
    throw new Error(`Failed to fetch program screen data by program ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Trailers and Excerpts data function
export const getTrailersAndExcerpts = async (mediaDescriptionId: string) => {
  try {
    console.log('🔍 getTrailersAndExcerpts: Starting for media ID:', mediaDescriptionId);
    
    // Get the main media description WITH relationships loaded
    const mediaDescription = await mediaApi.getMediaDescription(mediaDescriptionId);
    console.log('✅ getTrailersAndExcerpts: Media description received:', {
      id: mediaDescription.id,
      title: mediaDescription.episode_title,
      hasTrailers: !!(mediaDescription as any).trailers?.length,
      hasExcerpts: !!(mediaDescription as any).excerpts?.length,
      trailerCount: (mediaDescription as any).trailers?.length || 0,
      excerptCount: (mediaDescription as any).excerpts?.length || 0,
      rawTrailers: (mediaDescription as any).trailers,
      rawExcerpts: (mediaDescription as any).excerpts
    });
    
    // The API already returns trailers and excerpts as VideoFile objects in the relationships!
    const rawTrailers = (mediaDescription as any).trailers || [];
    const rawExcerpts = (mediaDescription as any).excerpts || [];
    
    // Return just the VideoFile objects - don't create fake MediaDescription objects
    // The VideoScreen will handle keeping the original description and only switching the video
    let trailers: { mediaDescription: MediaDescription, videoFile: VideoFile | null }[] = [];
    let excerpts: { mediaDescription: MediaDescription, videoFile: VideoFile | null }[] = [];
    
    // For trailers - keep original MediaDescription but use trailer VideoFile
    if (rawTrailers.length > 0) {
      console.log('🔍 getTrailersAndExcerpts: Processing trailers from relationships:', rawTrailers.length);
      trailers = rawTrailers.map((trailerVideoFile: VideoFile) => {
        return {
          mediaDescription: mediaDescription, // Keep original MediaDescription for display
          videoFile: trailerVideoFile // Use trailer VideoFile for playback
        };
      });
      console.log('✅ getTrailersAndExcerpts: Trailers processed:', trailers.length);
    }
    
    // For excerpts - keep original MediaDescription but use excerpt VideoFile
    if (rawExcerpts.length > 0) {
      console.log('🔍 getTrailersAndExcerpts: Processing excerpts from relationships:', rawExcerpts.length);
      excerpts = rawExcerpts.map((excerptVideoFile: VideoFile) => {
        return {
          mediaDescription: mediaDescription, // Keep original MediaDescription for display
          videoFile: excerptVideoFile // Use excerpt VideoFile for playback
        };
      });
      console.log('✅ getTrailersAndExcerpts: Excerpts processed:', excerpts.length);
    }
    
    console.log('✅ getTrailersAndExcerpts: Final result:', {
      trailersCount: trailers.length,
      excerptsCount: excerpts.length,
      totalExtraContent: trailers.length + excerpts.length
    });
    
    return {
      trailers,
      excerpts,
      hasTrailers: trailers.length > 0,
      hasExcerpts: excerpts.length > 0,
      hasExtraContent: trailers.length > 0 || excerpts.length > 0
    };
  } catch (error) {
    console.error('❌ getTrailersAndExcerpts: Critical error occurred:', {
      mediaDescriptionId,
      error: error instanceof Error ? error.message : error,
      errorDetails: error
    });
    throw new Error(`Failed to fetch trailers and excerpts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getMediaDescription = mediaApi.getMediaDescription;
export const getMediaDescriptions = mediaApi.getMediaDescriptions;
export const getVideoFilesByMediaDescription = (mediaId: string): Promise<{ data: VideoFile[] }> => {
  return mediaApi.getVideoFilesByMedia(mediaId).then(data => ({ data }));
};