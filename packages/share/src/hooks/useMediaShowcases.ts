import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mediaShowcasesApi } from '../api/media-showcases';
import {
  MediaShowcaseCreate,
  MediaShowcaseUpdate,
  MediaShowcaseFilters,
} from '../types';

// Query keys
export const mediaShowcaseKeys = {
  all: ['media-showcases'] as const,
  lists: () => [...mediaShowcaseKeys.all, 'list'] as const,
  list: (filters?: MediaShowcaseFilters) => [...mediaShowcaseKeys.lists(), filters] as const,
  details: () => [...mediaShowcaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...mediaShowcaseKeys.details(), id] as const,
  json: (id: string) => [...mediaShowcaseKeys.detail(id), 'json'] as const,
  withItems: (id: string) => [...mediaShowcaseKeys.detail(id), 'items'] as const,
  search: (query: string, filters?: any) => [...mediaShowcaseKeys.all, 'search', query, filters] as const,
  bySlug: (slug: string) => [...mediaShowcaseKeys.all, 'slug', slug] as const,
};

/**
 * Hook to fetch paginated media showcases with optional filtering
 */
export function useMediaShowcases(filters?: MediaShowcaseFilters) {
  return useQuery({
    queryKey: mediaShowcaseKeys.list(filters),
    queryFn: () => mediaShowcasesApi.getMediaShowcases(filters),
  });
}

/**
 * Hook to fetch a single media showcase by ID
 */
export function useMediaShowcase(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: mediaShowcaseKeys.detail(id),
    queryFn: () => mediaShowcasesApi.getMediaShowcase(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch media showcase JSON cache
 */
export function useMediaShowcaseJSON(id: string, refresh?: boolean) {
  return useQuery({
    queryKey: mediaShowcaseKeys.json(id),
    queryFn: () => mediaShowcasesApi.getMediaShowcaseJSON(id, refresh),
    enabled: !!id,
    staleTime: refresh ? 0 : 5 * 60 * 1000, // 5 minutes unless forcing refresh
  });
}

/**
 * Hook to fetch media showcase with items
 */
export function useMediaShowcaseWithItems(id: string) {
  return useQuery({
    queryKey: mediaShowcaseKeys.withItems(id),
    queryFn: () => mediaShowcasesApi.getMediaShowcaseWithItems(id),
    enabled: !!id,
  });
}

/**
 * Hook to search media showcases
 */
export function useSearchMediaShowcases(query: string, filters?: { skip?: number; limit?: number; activeOnly?: boolean }) {
  return useQuery({
    queryKey: mediaShowcaseKeys.search(query, filters),
    queryFn: () => mediaShowcasesApi.searchMediaShowcases(query, filters),
    enabled: !!query && query.length > 0,
  });
}

/**
 * Hook to fetch media showcase by slug
 */
export function useMediaShowcaseBySlug(slug: string) {
  return useQuery({
    queryKey: mediaShowcaseKeys.bySlug(slug),
    queryFn: () => mediaShowcasesApi.getMediaShowcaseBySlug(slug),
    enabled: !!slug,
  });
}

/**
 * Hook to create a new media showcase
 */
export function useCreateMediaShowcase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MediaShowcaseCreate) => mediaShowcasesApi.createMediaShowcase(data),
    onSuccess: () => {
      // Invalidate and refetch showcase lists
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.lists() });
    },
  });
}

/**
 * Hook to update a media showcase
 */
export function useUpdateMediaShowcase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MediaShowcaseUpdate }) =>
      mediaShowcasesApi.updateMediaShowcase(id, data),
    onSuccess: (updatedShowcase) => {
      // Update the specific showcase in cache
      queryClient.setQueryData(
        mediaShowcaseKeys.detail(updatedShowcase.id),
        updatedShowcase
      );
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.lists() });
      // Invalidate JSON cache as it might be outdated
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.json(updatedShowcase.id) });
    },
  });
}

/**
 * Hook to delete a media showcase
 */
export function useDeleteMediaShowcase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mediaShowcasesApi.deleteMediaShowcase(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: mediaShowcaseKeys.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.lists() });
    },
  });
}

/**
 * Hook to refresh media showcase JSON cache
 */
export function useRefreshMediaShowcaseJSON() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mediaShowcasesApi.refreshMediaShowcaseJSON(id),
    onSuccess: (updatedShowcase) => {
      // Update the showcase in cache
      queryClient.setQueryData(
        mediaShowcaseKeys.detail(updatedShowcase.id),
        updatedShowcase
      );
      // Invalidate JSON cache to trigger refetch with fresh data
      queryClient.invalidateQueries({
        queryKey: mediaShowcaseKeys.json(updatedShowcase.id)
      });
    },
  });
}

/**
 * Hook to replace all items in a media showcase
 */
export function useReplaceMediaShowcaseItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mediaDescriptionIds }: { id: string; mediaDescriptionIds: string[] }) =>
      mediaShowcasesApi.replaceMediaShowcaseItems(id, mediaDescriptionIds),
    onSuccess: (_, { id }) => {
      // Invalidate showcase details and items
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.withItems(id) });
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.json(id) });
    },
  });
}

/**
 * Hook to add items to a media showcase
 */
export function useAddMediaShowcaseItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mediaDescriptionIds, position }: {
      id: string;
      mediaDescriptionIds: string[];
      position?: number
    }) => mediaShowcasesApi.addMediaShowcaseItems(id, mediaDescriptionIds, position),
    onSuccess: (_, { id }) => {
      // Invalidate showcase details and items
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.withItems(id) });
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.json(id) });
    },
  });
}

/**
 * Hook to remove items from a media showcase
 */
export function useRemoveMediaShowcaseItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mediaDescriptionIds }: { id: string; mediaDescriptionIds: string[] }) =>
      mediaShowcasesApi.removeMediaShowcaseItems(id, mediaDescriptionIds),
    onSuccess: (_, { id }) => {
      // Invalidate showcase details and items
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.withItems(id) });
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.json(id) });
    },
  });
}

/**
 * Hook to reorder a single item in a media showcase
 */
export function useReorderMediaShowcaseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mediaDescriptionId, newPriority }: {
      id: string;
      mediaDescriptionId: string;
      newPriority: number
    }) => mediaShowcasesApi.reorderMediaShowcaseItem(id, mediaDescriptionId, newPriority),
    onSuccess: (_, { id }) => {
      // Invalidate showcase details and items
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.withItems(id) });
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.json(id) });
    },
  });
}

/**
 * Hook to refresh JSON cache for all media showcases
 */
export function useRefreshAllMediaShowcaseJSONs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mediaShowcasesApi.refreshAllMediaShowcaseJSONs(),
    onSuccess: () => {
      // Invalidate all showcase-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: mediaShowcaseKeys.all });
    },
  });
}