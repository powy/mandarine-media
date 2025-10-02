import { apiClient } from './client';
import { Program, ProgramCreate, ProgramUpdate, ProgramsApiParams, PaginatedProgramsResponse } from '../types';

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
};

export const getProgram = programsApi.getById;
