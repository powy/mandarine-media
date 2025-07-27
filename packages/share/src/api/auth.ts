import { apiClient } from './client';
import { AuthTokens, LoginRequest, RegisterRequest, User } from '../types';

export const authApi = {
  // Login with email/password
  async login(credentials: LoginRequest): Promise<AuthTokens> {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await apiClient.post<AuthTokens>('/api/v1/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Store token in localStorage directly
    try {
      localStorage.setItem('access_token', response.data.access_token);
    } catch (error) {
      // Handle localStorage errors gracefully
      console.warn('Failed to store token in localStorage:', error);
    }
    
    return response.data;
  },

  // Register new user (admin only)
  async register(userData: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>('/api/v1/users/', userData);
    return response.data;
  },

  // Get current user info
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/v1/users/me');
    return response.data;
  },

  // Logout - clear token
  async logout(): Promise<void> {
    try {
      localStorage.removeItem('access_token');
    } catch (error) {
      // Handle localStorage errors gracefully
      console.warn('Failed to remove token from localStorage:', error);
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = localStorage.getItem('access_token');
      return !!token;
    } catch (error) {
      return false;
    }
  },

  // Get stored token
  async getToken(): Promise<string | null> {
    try {
      return localStorage.getItem('access_token');
    } catch (error) {
      return null;
    }
  },

  // Update user profile
  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(`/api/v1/users/${userId}`, userData);
    return response.data;
  },

  // Get user by ID (admin only)
  async getUserById(userId: string): Promise<User> {
    const response = await apiClient.get<User>(`/api/v1/users/${userId}`);
    return response.data;
  },
};