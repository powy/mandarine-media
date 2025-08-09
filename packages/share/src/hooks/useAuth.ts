import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { User, LoginRequest, RegisterRequest } from '../types';

// Global auth state that persists across component re-mounts (only for useAuth hook)
// This is isolated to the useAuth hook and doesn't affect direct authApi usage
let globalAuthState = {
  isAuthenticated: false,
  initialCheckComplete: false,
};

// Simple event emitter for state changes
const authStateListeners: Array<() => void> = [];

// Helper functions for global state management
const updateGlobalAuthState = (updates: Partial<typeof globalAuthState>) => {
  globalAuthState = { ...globalAuthState, ...updates };
  
  // Notify all listeners
  authStateListeners.forEach(listener => listener());
};

export const useAuth = () => {
  const queryClient = useQueryClient();
  
  // Initialize local state from global state
  const [isAuthenticated, setIsAuthenticated] = useState(globalAuthState.isAuthenticated);
  const [initialCheckComplete, setInitialCheckComplete] = useState(globalAuthState.initialCheckComplete);
  
  // Sync local state with global state
  useEffect(() => {
    const listener = () => {
      setIsAuthenticated(globalAuthState.isAuthenticated);
      setInitialCheckComplete(globalAuthState.initialCheckComplete);
    };
    
    authStateListeners.push(listener);
    
    // Cleanup listener on unmount
    return () => {
      const index = authStateListeners.indexOf(listener);
      if (index > -1) {
        authStateListeners.splice(index, 1);
      }
    };
  }, []);

  // Check authentication status on mount and try to get cached user first
  useEffect(() => {
    // Only run initial auth check if we haven't completed it yet
    if (globalAuthState.initialCheckComplete) {
      return;
    }

    const checkAuth = async () => {
      try {
        const authenticated = await authApi.isAuthenticated();
        updateGlobalAuthState({ isAuthenticated: authenticated });
        
        if (authenticated) {
          // Try to get cached user data first to avoid unnecessary API calls
          const cachedUser = await authApi.getCachedUser();
          if (cachedUser) {
            // Pre-populate the React Query cache with cached user data
            queryClient.setQueryData(['user', 'current'], cachedUser);
          }
        }
      } catch (error) {
        console.warn('Error checking authentication:', error);
        updateGlobalAuthState({ isAuthenticated: false });
      } finally {
        updateGlobalAuthState({ initialCheckComplete: true });
      }
    };

    checkAuth();
  }, [queryClient]);

  // Get current user
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ['user', 'current'],
    queryFn: authApi.getCurrentUser,
    enabled: isAuthenticated,
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const result = await authApi.login(credentials);
      return result;
    },
    onSuccess: async () => {
      updateGlobalAuthState({ isAuthenticated: true });
      
      // Try to get the cached user data that was stored during login
      try {
        const cachedUser = await authApi.getCachedUser();
        if (cachedUser) {
          queryClient.setQueryData(['user', 'current'], cachedUser);
        } else {
          // If no cached user, invalidate to trigger fresh fetch
          queryClient.invalidateQueries({ queryKey: ['user', 'current'] });
        }
      } catch (error) {
        console.warn('Error getting cached user after login:', error);
        queryClient.invalidateQueries({ queryKey: ['user', 'current'] });
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      updateGlobalAuthState({ isAuthenticated: false });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      // Registration successful, but user still needs to login
      console.log('Registration successful');
    },
    onError: (error) => {
      console.error('Registration error:', error);
    },
  });

  // Logout function
  const logout = async () => {
    // Immediately set global state to logged out to trigger UI change
    updateGlobalAuthState({ isAuthenticated: false, initialCheckComplete: false });
    
    try {
      // Clear React Query cache first
      queryClient.clear();
      
      // Then clear authentication data
      await authApi.logout();
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, we must ensure local state is cleared
      queryClient.clear();
    } finally {
      // Always ensure we end in a logged out state
      updateGlobalAuthState({ isAuthenticated: false, initialCheckComplete: true });
    }
  };

  // Login function
  const login = async (credentials: LoginRequest) => {
    return loginMutation.mutateAsync(credentials);
  };

  // Register function
  const register = async (userData: RegisterRequest) => {
    return registerMutation.mutateAsync(userData);
  };

  return {
    // State
    user,
    isAuthenticated,
    isLoadingUser: isLoadingUser || !initialCheckComplete,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    initialCheckComplete,
    
    // Actions
    login,
    logout,
    register,
    
    // Errors
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    
    // Computed values
    isAdmin: user?.is_admin || false,
    isActive: user?.is_active || false,
  };
};