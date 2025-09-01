import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock the share package auth API
vi.mock('share', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
    getCurrentUser: vi.fn(),
    getCachedUser: vi.fn(),
  },
}));

import { authProvider } from '../authProvider';
import { authApi } from 'share';

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    test('should login successfully with valid credentials', async () => {
      vi.mocked(authApi.login).mockResolvedValue({ success: true });

      await expect(
        authProvider.login({ username: 'admin@kyool.com', password: 'admin123' })
      ).resolves.toBeUndefined();

      expect(authApi.login).toHaveBeenCalledWith({
        email: 'admin@kyool.com',
        password: 'admin123'
      });
    });

    test('should reject login with invalid credentials', async () => {
      const mockError = {
        response: { status: 401 },
        message: 'Unauthorized'
      };
      vi.mocked(authApi.login).mockRejectedValue(mockError);

      await expect(
        authProvider.login({ username: 'invalid', password: 'wrong' })
      ).rejects.toThrow('Login failed');
    });

    test('should handle network errors', async () => {
      const mockError = {
        code: 'ERR_NETWORK',
        message: 'Network Error'
      };
      vi.mocked(authApi.login).mockRejectedValue(mockError);

      await expect(
        authProvider.login({ username: 'admin@kyool.com', password: 'admin123' })
      ).rejects.toThrow('Cannot connect to server. Please check if the backend is running.');
    });

    test('should handle timeout errors', async () => {
      const mockError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      };
      vi.mocked(authApi.login).mockRejectedValue(mockError);

      await expect(
        authProvider.login({ username: 'admin@kyool.com', password: 'admin123' })
      ).rejects.toThrow('Cannot connect to server. Please check if the backend is running.');
    });

    test('should handle server errors', async () => {
      const mockError = {
        response: { status: 500 },
        message: 'Internal Server Error'
      };
      vi.mocked(authApi.login).mockRejectedValue(mockError);

      await expect(
        authProvider.login({ username: 'admin@kyool.com', password: 'admin123' })
      ).rejects.toThrow('Login failed');
    });
  });

  describe('logout', () => {
    test('should logout successfully', async () => {
      vi.mocked(authApi.logout).mockResolvedValue({ success: true });

      await expect(authProvider.logout()).resolves.toBeUndefined();
      expect(authApi.logout).toHaveBeenCalled();
    });

    test('should handle logout errors gracefully', async () => {
      vi.mocked(authApi.logout).mockRejectedValue(new Error('Logout failed'));

      // Should still resolve even if logout API fails
      await expect(authProvider.logout()).resolves.toBeUndefined();
    });
  });

  describe('checkAuth', () => {
    test('should resolve when user is authenticated', async () => {
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(true);

      await expect(authProvider.checkAuth()).resolves.toBeUndefined();
      expect(authApi.isAuthenticated).toHaveBeenCalled();
    });

    test('should reject when user is not authenticated', async () => {
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(false);

      await expect(authProvider.checkAuth()).rejects.toThrow('Not authenticated');
    });

    test('should reject when authentication check fails', async () => {
      vi.mocked(authApi.isAuthenticated).mockRejectedValue(new Error('Network error'));

      await expect(authProvider.checkAuth()).rejects.toThrow('Authentication check failed');
    });
  });

  describe('checkError', () => {
    test('should reject on 401 errors', async () => {
      const error = { status: 401 };
      await expect(authProvider.checkError(error)).rejects.toThrow('Authentication failed');
    });

    test('should reject on 403 errors', async () => {
      const error = { response: { status: 403 } };
      await expect(authProvider.checkError(error)).rejects.toThrow('Authentication failed');
    });

    test('should resolve on other errors', async () => {
      const error = { status: 500 };
      await expect(authProvider.checkError(error)).resolves.toBeUndefined();
    });

    test('should resolve on non-auth errors', async () => {
      const error = { status: 404 };
      await expect(authProvider.checkError(error)).resolves.toBeUndefined();
    });
  });

  describe('getIdentity', () => {
    const mockUser = {
      id: 'user-123',
      full_name: 'John Doe',
      email: 'john@example.com',
      is_admin: true
    };

    test('should return user identity when authenticated', async () => {
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(true);
      vi.mocked(authApi.getCachedUser).mockResolvedValue(mockUser);

      const identity = await authProvider.getIdentity();

      expect(identity).toEqual({
        id: 'user-123',
        fullName: 'John Doe',
        avatar: undefined
      });
    });

    test('should fetch fresh user data when cache is empty', async () => {
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(true);
      vi.mocked(authApi.getCachedUser).mockResolvedValue(null);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const identity = await authProvider.getIdentity();

      expect(authApi.getCurrentUser).toHaveBeenCalled();
      expect(identity).toEqual({
        id: 'user-123',
        fullName: 'John Doe',
        avatar: undefined
      });
    });

    test('should return fallback identity when user fetch fails', async () => {
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(true);
      vi.mocked(authApi.getCachedUser).mockResolvedValue(null);
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('User fetch failed'));

      const identity = await authProvider.getIdentity();

      expect(identity).toEqual({
        id: 'current-user',
        fullName: 'Admin User',
        avatar: undefined
      });
    });

    test('should reject when not authenticated', async () => {
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(false);

      await expect(authProvider.getIdentity()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getPermissions', () => {
    test('should return admin permissions for admin user', async () => {
      const adminUser = { id: 'admin-123', is_admin: true, full_name: 'Admin' };
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(true);
      vi.mocked(authApi.getCachedUser).mockResolvedValue(adminUser);

      const permissions = await authProvider.getPermissions();

      expect(permissions).toEqual(['admin']);
    });

    test('should return user permissions for non-admin user', async () => {
      const regularUser = { id: 'user-123', is_admin: false, full_name: 'User' };
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(true);
      vi.mocked(authApi.getCachedUser).mockResolvedValue(regularUser);

      const permissions = await authProvider.getPermissions();

      expect(permissions).toEqual(['user']);
    });

    test('should return default user permissions when user fetch fails', async () => {
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(true);
      vi.mocked(authApi.getCachedUser).mockResolvedValue(null);
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('User fetch failed'));

      const permissions = await authProvider.getPermissions();

      expect(permissions).toEqual(['user']);
    });

    test('should reject when not authenticated', async () => {
      vi.mocked(authApi.isAuthenticated).mockResolvedValue(false);

      await expect(authProvider.getPermissions()).rejects.toThrow('Not authenticated');
    });
  });
});