import { apiClient } from './client';
import type {
  ScreenContent,
  ScreenContentCreate,
  ScreenContentUpdate,
  ScreenContentListResponse,
  ScreenContentFilters,
  ScreenContentJSON,
  ReorderListsRequest,
} from '../types';

// Get all screen contents
export const getScreenContents = async (filters?: ScreenContentFilters): Promise<ScreenContentListResponse> => {
  const params = new URLSearchParams();
  
  if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
  if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
  if (filters?.screen_type) params.append('screen_type', filters.screen_type);
  
  const response = await apiClient.get(`/api/v1/screen-contents/?${params.toString()}`);
  return response.data;
};

// Get screen content by ID
export const getScreenContent = async (id: string): Promise<ScreenContent> => {
  const response = await apiClient.get(`/api/v1/screen-contents/${id}/`);
  return response.data;
};

// Create screen content (Manager/Admin only)
export const createScreenContent = async (data: ScreenContentCreate): Promise<ScreenContent> => {
  const response = await apiClient.post('/api/v1/screen-contents/', data);
  return response.data;
};

// Update screen content (Manager/Admin only)
export const updateScreenContent = async (id: string, data: ScreenContentUpdate): Promise<ScreenContent> => {
  const response = await apiClient.put(`/api/v1/screen-contents/${id}/`, data);
  return response.data;
};

// Delete screen content (Manager/Admin only)
export const deleteScreenContent = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/screen-contents/${id}/`);
};

// Get screen content JSON cache
export const getScreenContentJSON = async (id: string): Promise<ScreenContentJSON> => {
  const response = await apiClient.get(`/api/v1/screen-contents/${id}/json/`);
  return response.data;
};

// Reorder content lists in screen (Manager/Admin only)
export const reorderScreenContentLists = async (id: string, data: ReorderListsRequest): Promise<ScreenContent> => {
  const response = await apiClient.put(`/api/v1/screen-contents/${id}/reorder-lists/`, data);
  return response.data;
};

// Regenerate screen content JSON cache (Manager/Admin only)
export const regenerateScreenContentJSON = async (id: string): Promise<void> => {
  await apiClient.post(`/api/v1/screen-contents/${id}/regenerate-json/`);
};

// Get screen content by type
export const getScreenContentByType = async (screenType: string): Promise<ScreenContent[]> => {
  const response = await apiClient.get(`/api/v1/screen-contents/by-type/${screenType}/`);
  return response.data;
};