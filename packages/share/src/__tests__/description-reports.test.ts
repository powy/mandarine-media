import { describe, expect, test, beforeEach, vi } from 'vitest';
import { descriptionReportsApi } from '../api/description-reports';
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

describe('Description Reports API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDescriptionReports', () => {
    test('should fetch description reports with default parameters', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'report-1',
              description_id: 'media-1',
              title: 'Episode 1',
              success_associated_file: true,
              timestamp: '2024-01-15T10:30:00Z',
              batch_id: 'batch-123'
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

      const result = await descriptionReportsApi.getDescriptionReports();

      expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports?');
      expect(result).toEqual(mockResponse.data);
    });

    test('should fetch description reports with filters', async () => {
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
        batch_id: 'batch-456',
        status: 'success' as const,
        description_id: 'media-123'
      };

      await descriptionReportsApi.getDescriptionReports(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/description-reports?skip=10&limit=5&batch_id=batch-456&status=success&description_id=media-123'
      );
    });

    test('should handle different status filters', async () => {
      const mockResponse = {
        data: { data: [], pagination: { skip: 0, limit: 20, total: 0, page: 1, total_pages: 0, has_next: false, has_prev: false } }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      // Test each status type
      const statuses = ['success', 'failed', 'partial'] as const;

      for (const status of statuses) {
        await descriptionReportsApi.getDescriptionReports({ status });

        expect(mockApiClient.get).toHaveBeenCalledWith(`/description-reports?status=${status}`);
      }

      expect(mockApiClient.get).toHaveBeenCalledTimes(statuses.length);
    });

    test('should handle empty filters', async () => {
      const mockResponse = {
        data: { data: [], pagination: { skip: 0, limit: 20, total: 0, page: 1, total_pages: 0, has_next: false, has_prev: false } }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await descriptionReportsApi.getDescriptionReports({});

      expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports?');
    });
  });

  describe('getDescriptionReport', () => {
    test('should fetch single description report by id', async () => {
      const mockReport = {
        id: 'report-1',
        description_id: 'media-1',
        title: 'Episode 1',
        success_associated_file: true,
        timestamp: '2024-01-15T10:30:00Z',
        batch_id: 'batch-123'
      };

      const mockResponse = { data: mockReport };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await descriptionReportsApi.getDescriptionReport('report-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports/report-1');
      expect(result).toEqual(mockReport);
    });

    test('should handle not found error', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Description report not found' }
        }
      };

      mockApiClient.get.mockRejectedValue(mockError);

      await expect(descriptionReportsApi.getDescriptionReport('non-existent')).rejects.toEqual(mockError);
      expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports/non-existent');
    });

    test('should handle authentication errors', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { detail: 'Not authenticated' }
        }
      };

      mockApiClient.get.mockRejectedValue(mockError);

      await expect(descriptionReportsApi.getDescriptionReport('report-1')).rejects.toEqual(mockError);
    });
  });

  describe('getDescriptionReportsByBatch', () => {
    test('should fetch all reports for a specific batch', async () => {
      const mockReports = [
        {
          id: 'report-1',
          description_id: 'media-1',
          title: 'Episode 1',
          success_associated_file: true,
          timestamp: '2024-01-15T10:30:00Z',
          batch_id: 'batch-123'
        },
        {
          id: 'report-2',
          description_id: 'media-2',
          title: 'Episode 2',
          success_associated_file: false,
          timestamp: '2024-01-15T10:31:00Z',
          batch_id: 'batch-123'
        }
      ];

      const mockResponse = { data: mockReports };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await descriptionReportsApi.getDescriptionReportsByBatch('batch-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports/batch/batch-123');
      expect(result).toEqual(mockReports);
      expect(result).toHaveLength(2);
      expect(result[0].batch_id).toBe('batch-123');
      expect(result[1].batch_id).toBe('batch-123');
    });

    test('should handle empty batch results', async () => {
      const mockResponse = { data: [] };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await descriptionReportsApi.getDescriptionReportsByBatch('empty-batch');

      expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports/batch/empty-batch');
      expect(result).toEqual([]);
    });

    test('should handle batch not found error', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Batch not found' }
        }
      };

      mockApiClient.get.mockRejectedValue(mockError);

      await expect(
        descriptionReportsApi.getDescriptionReportsByBatch('non-existent-batch')
      ).rejects.toEqual(mockError);
    });

    test('should handle large batch results', async () => {
      const largeBatchReports = Array.from({ length: 100 }, (_, index) => ({
        id: `report-${index + 1}`,
        description_id: `media-${index + 1}`,
        title: `Episode ${index + 1}`,
        success_associated_file: index % 2 === 0, // Alternate success/failure
        timestamp: `2024-01-15T10:${String(index).padStart(2, '0')}:00Z`,
        batch_id: 'large-batch'
      }));

      const mockResponse = { data: largeBatchReports };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await descriptionReportsApi.getDescriptionReportsByBatch('large-batch');

      expect(result).toHaveLength(100);
      expect(result[0].title).toBe('Episode 1');
      expect(result[99].title).toBe('Episode 100');
    });
  });

  describe('Report Status Validation', () => {
    test('should correctly handle success status reports', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'report-success',
              description_id: 'media-1',
              title: 'Successful Episode',
              success_associated_file: true,
              timestamp: '2024-01-15T10:30:00Z'
            }
          ],
          pagination: { skip: 0, limit: 20, total: 1, page: 1, total_pages: 1, has_next: false, has_prev: false }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await descriptionReportsApi.getDescriptionReports({ status: 'success' });

      expect(result.data[0].success_associated_file).toBe(true);
    });

    test('should correctly handle failed status reports', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'report-failed',
              description_id: 'media-2',
              title: 'Failed Episode',
              success_associated_file: false,
              timestamp: '2024-01-15T10:30:00Z'
            }
          ],
          pagination: { skip: 0, limit: 20, total: 1, page: 1, total_pages: 1, has_next: false, has_prev: false }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await descriptionReportsApi.getDescriptionReports({ status: 'failed' });

      expect(result.data[0].success_associated_file).toBe(false);
    });

    test('should handle partial status reports', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'report-partial',
              description_id: 'media-3',
              title: 'Partially Processed Episode',
              success_associated_file: null, // Partial status might be null or special value
              timestamp: '2024-01-15T10:30:00Z'
            }
          ],
          pagination: { skip: 0, limit: 20, total: 1, page: 1, total_pages: 1, has_next: false, has_prev: false }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await descriptionReportsApi.getDescriptionReports({ status: 'partial' });

      expect(result.data[0].title).toBe('Partially Processed Episode');
    });
  });

  describe('Pagination Edge Cases', () => {
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

      await descriptionReportsApi.getDescriptionReports({ skip: 1000, limit: 10 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports?skip=1000&limit=10');
    });

    test('should handle zero results with proper pagination', async () => {
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

      const result = await descriptionReportsApi.getDescriptionReports();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.has_next).toBe(false);
    });
  });

  describe('API 1.13 Compliance', () => {
    test('should match API 1.13 report structure', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'report-1',
              description_id: 'media-1',
              title: 'Episode Title',
              success_associated_file: true,
              timestamp: '2024-01-15T10:30:00Z',
              batch_id: 'batch-123'
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

      const result = await descriptionReportsApi.getDescriptionReports();

      // Verify API 1.13 structure
      const report = result.data[0];
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('description_id');
      expect(report).toHaveProperty('title');
      expect(report).toHaveProperty('success_associated_file');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('batch_id');

      // Verify pagination structure
      expect(result.pagination).toHaveProperty('skip');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('total_pages');
      expect(result.pagination).toHaveProperty('has_next');
      expect(result.pagination).toHaveProperty('has_prev');
    });

    test('should handle reports without batch_id', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'report-single',
              description_id: 'media-1',
              title: 'Single Episode',
              success_associated_file: true,
              timestamp: '2024-01-15T10:30:00Z'
              // batch_id is optional
            }
          ],
          pagination: { skip: 0, limit: 20, total: 1, page: 1, total_pages: 1, has_next: false, has_prev: false }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await descriptionReportsApi.getDescriptionReports();

      expect(result.data[0]).not.toHaveProperty('batch_id');
      expect(result.data[0].id).toBe('report-single');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(descriptionReportsApi.getDescriptionReports()).rejects.toThrow('Network Error');
    });

    test('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      };

      mockApiClient.get.mockRejectedValue(serverError);

      await expect(descriptionReportsApi.getDescriptionReports()).rejects.toEqual(serverError);
    });

    test('should handle permission errors for admin-only endpoints', async () => {
      const permissionError = {
        response: {
          status: 403,
          data: { detail: 'Not enough permissions' }
        }
      };

      mockApiClient.get.mockRejectedValue(permissionError);

      await expect(
        descriptionReportsApi.getDescriptionReports()
      ).rejects.toEqual(permissionError);
    });

    test('should handle malformed batch IDs', async () => {
      const malformedError = {
        response: {
          status: 400,
          data: { detail: 'Invalid batch ID format' }
        }
      };

      mockApiClient.get.mockRejectedValue(malformedError);

      await expect(
        descriptionReportsApi.getDescriptionReportsByBatch('invalid-batch-format')
      ).rejects.toEqual(malformedError);
    });
  });

  describe('Filter Combinations', () => {
    test('should handle multiple filters simultaneously', async () => {
      const mockResponse = {
        data: { data: [], pagination: { skip: 0, limit: 20, total: 0, page: 1, total_pages: 0, has_next: false, has_prev: false } }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await descriptionReportsApi.getDescriptionReports({
        skip: 20,
        limit: 10,
        batch_id: 'batch-456',
        status: 'failed',
        description_id: 'media-789'
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/description-reports?skip=20&limit=10&batch_id=batch-456&status=failed&description_id=media-789'
      );
    });

    test('should ignore undefined filter values', async () => {
      const mockResponse = {
        data: { data: [], pagination: { skip: 0, limit: 20, total: 0, page: 1, total_pages: 0, has_next: false, has_prev: false } }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await descriptionReportsApi.getDescriptionReports({
        batch_id: 'batch-123',
        status: undefined,
        description_id: undefined
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports?batch_id=batch-123');
    });
  });

  describe('Bulk Operation Report Tracking', () => {
    test('should properly track bulk operation reports', async () => {
      const bulkReports = [
        {
          id: 'report-bulk-1',
          description_id: 'media-1',
          title: 'Bulk Episode 1',
          success_associated_file: true,
          timestamp: '2024-01-15T10:30:00Z',
          batch_id: 'bulk-batch-789'
        },
        {
          id: 'report-bulk-2',
          description_id: 'media-2',
          title: 'Bulk Episode 2',
          success_associated_file: false,
          timestamp: '2024-01-15T10:30:01Z',
          batch_id: 'bulk-batch-789'
        }
      ];

      const mockResponse = { data: bulkReports };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await descriptionReportsApi.getDescriptionReportsByBatch('bulk-batch-789');

      expect(result).toHaveLength(2);
      expect(result[0].success_associated_file).toBe(true);
      expect(result[1].success_associated_file).toBe(false);
      expect(result.every(report => report.batch_id === 'bulk-batch-789')).toBe(true);
    });
  });
});