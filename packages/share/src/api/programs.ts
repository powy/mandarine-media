import { apiClient } from './client';
import { Program, ProgramCreate, ProgramUpdate, ProgramsApiParams, PaginatedProgramsResponse, ProgramJSON, ProgramBulkRefreshResponse } from '../types';

export const programsApi = {
  getAll: async (params: ProgramsApiParams = {}): Promise<PaginatedProgramsResponse> => {
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

    const response = await apiClient.get(`/programs?${searchParams.toString()}`);
    return response.data as PaginatedProgramsResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/programs/${id}`);
    return response.data as Program;
  },

  create: async (program: ProgramCreate) => {
    const response = await apiClient.post('/programs', program);
    return response.data as Program;
  },

  update: async (id: string, program: ProgramUpdate) => {
    const response = await apiClient.put(`/programs/${id}`, program);
    return response.data as Program;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/programs/${id}`);
    return response.data as Program;
  },

  /**
   * Get program JSON cache
   * @param id - Program ID
   * @param refresh - Force refresh of cached JSON
   * @returns Program JSON data with nested seasons
   */
  getProgramJSON: async (id: string, refresh = false): Promise<ProgramJSON> => {
    const params = refresh ? { refresh: 'true' } : {};
    const response = await apiClient.get(`/programs/${id}/json`, { params });
    return response.data as ProgramJSON;
  },

  /**
   * Refresh program JSON cache
   * @param id - Program ID
   * @returns Updated program
   */
  refreshProgramJSON: async (id: string): Promise<Program> => {
    const response = await apiClient.post(`/programs/${id}/refresh-cache`);
    return response.data as Program;
  },

  /**
   * Refresh JSON cache for all programs
   * @returns Bulk refresh operation result
   */
  refreshAllProgramJSONs: async (): Promise<ProgramBulkRefreshResponse> => {
    const response = await apiClient.post('/programs/refresh-all-caches');
    return response.data as ProgramBulkRefreshResponse;
  },
};

export const getProgram = programsApi.getById;
export const getProgramJSON = programsApi.getProgramJSON;
export const refreshProgramJSON = programsApi.refreshProgramJSON;
export const refreshAllProgramJSONs = programsApi.refreshAllProgramJSONs;
