import { apiClient } from './client';
import { Picture, PictureCreate, PictureUpdate, PicturesApiParams, PaginatedPicturesResponse } from '../types';

export const picturesApi = {
  getAll: async (params: PicturesApiParams = {}): Promise<PaginatedPicturesResponse> => {
    const { skip = 0, limit = 20, q, order_by, order_dir } = params;
    const searchParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    if (q) {
      searchParams.append('q', q);
    }

    if (order_by) {
      searchParams.append('order_by', order_by);
    }

    if (order_dir) {
      searchParams.append('order_dir', order_dir.toLowerCase());
    }

    const response = await apiClient.get(`/pictures?${searchParams.toString()}`);
    return response.data as PaginatedPicturesResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/pictures/${id}`);
    return response.data as Picture;
  },

  create: async (picture: PictureCreate) => {
    const response = await apiClient.post('/pictures', picture);
    return response.data as Picture;
  },

  update: async (id: string, picture: PictureUpdate) => {
    const response = await apiClient.put(`/pictures/${id}`, picture);
    return response.data as Picture;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/pictures/${id}`);
    return response.data as Picture;
  },
};
