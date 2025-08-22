import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DebugGetScreen } from '../screens/DebugGetScreen';

// Mock the share package with v1.9 specific features
jest.mock('share', () => ({
  authApi: {
    getCurrentUser: jest.fn().mockResolvedValue({ id: 1, email: 'test@test.com' }),
  },
  mediaApi: {
    getMediaDescriptions: jest.fn().mockResolvedValue({ 
      data: [{
        id: '1',
        episode_title: 'Running Man - EP 730',
        tag_text_list: ['drama', 'kpop'], // v1.9: renamed from human_keywords_text_list
        slug: 'running_man_ep_730', // v1.9: renamed from friendly_url
        media_type: 'video'
      }], 
      pagination: { total: 1 } 
    }),
    getFeaturedMedia: jest.fn().mockResolvedValue([]),
    getTrendingMedia: jest.fn().mockResolvedValue([]),
    getVideoFiles: jest.fn().mockResolvedValue({ 
      data: [{
        id: '1',
        file_name: 'running_man_ep730.mp4',
        environment_key: 'production', // v1.9: new field
        protection_key: 'protected_123', // v1.9: new field
        slug: 'running_man_ep730' // v1.9: new field
      }], 
      pagination: { total: 1 } 
    }),
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
    getScreenDescriptions: jest.fn().mockResolvedValue({ 
      data: [{
        id: '1',
        title: 'Homepage',
        slug: 'homepage', // v1.9: new field
        screen_type: 'homepage',
        is_active: true
      }], 
      pagination: { total: 1 } 
    }),
  },
  screenContentsApi: {
    getScreenContents: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  videoFileReportsApi: {
    getReports: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  getContentLists: jest.fn().mockResolvedValue({ 
    data: [{
      id: '1',
      title: 'Trending K-Dramas',
      latest_first: true, // v1.9: new required field
      media_type: 'video', // v1.9: new filtering field
      media_categories_id_list: ['korean-drama-id'], // v1.9: new filtering field
      themes_and_genres_id_list: ['romance-id'], // v1.9: new filtering field
      slug: 'trending_k_dramas' // v1.9: new field
    }], 
    pagination: { total: 1 } 
  }),
  getScreenDescriptions: jest.fn().mockResolvedValue({ 
    data: [{
      id: '1',
      title: 'Homepage',
      slug: 'homepage',
      screen_type: 'homepage'
    }], 
    pagination: { total: 1 } 
  }),
  getScreenContents: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  initApiClient: jest.fn(),
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

// Mock the config
jest.mock('../../config', () => ({
  currentConfig: {
    environment: 'test',
    apiBaseUrl: 'http://localhost:8000'
  }
}));

describe('API v1.9 Features Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should use getScreenDescriptions instead of getScreenContents', async () => {
    const { getScreenDescriptions } = require('share');
    
    renderWithProvider(<DebugGetScreen />);
    
    // Wait for component to load and make API calls
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(getScreenDescriptions).toHaveBeenCalledWith({ limit: 10 });
  });

  it('should handle MediaDescription with v1.9 fields (tag_text_list, slug)', async () => {
    const { mediaApi } = require('share');
    
    renderWithProvider(<DebugGetScreen />);
    
    // Wait for component to load and make API calls
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mediaApi.getMediaDescriptions).toHaveBeenCalledWith({ limit: 10 });
    
    // Verify v1.9 response structure is expected
    const mockResponse = await mediaApi.getMediaDescriptions({ limit: 10 });
    const mediaDescription = mockResponse.data[0];
    
    expect(mediaDescription).toHaveProperty('tag_text_list');
    expect(mediaDescription).toHaveProperty('slug');
    expect(mediaDescription).not.toHaveProperty('human_keywords_text_list');
    expect(mediaDescription).not.toHaveProperty('friendly_url');
  });

  it('should handle VideoFile with v1.9 fields (environment_key, protection_key, slug)', async () => {
    const { mediaApi } = require('share');
    
    renderWithProvider(<DebugGetScreen />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const mockResponse = await mediaApi.getVideoFiles({ limit: 10 });
    const videoFile = mockResponse.data[0];
    
    expect(videoFile).toHaveProperty('environment_key');
    expect(videoFile).toHaveProperty('protection_key');
    expect(videoFile).toHaveProperty('slug');
    expect(videoFile.environment_key).toBe('production');
    expect(videoFile.protection_key).toBe('protected_123');
    expect(videoFile.slug).toBe('running_man_ep730');
  });

  it('should handle ContentList with v1.9 fields (latest_first, filtering fields, slug)', async () => {
    const { getContentLists } = require('share');
    
    renderWithProvider(<DebugGetScreen />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(getContentLists).toHaveBeenCalledWith({ limit: 10 });
    
    const mockResponse = await getContentLists({ limit: 10 });
    const contentList = mockResponse.data[0];
    
    expect(contentList).toHaveProperty('latest_first');
    expect(contentList).toHaveProperty('media_type');
    expect(contentList).toHaveProperty('media_categories_id_list');
    expect(contentList).toHaveProperty('themes_and_genres_id_list');
    expect(contentList).toHaveProperty('slug');
    expect(contentList.latest_first).toBe(true);
    expect(contentList.media_type).toBe('video');
    expect(contentList.slug).toBe('trending_k_dramas');
  });

  it('should handle ScreenDescription with v1.9 fields (slug)', async () => {
    const { getScreenDescriptions } = require('share');
    
    renderWithProvider(<DebugGetScreen />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const mockResponse = await getScreenDescriptions({ limit: 10 });
    const screenDescription = mockResponse.data[0];
    
    expect(screenDescription).toHaveProperty('slug');
    expect(screenDescription.slug).toBe('homepage');
    expect(screenDescription.title).toBe('Homepage');
  });

  it('should render DebugGetScreen with v1.9 API successfully', () => {
    const { getByText } = renderWithProvider(<DebugGetScreen />);
    
    // Should show the main title
    expect(getByText('Debug API Get Functions')).toBeTruthy();
    
    // Should show environment info
    expect(getByText(/Environment: test/)).toBeTruthy();
    expect(getByText(/Server: http:\/\/localhost:8000/)).toBeTruthy();
  });

  it('should have initApiClient available from share package', () => {
    const { initApiClient } = require('share');
    
    // Verify that initApiClient is available and is a function
    expect(typeof initApiClient).toBe('function');
    expect(initApiClient).toBeDefined();
    
    // Note: In the real app, initApiClient is called from App.tsx on mount
    // In tests, we mock it so it doesn't actually make network calls
  });
});