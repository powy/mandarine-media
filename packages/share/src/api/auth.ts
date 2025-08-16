import { apiClient } from './client';
import { AuthTokens, LoginRequest, RegisterRequest, User } from '../types';
import { authTokenStorage } from '../utils/storage';

// Extract getCurrentUser as a separate function to avoid 'this' context issues
const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/api/v1/users/me');
  return response.data;
};

// Extract isTokenExpired as a separate function to avoid 'this' context issues
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // Assume expired if we can't parse
  }
};

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

    // Store tokens using enhanced storage system
    try {
      await authTokenStorage.setAccessToken(response.data.access_token);
      
      // Store refresh token if available
      if (response.data.refresh_token) {
        await authTokenStorage.setRefreshToken(response.data.refresh_token);
      }

      // Also get and store user data
      try {
        const user = await getCurrentUser();
        await authTokenStorage.setUser(JSON.stringify(user));
      } catch (userError) {
        console.error('Failed to fetch user data after login:', userError);
        // Don't let user data fetch failure break the entire login process
      }
    } catch (error) {
      console.warn('Failed to store authentication data:', error);
      // Don't throw error for storage failures - login was successful
      // The app can still work without stored tokens (though user will need to login again)
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
    return getCurrentUser();
  },

  // Logout - clear token
  async logout(): Promise<void> {
    // Clear all authentication data first to ensure we're logged out locally
    // even if the server call fails
    try {
      await authTokenStorage.clearAll();
    } catch (clearError) {
      console.error('Failed to clear authentication data:', clearError);
      // This is a critical error - we must ensure tokens are cleared
      throw new Error(`Failed to clear local authentication data: ${clearError instanceof Error ? clearError.message : 'Unknown error'}`);
    }

    // Try to notify server about logout (optional - don't fail if server is unavailable)
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch (serverError) {
      // This is expected behavior - not all servers have logout endpoints
      // The important thing is that we've cleared local tokens above
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await authTokenStorage.getAccessToken();
      
      if (!token) {
        return false;
      }
      
      // Additional validation: check if token is expired
      if (isTokenExpired(token)) {
        try {
          await authTokenStorage.clearAll();
        } catch (clearError) {
          console.warn('Failed to clear expired token:', clearError);
        }
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Error checking authentication:', error);
      return false;
    }
  },

  // Get stored token
  async getToken(): Promise<string | null> {
    try {
      return await authTokenStorage.getAccessToken();
    } catch (error) {
      console.warn('Error getting token:', error);
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

  // Get cached user data
  async getCachedUser(): Promise<User | null> {
    try {
      const userData = await authTokenStorage.getUser();
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.warn('Error getting cached user:', error);
      return null;
    }
  },

  // Refresh access token using refresh token
  async refreshToken(): Promise<AuthTokens> {
    try {
      const refreshToken = await authTokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<AuthTokens>('/api/v1/auth/refresh', {
        refresh_token: refreshToken,
      });

      // Store new tokens
      await authTokenStorage.setAccessToken(response.data.access_token);
      
      if (response.data.refresh_token) {
        await authTokenStorage.setRefreshToken(response.data.refresh_token);
      }

      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens on refresh failure
      await authTokenStorage.clearAll();
      throw new Error('Token refresh failed');
    }
  },

  // Check if token is expired (basic JWT check)
  isTokenExpired(token: string): boolean {
    return isTokenExpired(token);
  },
};