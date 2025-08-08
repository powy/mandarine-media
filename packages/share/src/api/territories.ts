import { apiClient } from './client';
import { Territory, TerritoryCreate, TerritoryUpdate, TerritoriesApiParams, PaginatedTerritoriesResponse } from '../types';

export const territoriesApi = {
  getAll: async (params: TerritoriesApiParams = {}): Promise<PaginatedTerritoriesResponse> => {
    const { skip = 0, limit = 20, country_id, q } = params;
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (country_id) {
      queryParams.append('country_id', country_id);
    }
    
    if (q) {
      queryParams.append('q', q);
    }
    
    const response = await apiClient.get(`/api/v1/territories?${queryParams}`);
    return response.data as PaginatedTerritoriesResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/v1/territories/${id}`);
    return response.data as Territory;
  },

  create: async (territory: TerritoryCreate) => {
    const response = await apiClient.post('/api/v1/territories', territory);
    return response.data as Territory;
  },

  update: async (id: string, territory: TerritoryUpdate) => {
    const response = await apiClient.put(`/api/v1/territories/${id}`, territory);
    return response.data as Territory;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/territories/${id}`);
    return response.data as Territory;
  },
};