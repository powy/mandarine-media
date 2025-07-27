import { apiClient } from './client';
import { Picture, PictureCreate, PictureUpdate } from '../types';

export const picturesApi = {
  getAll: async (params: { skip?: number; limit?: number } = {}) => {
    const { skip = 0, limit = 20 } = params;
    const response = await apiClient.get(`/api/v1/pictures?skip=${skip}&limit=${limit}`);
    return response.data as Picture[];
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