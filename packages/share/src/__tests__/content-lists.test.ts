import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getContentLists,
  getContentList,
  createContentList,
  updateContentList,
  deleteContentList,
  getContentListJSON,
  reorderContentList,
  regenerateContentListJSON,
  autoGenerateContentLists,
  updateDynamicContentLists,
} from '../api/content-lists';
import { apiClient } from '../api/client';
import type {
  ContentList,
  ContentListCreate,
  ContentListUpdate,
  ContentListJSON,
  ReorderContentRequest,
  AutoGenerationResponse,
  DynamicListUpdateResponse,
} from '../types';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = apiClient as any;

describe('Content Lists API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContentList: ContentList = {
    id: 'content-list-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    last_updated_utc: '2024-01-15T14:30:00Z',
    title: 'Trending K-Dramas',
    thumbnail_format: '810x1080',
    list_type: 'classic',
    percentage_width: 100,
    percentage_height: 50,
    is_active: true,
    display_order: 1,
    latest_first: true, // v1.9 required field
    description: 'Popular Korean dramas this week',
    content_items: ['prog1', 'season2', 'media3'],
    content_types: ['program', 'season', 'media_description'],
  };

  const mockContentListJSON: ContentListJSON = {
    id: 'content-list-1',
    title: 'Trending K-Dramas',
    thumbnail_format: '810x1080',
    description: 'Popular Korean dramas this week',
    last_updated: '2024-01-15T14:30:00Z',
    items: [
      {
        content_id: 'prog1',
        content_type: 'program',
        title: 'Running Man',
        thumbnail_url: 'https://cdn.kyool.com/images/thumb.jpg',
        display_order: 1,
      },
    ],
  };

  describe('getContentLists', () => {
    it('should fetch content lists without filters', async () => {
      const mockResponse = {
        data: [mockContentList],
        pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      };
      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await getContentLists();

      expect(mockApiClient.get).toHaveBeenCalledWith('/content-lists?');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch content lists with filters', async () => {
      const mockResponse = {
        data: [mockContentList],
        pagination: { page: 1, limit: 10, total: 1, total_pages: 1 },
      };
      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const filters = {
        skip: 0,
        limit: 10,
        is_active: true,
        thumbnail_format: '810x1080' as const,
      };

      const result = await getContentLists(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/content-lists?skip=0&limit=10&is_active=true&thumbnail_format=810x1080'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getContentList', () => {
    it('should fetch a single content list', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockContentList });

      const result = await getContentList('content-list-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/content-lists/content-list-1');
      expect(result).toEqual(mockContentList);
    });
  });

  describe('createContentList', () => {
    it('should create a new content list', async () => {
      const createData: ContentListCreate = {
        title: 'New Content List',
        thumbnail_format: '1920x1080',
        list_type: 'carrousel',
        percentage_width: 80,
        percentage_height: 60,
        is_active: true,
        display_order: 2,
        latest_first: true, // v1.9 required field
        description: 'Test description',
        content_items: ['media1', 'media2'],
        content_types: ['media_description', 'media_description'],
      };

      mockApiClient.post.mockResolvedValue({ data: mockContentList });

      const result = await createContentList(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists', createData);
      expect(result).toEqual(mockContentList);
    });
  });

  describe('updateContentList', () => {
    it('should update an existing content list', async () => {
      const updateData: ContentListUpdate = {
        title: 'Updated Title',
        is_active: false,
      };

      mockApiClient.put.mockResolvedValue({ data: mockContentList });

      const result = await updateContentList('content-list-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/content-lists/content-list-1', updateData);
      expect(result).toEqual(mockContentList);
    });
  });

  describe('deleteContentList', () => {
    it('should delete a content list', async () => {
      mockApiClient.delete.mockResolvedValue({});

      await deleteContentList('content-list-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/content-lists/content-list-1');
    });
  });

  describe('getContentListJSON', () => {
    it('should fetch content list JSON cache', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockContentListJSON });

      const result = await getContentListJSON('content-list-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/content-lists/content-list-1/json');
      expect(result).toEqual(mockContentListJSON);
    });
  });

  describe('reorderContentList', () => {
    it('should reorder content in a list', async () => {
      const reorderData: ReorderContentRequest = {
        content_items: ['media3', 'prog1', 'season2'],
        content_types: ['media_description', 'program', 'season'],
      };

      mockApiClient.put.mockResolvedValue({ data: mockContentList });

      const result = await reorderContentList('content-list-1', reorderData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/content-lists/content-list-1/reorder', reorderData);
      expect(result).toEqual(mockContentList);
    });
  });

  describe('regenerateContentListJSON', () => {
    it('should regenerate JSON cache for a content list', async () => {
      mockApiClient.post.mockResolvedValue({});

      await regenerateContentListJSON('content-list-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists/content-list-1/regenerate-json');
    });
  });

  describe('Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Not Found';
      mockApiClient.get.mockRejectedValue(new Error(errorMessage));

      await expect(getContentList('non-existent-id')).rejects.toThrow(errorMessage);
    });

    it('should handle empty content_items arrays', async () => {
      const createData: ContentListCreate = {
        title: 'Empty List',
        thumbnail_format: '1080x1080',
        list_type: 'classic',
        percentage_width: 100,
        percentage_height: 100,
        is_active: true,
        display_order: 1,
        latest_first: true, // v1.9 required field
        content_items: [],
        content_types: [],
      };

      mockApiClient.post.mockResolvedValue({ data: { ...mockContentList, ...createData } });

      const result = await createContentList(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists', createData);
      expect(result.content_items).toEqual([]);
      expect(result.content_types).toEqual([]);
    });

    it('should handle missing optional fields', async () => {
      const minimalCreateData: ContentListCreate = {
        title: 'Minimal List',
        thumbnail_format: '1080x1920',
        list_type: 'classic',
        percentage_width: 100,
        percentage_height: 100,
        is_active: true,
        display_order: 1,
        latest_first: true, // v1.9 required field
      };

      mockApiClient.post.mockResolvedValue({ data: mockContentList });

      await createContentList(minimalCreateData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists', minimalCreateData);
    });
  });

  describe('autoGenerateContentLists', () => {
    it('should trigger auto-generation and return results', async () => {
      const mockResponse: AutoGenerationResponse = {
        message: 'Auto-generation completed',
        created_count: 24,
        updated_count: 0,
        skipped_count: 0,
        error_count: 0,
        errors: [],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await autoGenerateContentLists();

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists/auto-generate');
      expect(result).toEqual(mockResponse);
      expect(result.created_count).toBe(24);
      expect(result.errors).toEqual([]);
    });

    it('should handle auto-generation with errors', async () => {
      const mockResponse: AutoGenerationResponse = {
        message: 'Auto-generation completed with errors',
        created_count: 20,
        updated_count: 2,
        skipped_count: 0,
        error_count: 2,
        errors: [
          'Error processing video/animation/action: Database error',
          'Error processing webtoon/drama/romance: Theme not found',
        ],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await autoGenerateContentLists();

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists/auto-generate');
      expect(result).toEqual(mockResponse);
      expect(result.error_count).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle auto-generation API errors', async () => {
      const errorMessage = 'Unauthorized';
      mockApiClient.post.mockRejectedValue(new Error(errorMessage));

      await expect(autoGenerateContentLists()).rejects.toThrow(errorMessage);
      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists/auto-generate');
    });

    it('should handle idempotent auto-generation (second run)', async () => {
      const mockResponse: AutoGenerationResponse = {
        message: 'Auto-generation completed',
        created_count: 0,
        updated_count: 5,
        skipped_count: 43,
        error_count: 0,
        errors: [],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await autoGenerateContentLists();

      expect(result.created_count).toBe(0); // No new lists on second run
      expect(result.skipped_count).toBeGreaterThan(result.updated_count); // Mostly skipped
    });
  });

  describe('updateDynamicContentLists', () => {
    it('should trigger dynamic list update and return results', async () => {
      const mockResponse: DynamicListUpdateResponse = {
        message: 'Dynamic list update completed',
        processed_count: 15,
        updated_count: 8,
        skipped_count: 7,
        error_count: 0,
        errors: [],
        screens_updated: 3,
        screen_errors: [],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await updateDynamicContentLists();

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists/update-dynamic-lists');
      expect(result).toEqual(mockResponse);
      expect(result.processed_count).toBe(15);
      expect(result.updated_count).toBe(8);
      expect(result.errors).toEqual([]);
    });

    it('should handle dynamic update with errors', async () => {
      const mockResponse: DynamicListUpdateResponse = {
        message: 'Dynamic list update completed with errors',
        processed_count: 12,
        updated_count: 8,
        skipped_count: 2,
        error_count: 2,
        errors: [
          'Error processing content list "Animation + Action": Invalid theme ID',
          'Error processing content list "Drama Romance": Database connection failed',
        ],
        screens_updated: 1,
        screen_errors: ['Error updating screen "Homepage": Network timeout'],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await updateDynamicContentLists();

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists/update-dynamic-lists');
      expect(result).toEqual(mockResponse);
      expect(result.error_count).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle dynamic update API errors', async () => {
      const errorMessage = 'Unauthorized';
      mockApiClient.post.mockRejectedValue(new Error(errorMessage));

      await expect(updateDynamicContentLists()).rejects.toThrow(errorMessage);
      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists/update-dynamic-lists');
    });

    it('should handle dynamic update with no changes', async () => {
      const mockResponse: DynamicListUpdateResponse = {
        message: 'Dynamic list update completed',
        processed_count: 10,
        updated_count: 0,
        skipped_count: 10,
        error_count: 0,
        errors: [],
        screens_updated: 0,
        screen_errors: [],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await updateDynamicContentLists();

      expect(result.updated_count).toBe(0); // No updates needed
      expect(result.skipped_count).toBe(10); // All skipped due to no changes
      expect(result.processed_count).toBe(10); // All lists processed
    });

    it('should handle mixed results with season consolidation', async () => {
      const mockResponse: DynamicListUpdateResponse = {
        message: 'Dynamic list update completed',
        processed_count: 5,
        updated_count: 3,
        skipped_count: 2,
        error_count: 0,
        errors: [],
        screens_updated: 2,
        screen_errors: [],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await updateDynamicContentLists();

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists/update-dynamic-lists');
      expect(result.processed_count).toBe(5);
      expect(result.updated_count).toBe(3);
      expect(result.skipped_count).toBe(2);
    });
  });
});