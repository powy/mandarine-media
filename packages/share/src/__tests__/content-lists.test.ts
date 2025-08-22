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
} from '../api/content-lists';
import { apiClient } from '../api/client';
import type {
  ContentList,
  ContentListCreate,
  ContentListUpdate,
  ContentListJSON,
  ReorderContentRequest,
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
    thumbnail_format: 'medium_portrait',
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
    thumbnail_format: 'medium_portrait',
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
        thumbnail_format: 'medium_portrait' as const,
      };

      const result = await getContentLists(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/content-lists?skip=0&limit=10&is_active=true&thumbnail_format=medium_portrait'
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
        thumbnail_format: 'large_landscape',
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
        thumbnail_format: 'small_square',
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
        thumbnail_format: 'vertical_mobile',
        is_active: true,
        display_order: 1,
        latest_first: true, // v1.9 required field
      };

      mockApiClient.post.mockResolvedValue({ data: mockContentList });

      await createContentList(minimalCreateData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists', minimalCreateData);
    });
  });
});