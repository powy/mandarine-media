import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types';

// Mock the auth API before any imports
vi.mock('../api/auth', () => ({
  authApi: {
    isAuthenticated: vi.fn(),
    getCachedUser: vi.fn(),
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  },
}));

import { authApi } from '../api/auth';

const mockAuthApi = vi.mocked(authApi);


// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  let wrapper: ReturnType<typeof createWrapper>;
  let useAuth: any;

  beforeEach(async () => {
    // Clear all mocks first
    vi.clearAllMocks();

    // Reset modules to clear global state
    vi.resetModules();

    // Re-import useAuth to get fresh global state
    const useAuthModule = await import('../hooks/useAuth');
    useAuth = useAuthModule.useAuth;

    wrapper = createWrapper();

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set default mock responses
    mockAuthApi.isAuthenticated.mockResolvedValue(false);
    mockAuthApi.getCachedUser.mockResolvedValue(null);
    mockAuthApi.getCurrentUser.mockResolvedValue(null as any);
    mockAuthApi.login.mockResolvedValue({
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
    });
    mockAuthApi.logout.mockResolvedValue();
    mockAuthApi.register.mockResolvedValue({ message: 'Success' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with unauthenticated state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initial state should be unauthenticated
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeUndefined();
      expect(result.current.isLoadingUser).toBe(true); // Loading until initial check complete

      // Wait for initial check to complete
      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      expect(result.current.isLoadingUser).toBe(false);
    });

    it('should check authentication status on mount', async () => {
      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockAuthApi.isAuthenticated).toHaveBeenCalled();
      });
    });
  });

  describe('Authentication Check', () => {
    it('should set authenticated state when user is logged in', async () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAuthApi.isAuthenticated.mockResolvedValue(true);
      mockAuthApi.getCachedUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.initialCheckComplete).toBe(true);
      });
    });

    it('should handle authentication check errors gracefully', async () => {
      mockAuthApi.isAuthenticated.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.initialCheckComplete).toBe(true);
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Error checking authentication:',
        expect.any(Error)
      );
    });

    it('should cache user data after authentication check', async () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAuthApi.isAuthenticated.mockResolvedValue(true);
      mockAuthApi.getCachedUser.mockResolvedValue(mockUser);
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });
  });

  describe('Login', () => {
    it('should successfully login user', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAuthApi.getCachedUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial check
      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(mockAuthApi.login).toHaveBeenCalledWith(credentials);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoggingIn).toBe(false);
      expect(result.current.loginError).toBeNull();
    });

    it('should handle login errors', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const loginError = new Error('Invalid credentials');
      mockAuthApi.login.mockRejectedValue(loginError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoggingIn).toBe(false);
      expect(result.current.loginError).toBe(loginError);
    });

    it('should set loading state during login', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });

      mockAuthApi.login.mockReturnValue(loginPromise as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      // Start the login process
      act(() => {
        result.current.login(credentials);
      });

      // Wait for loading state to be set
      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(true);
      });

      // Resolve the login
      act(() => {
        resolveLogin!({
          access_token: 'token',
          refresh_token: 'refresh',
        });
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(false);
      });
    });
  });

  describe('Logout', () => {
    it('should successfully logout user', async () => {
      // Start with authenticated state
      mockAuthApi.isAuthenticated.mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial authentication check
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthApi.logout).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeUndefined();
    });

    it('should handle logout errors gracefully', async () => {
      mockAuthApi.isAuthenticated.mockResolvedValue(true);
      mockAuthApi.logout.mockRejectedValue(new Error('Logout failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      // Should still logout locally even if API call fails
      expect(result.current.isAuthenticated).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Logout error:',
        expect.any(Error)
      );
    });
  });

  describe('Registration', () => {
    it('should successfully register user', async () => {
      const userData: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User',
      };

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      await act(async () => {
        await result.current.register(userData);
      });

      expect(mockAuthApi.register).toHaveBeenCalledWith(userData);
      expect(result.current.isRegistering).toBe(false);
      expect(result.current.registerError).toBeNull();
    });

    it('should handle registration errors', async () => {
      const userData: RegisterRequest = {
        email: 'invalid@example.com',
        password: 'weak',
        full_name: 'Test User',
      };

      const registrationError = new Error('Email already exists');
      mockAuthApi.register.mockRejectedValue(registrationError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      await act(async () => {
        try {
          await result.current.register(userData);
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isRegistering).toBe(false);
        expect(result.current.registerError).toEqual(registrationError);
      });
    });
  });

  describe('User Data Loading', () => {
    it('should fetch user data when authenticated', async () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        is_admin: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAuthApi.isAuthenticated.mockResolvedValue(true);
      mockAuthApi.getCachedUser.mockResolvedValue(null);
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.isActive).toBe(true);
      });
    });

    it('should not fetch user data when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      // getCurrentUser should not be called when not authenticated
      expect(mockAuthApi.getCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('Computed Properties', () => {
    it('should return correct admin status', async () => {
      const adminUser: User = {
        id: 1,
        email: 'admin@example.com',
        full_name: 'Admin User',
        is_active: true,
        is_admin: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAuthApi.isAuthenticated.mockResolvedValue(true);
      mockAuthApi.getCurrentUser.mockResolvedValue(adminUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.isActive).toBe(true);
      });
    });

    it('should return false for admin status when no user', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle cached user data errors gracefully', async () => {
      mockAuthApi.isAuthenticated.mockResolvedValue(true);
      mockAuthApi.getCachedUser.mockRejectedValue(new Error('Cache error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      // When cached user fails, auth check catches the error and sets to false
      // The hook should handle this gracefully without crashing
      expect(result.current.isAuthenticated).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'Error checking authentication:',
        expect.any(Error)
      );
    });

    it('should handle missing cached user after login', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthApi.getCachedUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(result.current.isAuthenticated).toBe(true);
      // Should handle gracefully when no cached user is available
    });
  });
});