import { apiClient } from './client';
import { Language, LanguageCreate, LanguageUpdate, LanguagesApiParams, PaginatedLanguagesResponse } from '../types';

export const languagesApi = {
  getAll: async (params: LanguagesApiParams = {}): Promise<PaginatedLanguagesResponse> => {
    const { skip = 0, limit = 20, q } = params;
    const searchParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (q) {
      searchParams.append('q', q);
    }
    
    const response = await apiClient.get(`/api/v1/languages?${searchParams.toString()}`);
    return response.data as PaginatedLanguagesResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/v1/languages/${id}`);
    return response.data as Language;
  },

  create: async (language: LanguageCreate) => {
    const response = await apiClient.post('/api/v1/languages', language);
    return response.data as Language;
  },

  update: async (id: string, language: LanguageUpdate) => {
    const response = await apiClient.put(`/api/v1/languages/${id}`, language);
    return response.data as Language;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/languages/${id}`);
    return response.data as Language;
  },
};