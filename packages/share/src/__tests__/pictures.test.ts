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

  describe('getPictures', () => {
    it('should fetch pictures with default pagination', async () => {
      const mockPictures: Picture[] = [
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
      ];

      mockApiClient.get.mockResolvedValue({ data: mockPictures });

      const result = await picturesApi.getPictures();

      expect(mockApiClient.get).toHaveBeenCalledWith('/pictures', {
        params: { skip: 0, limit: 50 },
      });
      expect(result).toEqual(mockPictures);
    });

    it('should fetch pictures with custom pagination', async () => {
      const mockPictures: Picture[] = [
        {
          id: 1,
          title: 'Test Image',
          file_path: '/images/test.jpg',
          file_size_bytes: 1024,
          width: 1920,
          height: 1080,
          format: 'jpg',
        },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockPictures });

      const result = await picturesApi.getPictures(20, 10);

      expect(mockApiClient.get).toHaveBeenCalledWith('/pictures', {
        params: { skip: 20, limit: 10 },
      });
      expect(result).toEqual(mockPictures);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to fetch pictures');
      mockApiClient.get.mockRejectedValue(error);

      await expect(picturesApi.getPictures()).rejects.toThrow('Failed to fetch pictures');
    });
  });

  describe('getPicture', () => {
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

      const result = await picturesApi.getPicture(1);

      expect(mockApiClient.get).toHaveBeenCalledWith('/pictures/1');
      expect(result).toEqual(mockPicture);
    });

    it('should handle picture not found', async () => {
      const error = new Error('Picture not found');
      mockApiClient.get.mockRejectedValue(error);

      await expect(picturesApi.getPicture(999)).rejects.toThrow('Picture not found');
    });
  });

  describe('uploadPicture', () => {
    it('should upload a picture file', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadData = {
        file: mockFile,
        title: 'Uploaded Image',
        description: 'An uploaded test image',
      };

      const uploadedPicture: Picture = {
        id: 3,
        title: 'Uploaded Image',
        file_path: '/images/uploaded.jpg',
        file_size_bytes: mockFile.size,
        width: 1920,
        height: 1080,
        format: 'jpg',
        description: 'An uploaded test image',
      };

      mockApiClient.post.mockResolvedValue({ data: uploadedPicture });

      const result = await picturesApi.uploadPicture(uploadData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/pictures/upload', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual(uploadedPicture);
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadData = {
        file: mockFile,
        title: 'Uploaded Image',
      };

      const error = new Error('Upload failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(picturesApi.uploadPicture(uploadData)).rejects.toThrow('Upload failed');
    });
  });

  describe('updatePicture', () => {
    it('should update picture metadata', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
        alt_text: 'Updated alt text',
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

      const result = await picturesApi.updatePicture(1, updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/pictures/1', updateData);
      expect(result).toEqual(updatedPicture);
    });

    it('should handle update errors', async () => {
      const updateData = { title: 'Updated Title' };
      const error = new Error('Update failed');
      mockApiClient.put.mockRejectedValue(error);

      await expect(picturesApi.updatePicture(999, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('deletePicture', () => {
    it('should delete a picture', async () => {
      mockApiClient.delete.mockResolvedValue({ data: { message: 'Picture deleted successfully' } });

      const result = await picturesApi.deletePicture(1);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/pictures/1');
      expect(result).toEqual({ message: 'Picture deleted successfully' });
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Cannot delete picture');
      mockApiClient.delete.mockRejectedValue(error);

      await expect(picturesApi.deletePicture(999)).rejects.toThrow('Cannot delete picture');
    });
  });

  describe('File Type Validation', () => {
    it('should handle different image formats', async () => {
      const formats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

      for (const format of formats) {
        const mockFile = new File(['test'], `test.${format}`, { type: `image/${format}` });
        const uploadData = {
          file: mockFile,
          title: `Test ${format.toUpperCase()}`,
        };

        const uploadedPicture: Picture = {
          id: 1,
          title: `Test ${format.toUpperCase()}`,
          file_path: `/images/test.${format}`,
          file_size_bytes: mockFile.size,
          width: 1920,
          height: 1080,
          format,
        };

        mockApiClient.post.mockResolvedValue({ data: uploadedPicture });

        const result = await picturesApi.uploadPicture(uploadData);

        expect(result.format).toBe(format);
      }
    });

    it('should handle large file uploads', async () => {
      // Create a mock large file (10MB)
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const uploadData = {
        file: largeFile,
        title: 'Large Image',
      };

      const uploadedPicture: Picture = {
        id: 1,
        title: 'Large Image',
        file_path: '/images/large.jpg',
        file_size_bytes: largeFile.size,
        width: 4096,
        height: 3072,
        format: 'jpg',
      };

      mockApiClient.post.mockResolvedValue({ data: uploadedPicture });

      const result = await picturesApi.uploadPicture(uploadData);

      expect(result.file_size_bytes).toBe(largeFile.size);
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

      const result = await picturesApi.getPicture(1);

      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('should handle pictures with very long titles', async () => {
      const longTitle = 'A'.repeat(1000);
      const updateData = { title: longTitle };

      const updatedPicture: Picture = {
        id: 1,
        title: longTitle,
        file_path: '/images/test.jpg',
        file_size_bytes: 1024,
        width: 1920,
        height: 1080,
        format: 'jpg',
      };

      mockApiClient.put.mockResolvedValue({ data: updatedPicture });

      const result = await picturesApi.updatePicture(1, updateData);

      expect(result.title).toBe(longTitle);
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

      const result = await picturesApi.getPicture(1);

      expect(result.file_path).toContain(specialFilename);
    });

    it('should handle empty result sets', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      const result = await picturesApi.getPictures();

      expect(result).toEqual([]);
    });

    it('should handle concurrent uploads', async () => {
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });

      const uploadData1 = { file: file1, title: 'Image 1' };
      const uploadData2 = { file: file2, title: 'Image 2' };

      mockApiClient.post
        .mockResolvedValueOnce({
          data: {
            id: 1,
            title: 'Image 1',
            file_path: '/images/test1.jpg',
            file_size_bytes: file1.size,
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
            file_size_bytes: file2.size,
            width: 1920,
            height: 1080,
            format: 'jpg',
          },
        });

      const [result1, result2] = await Promise.all([
        picturesApi.uploadPicture(uploadData1),
        picturesApi.uploadPicture(uploadData2),
      ]);

      expect(result1.id).toBe(1);
      expect(result2.id).toBe(2);
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('FormData Handling', () => {
    it('should create FormData correctly for file upload', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadData = {
        file: mockFile,
        title: 'Test Upload',
        description: 'Test description',
        alt_text: 'Test alt text',
      };

      let capturedFormData: FormData;
      mockApiClient.post.mockImplementation((url, data) => {
        capturedFormData = data;
        return Promise.resolve({
          data: {
            id: 1,
            title: 'Test Upload',
            file_path: '/images/test.jpg',
            file_size_bytes: mockFile.size,
            width: 1920,
            height: 1080,
            format: 'jpg',
          },
        });
      });

      await picturesApi.uploadPicture(uploadData);

      expect(capturedFormData!).toBeInstanceOf(FormData);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/pictures/upload',
        expect.any(FormData),
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
    });
  });
});