import { describe, it, expect, vi, beforeEach } from 'vitest';
import { personsApi } from '../api/persons';
import { apiClient } from '../api/client';
import type {
  PublicPerson,
  PublicPersonCreate,
  PublicPersonUpdate,
  PersonsApiParams,
  PaginatedPersonsResponse
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

describe('Persons API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPublicPerson: PublicPerson = {
    id: 'person-123',
    creation_date_utc: '2024-01-15T10:30:00Z',
    stage_name_roman: 'Kim Chul-soo',
    first_name_hangul: '김',
    last_name_hangul: '철수',
    first_name_roman: 'Chul',
    last_name_roman: 'Kim',
    stage_name_hangul: '김철수',
    profession_list: ['actor', 'singer'],
    face_image_id: 'image-456'
  };

  const mockPaginatedResponse: PaginatedPersonsResponse = {
    data: [mockPublicPerson],
    pagination: {
      skip: 0,
      limit: 20,
      total: 1,
      page: 1,
      pages: 1
    }
  };

  describe('getAll', () => {
    it('should fetch all persons with default parameters', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const result = await personsApi.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons?skip=0&limit=20');
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should fetch persons with custom pagination', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const params: PersonsApiParams = {
        skip: 10,
        limit: 5
      };

      const result = await personsApi.getAll(params);

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons?skip=10&limit=5');
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should fetch persons with profession filter', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const params: PersonsApiParams = {
        skip: 0,
        limit: 20,
        profession: 'actor'
      };

      const result = await personsApi.getAll(params);

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons?skip=0&limit=20&profession=actor');
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should fetch persons with search query', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const params: PersonsApiParams = {
        skip: 0,
        limit: 20,
        q: 'Kim'
      };

      const result = await personsApi.getAll(params);

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons?skip=0&limit=20&search=Kim');
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should fetch persons with all filters', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const params: PersonsApiParams = {
        skip: 5,
        limit: 15,
        profession: 'singer',
        q: 'Lee'
      };

      const result = await personsApi.getAll(params);

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons?skip=5&limit=15&profession=singer&search=Lee');
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle empty results', async () => {
      const emptyResponse: PaginatedPersonsResponse = {
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

      const result = await personsApi.getAll();

      expect(result).toEqual(emptyResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(personsApi.getAll()).rejects.toThrow('Network timeout');
    });
  });

  describe('getPublicPersons (legacy method)', () => {
    it('should call getAll method for backward compatibility', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const params: PersonsApiParams = {
        skip: 10,
        limit: 5,
        profession: 'director'
      };

      const result = await personsApi.getPublicPersons(params);

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons?skip=10&limit=5&profession=director');
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should work without parameters', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const result = await personsApi.getPublicPersons();

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons?skip=0&limit=20');
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('getById', () => {
    it('should fetch person by ID', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPublicPerson });

      const result = await personsApi.getById('person-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons/person-123');
      expect(result).toEqual(mockPublicPerson);
    });

    it('should handle person not found', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'Public person not found'
            }
          }
        }
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(personsApi.getById('nonexistent')).rejects.toEqual(errorResponse);
    });

    it('should handle special characters in ID', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPublicPerson });

      const specialId = 'person-with-special-chars-é@#$';
      await personsApi.getById(specialId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/persons/${specialId}`);
    });
  });

  describe('getPublicPerson (legacy method)', () => {
    it('should call getById method for backward compatibility', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPublicPerson });

      const result = await personsApi.getPublicPerson('person-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons/person-123');
      expect(result).toEqual(mockPublicPerson);
    });
  });

  describe('create', () => {
    it('should create new person with required fields only', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPublicPerson });

      const createData: PublicPersonCreate = {
        stage_name_roman: 'New Actor'
      };

      const result = await personsApi.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/persons', createData);
      expect(result).toEqual(mockPublicPerson);
    });

    it('should create new person with all fields', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPublicPerson });

      const createData: PublicPersonCreate = {
        stage_name_roman: 'Kim Chul-soo',
        first_name_hangul: '김',
        last_name_hangul: '철수',
        first_name_roman: 'Chul',
        last_name_roman: 'Kim',
        stage_name_hangul: '김철수',
        profession_list: ['actor', 'singer'],
        face_image_id: 'image-456'
      };

      const result = await personsApi.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/persons', createData);
      expect(result).toEqual(mockPublicPerson);
    });

    it('should handle validation errors during creation', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'stage_name_roman is required',
              details: {
                field: 'stage_name_roman',
                message: 'This field is required'
              }
            }
          }
        }
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      const invalidData = {} as PublicPersonCreate;

      await expect(personsApi.create(invalidData)).rejects.toEqual(errorResponse);
    });

    it('should handle null values in optional fields', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPublicPerson });

      const createData: PublicPersonCreate = {
        stage_name_roman: 'Test Actor',
        first_name_hangul: null,
        last_name_hangul: null,
        profession_list: null,
        face_image_id: null
      };

      const result = await personsApi.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/persons', createData);
      expect(result).toEqual(mockPublicPerson);
    });
  });

  describe('createPublicPerson (legacy method)', () => {
    it('should call create method for backward compatibility', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPublicPerson });

      const createData: PublicPersonCreate = {
        stage_name_roman: 'Legacy Actor'
      };

      const result = await personsApi.createPublicPerson(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/persons', createData);
      expect(result).toEqual(mockPublicPerson);
    });
  });

  describe('update', () => {
    it('should update person with partial data', async () => {
      const updatedPerson = { ...mockPublicPerson, stage_name_roman: 'Updated Actor' };
      mockApiClient.put.mockResolvedValue({ data: updatedPerson });

      const updateData: PublicPersonUpdate = {
        stage_name_roman: 'Updated Actor'
      };

      const result = await personsApi.update('person-123', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/persons/person-123', updateData);
      expect(result).toEqual(updatedPerson);
    });

    it('should update person with all fields', async () => {
      const updatedPerson = { 
        ...mockPublicPerson, 
        stage_name_roman: 'Updated Actor',
        profession_list: ['director', 'producer']
      };
      mockApiClient.put.mockResolvedValue({ data: updatedPerson });

      const updateData: PublicPersonUpdate = {
        stage_name_roman: 'Updated Actor',
        first_name_hangul: '업데이트',
        last_name_hangul: '배우',
        first_name_roman: 'Updated',
        last_name_roman: 'Actor',
        stage_name_hangul: '업데이트배우',
        profession_list: ['director', 'producer'],
        face_image_id: 'new-image-789'
      };

      const result = await personsApi.update('person-123', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/persons/person-123', updateData);
      expect(result).toEqual(updatedPerson);
    });

    it('should handle update with null values', async () => {
      const updatedPerson = { ...mockPublicPerson, face_image_id: null };
      mockApiClient.put.mockResolvedValue({ data: updatedPerson });

      const updateData: PublicPersonUpdate = {
        face_image_id: null
      };

      const result = await personsApi.update('person-123', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/persons/person-123', updateData);
      expect(result).toEqual(updatedPerson);
    });

    it('should handle update errors', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'Public person not found'
            }
          }
        }
      };

      mockApiClient.put.mockRejectedValue(errorResponse);

      const updateData: PublicPersonUpdate = {
        stage_name_roman: 'Updated Name'
      };

      await expect(personsApi.update('nonexistent', updateData)).rejects.toEqual(errorResponse);
    });
  });

  describe('updatePublicPerson (legacy method)', () => {
    it('should call update method for backward compatibility', async () => {
      const updatedPerson = { ...mockPublicPerson, stage_name_roman: 'Legacy Updated' };
      mockApiClient.put.mockResolvedValue({ data: updatedPerson });

      const updateData: PublicPersonUpdate = {
        stage_name_roman: 'Legacy Updated'
      };

      const result = await personsApi.updatePublicPerson('person-123', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/persons/person-123', updateData);
      expect(result).toEqual(updatedPerson);
    });
  });

  describe('delete', () => {
    it('should delete person by ID', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockPublicPerson });

      const result = await personsApi.delete('person-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/persons/person-123');
      expect(result).toEqual(mockPublicPerson);
    });

    it('should handle delete errors', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'Public person not found'
            }
          }
        }
      };

      mockApiClient.delete.mockRejectedValue(errorResponse);

      await expect(personsApi.delete('nonexistent')).rejects.toEqual(errorResponse);
    });

    it('should handle permission errors', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions to delete person'
            }
          }
        }
      };

      mockApiClient.delete.mockRejectedValue(errorResponse);

      await expect(personsApi.delete('person-123')).rejects.toEqual(errorResponse);
    });
  });

  describe('deletePublicPerson (legacy method)', () => {
    it('should call delete method for backward compatibility', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockPublicPerson });

      const result = await personsApi.deletePublicPerson('person-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/persons/person-123');
      expect(result).toEqual(mockPublicPerson);
    });
  });

  describe('searchPublicPersonsByName', () => {
    it('should search persons by name with default pagination', async () => {
      mockApiClient.get.mockResolvedValue({ data: [mockPublicPerson] });

      const result = await personsApi.searchPublicPersonsByName('Kim');

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons/search/by-name?name=Kim&skip=0&limit=20');
      expect(result).toEqual([mockPublicPerson]);
    });

    it('should search persons by name with custom pagination', async () => {
      mockApiClient.get.mockResolvedValue({ data: [mockPublicPerson] });

      const result = await personsApi.searchPublicPersonsByName('Lee', 10, 5);

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons/search/by-name?name=Lee&skip=10&limit=5');
      expect(result).toEqual([mockPublicPerson]);
    });

    it('should handle empty search results', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      const result = await personsApi.searchPublicPersonsByName('NonExistent');

      expect(result).toEqual([]);
    });

    it('should handle special characters in search query', async () => {
      mockApiClient.get.mockResolvedValue({ data: [mockPublicPerson] });

      const searchName = 'Kim Chul-soo (김철수)';
      await personsApi.searchPublicPersonsByName(searchName);

      // URLSearchParams encodes spaces as + and parentheses differently than encodeURIComponent
      const params = new URLSearchParams();
      params.append('name', searchName);
      params.append('skip', '0');
      params.append('limit', '20');
      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/persons/search/by-name?${params.toString()}`
      );
    });

    it('should handle search errors', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: {
            error: {
              code: 'SEARCH_ERROR',
              message: 'Search service temporarily unavailable'
            }
          }
        }
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(personsApi.searchPublicPersonsByName('Kim')).rejects.toEqual(errorResponse);
    });
  });

  describe('getPublicPersonsByProfession', () => {
    it('should get persons by profession with default pagination', async () => {
      mockApiClient.get.mockResolvedValue({ data: [mockPublicPerson] });

      const result = await personsApi.getPublicPersonsByProfession('actor');

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons/profession/actor?skip=0&limit=20');
      expect(result).toEqual([mockPublicPerson]);
    });

    it('should get persons by profession with custom pagination', async () => {
      mockApiClient.get.mockResolvedValue({ data: [mockPublicPerson] });

      const result = await personsApi.getPublicPersonsByProfession('singer', 5, 10);

      expect(mockApiClient.get).toHaveBeenCalledWith('/persons/profession/singer?skip=5&limit=10');
      expect(result).toEqual([mockPublicPerson]);
    });

    it('should handle URL encoding for profession names', async () => {
      mockApiClient.get.mockResolvedValue({ data: [mockPublicPerson] });

      const profession = 'voice actor';
      await personsApi.getPublicPersonsByProfession(profession);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/persons/profession/${encodeURIComponent(profession)}?skip=0&limit=20`
      );
    });

    it('should handle empty profession results', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      const result = await personsApi.getPublicPersonsByProfession('rare_profession');

      expect(result).toEqual([]);
    });

    it('should handle profession query errors', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'INVALID_PROFESSION',
              message: 'Invalid profession specified'
            }
          }
        }
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(personsApi.getPublicPersonsByProfession('invalid')).rejects.toEqual(errorResponse);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long names', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPublicPerson });

      const longName = 'A'.repeat(500);
      const createData: PublicPersonCreate = {
        stage_name_roman: longName
      };

      const result = await personsApi.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/persons', createData);
      expect(result).toEqual(mockPublicPerson);
    });

    it('should handle Unicode characters correctly', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPublicPerson });

      const unicodeData: PublicPersonCreate = {
        stage_name_roman: 'Test Actor',
        first_name_hangul: '김',
        last_name_hangul: '철수',
        stage_name_hangul: '김철수',
        first_name_roman: 'Chul-soo',
        last_name_roman: 'Kim'
      };

      const result = await personsApi.create(unicodeData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/persons', unicodeData);
      expect(result).toEqual(mockPublicPerson);
    });

    it('should handle empty arrays in profession_list', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPublicPerson });

      const createData: PublicPersonCreate = {
        stage_name_roman: 'Test Actor',
        profession_list: []
      };

      const result = await personsApi.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/persons', createData);
      expect(result).toEqual(mockPublicPerson);
    });

    it('should handle server errors gracefully', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          }
        }
      };

      mockApiClient.get.mockRejectedValue(serverError);

      await expect(personsApi.getAll()).rejects.toEqual(serverError);
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests, please try again later'
            }
          }
        }
      };

      mockApiClient.get.mockRejectedValue(rateLimitError);

      await expect(personsApi.getAll()).rejects.toEqual(rateLimitError);
    });

    it('should handle malformed response data', async () => {
      mockApiClient.get.mockResolvedValue({ data: null });

      const result = await personsApi.getById('person-123');

      expect(result).toBeNull();
    });

    it('should handle pagination edge cases', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      // Test with zero skip
      await personsApi.getAll({ skip: 0, limit: 1 });
      expect(mockApiClient.get).toHaveBeenCalledWith('/persons?skip=0&limit=1');

      // Test with large skip
      await personsApi.getAll({ skip: 10000, limit: 100 });
      expect(mockApiClient.get).toHaveBeenCalledWith('/persons?skip=10000&limit=100');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent API calls', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPublicPerson });

      const promises = Array.from({ length: 10 }, (_, i) => 
        personsApi.getById(`person-${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockApiClient.get).toHaveBeenCalledTimes(10);
      results.forEach(result => {
        expect(result).toEqual(mockPublicPerson);
      });
    });

    it('should handle mixed success/failure in concurrent operations', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ data: mockPublicPerson })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockPublicPerson });

      const promises = [
        personsApi.getById('person-1'),
        personsApi.getById('person-2').catch(err => ({ error: err })),
        personsApi.getById('person-3')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(mockPublicPerson);
      expect(results[1]).toHaveProperty('error');
      expect(results[2]).toEqual(mockPublicPerson);
    });
  });
});