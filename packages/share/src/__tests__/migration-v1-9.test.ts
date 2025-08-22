import { describe, it, expect } from 'vitest';
import {
  migrateMediaDescriptionV18toV19,
  migrateScreenContentV18toV19,
  migrateContentListV18toV19,
  migrateVideoFileV18toV19,
  migrateURLV18toV19,
  getEndpointPath,
  generateSlugFromText,
  generateSlugFromFileName,
  generateSlugFromContentListFilters,
  validateV19ContentList,
  validateV19MediaDescription,
  migrationV19Utils,
} from '../utils/migration-v1-9';

describe('Migration v1.9 Utilities', () => {
  describe('Data Transformation', () => {
    describe('migrateMediaDescriptionV18toV19', () => {
      it('should rename human_keywords_text_list to tag_text_list', () => {
        const v18Data = {
          id: 'media-1',
          episode_title: 'Running Man - EP 730',
          human_keywords_text_list: ['drama', 'kpop'],
          descriptive_summary_text: 'Great episode',
        };

        const migrated = migrateMediaDescriptionV18toV19(v18Data);

        expect(migrated).toEqual({
          id: 'media-1',
          episode_title: 'Running Man - EP 730',
          tag_text_list: ['drama', 'kpop'],
          descriptive_summary_text: 'Great episode',
        });
        expect(migrated).not.toHaveProperty('human_keywords_text_list');
      });

      it('should rename friendly_url to slug', () => {
        const v18Data = {
          id: 'media-1',
          episode_title: 'Running Man - EP 730',
          friendly_url: 'running-man-ep-730',
        };

        const migrated = migrateMediaDescriptionV18toV19(v18Data);

        expect(migrated).toEqual({
          id: 'media-1',
          episode_title: 'Running Man - EP 730',
          slug: 'running-man-ep-730',
        });
        expect(migrated).not.toHaveProperty('friendly_url');
      });

      it('should handle both field renames together', () => {
        const v18Data = {
          id: 'media-1',
          episode_title: 'Running Man - EP 730',
          human_keywords_text_list: ['variety', 'korean'],
          friendly_url: 'running-man-ep-730',
          production_year: 2024,
        };

        const migrated = migrateMediaDescriptionV18toV19(v18Data);

        expect(migrated).toEqual({
          id: 'media-1',
          episode_title: 'Running Man - EP 730',
          tag_text_list: ['variety', 'korean'],
          slug: 'running-man-ep-730',
          production_year: 2024,
        });
      });

      it('should handle data without v1.8 fields', () => {
        const v18Data = {
          id: 'media-1',
          episode_title: 'New Content',
          production_year: 2024,
        };

        const migrated = migrateMediaDescriptionV18toV19(v18Data);

        expect(migrated).toEqual(v18Data);
      });
    });

    describe('migrateContentListV18toV19', () => {
      it('should add required latest_first field with default value', () => {
        const v18Data = {
          id: 'list-1',
          title: 'Korean Dramas',
          thumbnail_format: 'medium_portrait',
          is_active: true,
          display_order: 1,
        };

        const migrated = migrateContentListV18toV19(v18Data);

        expect(migrated.latest_first).toBe(true);
        expect(migrated.title).toBe('Korean Dramas');
      });

      it('should preserve existing latest_first if provided', () => {
        const v18Data = {
          id: 'list-1',
          title: 'Korean Dramas',
          latest_first: false,
        };

        const migrated = migrateContentListV18toV19(v18Data);

        expect(migrated.latest_first).toBe(false);
      });

      it('should generate slug from title when not provided', () => {
        const v18Data = {
          title: 'Trending K-Dramas',
          is_active: true,
        };

        const migrated = migrateContentListV18toV19(v18Data);

        expect(migrated.slug).toBe('trending_k_dramas');
      });

      it('should preserve existing slug', () => {
        const v18Data = {
          title: 'Trending K-Dramas',
          slug: 'custom_slug',
          is_active: true,
        };

        const migrated = migrateContentListV18toV19(v18Data);

        expect(migrated.slug).toBe('custom_slug');
      });
    });

    describe('migrateVideoFileV18toV19', () => {
      it('should add new v1.9 fields with defaults', () => {
        const v18Data = {
          id: 'video-1',
          file_name: 'running_man_ep730.mp4',
          media_description_id: 'media-1',
        };

        const migrated = migrateVideoFileV18toV19(v18Data);

        expect(migrated.environment_key).toBe('');
        expect(migrated.protection_key).toBe('');
        expect(migrated.slug).toBe('running_man_ep730');
      });

      it('should preserve existing v1.9 fields', () => {
        const v18Data = {
          id: 'video-1',
          file_name: 'test.mp4',
          environment_key: 'staging',
          protection_key: 'protected_123',
          slug: 'custom_slug',
        };

        const migrated = migrateVideoFileV18toV19(v18Data);

        expect(migrated.environment_key).toBe('staging');
        expect(migrated.protection_key).toBe('protected_123');
        expect(migrated.slug).toBe('custom_slug');
      });
    });

    describe('migrateScreenContentV18toV19', () => {
      it('should generate slug from title when not provided', () => {
        const v18Data = {
          id: 'screen-1',
          title: 'Homepage Layout',
          is_active: true,
          display_order: 1,
        };

        const migrated = migrateScreenContentV18toV19(v18Data);

        expect(migrated.slug).toBe('homepage_layout');
      });

      it('should preserve existing slug', () => {
        const v18Data = {
          title: 'Homepage Layout',
          slug: 'main_page',
        };

        const migrated = migrateScreenContentV18toV19(v18Data);

        expect(migrated.slug).toBe('main_page');
      });
    });
  });

  describe('URL Transformation', () => {
    describe('migrateURLV18toV19', () => {
      it('should convert v1.8 URLs to v1.9 format', () => {
        const testCases = [
          ['/api/v1/media/descriptions', '/api/v1/media-descriptions'],
          ['/api/v1/video/files', '/api/v1/video-files'],
          ['/api/v1/content/lists', '/api/v1/content-lists'],
          ['/api/v1/screen/contents', '/api/v1/screen-descriptions'],
          ['/api/v1/category/lists', '/api/v1/category-lists'],
          ['/api/v1/description/reports', '/api/v1/description-reports'],
          ['/api/v1/video/file/reports', '/api/v1/video-file-reports'],
        ];

        testCases.forEach(([oldUrl, expectedNewUrl]) => {
          expect(migrateURLV18toV19(oldUrl)).toBe(expectedNewUrl);
        });
      });

      it('should handle URLs with query parameters', () => {
        const oldUrl = '/api/v1/media/descriptions?skip=0&limit=10';
        const migratedUrl = migrateURLV18toV19(oldUrl);
        
        expect(migratedUrl).toBe('/api/v1/media-descriptions?skip=0&limit=10');
      });

      it('should handle URLs with IDs', () => {
        const oldUrl = '/api/v1/screen/contents/screen-123';
        const migratedUrl = migrateURLV18toV19(oldUrl);
        
        expect(migratedUrl).toBe('/api/v1/screen-descriptions/screen-123');
      });

      it('should return unchanged URLs that do not match', () => {
        const unchangedUrls = [
          '/api/v1/users',
          '/api/v1/auth/login',
          '/custom/endpoint',
        ];

        unchangedUrls.forEach(url => {
          expect(migrateURLV18toV19(url)).toBe(url);
        });
      });
    });

    describe('getEndpointPath', () => {
      it('should remove /api/v1 prefix from URLs', () => {
        const testCases = [
          ['/api/v1/media-descriptions', '/media-descriptions'],
          ['/api/v1/video-files/123', '/video-files/123'],
          ['/api/v1/content-lists?skip=0', '/content-lists?skip=0'],
        ];

        testCases.forEach(([fullUrl, expectedPath]) => {
          expect(getEndpointPath(fullUrl)).toBe(expectedPath);
        });
      });

      it('should handle URLs without /api/v1 prefix', () => {
        const testCases = [
          ['/media-descriptions', '/media-descriptions'],
          ['/video-files/123', '/video-files/123'],
        ];

        testCases.forEach(([url, expected]) => {
          expect(getEndpointPath(url)).toBe(expected);
        });
      });
    });
  });

  describe('Slug Generation', () => {
    describe('generateSlugFromText', () => {
      it('should convert text to lowercase with underscores', () => {
        const testCases = [
          ['Running Man - EP 730', 'running_man_ep_730'],
          ['My Amazing Show: Episode 1 (Special)', 'my_amazing_show_episode_1_special'],
          ['K-Drama Romance 101', 'k_drama_romance_101'],
          ['Trending K-Dramas', 'trending_k_dramas'],
          ['  Extra   Spaces  ', 'extra_spaces'],
        ];

        testCases.forEach(([input, expected]) => {
          expect(generateSlugFromText(input)).toBe(expected);
        });
      });

      it('should handle special characters', () => {
        const testCases = [
          ['Show!@#$%', 'show'],
          ['Episode & Season', 'episode_season'],
          ['Title (2024)', 'title_2024'],
        ];

        testCases.forEach(([input, expected]) => {
          expect(generateSlugFromText(input)).toBe(expected);
        });
      });
    });

    describe('generateSlugFromFileName', () => {
      it('should remove file extensions and generate slug', () => {
        const testCases = [
          ['running_man_ep730.mp4', 'running_man_ep730'],
          ['My Video File (HD).mov', 'my_video_file_hd'],
          ['special-episode_01.mkv', 'special_episode_01'],
          ['test.file.name.mp4', 'test_file_name'],
        ];

        testCases.forEach(([fileName, expected]) => {
          expect(generateSlugFromFileName(fileName)).toBe(expected);
        });
      });
    });

    describe('generateSlugFromContentListFilters', () => {
      it('should generate slug from filter criteria', () => {
        const filterData = {
          media_categories_id_list: ['korean-drama', 'romance'],
          themes_and_genres_id_list: ['comedy'],
          media_type: 'video' as const,
        };

        const slug = generateSlugFromContentListFilters(filterData);
        
        expect(slug).toBe('drama_romance_comedy_video');
      });

      it('should fallback to title when no filters', () => {
        const filterData = {
          title: 'My Favorite Shows',
        };

        const slug = generateSlugFromContentListFilters(filterData);
        
        expect(slug).toBe('my_favorite_shows');
      });

      it('should handle UUID-style IDs', () => {
        const filterData = {
          media_categories_id_list: ['12345678-1234-1234-1234-korean-drama'],
          media_type: 'webtoon' as const,
        };

        const slug = generateSlugFromContentListFilters(filterData);
        
        expect(slug).toBe('drama_webtoon');
      });
    });
  });

  describe('Validation', () => {
    describe('validateV19ContentList', () => {
      it('should validate required latest_first field', () => {
        const validData = {
          title: 'Test List',
          latest_first: true,
        };

        const result = validateV19ContentList(validData);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should catch missing latest_first field', () => {
        const invalidData = {
          title: 'Test List',
        };

        const result = validateV19ContentList(invalidData);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('latest_first is required and must be a boolean');
      });

      it('should catch invalid latest_first type', () => {
        const invalidData = {
          title: 'Test List',
          latest_first: 'true', // string instead of boolean
        };

        const result = validateV19ContentList(invalidData);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('latest_first is required and must be a boolean');
      });
    });

    describe('validateV19MediaDescription', () => {
      it('should validate migrated data', () => {
        const validData = {
          episode_title: 'Test Episode',
          tag_text_list: ['test'],
          slug: 'test_episode',
        };

        const result = validateV19MediaDescription(validData);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should catch v1.8 field names that need migration', () => {
        const invalidData = {
          episode_title: 'Test Episode',
          human_keywords_text_list: ['test'], // v1.8 field
          friendly_url: 'test-episode', // v1.8 field
        };

        const result = validateV19MediaDescription(invalidData);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('human_keywords_text_list should be renamed to tag_text_list');
        expect(result.errors).toContain('friendly_url should be renamed to slug');
      });
    });
  });

  describe('Utility Object Export', () => {
    it('should export all utility functions in migrationV19Utils', () => {
      expect(migrationV19Utils.migrateMediaDescriptionV18toV19).toBe(migrateMediaDescriptionV18toV19);
      expect(migrationV19Utils.migrateURLV18toV19).toBe(migrateURLV18toV19);
      expect(migrationV19Utils.generateSlugFromText).toBe(generateSlugFromText);
      expect(migrationV19Utils.validateV19ContentList).toBe(validateV19ContentList);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values gracefully', () => {
      const dataWithNulls = {
        id: 'test',
        title: null,
        description: undefined,
        human_keywords_text_list: ['test'],
      };

      const migrated = migrateMediaDescriptionV18toV19(dataWithNulls);
      
      expect(migrated.tag_text_list).toEqual(['test']);
      expect(migrated.title).toBeNull();
      expect(migrated.description).toBeUndefined();
    });

    it('should handle empty strings in slug generation', () => {
      expect(generateSlugFromText('')).toBe('');
      expect(generateSlugFromText('   ')).toBe('');
      expect(generateSlugFromFileName('')).toBe('');
    });

    it('should handle arrays with empty strings', () => {
      const filterData = {
        media_categories_id_list: ['', 'valid-category'],
        themes_and_genres_id_list: [''],
      };

      const slug = generateSlugFromContentListFilters(filterData);
      
      expect(slug).toBe('_category');
    });
  });

  describe('Integration Tests', () => {
    it('should migrate a complete v1.8 data object', () => {
      const v18MediaDescription = {
        id: 'media-1',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_number: 1246,
        episode_title: 'Running Man - EP 730',
        media_type: 'video',
        human_keywords_text_list: ['variety', 'korean', 'running-man'],
        friendly_url: 'running-man-ep-730',
        descriptive_summary_text: 'Great episode with amazing games',
        production_year: 2024,
        is_featured: true,
      };

      const migrated = migrateMediaDescriptionV18toV19(v18MediaDescription);

      expect(migrated).toEqual({
        id: 'media-1',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_number: 1246,
        episode_title: 'Running Man - EP 730',
        media_type: 'video',
        tag_text_list: ['variety', 'korean', 'running-man'],
        slug: 'running-man-ep-730',
        descriptive_summary_text: 'Great episode with amazing games',
        production_year: 2024,
        is_featured: true,
      });
    });

    it('should migrate a complete content list from v1.8 to v1.9', () => {
      const v18ContentList = {
        id: 'list-1',
        title: 'Trending Korean Dramas',
        thumbnail_format: 'medium_portrait',
        is_active: true,
        display_order: 1,
        description: 'Popular K-dramas this week',
      };

      const migrated = migrateContentListV18toV19(v18ContentList);

      expect(migrated).toEqual({
        id: 'list-1',
        title: 'Trending Korean Dramas',
        thumbnail_format: 'medium_portrait',
        is_active: true,
        display_order: 1,
        description: 'Popular K-dramas this week',
        latest_first: true,
        slug: 'trending_korean_dramas',
      });
    });
  });
});