import { apiClient } from './client';
import { Picture, PictureCreate, PictureUpdate, PicturesApiParams, PaginatedPicturesResponse } from '../types';

export const picturesApi = {
  getAll: async (params: PicturesApiParams = {}): Promise<PaginatedPicturesResponse> => {
    const { skip = 0, limit = 20, q } = params;
    const searchParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (q) {
      searchParams.append('q', q);
    }
    
    const response = await apiClient.get(`/api/v1/pictures?${searchParams.toString()}`);
    return response.data as PaginatedPicturesResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/v1/pictures/${id}`);
    return response.data as Picture;
  },

  create: async (picture: PictureCreate) => {
    const response = await apiClient.post('/api/v1/pictures', picture);
    return response.data as Picture;
  },

  update: async (id: string, picture: PictureUpdate) => {
    const response = await apiClient.put(`/api/v1/pictures/${id}`, picture);
    return response.data as Picture;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/pictures/${id}`);
    return response.data as Picture;
  },
};