import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { SeasonJSON, SeasonEpisodeItemJSON, Season } from '../types';

// Mock the seasons API
vi.mock('../api/seasons', () => ({
  seasonsApi: {
    getSeasonJSON: vi.fn(),
    getAll: vi.fn(),
  },
}));

import { seasonsApi } from '../api/seasons';
import { useSeasonJSON } from '../hooks/useSeasonJSON';

const mockSeasonsApi = vi.mocked(seasonsApi);

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSeasonJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should fetch and transform season JSON successfully', async () => {
    const mockSeasonJSON: SeasonJSON = {
      id: 'season-1',
      season_number: 1,
      season_name: 'Season 1',
      program_id: 'prog-1',
      creation_date_utc: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      episode_count: 2,
      general_description: {
        id: 'desc-1',
        title: 'Season 1',
        media_type: 'season',
        is_featured: false,
        episode_number: undefined,
        episode_order: 0,
        media_categories_list: ['drama'],
        descriptive_summary_text: 'First season',
        image_1920_1080_url: 'https://example.com/season.jpg'
      } as SeasonEpisodeItemJSON,
      episodes: [
        {
          id: 'ep-1',
          title: 'Episode 1',
          media_type: 'video',
          is_featured: false,
          episode_number: 1,
          episode_order: 1,
          image_1920_1080_url: 'https://example.com/ep1.jpg'
        } as SeasonEpisodeItemJSON
      ]
    };

    const mockSeasons: Season[] = [
      {
        id: 'season-1',
        season_number: 1,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z'
      } as Season,
      {
        id: 'season-2',
        season_number: 2,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z'
      } as Season
    ];

    mockSeasonsApi.getSeasonJSON.mockResolvedValue(mockSeasonJSON);
    mockSeasonsApi.getAll.mockResolvedValue(mockSeasons);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSeasonJSON('season-1'), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check transformed data
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.season.id).toBe('season-1');
    expect(result.current.data?.season.season_number).toBe(1);
    expect(result.current.data?.synopsis).toBe('First season');
    expect(result.current.data?.genres).toEqual(['drama']);
    expect(result.current.data?.episodes).toHaveLength(1);

    // Check navigation
    expect(result.current.data?.previousSeason).toBeNull();
    expect(result.current.data?.nextSeason).toBeDefined();
    expect(result.current.data?.nextSeason?.id).toBe('season-2');

    // Verify API was called correctly
    expect(mockSeasonsApi.getSeasonJSON).toHaveBeenCalledWith('season-1', false);
    expect(mockSeasonsApi.getAll).toHaveBeenCalledWith({
      program_id: 'prog-1',
      skip: 0,
      limit: 50
    });
  });

  it('should handle season without program_id (no navigation)', async () => {
    const mockSeasonJSON: SeasonJSON = {
      id: 'season-1',
      season_number: 1,
      season_name: 'Season 1',
      program_id: undefined, // No program
      creation_date_utc: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      episode_count: 0,
      general_description: undefined,
      episodes: []
    };

    mockSeasonsApi.getSeasonJSON.mockResolvedValue(mockSeasonJSON);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSeasonJSON('season-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // No navigation should be fetched
    expect(result.current.data?.nextSeason).toBeNull();
    expect(result.current.data?.previousSeason).toBeNull();
    expect(mockSeasonsApi.getAll).not.toHaveBeenCalled();
  });

  it('should not fetch when seasonId is undefined', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSeasonJSON(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockSeasonsApi.getSeasonJSON).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockSeasonsApi.getSeasonJSON.mockRejectedValue(
      new Error('Failed to fetch season JSON')
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSeasonJSON('season-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('should continue without navigation if navigation fetch fails', async () => {
    const mockSeasonJSON: SeasonJSON = {
      id: 'season-1',
      season_number: 1,
      season_name: 'Season 1',
      program_id: 'prog-1',
      creation_date_utc: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      episode_count: 0,
      general_description: undefined,
      episodes: []
    };

    mockSeasonsApi.getSeasonJSON.mockResolvedValue(mockSeasonJSON);
    mockSeasonsApi.getAll.mockRejectedValue(new Error('Navigation fetch failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSeasonJSON('season-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Season data should still be available
    expect(result.current.data?.season.id).toBe('season-1');

    // Navigation should be null (failed gracefully)
    expect(result.current.data?.nextSeason).toBeNull();
    expect(result.current.data?.previousSeason).toBeNull();
  });

  it('should pass refresh parameter to API', async () => {
    const mockSeasonJSON: SeasonJSON = {
      id: 'season-1',
      season_number: 1,
      season_name: undefined,
      program_id: undefined,
      creation_date_utc: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      episode_count: 0,
      general_description: undefined,
      episodes: []
    };

    mockSeasonsApi.getSeasonJSON.mockResolvedValue(mockSeasonJSON);

    const wrapper = createWrapper();
    renderHook(() => useSeasonJSON('season-1', true), { wrapper });

    await waitFor(() => {
      expect(mockSeasonsApi.getSeasonJSON).toHaveBeenCalledWith('season-1', true);
    });
  });
});
