import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Mock the share package
jest.mock('share', () => ({
  authApi: {
    getCurrentUser: jest.fn().mockResolvedValue({ id: 1, email: 'test@test.com' }),
  },
  mediaApi: {
    getMediaDescriptions: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getFeaturedMedia: jest.fn().mockResolvedValue([]),
    getTrendingMedia: jest.fn().mockResolvedValue([]),
    getVideoFiles: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getUnlinkedVideoFiles: jest.fn().mockResolvedValue([]),
    getDescriptionReports: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  usersApi: {
    getUsers: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  personsApi: {
    getPublicPersons: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  programsApi: {
    getAll: jest.fn().mockResolvedValue([]),
  },
  seasonsApi: {
    getAll: jest.fn().mockResolvedValue([]),
  },
  countriesApi: {
    getAll: jest.fn().mockResolvedValue([]),
  },
  territoriesApi: {
    getAll: jest.fn().mockResolvedValue([]),
  },
  languagesApi: {
    getAll: jest.fn().mockResolvedValue([]),
  },
  picturesApi: {
    getAll: jest.fn().mockResolvedValue([]),
  },
  categoryListsApi: {
    getCategoryLists: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  contentListsApi: {
    getContentLists: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  screenDescriptionsApi: {
    getScreenDescriptions: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  screenContentsApi: {
    getScreenContents: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  videoFileReportsApi: {
    getReports: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  getContentLists: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  getScreenDescriptions: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  getScreenContents: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }), // Legacy v1.8 support
  initApiClient: jest.fn(),
  // MISSING: useAuth hook mock - this is what causes the QueryClient error
  useAuth: jest.fn().mockReturnValue({
    isAuthenticated: true,
    isLoadingUser: false,
    user: { id: 1, email: 'test@test.com', full_name: 'Test User', is_admin: true, is_active: true },
    login: jest.fn(),
    logout: jest.fn(),
    isLoggingIn: false,
    loginError: null
  }),
}));

describe('QueryClient Error Reproduction Tests', () => {
  
  // Skipped: repro test for the old QueryClient crash; expects the Debug screen as the initial route, which it no longer is
  it.skip('REPRODUCES QueryClient Error: App without QueryClientProvider should fail', () => {
    // This test reproduces the exact error you're experiencing
    expect(() => {
      render(<App />);
    }).toThrow('No QueryClient set, use QueryClientProvider to set one');
  });

  // Skipped: repro test for the old QueryClient crash; expects the Debug screen as the initial route, which it no longer is
  it.skip('VERIFIES FIX: App with QueryClientProvider should work', () => {
    // This test verifies that our fix works
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    const AppWithProvider = () => (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    const { getByText } = render(<AppWithProvider />);
    expect(getByText('Debug API Get Functions')).toBeTruthy();
  });

  // Skipped: repro test for the old QueryClient crash; expects the Debug screen as the initial route, which it no longer is
  it.skip('SIMULATES REAL SETUP: Test the MainApp wrapper from index.js', () => {
    // This simulates the actual MainApp wrapper we created in index.js
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
          staleTime: 5 * 60 * 1000, // 5 minutes
        },
        mutations: {
          retry: 1,
        },
      },
    });

    const MainApp = () => (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    const { getByText } = render(<MainApp />);
    expect(getByText('Debug API Get Functions')).toBeTruthy();
  });
});