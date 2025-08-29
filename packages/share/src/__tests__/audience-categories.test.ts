import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audienceCategoriesApi } from '../api/audience-categories';
import { apiClient } from '../api/client';
import type { AudienceCategory, AudienceCategoryCreate, AudienceCategoryUpdate, PaginatedAudienceCategoriesResponse } from '../types';

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

describe('Audience Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAudienceCategory: AudienceCategory = {
    id: 'audience-category-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    name: 'Family',
  };

  const mockPaginatedResponse: PaginatedAudienceCategoriesResponse = {
    data: [mockAudienceCategory],
    pagination: {
      skip: 0,
      limit: 20,
      total: 1,
      page: 1,
      pages: 1
    }
  };

  describe('getAll', () => {
    it('should fetch all audience categories without filters', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const result = await audienceCategoriesApi.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith('/audience-categories?skip=0&limit=20');
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should fetch audience categories with custom pagination', async () => {
      const customPaginated = {
        ...mockPaginatedResponse,
        pagination: { ...mockPaginatedResponse.pagination, skip: 10, limit: 5 }
      };
      mockApiClient.get.mockResolvedValue({ data: customPaginated });

      const result = await audienceCategoriesApi.getAll({ skip: 10, limit: 5 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/audience-categories?skip=10&limit=5');
      expect(result).toEqual(customPaginated);
    });

    it('should fetch audience categories with search query', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const result = await audienceCategoriesApi.getAll({ q: 'Family' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/audience-categories?skip=0&limit=20&q=Family');
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('getById', () => {
    it('should fetch a single audience category by ID', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockAudienceCategory });

      const result = await audienceCategoriesApi.getById('audience-category-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/audience-categories/audience-category-1');
      expect(result).toEqual(mockAudienceCategory);
    });
  });

  describe('create', () => {
    it('should create a new audience category', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockAudienceCategory });

      const createData: AudienceCategoryCreate = {
        name: 'Family',
      };

      const result = await audienceCategoriesApi.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/audience-categories', createData);
      expect(result).toEqual(mockAudienceCategory);
    });
  });

  describe('update', () => {
    it('should update an existing audience category', async () => {
      const updatedAudienceCategory = { ...mockAudienceCategory, name: 'Adults Only' };
      mockApiClient.put.mockResolvedValue({ data: updatedAudienceCategory });

      const updateData: AudienceCategoryUpdate = {
        name: 'Adults Only',
      };

      const result = await audienceCategoriesApi.update('audience-category-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/audience-categories/audience-category-1', updateData);
      expect(result).toEqual(updatedAudienceCategory);
    });
  });

  describe('delete', () => {
    it('should delete an audience category', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockAudienceCategory });

      const result = await audienceCategoriesApi.delete('audience-category-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/audience-categories/audience-category-1');
      expect(result).toEqual(mockAudienceCategory);
    });
  });

  describe('Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { error: { code: 'NOT_FOUND', message: 'Audience category not found' } },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(audienceCategoriesApi.getById('nonexistent')).rejects.toEqual(errorResponse);
    });

    it('should handle empty response arrays', async () => {
      const emptyResponse = {
        data: [],
        pagination: {
          skip: 0,
          limit: 20,
          total: 0,
          page: 1,
          pages: 0
        }
      };
      mockApiClient.get.mockResolvedValue({ data: emptyResponse });

      const result = await audienceCategoriesApi.getAll();

      expect(result).toEqual(emptyResponse);
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockApiClient.get.mockRejectedValue(timeoutError);

      await expect(audienceCategoriesApi.getAll()).rejects.toThrow('Network timeout');
    });
  });
});