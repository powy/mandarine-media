import { apiClient } from './client';
import { AudienceCategory, AudienceCategoryCreate, AudienceCategoryUpdate, AudienceCategoriesApiParams, PaginatedAudienceCategoriesResponse } from '../types';

export const audienceCategoriesApi = {
  getAll: async (params: AudienceCategoriesApiParams = {}): Promise<PaginatedAudienceCategoriesResponse> => {
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

    const response = await apiClient.get(`/audience-categories?${searchParams.toString()}`);
    return response.data as PaginatedAudienceCategoriesResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/audience-categories/${id}`);
    return response.data as AudienceCategory;
  },

  create: async (audienceCategory: AudienceCategoryCreate) => {
    const response = await apiClient.post('/audience-categories', audienceCategory);
    return response.data as AudienceCategory;
  },

  update: async (id: string, audienceCategory: AudienceCategoryUpdate) => {
    const response = await apiClient.put(`/audience-categories/${id}`, audienceCategory);
    return response.data as AudienceCategory;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/audience-categories/${id}`);
    return response.data as AudienceCategory;
  },
};
