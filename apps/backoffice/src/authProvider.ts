import { AuthProvider } from 'react-admin';
import { authApi } from 'share';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const tokens = await authApi.login({ email: username, password });
      localStorage.setItem('access_token', tokens.access_token);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new Error('Invalid credentials'));
    }
  },

  logout: async () => {
    localStorage.removeItem('access_token');
    return Promise.resolve();
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return Promise.reject(new Error('Not authenticated'));
    }

    // TODO: Add token expiration check here
    return Promise.resolve();
  },

  checkError: async (error: any) => {
    const status = error?.status || error?.response?.status;
    
    if (status === 401 || status === 403) {
      localStorage.removeItem('access_token');
      return Promise.reject(new Error('Authentication failed'));
    }
    
    return Promise.resolve();
  },

  getIdentity: async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return Promise.reject(new Error('Not authenticated'));
      }

      // TODO: Decode JWT token to get user info, or make API call to get current user
      // For now, return a placeholder identity
      return Promise.resolve({
        id: 'current-user',
        fullName: 'Admin User',
        avatar: undefined,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },

  getPermissions: async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return Promise.reject(new Error('Not authenticated'));
      }

      // TODO: Get actual user permissions from API or JWT token
      // For now, assume admin permissions
      return Promise.resolve(['admin']);
    } catch (error) {
      return Promise.reject(error);
    }
  },
};