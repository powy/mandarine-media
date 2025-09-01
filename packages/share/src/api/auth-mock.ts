// TEMPORARY MOCK AUTH SERVICE FOR TESTING QUERYCLIENT FIX
// This is a mock version to test if the QueryClient context sharing works
// without depending on real HTTP requests or backend availability

import { AuthTokens, LoginRequest, RegisterRequest, User } from '../types';

// Mock data for testing
const MOCK_USER: User = {
  id: '1',
  email: 'test@example.com',
  full_name: 'Test User',
  is_active: true,
  is_admin: false,
  creation_date_utc: '2025-01-01T00:00:00Z',
};

const MOCK_TOKENS: AuthTokens = {
  access_token: 'mock-jwt-token-12345',
  token_type: 'bearer',
};

// Simulate async behavior with delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock localStorage for Jest environment
const mockStorage = {
  data: {} as { [key: string]: string },
  getItem(key: string) {
    return this.data[key] || null;
  },
  setItem(key: string, value: string) {
    this.data[key] = value;
  },
  removeItem(key: string) {
    delete this.data[key];
  }
};

// Use localStorage if available, otherwise use mock
const storage = typeof localStorage !== 'undefined' ? localStorage : mockStorage;

export const authApi = {
  // Login with email/password - MOCK VERSION
  async login(credentials: LoginRequest): Promise<AuthTokens> {
    console.log('[MOCK AUTH] Login attempt with:', credentials.email);
    await delay(500); // Simulate network delay
    
    // Always succeed for testing
    try {
      storage.setItem('access_token', MOCK_TOKENS.access_token);
      console.log('[MOCK AUTH] Login successful - token stored');
    } catch (error) {
      console.warn('[MOCK AUTH] Failed to store token in storage:', error);
    }
    
    return MOCK_TOKENS;
  },

  // Register new user - MOCK VERSION
  async register(userData: RegisterRequest): Promise<User> {
    console.log('[MOCK AUTH] Register attempt for:', userData.email);
    await delay(500); // Simulate network delay
    
    return {
      ...MOCK_USER,
      email: userData.email,
      full_name: userData.full_name,
    };
  },

  // Get current user info - MOCK VERSION
  async getCurrentUser(): Promise<User> {
    console.log('[MOCK AUTH] Getting current user');
    await delay(200); // Simulate network delay
    
    const token = storage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return MOCK_USER;
  },

  // Logout - MOCK VERSION
  async logout(): Promise<void> {
    console.log('[MOCK AUTH] Logout called');
    try {
      storage.removeItem('access_token');
      console.log('[MOCK AUTH] Token removed from storage');
    } catch (error) {
      console.warn('[MOCK AUTH] Failed to remove token from storage:', error);
    }
  },

  // Check if user is authenticated - MOCK VERSION
  async isAuthenticated(): Promise<boolean> {
    console.log('[MOCK AUTH] Checking authentication status');
    await delay(100); // Simulate network delay
    
    try {
      const token = storage.getItem('access_token');
      const isAuth = !!token;
      console.log('[MOCK AUTH] Authentication status:', isAuth);
      return isAuth;
    } catch (error) {
      console.log('[MOCK AUTH] Authentication check failed:', error);
      return false;
    }
  },

  // Get stored token - MOCK VERSION
  async getToken(): Promise<string | null> {
    console.log('[MOCK AUTH] Getting stored token');
    try {
      const token = storage.getItem('access_token');
      console.log('[MOCK AUTH] Token retrieved:', token ? 'present' : 'not found');
      return token;
    } catch (error) {
      console.log('[MOCK AUTH] Failed to get token:', error);
      return null;
    }
  },

  // Update user profile - MOCK VERSION
  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    console.log('[MOCK AUTH] Update user:', userId, userData);
    await delay(300); // Simulate network delay
    
    return {
      ...MOCK_USER,
      ...userData,
    };
  },

  // Get user by ID - MOCK VERSION
  async getUserById(userId: string): Promise<User> {
    console.log('[MOCK AUTH] Get user by ID:', userId);
    await delay(200); // Simulate network delay
    
    return {
      ...MOCK_USER,
      id: userId || '1',
    };
  },
};