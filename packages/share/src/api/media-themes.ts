import {
  MediaTheme,
  MediaThemeCreate,
  MediaThemeUpdate,
  MediaThemeApiParams,
  PaginatedMediaThemesResponse
} from '../types';
import { apiClient } from './client';

export async function getMediaThemes(params?: MediaThemeApiParams): Promise<PaginatedMediaThemesResponse> {
  const normalizedParams = params ? { ...params } : undefined;

  if (normalizedParams?.order_dir) {
    normalizedParams.order_dir = normalizedParams.order_dir.toLowerCase() as MediaThemeApiParams['order_dir'];
  }

  const response = await apiClient.get<PaginatedMediaThemesResponse>('/media-themes', {
    params: normalizedParams,
  });

  return response.data;
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
