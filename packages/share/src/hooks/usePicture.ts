import { useQuery } from '@tanstack/react-query';
import { picturesApi } from '../api/pictures';
import type { Picture } from '../types';

/**
 * React Query hook for fetching and caching picture data
 * @param pictureId - The ID of the picture to fetch
 * @param options - Optional configuration
 * @returns React Query result with picture data
 */
export function usePicture(pictureId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery<Picture>({
    queryKey: ['picture', pictureId],
    queryFn: async () => {
      if (!pictureId) throw new Error('Picture ID is required');
      return await picturesApi.getById(pictureId);
    },
    enabled: !!pictureId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes - pictures rarely change
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for this long
  });
}

/**
 * React Query hook for fetching multiple pictures at once
 * @param pictureIds - Array of picture IDs to fetch
 * @returns Array of React Query results
 */
export function usePictures(pictureIds: (string | null | undefined)[]) {
  const validIds = pictureIds.filter((id): id is string => !!id);

  return validIds.map(id => usePicture(id));
}
