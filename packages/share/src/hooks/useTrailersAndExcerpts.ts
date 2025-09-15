import { useQuery } from '@tanstack/react-query';
import { getTrailersAndExcerpts } from '../api/media';
import { MediaDescription, VideoFile } from '../types';

export interface TrailerOrExcerptItem {
  mediaDescription: MediaDescription;
  videoFile: VideoFile | null;
}

export interface TrailersAndExcerptsData {
  trailers: TrailerOrExcerptItem[];
  excerpts: TrailerOrExcerptItem[];
  hasTrailers: boolean;
  hasExcerpts: boolean;
  hasExtraContent: boolean;
}

export interface UseTrailersAndExcerptsReturn {
  data: TrailersAndExcerptsData | undefined;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
}

/**
 * React Query hook to fetch trailers and excerpts for a media description
 * 
 * @param mediaDescriptionId - The ID of the main media description
 * @param options - Optional configuration
 * @returns Query result with trailers and excerpts data
 */
export function useTrailersAndExcerpts(
  mediaDescriptionId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
): UseTrailersAndExcerptsReturn {
  const {
    data,
    isLoading,
    error,
    isError,
    refetch
  } = useQuery({
    queryKey: ['trailers-and-excerpts', mediaDescriptionId],
    queryFn: async () => {
      if (!mediaDescriptionId) {
        throw new Error('Media description ID is required');
      }
      return await getTrailersAndExcerpts(mediaDescriptionId);
    },
    enabled: !!mediaDescriptionId && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes
    gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: (failureCount, error) => {
      // Don't retry if the media description doesn't exist
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    data: data || {
      trailers: [],
      excerpts: [],
      hasTrailers: false,
      hasExcerpts: false,
      hasExtraContent: false
    },
    isLoading,
    error: error as Error | null,
    isError,
    refetch
  };
}