import { apiClient } from './client';
import { Program, ProgramCreate, ProgramUpdate, ProgramsApiParams, PaginatedProgramsResponse } from '../types';

export const programsApi = {
  getAll: async (params: ProgramsApiParams = {}): Promise<PaginatedProgramsResponse> => {
    const { skip = 0, limit = 20, q } = params;
    const searchParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (q) {
      searchParams.append('q', q);
    }
    
    const response = await apiClient.get(`/api/v1/programs?${searchParams.toString()}`);
    return response.data as PaginatedProgramsResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/v1/programs/${id}`);
    return response.data as Program;
  },

  create: async (program: ProgramCreate) => {
    const response = await apiClient.post('/api/v1/programs', program);
    return response.data as Program;
  },

  update: async (id: string, program: ProgramUpdate) => {
    const response = await apiClient.put(`/api/v1/programs/${id}`, program);
    return response.data as Program;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/programs/${id}`);
    return response.data as Program;
  },
};