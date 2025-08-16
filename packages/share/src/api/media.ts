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

    const response = await apiClient.get<MediaDescriptionListResponse>(`/api/v1/media-descriptions?${params}`);
    return response.data;
  },

  async getMediaDescription(id: string): Promise<MediaDescription> {
    const response = await apiClient.get<MediaDescription>(`/api/v1/media-descriptions/${id}`);
    return response.data;
  },

  async createMediaDescription(data: Partial<MediaDescription>): Promise<MediaDescription> {
    const response = await apiClient.post<MediaDescription>('/api/v1/media-descriptions', data);
    return response.data;
  },

  async updateMediaDescription(id: string, data: Partial<MediaDescription>): Promise<MediaDescription> {
    const response = await apiClient.put<MediaDescription>(`/api/v1/media-descriptions/${id}`, data);
    return response.data;
  },

  async deleteMediaDescription(id: string): Promise<MediaDescription> {
    const response = await apiClient.delete<MediaDescription>(`/api/v1/media-descriptions/${id}`);
    return response.data;
  },

  // Featured and trending content
  async getFeaturedMedia(skip = 0, limit = 20): Promise<MediaDescription[]> {
    const response = await apiClient.get<MediaDescription[]>(`/api/v1/media-descriptions/featured/list?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async getTrendingMedia(skip = 0, limit = 20): Promise<MediaDescription[]> {
    const response = await apiClient.get<MediaDescription[]>(`/api/v1/media-descriptions/trending/list?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // User interactions
  async likeMedia(id: string): Promise<MediaDescription> {
    const response = await apiClient.post<MediaDescription>(`/api/v1/media-descriptions/${id}/like`);
    return response.data;
  },

  async shareMedia(id: string): Promise<MediaDescription> {
    const response = await apiClient.post<MediaDescription>(`/api/v1/media-descriptions/${id}/share`);
    return response.data;
  },

  // Video File endpoints
  async getVideoFiles(filters?: VideoFileFilters): Promise<VideoFileListResponse> {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());

    const response = await apiClient.get<VideoFileListResponse>(`/api/v1/video-files?${params}`);
    return response.data;
  },

  async getVideoFile(id: string): Promise<VideoFile> {
    const response = await apiClient.get<VideoFile>(`/api/v1/video-files/${id}`);
    return response.data;
  },

  async createVideoFile(data: Partial<VideoFile>): Promise<VideoFile> {
    const response = await apiClient.post<VideoFile>('/api/v1/video-files', data);
    return response.data;
  },

  async updateVideoFile(id: string, data: Partial<VideoFile>): Promise<VideoFile> {
    const response = await apiClient.put<VideoFile>(`/api/v1/video-files/${id}`, data);
    return response.data;
  },

  async deleteVideoFile(id: string): Promise<VideoFile> {
    const response = await apiClient.delete<VideoFile>(`/api/v1/video-files/${id}`);
    return response.data;
  },

  // Video file management
  async getVideoFilesByMedia(mediaId: string): Promise<VideoFile[]> {
    const response = await apiClient.get<VideoFile[]>(`/api/v1/video-files/by-media/${mediaId}`);
    return response.data;
  },

  async getUnlinkedVideoFiles(skip = 0, limit = 20): Promise<VideoFile[]> {
    const response = await apiClient.get<VideoFile[]>(`/api/v1/video-files/unlinked/list?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async linkVideoToMedia(fileId: string, mediaId: string): Promise<VideoFile> {
    const response = await apiClient.post<VideoFile>(`/api/v1/video-files/${fileId}/link/${mediaId}`);
    return response.data;
  },

  async updateEncodingStatus(id: string, status: string, logs?: string): Promise<VideoFile> {
    const response = await apiClient.put<VideoFile>(`/api/v1/video-files/${id}/encoding-status`, {
      status,
      logs
    });
    return response.data;
  },

  // File upload (placeholder)
  async uploadVideoFile(file: File): Promise<{ message: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/v1/video-files/upload', formData, {
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
    const response = await apiClient.post('/api/v1/video-files/create-metadata', data);
    return response.data;
  },

  async createVideoFileWithExistingUrl(data: {
    file_name: string;
    external_url: string;
    media_description_id?: string;
  }): Promise<VideoFile> {
    const response = await apiClient.post<VideoFile>('/api/v1/video-files/create-with-existing-url', data);
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

    const response = await apiClient.post(`/api/v1/video-files/${fileId}/upload-file`, formData, {
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
    const response = await apiClient.post(`/api/v1/video-files/${fileId}/test`);
    return response.data;
  },

  // Bulk Media Description endpoints
  async createBulkMediaDescriptions(data: BulkMediaDescriptionRequest): Promise<BulkMediaDescriptionResponse> {
    const response = await apiClient.post<BulkMediaDescriptionResponse>('/api/v1/media-descriptions/bulk', data);
    return response.data;
  },

  async bulkCreateMediaDescriptions(data: MediaDescription[]): Promise<BulkMediaDescriptionResponse> {
    const response = await apiClient.post<BulkMediaDescriptionResponse>('/api/v1/media-descriptions/bulk-create', data);
    return response.data;
  },

  async bulkUpdateMediaDescriptions(data: Array<{id: string} & Partial<MediaDescription>>): Promise<BulkMediaDescriptionResponse> {
    const response = await apiClient.put<BulkMediaDescriptionResponse>('/api/v1/media-descriptions/bulk-update', data);
    return response.data;
  },

  // Description Reports endpoints
  async getDescriptionReports(skip = 0, limit = 20): Promise<DescriptionReportListResponse> {
    const response = await apiClient.get<DescriptionReportListResponse>(`/api/v1/description-reports?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async getDescriptionReport(id: string): Promise<DescriptionReport> {
    const response = await apiClient.get<DescriptionReport>(`/api/v1/description-reports/${id}`);
    return response.data;
  },

  async getDescriptionReportsByBatch(batchId: string): Promise<DescriptionReport[]> {
    const response = await apiClient.get<DescriptionReport[]>(`/api/v1/description-reports/batch/${batchId}`);
    return response.data;
  },

  async getDescriptionReportsByDescription(descriptionId: string): Promise<DescriptionReport[]> {
    const response = await apiClient.get<DescriptionReport[]>(`/api/v1/description-reports/description/${descriptionId}`);
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

export const getMediaDescription = mediaApi.getMediaDescription;
export const getMediaDescriptions = mediaApi.getMediaDescriptions;
export const getVideoFilesByMediaDescription = (mediaId: string): Promise<{ data: VideoFile[] }> => {
  return mediaApi.getVideoFilesByMedia(mediaId).then(data => ({ data }));
};