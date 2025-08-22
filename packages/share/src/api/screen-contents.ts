import { apiClient } from './client';
import type {
  ScreenDescription,
  ScreenDescriptionCreate,
  ScreenDescriptionUpdate,
  ScreenDescriptionListResponse,
  ScreenDescriptionFilters,
  ScreenDescriptionJSON,
  // Legacy aliases for backward compatibility
  ScreenContent,
  ScreenContentCreate,
  ScreenContentUpdate,
  ScreenContentListResponse,
  ScreenContentFilters,
  ScreenContentJSON,
  ReorderListsRequest,
} from '../types';

// v1.9: Updated to use screen-descriptions endpoints
export const getScreenDescriptions = async (filters?: ScreenDescriptionFilters): Promise<ScreenDescriptionListResponse> => {
  const params = new URLSearchParams();
  
  if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
  if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
  if (filters?.screen_type) params.append('screen_type', filters.screen_type);
  
  const response = await apiClient.get(`/screen-descriptions?${params.toString()}`);
  return response.data;
};

// Legacy function for backward compatibility
export const getScreenContents = async (filters?: ScreenContentFilters): Promise<ScreenContentListResponse> => {
  return getScreenDescriptions(filters);
};

// v1.9: Updated to use screen-descriptions endpoints
export const getScreenDescription = async (id: string): Promise<ScreenDescription> => {
  const response = await apiClient.get(`/screen-descriptions/${id}`);
  return response.data;
};

// Legacy function for backward compatibility
export const getScreenContent = async (id: string): Promise<ScreenContent> => {
  return getScreenDescription(id);
};

// v1.9: Updated to use screen-descriptions endpoints
export const createScreenDescription = async (data: ScreenDescriptionCreate): Promise<ScreenDescription> => {
  const response = await apiClient.post('/screen-descriptions', data);
  return response.data;
};

// Legacy function for backward compatibility
export const createScreenContent = async (data: ScreenContentCreate): Promise<ScreenContent> => {
  return createScreenDescription(data);
};

// v1.9: Updated to use screen-descriptions endpoints
export const updateScreenDescription = async (id: string, data: ScreenDescriptionUpdate): Promise<ScreenDescription> => {
  const response = await apiClient.put(`/screen-descriptions/${id}`, data);
  return response.data;
};

// Legacy function for backward compatibility
export const updateScreenContent = async (id: string, data: ScreenContentUpdate): Promise<ScreenContent> => {
  return updateScreenDescription(id, data);
};

// v1.9: Updated to use screen-descriptions endpoints
export const deleteScreenDescription = async (id: string): Promise<void> => {
  await apiClient.delete(`/screen-descriptions/${id}`);
};

// Legacy function for backward compatibility
export const deleteScreenContent = async (id: string): Promise<void> => {
  return deleteScreenDescription(id);
};

// v1.9: Updated to use screen-descriptions endpoints
export const getScreenDescriptionJSON = async (id: string): Promise<ScreenDescriptionJSON> => {
  const response = await apiClient.get(`/screen-descriptions/${id}/json`);
  return response.data;
};

// Legacy function for backward compatibility
export const getScreenContentJSON = async (id: string): Promise<ScreenContentJSON> => {
  return getScreenDescriptionJSON(id);
};

// v1.9: Updated to use screen-descriptions endpoints
export const reorderScreenDescriptionLists = async (id: string, data: ReorderListsRequest): Promise<ScreenDescription> => {
  const response = await apiClient.put(`/screen-descriptions/${id}/reorder-lists`, data);
  return response.data;
};

// Legacy function for backward compatibility
export const reorderScreenContentLists = async (id: string, data: ReorderListsRequest): Promise<ScreenContent> => {
  return reorderScreenDescriptionLists(id, data);
};

// v1.9: Updated to use screen-descriptions endpoints
export const regenerateScreenDescriptionJSON = async (id: string): Promise<void> => {
  await apiClient.post(`/screen-descriptions/${id}/regenerate-json`);
};

// Legacy function for backward compatibility
export const regenerateScreenContentJSON = async (id: string): Promise<void> => {
  return regenerateScreenDescriptionJSON(id);
};

// v1.9: Updated to use screen-descriptions endpoints
export const getScreenDescriptionByType = async (screenType: string): Promise<ScreenDescription> => {
  const response = await apiClient.get(`/screen-descriptions/by-type/${screenType}`);
  return response.data;
};

// Legacy function for backward compatibility
export const getScreenContentByType = async (screenType: string): Promise<ScreenContent[]> => {
  // Note: v1.9 returns single item, not array
  const result = await getScreenDescriptionByType(screenType);
  return [result];
};