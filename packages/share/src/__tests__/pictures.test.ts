import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { picturesApi } from '../api/pictures';
import { apiClient } from '../api/client';
import type { Picture } from '../types';

const mockApiClient = vi.mocked(apiClient);

describe('Pictures API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch pictures with default pagination', async () => {
      const mockResponse = {
        items: [
          {
            id: 1,
            title: 'Test Image 1',
            file_path: '/images/test1.jpg',
            file_size_bytes: 1024,
            width: 1920,
            height: 1080,
            format: 'jpg',
          },
          {
            id: 2,
            title: 'Test Image 2',
            file_path: '/images/test2.png',
            file_size_bytes: 2048,
            width: 1280,
            height: 720,
            format: 'png',
          },
        ],
        total: 2,
        skip: 0,
        limit: 20,
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await picturesApi.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith('/pictures?skip=0&limit=20');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch pictures with custom pagination', async () => {
      const mockResponse = {
        items: [
          {
            id: 1,
            title: 'Test Image',
            file_path: '/images/test.jpg',
            file_size_bytes: 1024,
            width: 1920,
            height: 1080,
            format: 'jpg',
          },
        ],
        total: 1,
        skip: 20,
        limit: 10,
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await picturesApi.getAll({ skip: 20, limit: 10 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/pictures?skip=20&limit=10');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to fetch pictures');
      mockApiClient.get.mockRejectedValue(error);

      await expect(picturesApi.getAll()).rejects.toThrow('Failed to fetch pictures');
    });
  });

  describe('getById', () => {
    it('should fetch a single picture by ID', async () => {
      const mockPicture: Picture = {
        id: 1,
        title: 'Test Image',
        file_path: '/images/test.jpg',
        file_size_bytes: 1024,
        width: 1920,
        height: 1080,
        format: 'jpg',
        description: 'A test image for the platform',
        alt_text: 'Test image alt text',
      };

      mockApiClient.get.mockResolvedValue({ data: mockPicture });

      const result = await picturesApi.getById('1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/pictures/1');
      expect(result).toEqual(mockPicture);
    });

    it('should handle picture not found', async () => {
      const error = new Error('Picture not found');
      mockApiClient.get.mockRejectedValue(error);

      await expect(picturesApi.getById('999')).rejects.toThrow('Picture not found');
    });
  });

  describe('create', () => {
    it('should create a picture', async () => {
      const createData = {
        image_url: 'https://example.com/images/uploaded.jpg',
        file_name: 'uploaded.jpg',
        file_size_bytes: 1024,
        width: 1920,
        height: 1080,
        alt_text: 'An uploaded test image',
      };

      const createdPicture: Picture = {
        id: 3,
        title: 'Uploaded Image',
        file_path: '/images/uploaded.jpg',
        file_size_bytes: 1024,
        width: 1920,
        height: 1080,
        format: 'jpg',
        description: 'An uploaded test image',
      };

      mockApiClient.post.mockResolvedValue({ data: createdPicture });

      const result = await picturesApi.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/pictures', createData);
      expect(result).toEqual(createdPicture);
    });

    it('should handle create errors', async () => {
      const createData = {
        image_url: 'https://example.com/images/uploaded.jpg',
      };

      const error = new Error('Create failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(picturesApi.create(createData)).rejects.toThrow('Create failed');
    });
  });

  describe('update', () => {
    it('should update picture metadata', async () => {
      const updateData = {
        image_url: 'https://example.com/images/updated.jpg',
        alt_text: 'Updated alt text',
        width: 1920,
        height: 1080,
      };

      const updatedPicture: Picture = {
        id: 1,
        title: 'Updated Title',
        file_path: '/images/test.jpg',
        file_size_bytes: 1024,
        width: 1920,
        height: 1080,
        format: 'jpg',
        description: 'Updated description',
        alt_text: 'Updated alt text',
      };

      mockApiClient.put.mockResolvedValue({ data: updatedPicture });

      const result = await picturesApi.update('1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/pictures/1', updateData);
      expect(result).toEqual(updatedPicture);
    });

    it('should handle update errors', async () => {
      const updateData = { image_url: 'https://example.com/images/updated.jpg' };
      const error = new Error('Update failed');
      mockApiClient.put.mockRejectedValue(error);

      await expect(picturesApi.update('999', updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('should delete a picture', async () => {
      const deletedPicture: Picture = {
        id: 1,
        title: 'Deleted Image',
        file_path: '/images/test.jpg',
        file_size_bytes: 1024,
        width: 1920,
        height: 1080,
        format: 'jpg',
      };

      mockApiClient.delete.mockResolvedValue({ data: deletedPicture });

      const result = await picturesApi.delete('1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/pictures/1');
      expect(result).toEqual(deletedPicture);
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Cannot delete picture');
      mockApiClient.delete.mockRejectedValue(error);

      await expect(picturesApi.delete('999')).rejects.toThrow('Cannot delete picture');
    });
  });

  describe('File Type Validation', () => {
    it('should handle different image formats', async () => {
      const formats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

      for (const format of formats) {
        const createData = {
          image_url: `https://example.com/images/test.${format}`,
          file_name: `test.${format}`,
          width: 1920,
          height: 1080,
        };

        const createdPicture: Picture = {
          id: 1,
          title: `Test ${format.toUpperCase()}`,
          file_path: `/images/test.${format}`,
          file_size_bytes: 1024,
          width: 1920,
          height: 1080,
          format,
        };

        mockApiClient.post.mockResolvedValue({ data: createdPicture });

        const result = await picturesApi.create(createData);

        expect(result.format).toBe(format);
      }
    });

    it('should handle large file size', async () => {
      const largeFileSize = 10 * 1024 * 1024; // 10MB
      const createData = {
        image_url: 'https://example.com/images/large.jpg',
        file_name: 'large.jpg',
        file_size_bytes: largeFileSize,
        width: 4096,
        height: 3072,
      };

      const createdPicture: Picture = {
        id: 1,
        title: 'Large Image',
        file_path: '/images/large.jpg',
        file_size_bytes: largeFileSize,
        width: 4096,
        height: 3072,
        format: 'jpg',
      };

      mockApiClient.post.mockResolvedValue({ data: createdPicture });

      const result = await picturesApi.create(createData);

      expect(result.file_size_bytes).toBe(largeFileSize);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pictures with no dimensions', async () => {
      const pictureWithoutDimensions: Picture = {
        id: 1,
        title: 'Vector Image',
        file_path: '/images/vector.svg',
        file_size_bytes: 512,
        width: 0,
        height: 0,
        format: 'svg',
      };

      mockApiClient.get.mockResolvedValue({ data: pictureWithoutDimensions });

      const result = await picturesApi.getById('1');

      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('should handle pictures with very long file names', async () => {
      const longFileName = 'A'.repeat(1000) + '.jpg';
      const updateData = {
        file_name: longFileName,
        image_url: 'https://example.com/images/long.jpg',
      };

      const updatedPicture: Picture = {
        id: 1,
        title: 'Long filename',
        file_path: '/images/long.jpg',
        file_size_bytes: 1024,
        width: 1920,
        height: 1080,
        format: 'jpg',
      };

      mockApiClient.put.mockResolvedValue({ data: updatedPicture });

      const result = await picturesApi.update('1', updateData);

      expect(result).toEqual(updatedPicture);
    });

    it('should handle special characters in filenames', async () => {
      const specialFilename = 'test-file_with-special.chars@#$%^&*()!.jpg';
      const picture: Picture = {
        id: 1,
        title: 'Special Filename',
        file_path: `/images/${specialFilename}`,
        file_size_bytes: 1024,
        width: 1920,
        height: 1080,
        format: 'jpg',
      };

      mockApiClient.get.mockResolvedValue({ data: picture });

      const result = await picturesApi.getById('1');

      expect(result.file_path).toContain(specialFilename);
    });

    it('should handle empty result sets', async () => {
      const emptyResponse = {
        items: [],
        total: 0,
        skip: 0,
        limit: 20,
      };

      mockApiClient.get.mockResolvedValue({ data: emptyResponse });

      const result = await picturesApi.getAll();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle concurrent creates', async () => {
      const createData1 = {
        image_url: 'https://example.com/images/test1.jpg',
        file_name: 'test1.jpg',
      };
      const createData2 = {
        image_url: 'https://example.com/images/test2.jpg',
        file_name: 'test2.jpg',
      };

      mockApiClient.post
        .mockResolvedValueOnce({
          data: {
            id: 1,
            title: 'Image 1',
            file_path: '/images/test1.jpg',
            file_size_bytes: 1024,
            width: 1920,
            height: 1080,
            format: 'jpg',
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 2,
            title: 'Image 2',
            file_path: '/images/test2.jpg',
            file_size_bytes: 2048,
            width: 1920,
            height: 1080,
            format: 'jpg',
          },
        });

      const [result1, result2] = await Promise.all([
        picturesApi.create(createData1),
        picturesApi.create(createData2),
      ]);

      expect(result1.id).toBe(1);
      expect(result2.id).toBe(2);
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Search and Filtering', () => {
    it('should handle search query parameter', async () => {
      const mockResponse = {
        items: [
          {
            id: 1,
            title: 'Searchable Image',
            file_path: '/images/search.jpg',
            file_size_bytes: 1024,
            width: 1920,
            height: 1080,
            format: 'jpg',
          },
        ],
        total: 1,
        skip: 0,
        limit: 20,
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await picturesApi.getAll({ q: 'searchable' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/pictures?skip=0&limit=20&q=searchable');
      expect(result).toEqual(mockResponse);
    });

    it('should handle order_by and order_dir parameters', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        skip: 0,
        limit: 20,
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await picturesApi.getAll({
        order_by: 'created_at',
        order_dir: 'DESC'
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/pictures?skip=0&limit=20&order_by=created_at&order_dir=desc');
      expect(result).toEqual(mockResponse);
    });
  });
});