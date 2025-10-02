import { apiClient } from './client';
import { Country, CountryCreate, CountryUpdate, CountriesApiParams, PaginatedCountriesResponse } from '../types';

export const countriesApi = {
  getAll: async (params: CountriesApiParams = {}): Promise<PaginatedCountriesResponse> => {
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

    const response = await apiClient.get(`/countries?${searchParams.toString()}`);
    return response.data as PaginatedCountriesResponse;
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
