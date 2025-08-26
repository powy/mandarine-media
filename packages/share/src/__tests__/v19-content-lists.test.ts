import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getContentLists,
  getContentList,
  createContentList,
  updateContentList,
  deleteContentList,
} from '../api/content-lists';
import { apiClient } from '../api/client';
import type {
  ContentList,
  ContentListCreate,
  ContentListUpdate,
  ThumbnailFormatEnum,
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

describe('Content Lists API v1.9 Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContentListV19: ContentList = {
    id: 'content-list-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    last_updated_utc: '2024-01-15T14:30:00Z',
    title: 'Trending K-Dramas',
    thumbnail_format: '810x1080' as ThumbnailFormatEnum,
    is_active: true,
    display_order: 1,
    latest_first: true, // v1.9 required field
    description: 'Popular Korean dramas this week',
    content_items: ['prog1', 'season2', 'media3'],
    content_types: ['program', 'season', 'media_description'],
    // v1.9 new filtering fields
    media_type: 'video',
    media_categories_id_list: ['korean-drama', 'romance'],
    themes_and_genres_id_list: ['drama', 'romance', 'comedy'],
    slug: 'trending_k_dramas', // v1.9 new field
  };

  describe('v1.9 New Fields', () => {
    describe('createContentList with v1.9 fields', () => {
      it('should create content list with latest_first field (required)', async () => {
        const createData: ContentListCreate = {
          title: 'New Content List',
          thumbnail_format: '810x1080',
          is_active: true,
          display_order: 1,
          latest_first: true, // v1.9 required field
        };

        mockApiClient.post.mockResolvedValue({ data: mockContentListV19 });

        const result = await createContentList(createData);

        expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists', createData);
        expect(result.latest_first).toBe(true);
      });

      it('should create content list with filtering capabilities', async () => {
        const createData: ContentListCreate = {
          title: 'Korean Drama Videos',
          thumbnail_format: '810x1080',
          is_active: true,
          display_order: 1,
          latest_first: true,
          // v1.9 new filtering fields
          media_type: 'video',
          media_categories_id_list: ['korean-drama-cat'],
          themes_and_genres_id_list: ['romance', 'comedy'],
          slug: 'korean_drama_videos',
        };

        const expectedResponse = {
          ...mockContentListV19,
          media_type: 'video',
          media_categories_id_list: ['korean-drama-cat'],
          themes_and_genres_id_list: ['romance', 'comedy'],
          slug: 'korean_drama_videos',
        };

        mockApiClient.post.mockResolvedValue({ data: expectedResponse });

        const result = await createContentList(createData);

        expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists', createData);
        expect(result.media_type).toBe('video');
        expect(result.media_categories_id_list).toEqual(['korean-drama-cat']);
        expect(result.themes_and_genres_id_list).toEqual(['romance', 'comedy']);
        expect(result.slug).toBe('korean_drama_videos');
      });

      it('should create content list with auto-generated slug', async () => {
        const createData: ContentListCreate = {
          title: 'Auto Generated Slug List',
          thumbnail_format: '1920x1080',
          is_active: true,
          display_order: 2,
          latest_first: false,
          media_type: 'webtoon',
          media_categories_id_list: ['manga', 'korean'],
          // slug not provided - should be auto-generated
        };

        const expectedResponse = {
          ...mockContentListV19,
          title: 'Auto Generated Slug List',
          slug: 'manga_korean_webtoon', // auto-generated from filters
          media_type: 'webtoon',
          media_categories_id_list: ['manga', 'korean'],
          latest_first: false,
        };

        mockApiClient.post.mockResolvedValue({ data: expectedResponse });

        const result = await createContentList(createData);

        expect(result.slug).toBe('manga_korean_webtoon');
        expect(result.media_type).toBe('webtoon');
        expect(result.latest_first).toBe(false);
      });
    });

    describe('updateContentList with v1.9 fields', () => {
      it('should update content list with new v1.9 fields', async () => {
        const updateData: ContentListUpdate = {
          title: 'Updated Title',
          latest_first: false, // v1.9 field
          media_type: 'trailer',
          media_categories_id_list: ['action', 'thriller'],
          themes_and_genres_id_list: ['suspense'],
          slug: 'updated_action_trailers',
        };

        const expectedResponse = {
          ...mockContentListV19,
          ...updateData,
        };

        mockApiClient.put.mockResolvedValue({ data: expectedResponse });

        const result = await updateContentList('content-list-1', updateData);

        expect(mockApiClient.put).toHaveBeenCalledWith('/content-lists/content-list-1', updateData);
        expect(result.latest_first).toBe(false);
        expect(result.media_type).toBe('trailer');
        expect(result.slug).toBe('updated_action_trailers');
      });
    });
  });

  describe('Media Type Filtering', () => {
    it('should support all media types', async () => {
      const mediaTypes: Array<'video' | 'webtoon' | 'trailer' | 'teaser' | 'excerpt'> = [
        'video', 'webtoon', 'trailer', 'teaser', 'excerpt'
      ];

      for (const mediaType of mediaTypes) {
        const createData: ContentListCreate = {
          title: `${mediaType} Content`,
          thumbnail_format: '1080x1080',
          is_active: true,
          display_order: 1,
          latest_first: true,
          media_type: mediaType,
        };

        const expectedResponse = {
          ...mockContentListV19,
          media_type: mediaType,
          title: `${mediaType} Content`,
        };

        mockApiClient.post.mockResolvedValue({ data: expectedResponse });

        const result = await createContentList(createData);

        expect(result.media_type).toBe(mediaType);
      }
    });
  });

  describe('Slug Auto-generation', () => {
    it('should handle empty slug with filtering (auto-generated)', async () => {
      const createData: ContentListCreate = {
        title: 'Drama Collection',
        thumbnail_format: '1080x1920',
        is_active: true,
        display_order: 1,
        latest_first: true,
        media_type: 'video',
        media_categories_id_list: ['drama', 'korean'],
        themes_and_genres_id_list: ['romance', 'family'],
        // No slug provided - should be auto-generated from filters
      };

      const expectedResponse = {
        ...mockContentListV19,
        slug: 'drama_korean_romance_family_video', // Generated from filters
      };

      mockApiClient.post.mockResolvedValue({ data: expectedResponse });

      const result = await createContentList(createData);

      expect(result.slug).toBe('drama_korean_romance_family_video');
    });

    it('should handle empty slug without filtering (auto-generated from title)', async () => {
      const createData: ContentListCreate = {
        title: 'My Favorite Shows',
        thumbnail_format: '1920x1080',
        is_active: true,
        display_order: 1,
        latest_first: true,
        // No filtering fields, no slug - should be generated from title
      };

      const expectedResponse = {
        ...mockContentListV19,
        title: 'My Favorite Shows',
        slug: 'my_favorite_shows', // Generated from title
        media_type: undefined,
        media_categories_id_list: undefined,
        themes_and_genres_id_list: undefined,
      };

      mockApiClient.post.mockResolvedValue({ data: expectedResponse });

      const result = await createContentList(createData);

      expect(result.slug).toBe('my_favorite_shows');
      expect(result.title).toBe('My Favorite Shows');
    });
  });

  describe('Validation', () => {
    it('should require latest_first field', () => {
      // TypeScript should enforce this at compile time
      const createData: ContentListCreate = {
        title: 'Test List',
        thumbnail_format: '810x1080',
        is_active: true,
        display_order: 1,
        latest_first: true, // This is required in v1.9
      };

      expect(createData.latest_first).toBeDefined();
      expect(typeof createData.latest_first).toBe('boolean');
    });

    it('should handle all thumbnail formats', async () => {
      const formats: ThumbnailFormatEnum[] = [
        '1080x1080', '810x1080', '1920x1080', '1080x1920', '1920x720'
      ];

      for (const format of formats) {
        const createData: ContentListCreate = {
          title: `${format} List`,
          thumbnail_format: format,
          is_active: true,
          display_order: 1,
          latest_first: true,
        };

        const expectedResponse = {
          ...mockContentListV19,
          thumbnail_format: format,
        };

        mockApiClient.post.mockResolvedValue({ data: expectedResponse });

        const result = await createContentList(createData);

        expect(result.thumbnail_format).toBe(format);
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with existing content lists without v1.9 fields', async () => {
      const legacyContentList: ContentList = {
        id: 'legacy-list-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated_utc: '2024-01-01T00:00:00Z',
        title: 'Legacy List',
        thumbnail_format: '810x1080',
        is_active: true,
        display_order: 1,
        latest_first: true, // Required in v1.9 but wasn't in v1.8
        // v1.9 fields are optional
      };

      mockApiClient.get.mockResolvedValue({ data: legacyContentList });

      const result = await getContentList('legacy-list-1');

      expect(result.latest_first).toBe(true);
      expect(result.media_type).toBeUndefined();
      expect(result.slug).toBeUndefined();
    });
  });

  describe('URL Structure', () => {
    it('should use flat URL structure for all endpoints', async () => {
      // Test all endpoints use the new flat structure
      mockApiClient.get.mockResolvedValue({ data: { data: [mockContentListV19] } });
      await getContentLists();
      expect(mockApiClient.get).toHaveBeenCalledWith('/content-lists?');

      mockApiClient.get.mockResolvedValue({ data: mockContentListV19 });
      await getContentList('test-id');
      expect(mockApiClient.get).toHaveBeenCalledWith('/content-lists/test-id');

      mockApiClient.post.mockResolvedValue({ data: mockContentListV19 });
      await createContentList({
        title: 'Test',
        thumbnail_format: '810x1080',
        is_active: true,
        display_order: 1,
        latest_first: true,
      });
      expect(mockApiClient.post).toHaveBeenCalledWith('/content-lists', expect.any(Object));

      mockApiClient.put.mockResolvedValue({ data: mockContentListV19 });
      await updateContentList('test-id', { title: 'Updated' });
      expect(mockApiClient.put).toHaveBeenCalledWith('/content-lists/test-id', expect.any(Object));

      mockApiClient.delete.mockResolvedValue({});
      await deleteContentList('test-id');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/content-lists/test-id');
    });
  });
});