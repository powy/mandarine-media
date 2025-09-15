import { describe, expect, test, beforeEach, vi } from 'vitest';
import { mediaShowcasesApi } from '../api/media-showcases';
import { apiClient } from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

const mockApiClient = apiClient as any;

describe('Media Showcases API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMediaShowcases', () => {
    test('should fetch media showcases with default parameters', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'showcase-1',
              title: 'Featured Content',
              list_type: 'classic',
              is_active: true,
              display_order: 1
            }
          ],
          pagination: {
            skip: 0,
            limit: 20,
            total: 1,
            page: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false
          }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await mediaShowcasesApi.getMediaShowcases();

      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases?');
      expect(result).toEqual(mockResponse.data);
    });

    test('should fetch media showcases with filters', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: { skip: 10, limit: 5, total: 0, page: 3, total_pages: 0, has_next: false, has_prev: true }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const filters = {
        skip: 10,
        limit: 5,
        list_type: 'carousel' as const,
        is_active: true
      };

      await mediaShowcasesApi.getMediaShowcases(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/media-showcases?skip=10&limit=5&list_type=carousel&is_active=true'
      );
    });

    test('should handle boolean filters correctly', async () => {
      const mockResponse = {
        data: { data: [], pagination: { skip: 0, limit: 20, total: 0, page: 1, total_pages: 0, has_next: false, has_prev: false } }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await mediaShowcasesApi.getMediaShowcases({ is_active: false });

      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases?is_active=false');
    });

    test('should handle thumbnail_format filtering', async () => {
      const mockResponse = {
        data: { data: [], pagination: { skip: 0, limit: 20, total: 0, page: 1, total_pages: 0, has_next: false, has_prev: false } }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await mediaShowcasesApi.getMediaShowcases({
        thumbnail_format: '1920x1080',
        list_type: 'classic'
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases?list_type=classic&thumbnail_format=1920x1080');
    });

    test('should handle all filter combinations', async () => {
      const mockResponse = {
        data: { data: [], pagination: { skip: 0, limit: 20, total: 0, page: 1, total_pages: 0, has_next: false, has_prev: false } }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await mediaShowcasesApi.getMediaShowcases({
        skip: 20,
        limit: 10,
        list_type: 'carousel',
        is_active: true,
        thumbnail_format: '1080x1920'
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases?skip=20&limit=10&list_type=carousel&is_active=true&thumbnail_format=1080x1920');
    });
  });

  describe('getMediaShowcase', () => {
    test('should fetch single media showcase by id', async () => {
      const mockShowcase = {
        id: 'showcase-1',
        title: 'Featured Content',
        description: 'Latest featured content',
        list_type: 'classic' as const,
        is_active: true,
        display_order: 1,
        creation_date_utc: '2024-01-15T10:30:00Z'
      };

      const mockResponse = { data: mockShowcase };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await mediaShowcasesApi.getMediaShowcase('showcase-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases/showcase-1');
      expect(result).toEqual(mockShowcase);
    });

    test('should handle not found error', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Media showcase not found' }
        }
      };

      mockApiClient.get.mockRejectedValue(mockError);

      await expect(mediaShowcasesApi.getMediaShowcase('non-existent')).rejects.toEqual(mockError);
      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases/non-existent');
    });
  });

  describe('createMediaShowcase', () => {
    test('should create a new media showcase with required fields', async () => {
      const showcaseData = {
        title: 'New Releases',
        list_type: 'carousel' as const,
        is_active: true
      };

      const mockResponse = {
        data: {
          id: 'showcase-new',
          creation_date_utc: '2024-01-15T10:30:00Z',
          ...showcaseData
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await mediaShowcasesApi.createMediaShowcase(showcaseData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/media-showcases', showcaseData);
      expect(result).toEqual(mockResponse.data);
    });

    test('should create a media showcase with all optional fields', async () => {
      const showcaseData = {
        title: 'Action Movies',
        description: 'Best action movies of the year',
        list_type: 'classic' as const,
        is_active: true,
        display_order: 5,
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-12-31T23:59:59Z',
        banner_image_id: 'image-uuid'
      };

      const mockResponse = {
        data: {
          id: 'showcase-action',
          creation_date_utc: '2024-01-15T10:30:00Z',
          ...showcaseData
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await mediaShowcasesApi.createMediaShowcase(showcaseData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/media-showcases', showcaseData);
      expect(result).toEqual(mockResponse.data);
    });

    test('should handle validation errors', async () => {
      const invalidData = {
        title: '', // Invalid empty title
        list_type: 'classic' as const,
        is_active: true
      };

      const mockError = {
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['body', 'title'],
                msg: 'field required',
                type: 'value_error.missing'
              }
            ]
          }
        }
      };

      mockApiClient.post.mockRejectedValue(mockError);

      await expect(mediaShowcasesApi.createMediaShowcase(invalidData)).rejects.toEqual(mockError);
    });
  });

  describe('updateMediaShowcase', () => {
    test('should update media showcase with partial data', async () => {
      const updateData = {
        title: 'Updated Title',
        is_active: false
      };

      const mockResponse = {
        data: {
          id: 'showcase-1',
          title: 'Updated Title',
          list_type: 'classic' as const,
          is_active: false,
          display_order: 1
        }
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await mediaShowcasesApi.updateMediaShowcase('showcase-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/media-showcases/showcase-1', updateData);
      expect(result).toEqual(mockResponse.data);
    });

    test('should update showcase type', async () => {
      const updateData = {
        list_type: 'carousel' as const
      };

      const mockResponse = {
        data: {
          id: 'showcase-1',
          title: 'Test Showcase',
          list_type: 'carousel' as const,
          is_active: true
        }
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await mediaShowcasesApi.updateMediaShowcase('showcase-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/media-showcases/showcase-1', updateData);
      expect(result.list_type).toBe('carousel');
    });

    test('should handle update errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Media showcase not found' }
        }
      };

      mockApiClient.put.mockRejectedValue(mockError);

      await expect(
        mediaShowcasesApi.updateMediaShowcase('non-existent', { title: 'Updated' })
      ).rejects.toEqual(mockError);
    });
  });

  describe('deleteMediaShowcase', () => {
    test('should delete media showcase successfully', async () => {
      const mockResponse = {
        data: {
          id: 'showcase-1',
          title: 'Deleted Showcase',
          list_type: 'classic' as const,
          is_active: false
        }
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await mediaShowcasesApi.deleteMediaShowcase('showcase-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/media-showcases/showcase-1');
      expect(result).toEqual(mockResponse.data);
    });

    test('should handle delete errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Media showcase not found' }
        }
      };

      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(mediaShowcasesApi.deleteMediaShowcase('non-existent')).rejects.toEqual(mockError);
    });

    test('should handle permission errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { detail: 'Not enough permissions' }
        }
      };

      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(mediaShowcasesApi.deleteMediaShowcase('showcase-1')).rejects.toEqual(mockError);
    });
  });

  describe('List Types Validation', () => {
    test('should support all valid list types', async () => {
      const listTypes = [
        'classic',
        'carousel'
      ] as const;

      const mockResponse = { data: { id: 'test', title: 'Test' } };
      mockApiClient.post.mockResolvedValue(mockResponse);

      for (const type of listTypes) {
        await mediaShowcasesApi.createMediaShowcase({
          title: `Test ${type}`,
          list_type: type,
          is_active: true
        });

        expect(mockApiClient.post).toHaveBeenCalledWith('/media-showcases', {
          title: `Test ${type}`,
          list_type: type,
          is_active: true
        });
      }

      expect(mockApiClient.post).toHaveBeenCalledTimes(listTypes.length);
    });

    test('should filter by list_type correctly', async () => {
      const mockResponse = {
        data: { data: [], pagination: { skip: 0, limit: 20, total: 0, page: 1, total_pages: 0, has_next: false, has_prev: false } }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      // Test classic
      await mediaShowcasesApi.getMediaShowcases({ list_type: 'classic' });
      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases?list_type=classic');

      // Test carousel
      await mediaShowcasesApi.getMediaShowcases({ list_type: 'carousel' });
      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases?list_type=carousel');
    });
  });

  describe('Pagination and Filtering Edge Cases', () => {
    test('should handle zero results', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: {
            skip: 0,
            limit: 20,
            total: 0,
            page: 1,
            total_pages: 0,
            has_next: false,
            has_prev: false
          }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await mediaShowcasesApi.getMediaShowcases();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    test('should handle large skip values', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: {
            skip: 1000,
            limit: 10,
            total: 50,
            page: 101,
            total_pages: 5,
            has_next: false,
            has_prev: true
          }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await mediaShowcasesApi.getMediaShowcases({ skip: 1000, limit: 10 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases?skip=1000&limit=10');
    });

    test('should handle undefined filter values', async () => {
      const mockResponse = {
        data: { data: [], pagination: { skip: 0, limit: 20, total: 0, page: 1, total_pages: 0, has_next: false, has_prev: false } }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await mediaShowcasesApi.getMediaShowcases({
        list_type: undefined,
        is_active: undefined
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/media-showcases?');
    });
  });

  describe('API 1.13 Compliance', () => {
    test('should match API 1.13 response structure', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'showcase-1',
              creation_date_utc: '2024-01-15T10:30:00Z',
              title: 'Featured Content',
              description: 'Best content of the month',
              list_type: 'classic',
              is_active: true,
              display_order: 1,
              start_date: '2024-01-01T00:00:00Z',
              end_date: '2024-01-31T23:59:59Z',
              media_descriptions: [
                {
                  id: 'media-1',
                  episode_title: 'Episode 1',
                  media_type: 'video'
                }
              ],
              banner_image_id: 'image-1',
              banner_image: {
                id: 'image-1',
                image_url: 'https://cdn.example.com/banner.jpg'
              }
            }
          ],
          pagination: {
            skip: 0,
            limit: 20,
            total: 1,
            page: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false
          }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await mediaShowcasesApi.getMediaShowcases();

      // Verify API 1.13 structure
      expect(result.data[0]).toHaveProperty('creation_date_utc');
      expect(result.data[0]).toHaveProperty('list_type');
      expect(result.data[0]).toHaveProperty('display_order');
      expect(result.data[0]).toHaveProperty('media_descriptions');
      expect(result.data[0]).toHaveProperty('banner_image');
      expect(result.pagination).toHaveProperty('has_next');
      expect(result.pagination).toHaveProperty('has_prev');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(mediaShowcasesApi.getMediaShowcases()).rejects.toThrow('Network Error');
    });

    test('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      };

      mockApiClient.get.mockRejectedValue(serverError);

      await expect(mediaShowcasesApi.getMediaShowcases()).rejects.toEqual(serverError);
    });

    test('should handle authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: { detail: 'Not authenticated' }
        }
      };

      mockApiClient.post.mockRejectedValue(authError);

      await expect(
        mediaShowcasesApi.createMediaShowcase({
          title: 'Test',
          list_type: 'classic',
          is_active: true
        })
      ).rejects.toEqual(authError);
    });
  });
});