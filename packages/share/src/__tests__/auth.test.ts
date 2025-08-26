import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import type { User, AuthTokens } from '../types';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

const mockApiClient = apiClient as any;

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockUser: User = {
    id: 1,
    email: 'user@example.com',
    full_name: 'Test User',
    is_active: true,
    is_admin: false,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  };

  const mockAuthTokens: AuthTokens = {
    access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
    token_type: 'bearer',
    expires_in: 86400,
  };

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockAuthTokens });
      mockApiClient.get.mockResolvedValue({ data: mockUser });

      const credentials = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = await authApi.login(credentials);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData was created correctly
      const formDataCall = mockApiClient.post.mock.calls[0][1];
      expect(formDataCall).toBeInstanceOf(FormData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', mockAuthTokens.access_token);
      expect(result).toEqual(mockAuthTokens);
    });

    it('should handle login failure with invalid credentials', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid email or password',
            },
          },
        },
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      await expect(authApi.login({ email: 'invalid@example.com', password: 'wrongpassword' })).rejects.toEqual(errorResponse);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      const networkError = new Error('Network error');
      mockApiClient.post.mockRejectedValue(networkError);

      await expect(authApi.login({ email: 'user@example.com', password: 'password123' })).rejects.toThrow('Network error');
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockUser });

      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User',
        is_admin: false,
      };

      const result = await authApi.register(userData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/users/', userData);
      expect(result).toEqual(mockUser);
    });

    it('should handle registration failure with duplicate email', async () => {
      const errorResponse = {
        response: {
          status: 409,
          data: {
            error: {
              code: 'CONFLICT',
              message: 'Email already exists',
            },
          },
        },
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        full_name: 'Duplicate User',
        is_admin: false,
      };

      await expect(authApi.register(userData)).rejects.toEqual(errorResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockUser });

      const result = await authApi.getCurrentUser();

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthorized access', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(authApi.getCurrentUser()).rejects.toEqual(errorResponse);
    });
  });

  describe('logout', () => {
    it('should logout and clear stored token', async () => {
      await authApi.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when valid token exists', async () => {
      // Create a valid-looking JWT token that won't be expired
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const mockPayload = JSON.stringify({ exp: futureTime });
      const mockToken = `header.${btoa(mockPayload)}.signature`;
      
      localStorageMock.getItem.mockReturnValue(mockToken);

      const result = await authApi.isAuthenticated();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('access_token');
      expect(result).toBe(true);
    });

    it('should return false when no token exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await authApi.isAuthenticated();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('access_token');
      expect(result).toBe(false);
    });

    it('should return false when token is empty string', async () => {
      localStorageMock.getItem.mockReturnValue('');

      const result = await authApi.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return stored token', async () => {
      const token = 'stored-token';
      localStorageMock.getItem.mockReturnValue(token);

      const result = await authApi.getToken();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('access_token');
      expect(result).toBe(token);
    });

    it('should return null when no token stored', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await authApi.getToken();

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, full_name: 'Updated Name' };
      mockApiClient.put.mockResolvedValue({ data: updatedUser });

      const updateData = { full_name: 'Updated Name' };
      const result = await authApi.updateUser('user-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should handle validation errors during update', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid email format',
            },
          },
        },
      };

      mockApiClient.put.mockRejectedValue(errorResponse);

      const updateData = { email: 'invalid-email' };
      await expect(authApi.updateUser('user-1', updateData)).rejects.toEqual(errorResponse);
    });
  });

  describe('getUserById', () => {
    it('should fetch user by ID successfully', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockUser });

      const result = await authApi.getUserById('user-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/user-1');
      expect(result).toEqual(mockUser);
    });

    it('should handle user not found', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(authApi.getUserById('nonexistent')).rejects.toEqual(errorResponse);
    });

    it('should handle insufficient permissions', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(authApi.getUserById('other-user')).rejects.toEqual(errorResponse);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle localStorage access errors', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('LocalStorage access denied');
      });

      // Should not throw when localStorage fails
      await expect(authApi.isAuthenticated()).resolves.toBe(false);
      await expect(authApi.getToken()).resolves.toBeNull();
    });

    it('should handle malformed FormData in login', async () => {
      // Test with special characters in credentials
      mockApiClient.post.mockResolvedValue({ data: mockAuthTokens });

      await authApi.login({ email: 'user+test@example.com', password: 'password with spaces!@#' });

      expect(mockApiClient.post).toHaveBeenCalled();
      const formDataCall = mockApiClient.post.mock.calls[0][1];
      expect(formDataCall).toBeInstanceOf(FormData);
    });

    it('should handle empty credentials gracefully', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockAuthTokens });

      await authApi.login({ email: '', password: '' });

      expect(mockApiClient.post).toHaveBeenCalled();
    });

    it('should handle server timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockApiClient.post.mockRejectedValue(timeoutError);

      await expect(authApi.login({ email: 'user@example.com', password: 'password123' })).rejects.toThrow('Request timeout');
    });
  });

  describe('Token Management', () => {
    it('should handle token storage failure gracefully', async () => {
      // Mock console.warn to suppress expected warning output
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      mockApiClient.post.mockResolvedValue({ data: mockAuthTokens });

      // Should not throw even if token storage fails
      await expect(authApi.login({ email: 'user@example.com', password: 'password123' })).resolves.toEqual(mockAuthTokens);
      
      // Verify that warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to store authentication data:', expect.any(Error));
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle token removal failure gracefully', async () => {
      // Mock console.error for critical failures
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Cannot remove item');
      });

      // Should throw when critical token clearing fails
      await expect(authApi.logout()).rejects.toThrow('Failed to clear local authentication data');
      
      // Verify that error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to clear authentication data:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });
});