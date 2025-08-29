import { AuthProvider } from 'react-admin';
import { authApi } from 'share';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      await authApi.login({ email: username, password });
      // Auth tokens are now automatically stored by the enhanced auth system
      return Promise.resolve();
    } catch (error) {
      // Better error handling with proper type checking
      if (error && typeof error === 'object' && 'code' in error) {
        const axiosError = error as { code?: string; response?: { status?: number }; message?: string };
        if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
          return Promise.reject(new Error('Cannot connect to server. Please check if the backend is running.'));
        }
        if (axiosError.response?.status === 401) {
          return Promise.reject(new Error('Invalid credentials'));
        }
        return Promise.reject(new Error(axiosError.message || 'Login failed'));
      }
      // Handle unknown error types
      return Promise.reject(new Error('Login failed'));
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
      // Tokens are automatically cleared by the enhanced auth system
      return Promise.resolve();
    } catch (error) {
      // Even if logout fails, return success for React Admin
      return Promise.resolve();
    }
  },

  checkAuth: async () => {
    try {
      const isAuthenticated = await authApi.isAuthenticated();
      if (!isAuthenticated) {
        return Promise.reject(new Error('Not authenticated'));
      }
      return Promise.resolve();
    } catch (error) {
      // If there's a network error or timeout, reject to force login
      console.error('Auth check failed:', error);
      return Promise.reject(new Error('Authentication check failed'));
    }
  },

  checkError: async (error: unknown) => {
    const status = (error as { status?: number; response?: { status?: number } })?.status || 
                   (error as { status?: number; response?: { status?: number } })?.response?.status;
    
    if (status === 401 || status === 403) {
      // Auth system will automatically handle token clearing via interceptors
      return Promise.reject(new Error('Authentication failed'));
    }
    
    return Promise.resolve();
  },

  getIdentity: async () => {
    try {
      const isAuthenticated = await authApi.isAuthenticated();
      if (!isAuthenticated) {
        return Promise.reject(new Error('Not authenticated'));
      }

      // Try to get current user info from API or cache
      try {
        let user = await authApi.getCachedUser();
        if (!user) {
          user = await authApi.getCurrentUser();
        }
        
        return Promise.resolve({
          id: user.id,
          fullName: user.full_name,
          avatar: undefined,
        });
      } catch (userError) {
        // If we can't get user info, return a basic identity
        return Promise.resolve({
          id: 'current-user',
          fullName: 'Admin User',
          avatar: undefined,
        });
      }
    } catch (error) {
      return Promise.reject(error);
    }
  },

  getPermissions: async () => {
    try {
      const isAuthenticated = await authApi.isAuthenticated();
      if (!isAuthenticated) {
        return Promise.reject(new Error('Not authenticated'));
      }

      // Try to get user permissions from cached or fresh user data
      try {
        let user = await authApi.getCachedUser();
        if (!user) {
          user = await authApi.getCurrentUser();
        }
        
        // Return permissions based on user's admin status
        return Promise.resolve(user.is_admin ? ['admin'] : ['user']);
      } catch (userError) {
        // If we can't get user info, assume basic user permissions
        return Promise.resolve(['user']);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  },
};