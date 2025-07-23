import { apiClient } from './client';
import { Country, CountryCreate, CountryUpdate } from '../types';

export const countriesApi = {
  getAll: async (params: { skip?: number; limit?: number } = {}) => {
    const { skip = 0, limit = 20 } = params;
    const response = await apiClient.get(`/countries?skip=${skip}&limit=${limit}`);
    return response.data as Country[];
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/countries/${id}`);
    return response.data as Country;
  },

  create: async (country: CountryCreate) => {
    const response = await apiClient.post('/countries', country);
    return response.data as Country;
  },

  update: async (id: string, country: CountryUpdate) => {
    const response = await apiClient.put(`/countries/${id}`, country);
    return response.data as Country;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/countries/${id}`);
    return response.data as Country;
  },
};