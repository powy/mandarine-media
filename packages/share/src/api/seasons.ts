import { apiClient } from './client';
import { Season, SeasonCreate, SeasonUpdate, SeasonsApiParams, PaginatedSeasonsResponse } from '../types';

export const seasonsApi = {
  getAll: async (params: SeasonsApiParams = {}): Promise<PaginatedSeasonsResponse> => {
    const { skip = 0, limit = 20, program_id, q } = params;
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (program_id) {
      queryParams.append('program_id', program_id);
    }
    
    if (q) {
      queryParams.append('q', q);
    }
    
    const response = await apiClient.get(`/api/v1/seasons?${queryParams}`);
    return response.data as PaginatedSeasonsResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/v1/seasons/${id}`);
    return response.data as Season;
  },

  create: async (season: SeasonCreate) => {
    const response = await apiClient.post('/api/v1/seasons', season);
    return response.data as Season;
  },

  update: async (id: string, season: SeasonUpdate) => {
    const response = await apiClient.put(`/api/v1/seasons/${id}`, season);
    return response.data as Season;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/seasons/${id}`);
    return response.data as Season;
  },
};

export const getSeason = seasonsApi.getById;
export const getSeasonsByProgram = (programId: string): Promise<{ data: Season[] }> => {
  return seasonsApi.getAll({ program_id: programId }).then(response => ({ data: response.data }));
};