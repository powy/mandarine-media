import { apiClient } from './client';
import { Country, CountryCreate, CountryUpdate, CountriesApiParams, PaginatedCountriesResponse } from '../types';

export const countriesApi = {
  getAll: async (params: CountriesApiParams = {}): Promise<PaginatedCountriesResponse> => {
    const { skip = 0, limit = 20, q } = params;
    const searchParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (q) {
      searchParams.append('q', q);
    }
    
    const response = await apiClient.get(`/api/v1/countries?${searchParams.toString()}`);
    return response.data as PaginatedCountriesResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/v1/countries/${id}`);
    return response.data as Country;
  },

  create: async (country: CountryCreate) => {
    const response = await apiClient.post('/api/v1/countries', country);
    return response.data as Country;
  },

  update: async (id: string, country: CountryUpdate) => {
    const response = await apiClient.put(`/api/v1/countries/${id}`, country);
    return response.data as Country;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/countries/${id}`);
    return response.data as Country;
  },
};