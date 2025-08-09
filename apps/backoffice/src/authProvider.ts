import { AuthProvider } from 'react-admin';
import { authApi } from 'share';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      await authApi.login({ email: username, password });
      // Auth tokens are now automatically stored by the enhanced auth system
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new Error('Invalid credentials'));
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
    const isAuthenticated = await authApi.isAuthenticated();
    if (!isAuthenticated) {
      return Promise.reject(new Error('Not authenticated'));
    }

    return Promise.resolve();
  },

  checkError: async (error: any) => {
    const status = error?.status || error?.response?.status;
    
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