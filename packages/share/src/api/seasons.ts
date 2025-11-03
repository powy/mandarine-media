import { apiClient } from './client';
import { Season, SeasonCreate, SeasonUpdate, SeasonsApiParams, PaginatedSeasonsResponse, SeasonJSON, SeasonBulkRefreshResponse } from '../types';

export const seasonsApi = {
  getAll: async (params: SeasonsApiParams = {}): Promise<PaginatedSeasonsResponse> => {
    const { skip = 0, limit = 20, program_id, q, order_by, order_dir } = params;
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

    if (order_by) {
      queryParams.append('order_by', order_by);
    }

    if (order_dir) {
      queryParams.append('order_dir', order_dir.toLowerCase());
    }

    const response = await apiClient.get(`/seasons?${queryParams}`);
    return response.data as PaginatedSeasonsResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/seasons/${id}`);
    return response.data as Season;
  },

  create: async (season: SeasonCreate) => {
    const response = await apiClient.post('/seasons', season);
    return response.data as Season;
  },

  update: async (id: string, season: SeasonUpdate) => {
    const response = await apiClient.put(`/seasons/${id}`, season);
    return response.data as Season;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/seasons/${id}`);
    return response.data as Season;
  },

  /**
   * Get season JSON cache
   * @param id - Season ID
   * @param refresh - Force refresh of cached JSON
   * @returns Season JSON data
   */
  getSeasonJSON: async (id: string, refresh = false): Promise<SeasonJSON> => {
    const params = refresh ? { refresh: 'true' } : {};
    const response = await apiClient.get(`/seasons/${id}/json`, { params });
    return response.data as SeasonJSON;
  },

  /**
   * Refresh season JSON cache
   * @param id - Season ID
   * @returns Updated season
   */
  refreshSeasonJSON: async (id: string): Promise<Season> => {
    const response = await apiClient.post(`/seasons/${id}/refresh-cache`);
    return response.data as Season;
  },

  /**
   * Refresh JSON cache for all seasons
   * @returns Bulk refresh operation result
   */
  refreshAllSeasonJSONs: async (): Promise<SeasonBulkRefreshResponse> => {
    const response = await apiClient.post('/seasons/refresh-all-caches');
    return response.data as SeasonBulkRefreshResponse;
  },
};

export const getSeason = seasonsApi.getById;
export const getSeasonsByProgram = (programId: string): Promise<{ data: Season[] }> => {
  return seasonsApi.getAll({ program_id: programId }).then(response => ({ data: response.data }));
};
export const getSeasonJSON = seasonsApi.getSeasonJSON;
export const refreshSeasonJSON = seasonsApi.refreshSeasonJSON;
export const refreshAllSeasonJSONs = seasonsApi.refreshAllSeasonJSONs;
