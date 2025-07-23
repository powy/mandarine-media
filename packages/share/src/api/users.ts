import { apiClient } from './client';
import { User } from '../types';

export interface UserCreate {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  full_name?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface UserListResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface UserFilters {
  skip?: number;
  limit?: number;
  role?: string;
  is_active?: boolean;
  search?: string;
}

export const usersApi = {
  async getUsers(filters?: UserFilters): Promise<UserListResponse> {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.role) params.append('role', filters.role);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get<UserListResponse>(`/api/v1/users?${params}`);
    return response.data;
  },

  async getUser(id: string): Promise<User> {
    const response = await apiClient.get<User>(`/api/v1/users/${id}`);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/v1/users/me');
    return response.data;
  },

  async createUser(data: UserCreate): Promise<User> {
    const response = await apiClient.post<User>('/api/v1/users', data);
    return response.data;
  },

  async updateUser(id: string, data: UserUpdate): Promise<User> {
    const response = await apiClient.put<User>(`/api/v1/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<User> {
    const response = await apiClient.delete<User>(`/api/v1/users/${id}`);
    return response.data;
  },

  async activateUser(id: string): Promise<User> {
    const response = await apiClient.patch<User>(`/api/v1/users/${id}/activate`);
    return response.data;
  },

  async deactivateUser(id: string): Promise<User> {
    const response = await apiClient.patch<User>(`/api/v1/users/${id}/deactivate`);
    return response.data;
  },
};