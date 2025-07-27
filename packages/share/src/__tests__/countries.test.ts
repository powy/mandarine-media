import { describe, it, expect, vi, beforeEach } from 'vitest';
import { countriesApi } from '../api/countries';
import { apiClient } from '../api/client';
import type { Country, CountryCreate, CountryUpdate } from '../types';

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

describe('Countries API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCountry: Country = {
    id: 'country-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    name: 'South Korea',
  };

  describe('getAll', () => {
    it('should fetch all countries without filters', async () => {
      mockApiClient.get.mockResolvedValue({ data: [mockCountry] });

      const result = await countriesApi.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/countries?skip=0&limit=20');
      expect(result).toEqual([mockCountry]);
    });

    it('should fetch countries with custom pagination', async () => {
      mockApiClient.get.mockResolvedValue({ data: [mockCountry] });

      const result = await countriesApi.getAll({ skip: 10, limit: 5 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/countries?skip=10&limit=5');
      expect(result).toEqual([mockCountry]);
    });
  });

  describe('getById', () => {
    it('should fetch a single country by ID', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockCountry });

      const result = await countriesApi.getById('country-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/countries/country-1');
      expect(result).toEqual(mockCountry);
    });
  });

  describe('create', () => {
    it('should create a new country', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockCountry });

      const createData: CountryCreate = {
        name: 'South Korea',
      };

      const result = await countriesApi.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/countries', createData);
      expect(result).toEqual(mockCountry);
    });
  });

  describe('update', () => {
    it('should update an existing country', async () => {
      const updatedCountry = { ...mockCountry, name: 'Republic of Korea' };
      mockApiClient.put.mockResolvedValue({ data: updatedCountry });

      const updateData: CountryUpdate = {
        name: 'Republic of Korea',
      };

      const result = await countriesApi.update('country-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/countries/country-1', updateData);
      expect(result).toEqual(updatedCountry);
    });
  });

  describe('delete', () => {
    it('should delete a country', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockCountry });

      const result = await countriesApi.delete('country-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/countries/country-1');
      expect(result).toEqual(mockCountry);
    });
  });

  describe('Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { error: { code: 'NOT_FOUND', message: 'Country not found' } },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(countriesApi.getById('nonexistent')).rejects.toEqual(errorResponse);
    });

    it('should handle empty response arrays', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      const result = await countriesApi.getAll();

      expect(result).toEqual([]);
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockApiClient.get.mockRejectedValue(timeoutError);

      await expect(countriesApi.getAll()).rejects.toThrow('Network timeout');
    });
  });
});