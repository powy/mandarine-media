import { describe, it, expect } from 'vitest';
import type {
  ThumbnailFormatEnum,
  ContentList,
  ContentListCreate,
  ContentListUpdate,
  ContentListJSON,
  ContentListItemJSON,
  ScreenContent,
  ScreenContentCreate,
  ScreenContentUpdate,
  ScreenContentJSON,
  ReorderContentRequest,
  ReorderListsRequest,
  MediaDescription,
} from '../types';

describe('v1.6 Types Validation', () => {
  describe('ThumbnailFormatEnum', () => {
    it('should accept all valid thumbnail format values', () => {
      const validFormats: ThumbnailFormatEnum[] = [
        '1080x1080',
        '810x1080',
        '1920x1080',
        '1080x1920',
      ];

      validFormats.forEach(format => {
        expect(typeof format).toBe('string');
        expect(['1080x1080', '810x1080', '1920x1080', '1080x1920']).toContain(format);
      });
    });
  });

  describe('ContentList Interface', () => {
    it('should have correct ContentList structure', () => {
      const mockContentList: ContentList = {
        id: 'content-list-1',
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T14:30:00Z',
        title: 'Trending K-Dramas',
        thumbnail_format: '810x1080',
        is_active: true,
        display_order: 1,
        description: 'Popular Korean dramas this week',
        content_items: ['prog1', 'season2', 'media3'],
        content_types: ['program', 'season', 'media_description'],
        json_content: '{"id": "content-list-1", "items": []}',
        json_last_updated: '2024-01-15T14:30:00Z',
      };

      // Required fields
      expect(typeof mockContentList.id).toBe('string');
      expect(typeof mockContentList.creation_date_utc).toBe('string');
      expect(typeof mockContentList.last_updated_utc).toBe('string');
      expect(typeof mockContentList.title).toBe('string');
      expect(typeof mockContentList.thumbnail_format).toBe('string');
      expect(typeof mockContentList.is_active).toBe('boolean');
      expect(typeof mockContentList.display_order).toBe('number');

      // Optional fields
      expect(typeof mockContentList.description).toBe('string');
      expect(Array.isArray(mockContentList.content_items)).toBe(true);
      expect(Array.isArray(mockContentList.content_types)).toBe(true);
      expect(typeof mockContentList.json_content).toBe('string');
      expect(typeof mockContentList.json_last_updated).toBe('string');
    });

    it('should accept minimal ContentList without optional fields', () => {
      const minimalContentList: ContentList = {
        id: 'minimal-list',
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T14:30:00Z',
        title: 'Minimal List',
        thumbnail_format: '1080x1080',
        is_active: true,
        display_order: 1,
      };

      expect(minimalContentList.description).toBeUndefined();
      expect(minimalContentList.content_items).toBeUndefined();
      expect(minimalContentList.content_types).toBeUndefined();
    });
  });

  describe('ContentListCreate Interface', () => {
    it('should have correct ContentListCreate structure', () => {
      const createData: ContentListCreate = {
        title: 'New Content List',
        thumbnail_format: '1920x1080',
        is_active: true,
        display_order: 2,
        description: 'Test description',
        content_items: ['media1', 'media2'],
        content_types: ['media_description', 'media_description'],
      };

      // Required fields for creation
      expect(typeof createData.title).toBe('string');
      expect(typeof createData.thumbnail_format).toBe('string');
      expect(typeof createData.is_active).toBe('boolean');
      expect(typeof createData.display_order).toBe('number');

      // Optional fields
      expect(typeof createData.description).toBe('string');
      expect(Array.isArray(createData.content_items)).toBe(true);
      expect(Array.isArray(createData.content_types)).toBe(true);
    });
  });

  describe('ScreenContent Interface', () => {
    it('should have correct ScreenContent structure', () => {
      const mockScreenContent: ScreenContent = {
        id: 'screen-1',
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T14:30:00Z',
        title: 'Homepage',
        is_active: true,
        display_order: 1,
        description: 'Main homepage layout',
        content_lists: ['list1', 'list2'],
        screen_type: 'homepage',
        json_content: '{"screen": "data"}',
        json_last_updated: '2024-01-15T14:30:00Z',
      };

      // Required fields
      expect(typeof mockScreenContent.id).toBe('string');
      expect(typeof mockScreenContent.creation_date_utc).toBe('string');
      expect(typeof mockScreenContent.last_updated_utc).toBe('string');
      expect(typeof mockScreenContent.title).toBe('string');
      expect(typeof mockScreenContent.is_active).toBe('boolean');
      expect(typeof mockScreenContent.display_order).toBe('number');

      // Optional fields
      expect(typeof mockScreenContent.description).toBe('string');
      expect(Array.isArray(mockScreenContent.content_lists)).toBe(true);
      expect(typeof mockScreenContent.screen_type).toBe('string');
    });
  });

  describe('JSON Response Types', () => {
    it('should have correct ContentListJSON structure', () => {
      const jsonResponse: ContentListJSON = {
        id: 'list-1',
        title: 'JSON List',
        thumbnail_format: '1080x1920',
        description: 'JSON description',
        last_updated: '2024-01-15T14:30:00Z',
        items: [
          {
            content_id: 'content-1',
            content_type: 'program',
            title: 'Content Title',
            thumbnail_url: 'https://example.com/thumb.jpg',
            display_order: 1,
          },
        ],
      };

      expect(typeof jsonResponse.id).toBe('string');
      expect(typeof jsonResponse.title).toBe('string');
      expect(typeof jsonResponse.thumbnail_format).toBe('string');
      expect(Array.isArray(jsonResponse.items)).toBe(true);
      expect(jsonResponse.items[0].content_type).toBe('program');
    });

    it('should have correct ScreenContentJSON structure', () => {
      const screenJSON: ScreenContentJSON = {
        id: 'screen-1',
        title: 'Screen Title',
        description: 'Screen description',
        screen_type: 'category',
        last_updated: '2024-01-15T14:30:00Z',
        content_lists: [
          {
            id: 'list-1',
            title: 'List Title',
            thumbnail_format: '810x1080',
            last_updated: '2024-01-15T14:30:00Z',
            items: [],
          },
        ],
      };

      expect(typeof screenJSON.id).toBe('string');
      expect(typeof screenJSON.title).toBe('string');
      expect(Array.isArray(screenJSON.content_lists)).toBe(true);
      expect(screenJSON.content_lists[0].thumbnail_format).toBe('810x1080');
    });
  });

  describe('Request Types', () => {
    it('should have correct ReorderContentRequest structure', () => {
      const reorderRequest: ReorderContentRequest = {
        content_items: ['item1', 'item2', 'item3'],
        content_types: ['program', 'season', 'media_description'],
      };

      expect(Array.isArray(reorderRequest.content_items)).toBe(true);
      expect(Array.isArray(reorderRequest.content_types)).toBe(true);
      expect(reorderRequest.content_items.length).toBe(reorderRequest.content_types.length);
    });

    it('should have correct ReorderListsRequest structure', () => {
      const reorderListsRequest: ReorderListsRequest = {
        content_lists: ['list1', 'list2', 'list3'],
      };

      expect(Array.isArray(reorderListsRequest.content_lists)).toBe(true);
    });
  });

  describe('Updated MediaDescription for v1.6', () => {
    it('should support updated image fields', () => {
      const mediaDescription: MediaDescription = {
        id: 'media-1',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_number: 1246,
        episode_title: 'Test Episode',
        media_type: 'video',
        // Updated fields for v1.6
        image_mobile_home: 'mobile-image-id',
        image_desktop_home: 'desktop-image-id',
        additional_images_id_list: ['image1', 'image2', 'image3'],
        // Keep existing fields
        image_fullscreen: 'fullscreen-image-id',
        image_thumbnail1: 'thumb1-id',
        image_thumbnail2: 'thumb2-id',
      };

      expect(typeof mediaDescription.image_mobile_home).toBe('string');
      expect(typeof mediaDescription.image_desktop_home).toBe('string');
      expect(Array.isArray(mediaDescription.additional_images_id_list)).toBe(true);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle empty arrays gracefully', () => {
      const emptyContentList: ContentList = {
        id: 'empty-list',
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T14:30:00Z',
        title: 'Empty List',
        thumbnail_format: '1080x1080',
        is_active: true,
        display_order: 1,
        content_items: [],
        content_types: [],
      };

      expect(emptyContentList.content_items).toEqual([]);
      expect(emptyContentList.content_types).toEqual([]);
    });

    it('should support all thumbnail formats', () => {
      const formats: ThumbnailFormatEnum[] = [
        '1080x1080',
        '810x1080', 
        '1920x1080',
        '1080x1920',
      ];

      formats.forEach(format => {
        const contentList: ContentList = {
          id: `list-${format}`,
          creation_date_utc: '2024-01-15T10:30:00Z',
          last_updated_utc: '2024-01-15T14:30:00Z',
          title: `List with ${format}`,
          thumbnail_format: format,
          is_active: true,
          display_order: 1,
        };

        expect(contentList.thumbnail_format).toBe(format);
      });
    });

    it('should support all content types', () => {
      const contentTypes: Array<'program' | 'season' | 'media_description'> = [
        'program',
        'season',
        'media_description',
      ];

      contentTypes.forEach(type => {
        const itemJSON: ContentListItemJSON = {
          content_id: `${type}-1`,
          content_type: type,
          title: `${type} Title`,
          display_order: 1,
        };

        expect(itemJSON.content_type).toBe(type);
      });
    });

    it('should handle large arrays efficiently', () => {
      const largeContentItems = Array.from({ length: 1000 }, (_, i) => `item-${i}`);
      const largeContentTypes = Array.from({ length: 1000 }, () => 'media_description' as const);

      const largeContentList: ContentList = {
        id: 'large-list',
        creation_date_utc: '2024-01-15T10:30:00Z',
        last_updated_utc: '2024-01-15T14:30:00Z',
        title: 'Large List',
        thumbnail_format: '810x1080',
        is_active: true,
        display_order: 1,
        content_items: largeContentItems,
        content_types: largeContentTypes,
      };

      expect(largeContentList.content_items?.length).toBe(1000);
      expect(largeContentList.content_types?.length).toBe(1000);
    });
  });
});