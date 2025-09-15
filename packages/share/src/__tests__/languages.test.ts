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

import { languagesApi } from '../api/languages';
import { apiClient } from '../api/client';
import type { Language } from '../types';

const mockApiClient = vi.mocked(apiClient);

describe('Languages API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLanguages', () => {
    it('should fetch languages with default pagination', async () => {
      const mockLanguages: Language[] = [
        { id: 1, name: 'English', sigle: 'en' },
        { id: 2, name: 'Spanish', sigle: 'es' },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockLanguages });

      const result = await languagesApi.getLanguages();

      expect(mockApiClient.get).toHaveBeenCalledWith('/languages', {
        params: { skip: 0, limit: 50 },
      });
      expect(result).toEqual(mockLanguages);
    });

    it('should fetch languages with custom pagination', async () => {
      const mockLanguages: Language[] = [
        { id: 1, name: 'English', sigle: 'en' },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockLanguages });

      const result = await languagesApi.getLanguages(10, 20);

      expect(mockApiClient.get).toHaveBeenCalledWith('/languages', {
        params: { skip: 10, limit: 20 },
      });
      expect(result).toEqual(mockLanguages);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      mockApiClient.get.mockRejectedValue(error);

      await expect(languagesApi.getLanguages()).rejects.toThrow('Network error');
    });
  });

  describe('getLanguage', () => {
    it('should fetch a single language by ID', async () => {
      const mockLanguage: Language = { id: 1, name: 'English', sigle: 'en' };

      mockApiClient.get.mockResolvedValue({ data: mockLanguage });

      const result = await languagesApi.getLanguage(1);

      expect(mockApiClient.get).toHaveBeenCalledWith('/languages/1');
      expect(result).toEqual(mockLanguage);
    });

    it('should handle language not found', async () => {
      const error = new Error('Language not found');
      mockApiClient.get.mockRejectedValue(error);

      await expect(languagesApi.getLanguage(999)).rejects.toThrow('Language not found');
    });
  });

  describe('createLanguage', () => {
    it('should create a new language', async () => {
      const newLanguage = { name: 'French', sigle: 'fr' };
      const createdLanguage: Language = { id: 3, ...newLanguage };

      mockApiClient.post.mockResolvedValue({ data: createdLanguage });

      const result = await languagesApi.createLanguage(newLanguage);

      expect(mockApiClient.post).toHaveBeenCalledWith('/languages', newLanguage);
      expect(result).toEqual(createdLanguage);
    });

    it('should handle creation errors', async () => {
      const newLanguage = { name: 'French', sigle: 'fr' };
      const error = new Error('Language already exists');
      mockApiClient.post.mockRejectedValue(error);

      await expect(languagesApi.createLanguage(newLanguage)).rejects.toThrow('Language already exists');
    });
  });

  describe('updateLanguage', () => {
    it('should update an existing language', async () => {
      const updateData = { name: 'Updated French' };
      const updatedLanguage: Language = { id: 3, name: 'Updated French', sigle: 'fr' };

      mockApiClient.put.mockResolvedValue({ data: updatedLanguage });

      const result = await languagesApi.updateLanguage(3, updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/languages/3', updateData);
      expect(result).toEqual(updatedLanguage);
    });

    it('should handle update errors', async () => {
      const updateData = { name: 'Updated French' };
      const error = new Error('Language not found');
      mockApiClient.put.mockRejectedValue(error);

      await expect(languagesApi.updateLanguage(999, updateData)).rejects.toThrow('Language not found');
    });
  });

  describe('deleteLanguage', () => {
    it('should delete a language', async () => {
      mockApiClient.delete.mockResolvedValue({ data: { message: 'Language deleted' } });

      const result = await languagesApi.deleteLanguage(3);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/languages/3');
      expect(result).toEqual({ message: 'Language deleted' });
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Cannot delete language');
      mockApiClient.delete.mockRejectedValue(error);

      await expect(languagesApi.deleteLanguage(999)).rejects.toThrow('Cannot delete language');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero pagination values', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await languagesApi.getLanguages(0, 0);

      expect(mockApiClient.get).toHaveBeenCalledWith('/languages', {
        params: { skip: 0, limit: 0 },
      });
    });

    it('should handle negative pagination values', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await languagesApi.getLanguages(-10, -5);

      expect(mockApiClient.get).toHaveBeenCalledWith('/languages', {
        params: { skip: -10, limit: -5 },
      });
    });

    it('should handle empty response data', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      const result = await languagesApi.getLanguages();

      expect(result).toEqual([]);
    });

    it('should handle malformed response', async () => {
      mockApiClient.get.mockResolvedValue({ data: null });

      const result = await languagesApi.getLanguages();

      expect(result).toBeNull();
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockApiClient.get.mockRejectedValue(timeoutError);

      await expect(languagesApi.getLanguages()).rejects.toThrow('Request timeout');
    });

    it('should handle very large pagination values', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await languagesApi.getLanguages(1000000, 1000000);

      expect(mockApiClient.get).toHaveBeenCalledWith('/languages', {
        params: { skip: 1000000, limit: 1000000 },
      });
    });
  });

  describe('Data Validation', () => {
    it('should handle language with special characters', async () => {
      const specialLanguage: Language = {
        id: 1,
        name: 'Français (French)',
        sigle: 'fr-FR',
      };

      mockApiClient.get.mockResolvedValue({ data: specialLanguage });

      const result = await languagesApi.getLanguage(1);

      expect(result).toEqual(specialLanguage);
    });

    it('should handle language with unicode characters', async () => {
      const unicodeLanguage: Language = {
        id: 1,
        name: '中文 (Chinese)',
        sigle: 'zh-CN',
      };

      mockApiClient.post.mockResolvedValue({ data: unicodeLanguage });

      const result = await languagesApi.createLanguage({
        name: '中文 (Chinese)',
        sigle: 'zh-CN',
      });

      expect(result).toEqual(unicodeLanguage);
    });

    it('should handle empty string fields', async () => {
      const emptyFieldLanguage = { name: '', sigle: '' };

      mockApiClient.post.mockResolvedValue({ data: { id: 1, ...emptyFieldLanguage } });

      const result = await languagesApi.createLanguage(emptyFieldLanguage);

      expect(mockApiClient.post).toHaveBeenCalledWith('/languages', emptyFieldLanguage);
      expect(result.name).toBe('');
      expect(result.sigle).toBe('');
    });
  });
});