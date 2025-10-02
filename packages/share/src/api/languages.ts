import { apiClient } from './client';
import { Language, LanguageCreate, LanguageUpdate, LanguagesApiParams, PaginatedLanguagesResponse } from '../types';

export const languagesApi = {
  getAll: async (params: LanguagesApiParams = {}): Promise<PaginatedLanguagesResponse> => {
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

    const response = await apiClient.get(`/languages?${searchParams.toString()}`);
    return response.data as PaginatedLanguagesResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/languages/${id}`);
    return response.data as Language;
  },

  create: async (language: LanguageCreate) => {
    const response = await apiClient.post('/languages', language);
    return response.data as Language;
  },

  update: async (id: string, language: LanguageUpdate) => {
    const response = await apiClient.put(`/languages/${id}`, language);
    return response.data as Language;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/languages/${id}`);
    return response.data as Language;
  },
};
