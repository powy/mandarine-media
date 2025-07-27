import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getScreenContents,
  getScreenContent,
  createScreenContent,
  updateScreenContent,
  deleteScreenContent,
  getScreenContentJSON,
  reorderScreenContentLists,
  regenerateScreenContentJSON,
  getScreenContentByType,
} from '../api/screen-contents';
import { apiClient } from '../api/client';
import type {
  ScreenContent,
  ScreenContentCreate,
  ScreenContentUpdate,
  ScreenContentJSON,
  ReorderListsRequest,
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

describe('Screen Contents API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockScreenContent: ScreenContent = {
    id: 'screen-content-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    last_updated_utc: '2024-01-15T14:30:00Z',
    title: 'Homepage',
    is_active: true,
    display_order: 1,
    description: 'Main homepage content layout',
    content_lists: ['list1', 'list2', 'list3'],
    screen_type: 'homepage',
  };

  const mockScreenContentJSON: ScreenContentJSON = {
    id: 'screen-content-1',
    title: 'Homepage',
    description: 'Main homepage content layout',
    screen_type: 'homepage',
    last_updated: '2024-01-15T14:30:00Z',
    content_lists: [
      {
        id: 'list1',
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
      },
    ],
  };

  describe('getScreenContents', () => {
    it('should fetch screen contents without filters', async () => {
      const mockResponse = {
        data: [mockScreenContent],
        pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      };
      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await getScreenContents();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/screen/contents?');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch screen contents with filters', async () => {
      const mockResponse = {
        data: [mockScreenContent],
        pagination: { page: 1, limit: 10, total: 1, total_pages: 1 },
      };
      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const filters = {
        skip: 0,
        limit: 10,
        is_active: true,
        screen_type: 'homepage',
      };

      const result = await getScreenContents(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/screen/contents?skip=0&limit=10&is_active=true&screen_type=homepage'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getScreenContent', () => {
    it('should fetch a single screen content', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockScreenContent });

      const result = await getScreenContent('screen-content-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/screen/contents/screen-content-1');
      expect(result).toEqual(mockScreenContent);
    });
  });

  describe('createScreenContent', () => {
    it('should create a new screen content', async () => {
      const createData: ScreenContentCreate = {
        title: 'New Screen',
        is_active: true,
        display_order: 2,
        description: 'Test screen layout',
        content_lists: ['list1', 'list2'],
        screen_type: 'category',
      };

      mockApiClient.post.mockResolvedValue({ data: mockScreenContent });

      const result = await createScreenContent(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/screen/contents', createData);
      expect(result).toEqual(mockScreenContent);
    });
  });

  describe('updateScreenContent', () => {
    it('should update an existing screen content', async () => {
      const updateData: ScreenContentUpdate = {
        title: 'Updated Screen Title',
        is_active: false,
        screen_type: 'discover',
      };

      mockApiClient.put.mockResolvedValue({ data: mockScreenContent });

      const result = await updateScreenContent('screen-content-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/screen/contents/screen-content-1', updateData);
      expect(result).toEqual(mockScreenContent);
    });
  });

  describe('deleteScreenContent', () => {
    it('should delete a screen content', async () => {
      mockApiClient.delete.mockResolvedValue({});

      await deleteScreenContent('screen-content-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/screen/contents/screen-content-1');
    });
  });

  describe('getScreenContentJSON', () => {
    it('should fetch screen content JSON cache', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockScreenContentJSON });

      const result = await getScreenContentJSON('screen-content-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/screen/contents/screen-content-1/json');
      expect(result).toEqual(mockScreenContentJSON);
    });
  });

  describe('reorderScreenContentLists', () => {
    it('should reorder content lists in a screen', async () => {
      const reorderData: ReorderListsRequest = {
        content_lists: ['list3', 'list1', 'list2'],
      };

      mockApiClient.put.mockResolvedValue({ data: mockScreenContent });

      const result = await reorderScreenContentLists('screen-content-1', reorderData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/screen/contents/screen-content-1/reorder-lists', reorderData);
      expect(result).toEqual(mockScreenContent);
    });
  });

  describe('regenerateScreenContentJSON', () => {
    it('should regenerate JSON cache for a screen content', async () => {
      mockApiClient.post.mockResolvedValue({});

      await regenerateScreenContentJSON('screen-content-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/screen/contents/screen-content-1/regenerate-json');
    });
  });

  describe('getScreenContentByType', () => {
    it('should fetch screen contents by type', async () => {
      const mockScreenContents = [mockScreenContent];
      mockApiClient.get.mockResolvedValue({ data: mockScreenContents });

      const result = await getScreenContentByType('homepage');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/screen/contents/by-type/homepage');
      expect(result).toEqual(mockScreenContents);
    });
  });

  describe('Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Forbidden';
      mockApiClient.get.mockRejectedValue(new Error(errorMessage));

      await expect(getScreenContent('non-existent-id')).rejects.toThrow(errorMessage);
    });

    it('should handle empty content_lists arrays', async () => {
      const createData: ScreenContentCreate = {
        title: 'Empty Screen',
        is_active: true,
        display_order: 1,
        content_lists: [],
      };

      mockApiClient.post.mockResolvedValue({ data: { ...mockScreenContent, content_lists: [] } });

      const result = await createScreenContent(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/screen/contents', createData);
      expect(result.content_lists).toEqual([]);
    });

    it('should handle missing optional fields', async () => {
      const minimalCreateData: ScreenContentCreate = {
        title: 'Minimal Screen',
        is_active: true,
        display_order: 1,
      };

      mockApiClient.post.mockResolvedValue({ data: mockScreenContent });

      await createScreenContent(minimalCreateData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/screen/contents', minimalCreateData);
    });

    it('should handle network timeouts', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network timeout'));

      await expect(getScreenContents()).rejects.toThrow('Network timeout');
    });

    it('should handle different screen types', async () => {
      const screenTypes = ['homepage', 'category', 'search', 'profile', 'discover'];
      
      for (const screenType of screenTypes) {
        mockApiClient.get.mockResolvedValue({ data: [mockScreenContent] });
        
        await getScreenContentByType(screenType);
        
        expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/screen/contents/by-type/${screenType}`);
      }
    });
  });
});