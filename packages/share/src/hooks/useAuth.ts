import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { User, LoginRequest, RegisterRequest } from '../types';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await authApi.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.warn('Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Get current user
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ['user', 'current'],
    queryFn: authApi.getCurrentUser,
    enabled: isAuthenticated,
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: () => {
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ['user', 'current'] });
    },
    onError: (error) => {
      console.error('Login error:', error);
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
    try {
      await authApi.logout();
      setIsAuthenticated(false);
      queryClient.clear();
    } catch (error) {
      console.error('Logout error:', error);
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
    isLoadingUser,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    
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