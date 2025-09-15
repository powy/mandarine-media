import { apiClient } from './client';
import { User, UsersApiParams, PaginatedUsersResponse } from '../types';

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

// Keep legacy interface for backward compatibility
export interface UserListResponse extends PaginatedUsersResponse {}

// Keep legacy interface for backward compatibility  
export interface UserFilters extends UsersApiParams {
  role?: string;
  search?: string;
}

export const usersApi = {
  getAll: async (params: UsersApiParams = {}): Promise<PaginatedUsersResponse> => {
    const { skip = 0, limit = 20, is_active, is_admin, q } = params;
    const searchParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (is_active !== undefined) {
      searchParams.append('is_active', is_active.toString());
    }
    
    if (is_admin !== undefined) {
      searchParams.append('is_admin', is_admin.toString());
    }
    
    if (q) {
      searchParams.append('q', q);
    }
    
    const response = await apiClient.get(`/users?${searchParams.toString()}`);
    return response.data as PaginatedUsersResponse;
  },

  // Keep legacy method for backward compatibility
  async getUsers(filters?: UserFilters): Promise<UserListResponse> {
    const params = new URLSearchParams();
    
    // Only add parameters if they are explicitly provided (not undefined/empty)
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.role && filters.role !== '') params.append('role', filters.role);
    if (filters?.search && filters.search !== '') params.append('search', filters.search);

    const response = await apiClient.get(`/users?${params}`);
    return response.data as UserListResponse;
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data as User;
  },

  create: async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post('/users', data);
    return response.data as User;
  },

  update: async (id: string, data: UserUpdate): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data as User;
  },

  delete: async (id: string): Promise<User> => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data as User;
  },

  // Legacy methods for backward compatibility
  async getUser(id: string): Promise<User> {
    return this.getById(id);
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  async createUser(data: UserCreate): Promise<User> {
    return this.create(data);
  },

  async updateUser(id: string, data: UserUpdate): Promise<User> {
    return this.update(id, data);
  },

  async deleteUser(id: string): Promise<User> {
    return this.delete(id);
  },

  async activateUser(id: string): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${id}/activate`);
    return response.data;
  },

  async deactivateUser(id: string): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${id}/deactivate`);
    return response.data;
  },

  // API 1.13 Subscription plan management
  async addSubscriptionPlan(userId: string, planId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/users/${userId}/subscription_plans/${planId}`);
    return response.data;
  },

  async removeSubscriptionPlan(userId: string, planId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/users/${userId}/subscription_plans/${planId}`);
    return response.data;
  },

  async updateAllSubscriptionPlans(userId: string, planIds: string[]): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put(`/users/${userId}/subscription_plans`, planIds);
    return response.data;
  },
};