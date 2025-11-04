import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ProgramJSON, SeasonJSON, SeasonEpisodeItemJSON } from '../types';

// Mock the programs API
vi.mock('../api/programs', () => ({
  programsApi: {
    getProgramJSON: vi.fn(),
  },
}));

import { programsApi } from '../api/programs';
import { useProgramJSON } from '../hooks/useProgramJSON';

const mockProgramsApi = vi.mocked(programsApi);

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

describe('useProgramJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should fetch and transform program JSON successfully', async () => {
    const mockProgramJSON: ProgramJSON = {
      id: 'prog-1',
      program_name: 'Test Program',
      creation_date_utc: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      season_count: 1,
      general_description: {
        id: 'desc-1',
        title: 'Test Program',
        media_type: 'program',
        is_featured: true,
        episode_number: undefined,
        episode_order: 0,
        media_categories_list: ['drama'],
        descriptive_summary_text: 'A test program',
        image_1920_1080_url: 'https://example.com/image.jpg'
      } as SeasonEpisodeItemJSON,
      seasons: [
        {
          id: 'season-1',
          season_number: 1,
          season_name: 'Season 1',
          program_id: 'prog-1',
          creation_date_utc: '2024-01-01T00:00:00Z',
          last_updated: '2024-01-15T00:00:00Z',
          episode_count: 5,
          general_description: undefined,
          episodes: []
        } as SeasonJSON
      ]
    };

    mockProgramsApi.getProgramJSON.mockResolvedValue(mockProgramJSON);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useProgramJSON('prog-1'), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check transformed data
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.program.id).toBe('prog-1');
    expect(result.current.data?.program.program_name).toBe('Test Program');
    expect(result.current.data?.synopsis).toBe('A test program');
    expect(result.current.data?.genres).toEqual(['drama']);
    expect(result.current.data?.allSeasons).toHaveLength(1);

    // Verify API was called correctly
    expect(mockProgramsApi.getProgramJSON).toHaveBeenCalledWith('prog-1', false);
  });

  it('should not fetch when programId is undefined', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useProgramJSON(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockProgramsApi.getProgramJSON).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockProgramsApi.getProgramJSON.mockRejectedValue(
      new Error('Failed to fetch program JSON')
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useProgramJSON('prog-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('should pass refresh parameter to API', async () => {
    const mockProgramJSON: ProgramJSON = {
      id: 'prog-1',
      program_name: 'Test Program',
      creation_date_utc: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      season_count: 0,
      general_description: undefined,
      seasons: []
    };

    mockProgramsApi.getProgramJSON.mockResolvedValue(mockProgramJSON);

    const wrapper = createWrapper();
    renderHook(() => useProgramJSON('prog-1', true), { wrapper });

    await waitFor(() => {
      expect(mockProgramsApi.getProgramJSON).toHaveBeenCalledWith('prog-1', true);
    });
  });
});
