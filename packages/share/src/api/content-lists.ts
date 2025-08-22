import { apiClient } from './client';
import type {
  ContentList,
  ContentListCreate,
  ContentListUpdate,
  ContentListListResponse,
  ContentListFilters,
  ContentListJSON,
  ReorderContentRequest,
} from '../types';

// Get all content lists
export const getContentLists = async (filters?: ContentListFilters): Promise<ContentListListResponse> => {
  const params = new URLSearchParams();
  
  if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
  if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
  if (filters?.thumbnail_format) params.append('thumbnail_format', filters.thumbnail_format);
  
  // v1.9: Updated to flat URL structure
  const response = await apiClient.get(`/content-lists?${params.toString()}`);
  return response.data;
};

// Get content list by ID
export const getContentList = async (id: string): Promise<ContentList> => {
  // v1.9: Updated to flat URL structure
  const response = await apiClient.get(`/content-lists/${id}`);
  return response.data;
};

// Create content list (Manager/Admin only)
export const createContentList = async (data: ContentListCreate): Promise<ContentList> => {
  // v1.9: Updated to flat URL structure
  const response = await apiClient.post('/content-lists', data);
  return response.data;
};

// Update content list (Manager/Admin only)
export const updateContentList = async (id: string, data: ContentListUpdate): Promise<ContentList> => {
  // v1.9: Updated to flat URL structure
  const response = await apiClient.put(`/content-lists/${id}`, data);
  return response.data;
};

// Delete content list (Manager/Admin only)
export const deleteContentList = async (id: string): Promise<void> => {
  // v1.9: Updated to flat URL structure
  await apiClient.delete(`/content-lists/${id}`);
};

// Get content list JSON cache
export const getContentListJSON = async (id: string): Promise<ContentListJSON> => {
  // v1.9: Updated to flat URL structure
  const response = await apiClient.get(`/content-lists/${id}/json`);
  return response.data;
};

// Reorder content in list (Manager/Admin only)
export const reorderContentList = async (id: string, data: ReorderContentRequest): Promise<ContentList> => {
  // v1.9: Updated to flat URL structure
  const response = await apiClient.put(`/content-lists/${id}/reorder`, data);
  return response.data;
};

// Regenerate content list JSON cache (Manager/Admin only)
export const regenerateContentListJSON = async (id: string): Promise<void> => {
  // v1.9: Updated to flat URL structure
  await apiClient.post(`/content-lists/${id}/regenerate-json`);
};