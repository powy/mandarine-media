import { apiClient } from './client';
import { PublicPerson, PublicPersonCreate, PublicPersonUpdate, PersonsApiParams, PaginatedPersonsResponse } from '../types';

export const personsApi = {
  getAll: async (params: PersonsApiParams = {}): Promise<PaginatedPersonsResponse> => {
    const { skip = 0, limit = 20, profession, q } = params;
    const searchParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (profession) {
      searchParams.append('profession', profession);
    }
    
    if (q) {
      searchParams.append('search', q);
    }
    
    const response = await apiClient.get(`/persons?${searchParams.toString()}`);
    return response.data as PaginatedPersonsResponse;
  },

  // Keep legacy method for backward compatibility
  async getPublicPersons(filters?: PersonsApiParams): Promise<PaginatedPersonsResponse> {
    return this.getAll(filters);
  },

  getById: async (id: string): Promise<PublicPerson> => {
    const response = await apiClient.get(`/persons/${id}`);
    return response.data as PublicPerson;
  },

  create: async (data: PublicPersonCreate): Promise<PublicPerson> => {
    const response = await apiClient.post('/persons', data);
    return response.data as PublicPerson;
  },

  update: async (id: string, data: PublicPersonUpdate): Promise<PublicPerson> => {
    const response = await apiClient.put(`/persons/${id}`, data);
    return response.data as PublicPerson;
  },

  delete: async (id: string): Promise<PublicPerson> => {
    const response = await apiClient.delete(`/persons/${id}`);
    return response.data as PublicPerson;
  },

  // Keep legacy methods for backward compatibility
  async getPublicPerson(id: string): Promise<PublicPerson> {
    return this.getById(id);
  },

  async createPublicPerson(data: PublicPersonCreate): Promise<PublicPerson> {
    return this.create(data);
  },

  async updatePublicPerson(id: string, data: PublicPersonUpdate): Promise<PublicPerson> {
    return this.update(id, data);
  },

  async deletePublicPerson(id: string): Promise<PublicPerson> {
    return this.delete(id);
  },

  async searchPublicPersonsByName(name: string, skip: number = 0, limit: number = 20): Promise<PublicPerson[]> {
    const params = new URLSearchParams();
    params.append('name', name);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get<PublicPerson[]>(`/persons/search/by-name?${params}`);
    return response.data;
  },

  async getPublicPersonsByProfession(profession: string, skip: number = 0, limit: number = 20): Promise<PublicPerson[]> {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get<PublicPerson[]>(`/persons/profession/${encodeURIComponent(profession)}?${params}`);
    return response.data;
  },
};