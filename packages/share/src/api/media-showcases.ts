import { apiClient } from './client';
import {
  MediaShowcase,
  MediaShowcaseCreate,
  MediaShowcaseUpdate,
  MediaShowcaseFilters,
  MediaShowcaseJSON,
  MediaShowcaseWithItems,
  MediaShowcaseItemOperationResponse,
  MediaShowcaseBulkRefreshResponse,
  PaginatedMediaShowcasesResponse
} from '../types';

/**
 * Media Showcases API
 * Manages curated content collections and promotional displays
 * API 1.13 Implementation
 */

export const mediaShowcasesApi = {
  /**
   * List media showcases with filtering and pagination
   * @param filters - Optional filters for showcases
   * @returns Paginated list of media showcases
   */
  async getMediaShowcases(filters?: MediaShowcaseFilters): Promise<PaginatedMediaShowcasesResponse> {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.list_type) params.append('list_type', filters.list_type);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.thumbnail_format) params.append('thumbnail_format', filters.thumbnail_format);

    const response = await apiClient.get<PaginatedMediaShowcasesResponse>(`/media-showcases?${params}`);
    return response.data;
  },

  /**
   * Get a single media showcase by ID
   * @param id - Showcase ID
   * @returns Media showcase details
   */
  async getMediaShowcase(id: string): Promise<MediaShowcase> {
    const response = await apiClient.get<MediaShowcase>(`/media-showcases/${id}`);
    return response.data;
  },

  /**
   * Create a new media showcase
   * @param data - Media showcase creation data
   * @returns Created media showcase
   */
  async createMediaShowcase(data: MediaShowcaseCreate): Promise<MediaShowcase> {
    const response = await apiClient.post<MediaShowcase>('/media-showcases', data);
    return response.data;
  },

  /**
   * Update an existing media showcase
   * @param id - Showcase ID
   * @param data - Media showcase update data
   * @returns Updated media showcase
   */
  async updateMediaShowcase(id: string, data: MediaShowcaseUpdate): Promise<MediaShowcase> {
    const response = await apiClient.put<MediaShowcase>(`/media-showcases/${id}`, data);
    return response.data;
  },

  /**
   * Delete a media showcase
   * @param id - Showcase ID
   * @returns Deleted media showcase
   */
  async deleteMediaShowcase(id: string): Promise<MediaShowcase> {
    const response = await apiClient.delete<MediaShowcase>(`/media-showcases/${id}`);
    return response.data;
  },

  /**
   * Get media showcase JSON cache
   * @param id - Showcase ID
   * @param refresh - Force refresh of cached JSON
   * @returns Media showcase JSON data
   */
  async getMediaShowcaseJSON(id: string, refresh?: boolean): Promise<MediaShowcaseJSON> {
    const params = new URLSearchParams();
    if (refresh) params.append('refresh', 'true');

    const response = await apiClient.get<{ showcase: MediaShowcaseJSON }>(`/media-showcases/${id}/json?${params}`);
    return response.data.showcase;
  },

  /**
   * Refresh media showcase JSON cache
   * @param id - Showcase ID
   * @returns Updated media showcase
   */
  async refreshMediaShowcaseJSON(id: string): Promise<MediaShowcase> {
    const response = await apiClient.post<MediaShowcase>(`/media-showcases/${id}/refresh-cache`);
    return response.data;
  },

  /**
   * Get media showcase with items
   * @param id - Showcase ID
   * @returns Media showcase with items
   */
  async getMediaShowcaseWithItems(id: string): Promise<MediaShowcaseWithItems> {
    const response = await apiClient.get<MediaShowcaseWithItems>(`/media-showcases/${id}/items`);
    return response.data;
  },

  /**
   * Replace all items in a media showcase
   * @param id - Showcase ID
   * @param mediaDescriptionIds - Array of media description IDs in desired order
   * @returns Operation result
   */
  async replaceMediaShowcaseItems(id: string, mediaDescriptionIds: string[]): Promise<MediaShowcaseItemOperationResponse> {
    const response = await apiClient.put<MediaShowcaseItemOperationResponse>(`/media-showcases/${id}/items`, {
      media_description_ids: mediaDescriptionIds
    });
    return response.data;
  },

  /**
   * Add items to a media showcase
   * @param id - Showcase ID
   * @param mediaDescriptionIds - Array of media description IDs to add
   * @param position - Position to insert items (optional)
   * @returns Operation result
   */
  async addMediaShowcaseItems(id: string, mediaDescriptionIds: string[], position?: number): Promise<MediaShowcaseItemOperationResponse> {
    const response = await apiClient.post<MediaShowcaseItemOperationResponse>(`/media-showcases/${id}/items`, {
      media_description_ids: mediaDescriptionIds,
      position
    });
    return response.data;
  },

  /**
   * Remove items from a media showcase
   * @param id - Showcase ID
   * @param mediaDescriptionIds - Array of media description IDs to remove
   * @returns Operation result
   */
  async removeMediaShowcaseItems(id: string, mediaDescriptionIds: string[]): Promise<MediaShowcaseItemOperationResponse> {
    const response = await apiClient.delete<MediaShowcaseItemOperationResponse>(`/media-showcases/${id}/items`, {
      data: { media_description_ids: mediaDescriptionIds }
    });
    return response.data;
  },

  /**
   * Reorder a single item in a media showcase
   * @param id - Showcase ID
   * @param mediaDescriptionId - Media description ID to reorder
   * @param newPriority - New priority/position
   * @returns Operation result
   */
  async reorderMediaShowcaseItem(id: string, mediaDescriptionId: string, newPriority: number): Promise<MediaShowcaseItemOperationResponse> {
    const response = await apiClient.put<MediaShowcaseItemOperationResponse>(`/media-showcases/${id}/items/reorder`, {
      media_description_id: mediaDescriptionId,
      new_priority: newPriority
    });
    return response.data;
  },

  /**
   * Search media showcases by title
   * @param query - Search query
   * @param filters - Optional search filters
   * @returns Paginated search results
   */
  async searchMediaShowcases(query: string, filters?: {
    skip?: number;
    limit?: number;
    activeOnly?: boolean;
  }): Promise<PaginatedMediaShowcasesResponse> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.activeOnly !== undefined) params.append('active_only', filters.activeOnly.toString());

    const response = await apiClient.get<PaginatedMediaShowcasesResponse>(`/media-showcases/search/?${params}`);
    return response.data;
  },

  /**
   * Get media showcase by slug
   * @param slug - Showcase slug
   * @returns Media showcase
   */
  async getMediaShowcaseBySlug(slug: string): Promise<MediaShowcase> {
    const response = await apiClient.get<MediaShowcase>(`/media-showcases/by-slug/${slug}`);
    return response.data;
  },

  /**
   * Refresh JSON cache for all media showcases
   * @returns Bulk refresh operation result
   */
  async refreshAllMediaShowcaseJSONs(): Promise<MediaShowcaseBulkRefreshResponse> {
    const response = await apiClient.post<MediaShowcaseBulkRefreshResponse>('/media-showcases/refresh-all-caches');
    return response.data;
  }
};

// Export individual functions for convenience
export const {
  getMediaShowcases,
  getMediaShowcase,
  createMediaShowcase,
  updateMediaShowcase,
  deleteMediaShowcase,
  getMediaShowcaseJSON,
  refreshMediaShowcaseJSON,
  getMediaShowcaseWithItems,
  replaceMediaShowcaseItems,
  addMediaShowcaseItems,
  removeMediaShowcaseItems,
  reorderMediaShowcaseItem,
  searchMediaShowcases,
  getMediaShowcaseBySlug,
  refreshAllMediaShowcaseJSONs
} = mediaShowcasesApi;