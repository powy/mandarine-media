import { 
  MediaTheme, 
  MediaThemeCreate, 
  MediaThemeUpdate, 
  MediaThemeApiParams,
  PaginatedMediaThemesResponse
} from '../types';
import { apiClient } from './client';

export async function getMediaThemes(params?: MediaThemeApiParams): Promise<PaginatedMediaThemesResponse> {
  const response = await apiClient.get<MediaTheme[]>('/media-themes/', { params });
  // Convert simple array response to paginated format for consistency
  return {
    data: response.data,
    pagination: {
      total: response.data.length,
      page: Math.floor((params?.skip || 0) / (params?.limit || 20)) + 1,
      per_page: params?.limit || 20,
      pages: Math.ceil(response.data.length / (params?.limit || 20))
    }
  };
}

export async function getMediaTheme(id: string): Promise<MediaTheme> {
  const response = await apiClient.get<MediaTheme>(`/media-themes/${id}`);
  return response.data;
}

export async function createMediaTheme(data: MediaThemeCreate): Promise<MediaTheme> {
  const response = await apiClient.post<MediaTheme>('/media-themes/', data);
  return response.data;
}

export async function updateMediaTheme(id: string, data: MediaThemeUpdate): Promise<MediaTheme> {
  const response = await apiClient.put<MediaTheme>(`/media-themes/${id}`, data);
  return response.data;
}

export async function deleteMediaTheme(id: string): Promise<MediaTheme> {
  const response = await apiClient.delete<MediaTheme>(`/media-themes/${id}`);
  return response.data;
}