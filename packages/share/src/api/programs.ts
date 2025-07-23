import { apiClient } from './client';
import { Program, ProgramCreate, ProgramUpdate } from '../types';

export const programsApi = {
  getAll: async (params: { skip?: number; limit?: number } = {}) => {
    const { skip = 0, limit = 20 } = params;
    const response = await apiClient.get(`/programs?skip=${skip}&limit=${limit}`);
    return response.data as Program[];
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