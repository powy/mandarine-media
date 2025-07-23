import { apiClient } from './client';
import { Language, LanguageCreate, LanguageUpdate } from '../types';

export const languagesApi = {
  getAll: async (params: { skip?: number; limit?: number } = {}) => {
    const { skip = 0, limit = 20 } = params;
    const response = await apiClient.get(`/languages?skip=${skip}&limit=${limit}`);
    return response.data as Language[];
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