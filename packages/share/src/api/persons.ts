import { apiClient } from './client';
import { PublicPerson, PublicPersonCreate, PublicPersonUpdate } from '../types';

export interface PublicPersonListResponse {
  data: PublicPerson[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface PublicPersonFilters {
  skip?: number;
  limit?: number;
  profession?: string;  // Still supported via profession_list
  search?: string;
}

export const personsApi = {
  async getPublicPersons(filters?: PublicPersonFilters): Promise<PublicPersonListResponse> {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.profession) params.append('profession', filters.profession);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get<PublicPersonListResponse>(`/api/v1/persons?${params}`);
    return response.data;
  },

  async getPublicPerson(id: string): Promise<PublicPerson> {
    const response = await apiClient.get<PublicPerson>(`/api/v1/persons/${id}`);
    return response.data;
  },

  async createPublicPerson(data: PublicPersonCreate): Promise<PublicPerson> {
    const response = await apiClient.post<PublicPerson>('/api/v1/persons', data);
    return response.data;
  },

  async updatePublicPerson(id: string, data: PublicPersonUpdate): Promise<PublicPerson> {
    const response = await apiClient.put<PublicPerson>(`/api/v1/persons/${id}`, data);
    return response.data;
  },

  async deletePublicPerson(id: string): Promise<PublicPerson> {
    const response = await apiClient.delete<PublicPerson>(`/api/v1/persons/${id}`);
    return response.data;
  },

  async searchPublicPersonsByName(name: string, skip: number = 0, limit: number = 20): Promise<PublicPerson[]> {
    const params = new URLSearchParams();
    params.append('name', name);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get<PublicPerson[]>(`/api/v1/persons/search/by-name?${params}`);
    return response.data;
  },

  async getPublicPersonsByProfession(profession: string, skip: number = 0, limit: number = 20): Promise<PublicPerson[]> {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get<PublicPerson[]>(`/api/v1/persons/profession/${encodeURIComponent(profession)}?${params}`);
    return response.data;
  },
};