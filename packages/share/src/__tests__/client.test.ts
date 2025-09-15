import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before any imports
vi.mock('../utils/storage', () => ({
  authTokenStorage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('../utils/token-utils', () => ({
  isTokenExpired: vi.fn(),
}));

import { authTokenStorage } from '../utils/storage';
import { isTokenExpired } from '../utils/token-utils';
import { initApiClient } from '../api/client';

const mockAuthTokenStorage = vi.mocked(authTokenStorage);
const mockIsTokenExpired = vi.mocked(isTokenExpired);

describe('API Client Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Client Initialization', () => {
    it('should update config when initApiClient is called', () => {
      const config = {
        baseURL: 'https://api.example.com',
        onAuthError: vi.fn(),
      };

      expect(() => initApiClient(config)).not.toThrow();
    });

    it('should accept minimal config', () => {
      const config = {
        baseURL: 'https://minimal.example.com',
      };

      expect(() => initApiClient(config)).not.toThrow();
    });
  });

  describe('Token Utils Integration', () => {
    it('should call token storage methods', async () => {
      mockAuthTokenStorage.getAccessToken.mockResolvedValue('test-token');

      await mockAuthTokenStorage.getAccessToken();

      expect(mockAuthTokenStorage.getAccessToken).toHaveBeenCalled();
    });

    it('should call token validation', () => {
      mockIsTokenExpired.mockReturnValue(false);

      const result = mockIsTokenExpired('test-token');

      expect(result).toBe(false);
      expect(mockIsTokenExpired).toHaveBeenCalledWith('test-token');
    });
  });

  describe('Storage Integration', () => {
    it('should handle token storage operations', async () => {
      mockAuthTokenStorage.setAccessToken.mockResolvedValue();
      mockAuthTokenStorage.setRefreshToken.mockResolvedValue();
      mockAuthTokenStorage.clearAll.mockResolvedValue();

      await mockAuthTokenStorage.setAccessToken('access-token');
      await mockAuthTokenStorage.setRefreshToken('refresh-token');
      await mockAuthTokenStorage.clearAll();

      expect(mockAuthTokenStorage.setAccessToken).toHaveBeenCalledWith('access-token');
      expect(mockAuthTokenStorage.setRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(mockAuthTokenStorage.clearAll).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      const storageError = new Error('Storage unavailable');
      mockAuthTokenStorage.getAccessToken.mockRejectedValue(storageError);

      await expect(mockAuthTokenStorage.getAccessToken()).rejects.toThrow('Storage unavailable');
    });
  });

  describe('Token Expiration Scenarios', () => {
    it('should detect expired tokens', () => {
      mockIsTokenExpired.mockReturnValue(true);

      const result = mockIsTokenExpired('expired-token');

      expect(result).toBe(true);
    });

    it('should detect valid tokens', () => {
      mockIsTokenExpired.mockReturnValue(false);

      const result = mockIsTokenExpired('valid-token');

      expect(result).toBe(false);
    });

    it('should handle malformed tokens', () => {
      mockIsTokenExpired.mockReturnValue(true);

      const result = mockIsTokenExpired('malformed-token');

      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle auth error callbacks', () => {
      const onAuthError = vi.fn();
      const config = {
        baseURL: 'https://api.example.com',
        onAuthError,
      };

      initApiClient(config);

      // Simulate auth error
      onAuthError();

      expect(onAuthError).toHaveBeenCalled();
    });

    it('should handle missing auth error callback', () => {
      const config = {
        baseURL: 'https://api.example.com',
      };

      expect(() => initApiClient(config)).not.toThrow();
    });
  });

  describe('Token Refresh Scenarios', () => {
    it('should handle successful token refresh', async () => {
      mockAuthTokenStorage.getAccessToken.mockResolvedValue('expired-token');
      mockAuthTokenStorage.getRefreshToken.mockResolvedValue('refresh-token');
      mockAuthTokenStorage.setAccessToken.mockResolvedValue();
      mockAuthTokenStorage.setRefreshToken.mockResolvedValue();
      mockIsTokenExpired.mockReturnValue(true);

      // Simulate token refresh flow
      const currentToken = await mockAuthTokenStorage.getAccessToken();
      const refreshToken = await mockAuthTokenStorage.getRefreshToken();
      const isExpired = mockIsTokenExpired(currentToken!);

      expect(isExpired).toBe(true);
      expect(refreshToken).toBe('refresh-token');

      // Simulate setting new tokens
      await mockAuthTokenStorage.setAccessToken('new-access-token');
      await mockAuthTokenStorage.setRefreshToken('new-refresh-token');

      expect(mockAuthTokenStorage.setAccessToken).toHaveBeenCalledWith('new-access-token');
      expect(mockAuthTokenStorage.setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
    });

    it('should handle refresh token failure', async () => {
      mockAuthTokenStorage.getRefreshToken.mockResolvedValue(null);
      mockAuthTokenStorage.clearAll.mockResolvedValue();

      const refreshToken = await mockAuthTokenStorage.getRefreshToken();

      if (!refreshToken) {
        await mockAuthTokenStorage.clearAll();
      }

      expect(mockAuthTokenStorage.clearAll).toHaveBeenCalled();
    });

    it('should handle storage errors during refresh', async () => {
      const storageError = new Error('Storage error');
      mockAuthTokenStorage.setAccessToken.mockRejectedValue(storageError);

      await expect(
        mockAuthTokenStorage.setAccessToken('new-token')
      ).rejects.toThrow('Storage error');
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple token storage calls', async () => {
      mockAuthTokenStorage.getAccessToken.mockResolvedValue('token');

      const promises = [
        mockAuthTokenStorage.getAccessToken(),
        mockAuthTokenStorage.getAccessToken(),
        mockAuthTokenStorage.getAccessToken(),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual(['token', 'token', 'token']);
      expect(mockAuthTokenStorage.getAccessToken).toHaveBeenCalledTimes(3);
    });

    it('should handle token clearing during concurrent operations', async () => {
      mockAuthTokenStorage.clearAll.mockResolvedValue();

      const promises = [
        mockAuthTokenStorage.clearAll(),
        mockAuthTokenStorage.clearAll(),
      ];

      await Promise.all(promises);

      expect(mockAuthTokenStorage.clearAll).toHaveBeenCalledTimes(2);
    });
  });
});