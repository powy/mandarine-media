import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api/client';
import {
  getContentLists,
  getContentList,
  createContentList,
  getContentListJSON,
  reorderContentList,
  regenerateContentListJSON,
} from '../api/content-lists';
import {
  getScreenContents,
  getScreenContent,
  createScreenContent,
  getScreenContentJSON,
  getScreenContentByType,
} from '../api/screen-contents';
import { mediaApi } from '../api/media';
import { programsApi } from '../api/programs';
import { seasonsApi } from '../api/seasons';

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

describe('Integration Tests (v1.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Organization Workflow', () => {
    it('should support complete content organization workflow', async () => {
      // Step 1: Create content items (programs, seasons, media)
      const mockProgram = {
        id: 'program-1',
        program_name: 'Running Man',
        creation_date_utc: '2024-01-15T10:30:00Z',
      };

      const mockSeason = {
        id: 'season-1',
        program_id: 'program-1',
        season_number: 1,
        creation_date_utc: '2024-01-15T10:30:00Z',
      };

      const mockMedia = {
        id: 'media-1',
        file_number: 730,
        episode_title: 'Running Man - EP 730',
        media_type: 'video',
        creation_date_utc: '2024-01-15T10:30:00Z',
      };

      // Step 2: Create content list mixing different content types
      const contentListData = {
        title: 'Featured K-Entertainment',
        thumbnail_format: 'medium_portrait' as const,
        is_active: true,
        display_order: 1,
        description: 'Best Korean entertainment content',
        content_items: ['program-1', 'season-1', 'media-1'],
        content_types: ['program', 'season', 'media_description'],
      };

      const mockContentList = {
        id: 'content-list-1',
        ...contentListData,
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T14:30:00Z',
      };

      mockApiClient.post.mockResolvedValue({ data: mockContentList });

      const createdList = await createContentList(contentListData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/content/lists', contentListData);
      expect(createdList).toEqual(mockContentList);

      // Step 3: Create screen content with the content list
      const screenContentData = {
        title: 'Homepage Layout',
        is_active: true,
        display_order: 1,
        description: 'Main homepage content layout',
        content_lists: ['content-list-1'],
        screen_type: 'homepage',
      };

      const mockScreenContent = {
        id: 'screen-1',
        ...screenContentData,
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T14:30:00Z',
      };

      mockApiClient.post.mockResolvedValue({ data: mockScreenContent });

      const createdScreen = await createScreenContent(screenContentData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/screen/contents', screenContentData);
      expect(createdScreen).toEqual(mockScreenContent);
    });

    it('should handle content reordering within lists', async () => {
      // Initial order
      const initialOrder = {
        content_items: ['program-1', 'season-1', 'media-1'],
        content_types: ['program', 'season', 'media_description'],
      };

      // New order after reordering
      const newOrder = {
        content_items: ['media-1', 'program-1', 'season-1'],
        content_types: ['media_description', 'program', 'season'],
      };

      const mockUpdatedList = {
        id: 'content-list-1',
        title: 'Reordered List',
        thumbnail_format: 'medium_portrait' as const,
        is_active: true,
        display_order: 1,
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T15:00:00Z',
        ...newOrder,
      };

      mockApiClient.put.mockResolvedValue({ data: mockUpdatedList });

      const result = await reorderContentList('content-list-1', newOrder);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/content/lists/content-list-1/reorder', newOrder);
      expect(result.content_items).toEqual(['media-1', 'program-1', 'season-1']);
      expect(result.content_types).toEqual(['media_description', 'program', 'season']);
    });
  });

  describe('JSON Caching Workflow', () => {
    it('should handle complete JSON caching workflow', async () => {
      // Step 1: Get content list with metadata
      const mockContentList = {
        id: 'content-list-1',
        title: 'Cached List',
        thumbnail_format: 'large_landscape' as const,
        is_active: true,
        display_order: 1,
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T14:30:00Z',
        json_last_updated: '2024-01-15T14:30:00Z',
      };

      mockApiClient.get.mockResolvedValue({ data: mockContentList });

      const contentList = await getContentList('content-list-1');

      expect(contentList.json_last_updated).toBeDefined();

      // Step 2: Get JSON cached version
      const mockJSONResponse = {
        id: 'content-list-1',
        title: 'Cached List',
        thumbnail_format: 'large_landscape' as const,
        description: undefined,
        last_updated: '2024-01-15T14:30:00Z',
        items: [
          {
            content_id: 'program-1',
            content_type: 'program' as const,
            title: 'Running Man',
            thumbnail_url: 'https://cdn.kyool.com/images/running-man.jpg',
            display_order: 1,
          },
          {
            content_id: 'media-1',
            content_type: 'media_description' as const,
            title: 'Running Man - EP 730',
            thumbnail_url: 'https://cdn.kyool.com/images/ep730.jpg',
            display_order: 2,
          },
        ],
      };

      mockApiClient.get.mockResolvedValue({ data: mockJSONResponse });

      const jsonCache = await getContentListJSON('content-list-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/content/lists/content-list-1/json');
      expect(jsonCache.items).toHaveLength(2);
      expect(jsonCache.items[0].content_type).toBe('program');
      expect(jsonCache.items[1].content_type).toBe('media_description');

      // Step 3: Regenerate cache
      mockApiClient.post.mockResolvedValue({});

      await regenerateContentListJSON('content-list-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/content/lists/content-list-1/regenerate-json');
    });

    it('should handle screen content JSON caching', async () => {
      const mockScreenJSON = {
        id: 'screen-1',
        title: 'Homepage',
        description: 'Main homepage',
        screen_type: 'homepage',
        last_updated: '2024-01-15T14:30:00Z',
        content_lists: [
          {
            id: 'list-1',
            title: 'Trending',
            thumbnail_format: 'medium_portrait' as const,
            last_updated: '2024-01-15T14:30:00Z',
            items: [
              {
                content_id: 'program-1',
                content_type: 'program' as const,
                title: 'Running Man',
                display_order: 1,
              },
            ],
          },
          {
            id: 'list-2',
            title: 'Recent Episodes',
            thumbnail_format: 'small_square' as const,
            last_updated: '2024-01-15T14:30:00Z',
            items: [],
          },
        ],
      };

      mockApiClient.get.mockResolvedValue({ data: mockScreenJSON });

      const screenJSON = await getScreenContentJSON('screen-1');

      expect(screenJSON.content_lists).toHaveLength(2);
      expect(screenJSON.content_lists[0].items).toHaveLength(1);
      expect(screenJSON.content_lists[1].items).toHaveLength(0);
    });
  });

  describe('Multi-screen Type Support', () => {
    it('should support different screen types', async () => {
      const screenTypes = ['homepage', 'category', 'search', 'profile', 'discover'];

      for (const screenType of screenTypes) {
        const mockScreens = [
          {
            id: `screen-${screenType}`,
            title: `${screenType} Screen`,
            screen_type: screenType,
            is_active: true,
            display_order: 1,
            creation_date_utc: '2024-01-15T10:30:00Z',
            last_updated_utc: '2024-01-15T14:30:00Z',
          },
        ];

        mockApiClient.get.mockResolvedValue({ data: mockScreens });

        const screens = await getScreenContentByType(screenType);

        expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/screen/contents/by-type/${screenType}`);
        expect(screens).toEqual(mockScreens);
        expect(screens[0].screen_type).toBe(screenType);
      }
    });
  });

  describe('Cross-API Integration', () => {
    it('should integrate with existing API endpoints', async () => {
      // Test that new v1.6 endpoints work with existing v1.5 data
      const mockPrograms = [
        {
          id: 'program-1',
          program_name: 'Running Man',
          creation_date_utc: '2024-01-15T10:30:00Z',
        },
      ];

      const mockSeasons = [
        {
          id: 'season-1',
          program_id: 'program-1',
          season_number: 1,
          creation_date_utc: '2024-01-15T10:30:00Z',
        },
      ];

      const mockMedia = {
        data: [
          {
            id: 'media-1',
            file_number: 730,
            episode_title: 'Running Man - EP 730',
            media_type: 'video',
            program_id: 'program-1',
            season_id: 'season-1',
            creation_date_utc: '2024-01-15T10:30:00Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      };

      // Mock API calls
      mockApiClient.get
        .mockResolvedValueOnce({ data: mockPrograms })
        .mockResolvedValueOnce({ data: mockSeasons })
        .mockResolvedValueOnce({ data: mockMedia });

      // Get existing content
      const programs = await programsApi.getAll();
      const seasons = await seasonsApi.getAll();
      const media = await mediaApi.getMediaDescriptions();

      expect(programs).toHaveLength(1);
      expect(seasons).toHaveLength(1);
      expect(media.data).toHaveLength(1);

      // Create content list that references this existing content
      const contentListData = {
        title: 'Integrated Content',
        thumbnail_format: 'medium_portrait' as const,
        is_active: true,
        display_order: 1,
        content_items: [programs[0].id, seasons[0].id, media.data[0].id],
        content_types: ['program', 'season', 'media_description'],
      };

      const mockCreatedList = {
        id: 'integrated-list',
        ...contentListData,
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T14:30:00Z',
      };

      mockApiClient.post.mockResolvedValue({ data: mockCreatedList });

      const createdList = await createContentList(contentListData);

      expect(createdList.content_items).toEqual(['program-1', 'season-1', 'media-1']);
      expect(createdList.content_types).toEqual(['program', 'season', 'media_description']);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network failures gracefully', async () => {
      const networkError = new Error('Network Error');
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(getContentLists()).rejects.toThrow('Network Error');
      await expect(getScreenContents()).rejects.toThrow('Network Error');
    });

    it('should handle server errors gracefully', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(serverError);

      await expect(getContentList('list-1')).rejects.toMatchObject({
        response: {
          status: 500,
          data: {
            error: {
              code: 'INTERNAL_ERROR',
            },
          },
        },
      });
    });

    it('should handle validation errors on creation', async () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid thumbnail format',
              details: {
                field: 'thumbnail_format',
                allowed_values: ['small_square', 'medium_portrait', 'large_landscape', 'vertical_mobile'],
              },
            },
          },
        },
      };

      mockApiClient.post.mockRejectedValue(validationError);

      const invalidData = {
        title: 'Invalid List',
        thumbnail_format: 'invalid_format' as any,
        is_active: true,
        display_order: 1,
      };

      await expect(createContentList(invalidData)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
            },
          },
        },
      });
    });
  });
});