import { describe, test, expect, beforeEach, vi } from 'vitest';
import { dataProvider } from '../dataProvider';

// Mock the share package
const mockMediaApi = {
  getMediaDescriptions: vi.fn(),
  getMediaDescription: vi.fn(),
  createMediaDescription: vi.fn(),
  updateMediaDescription: vi.fn(),
  deleteMediaDescription: vi.fn(),
  getVideoFiles: vi.fn(),
  getVideoFile: vi.fn(),
};

const mockCountriesApi = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockContentListApi = {
  getContentLists: vi.fn(),
  getContentList: vi.fn(),
  createContentList: vi.fn(),
  updateContentList: vi.fn(),
  deleteContentList: vi.fn(),
  getContentListJSON: vi.fn(),
  regenerateContentListJSON: vi.fn(),
};

const mockAudienceCategoriesApi = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockSubscriptionPlansApi = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockVideoFileReportsApi = {
  getReports: vi.fn(),
  getReport: vi.fn(),
  getReportsByVideoFile: vi.fn(),
  destroyVideoFile: vi.fn(),
};

vi.mock('share', () => ({
  mediaApi: mockMediaApi,
  countriesApi: mockCountriesApi,
  languagesApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  picturesApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  programsApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  seasonsApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  personsApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  usersApi: { getAll: vi.fn(), getById: vi.fn(), update: vi.fn() },
  authApi: { register: vi.fn() },
  audienceCategoriesApi: mockAudienceCategoriesApi,
  subscriptionPlansApi: mockSubscriptionPlansApi,
  videoFileReportsApi: mockVideoFileReportsApi,
  getContentLists: mockContentListApi.getContentLists,
  getContentList: mockContentListApi.getContentList,
  createContentList: mockContentListApi.createContentList,
  updateContentList: mockContentListApi.updateContentList,
  deleteContentList: mockContentListApi.deleteContentList,
  getScreenDescriptions: vi.fn(),
  getScreenDescription: vi.fn(),
  createScreenDescription: vi.fn(),
  updateScreenDescription: vi.fn(),
  deleteScreenDescription: vi.fn(),
}));

// Mock fetch for themes and media-themes
global.fetch = vi.fn();

describe('DataProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getList', () => {
    test('should handle media-descriptions resource', async () => {
      const mockResponse = {
        data: [
          { id: '1', episode_title: 'Test Episode', creation_date_utc: '2024-01-01T00:00:00Z' }
        ],
        pagination: { total: 1 }
      };

      mockMediaApi.getMediaDescriptions.mockResolvedValue(mockResponse);

      const result = await dataProvider.getList('media-descriptions', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(mockMediaApi.getMediaDescriptions).toHaveBeenCalledWith({
        skip: 0,
        limit: 20,
      });
      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            episode_title: 'Test Episode',
            creation_date_utc: '2024-01-01T00:00:00Z'
          })
        ]),
        total: 1,
      });
    });

    test('should handle countries resource', async () => {
      const mockResponse = {
        data: [
          { id: '1', name: 'South Korea', creation_date_utc: '2024-01-01T00:00:00Z' }
        ],
        pagination: { total: 1 }
      };

      mockCountriesApi.getAll.mockResolvedValue(mockResponse);

      const result = await dataProvider.getList('countries', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(mockCountriesApi.getAll).toHaveBeenCalledWith({
        skip: 0,
        limit: 20,
      });
      expect(result.total).toBe(1);
    });

    test('should handle audience-categories resource', async () => {
      const mockResponse = {
        data: [
          { id: '1', name: 'Family', creation_date_utc: '2024-01-01T00:00:00Z' }
        ],
        pagination: { total: 1 }
      };

      mockAudienceCategoriesApi.getAll.mockResolvedValue(mockResponse);

      const result = await dataProvider.getList('audience-categories', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(mockAudienceCategoriesApi.getAll).toHaveBeenCalledWith({
        skip: 0,
        limit: 20,
      });
      expect(result.total).toBe(1);
    });

    test('should handle subscription-plans resource', async () => {
      const mockResponse = {
        data: [
          { id: '1', name: 'Premium', creation_date_utc: '2024-01-01T00:00:00Z' }
        ],
        pagination: { total: 1 }
      };

      mockSubscriptionPlansApi.getAll.mockResolvedValue(mockResponse);

      const result = await dataProvider.getList('subscription-plans', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(mockSubscriptionPlansApi.getAll).toHaveBeenCalledWith({
        skip: 0,
        limit: 20,
      });
      expect(result.total).toBe(1);
    });

    test('should handle unknown resource', async () => {
      await expect(
        dataProvider.getList('unknown-resource', {
          pagination: { page: 1, perPage: 20 },
          sort: { field: 'id', order: 'ASC' },
          filter: {},
        })
      ).rejects.toThrow('Unknown resource: unknown-resource');
    });
  });

  describe('getOne', () => {
    test('should handle media-descriptions resource', async () => {
      const mockResponse = {
        id: '1',
        episode_title: 'Test Episode',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockMediaApi.getMediaDescription.mockResolvedValue(mockResponse);

      const result = await dataProvider.getOne('media-descriptions', { id: '1' });

      expect(mockMediaApi.getMediaDescription).toHaveBeenCalledWith('1');
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        episode_title: 'Test Episode',
        creation_date_utc: '2024-01-01T00:00:00Z'
      }));
    });

    test('should handle audience-categories resource', async () => {
      const mockResponse = {
        id: '1',
        name: 'Family',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockAudienceCategoriesApi.getById.mockResolvedValue(mockResponse);

      const result = await dataProvider.getOne('audience-categories', { id: '1' });

      expect(mockAudienceCategoriesApi.getById).toHaveBeenCalledWith('1');
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        name: 'Family',
        creation_date_utc: '2024-01-01T00:00:00Z'
      }));
    });

    test('should handle subscription-plans resource', async () => {
      const mockResponse = {
        id: '1',
        name: 'Premium',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockSubscriptionPlansApi.getById.mockResolvedValue(mockResponse);

      const result = await dataProvider.getOne('subscription-plans', { id: '1' });

      expect(mockSubscriptionPlansApi.getById).toHaveBeenCalledWith('1');
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        name: 'Premium',
        creation_date_utc: '2024-01-01T00:00:00Z'
      }));
    });

  });

  describe('create', () => {

    test('should handle media-descriptions resource', async () => {
      const mockInput = {
        episode_title: 'New Episode',
        media_type: 'video'
      };
      const mockResponse = {
        id: '2',
        episode_title: 'New Episode',
        media_type: 'video',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockMediaApi.createMediaDescription.mockResolvedValue(mockResponse);

      const result = await dataProvider.create('media-descriptions', { data: mockInput });

      expect(mockMediaApi.createMediaDescription).toHaveBeenCalledWith(expect.objectContaining({
        file_number: 0,
        episode_title: 'New Episode',
        media_type: 'video'
      }));
      expect(result.data).toEqual(expect.objectContaining({
        id: '2',
        episode_title: 'New Episode'
      }));
    });

    test('should handle audience-categories resource', async () => {
      const mockInput = {
        name: 'Adults Only'
      };
      const mockResponse = {
        id: '2',
        name: 'Adults Only',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockAudienceCategoriesApi.create.mockResolvedValue(mockResponse);

      const result = await dataProvider.create('audience-categories', { data: mockInput });

      expect(mockAudienceCategoriesApi.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Adults Only'
      }));
      expect(result.data).toEqual(expect.objectContaining({
        id: '2',
        name: 'Adults Only'
      }));
    });

    test('should handle subscription-plans resource', async () => {
      const mockInput = {
        name: 'Basic'
      };
      const mockResponse = {
        id: '2',
        name: 'Basic',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockSubscriptionPlansApi.create.mockResolvedValue(mockResponse);

      const result = await dataProvider.create('subscription-plans', { data: mockInput });

      expect(mockSubscriptionPlansApi.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Basic'
      }));
      expect(result.data).toEqual(expect.objectContaining({
        id: '2',
        name: 'Basic'
      }));
    });
  });

  describe('update', () => {

    test('should handle media-descriptions resource', async () => {
      const mockInput = {
        episode_title: 'Updated Episode',
        media_type: 'video'
      };
      const mockResponse = {
        id: '1',
        episode_title: 'Updated Episode',
        media_type: 'video',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockMediaApi.updateMediaDescription.mockResolvedValue(mockResponse);

      const result = await dataProvider.update('media-descriptions', { id: '1', data: mockInput });

      expect(mockMediaApi.updateMediaDescription).toHaveBeenCalledWith('1', expect.objectContaining({
        episode_title: 'Updated Episode',
        media_type: 'video'
      }));
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        episode_title: 'Updated Episode'
      }));
    });

    test('should handle audience-categories resource', async () => {
      const mockInput = {
        name: 'Updated Category'
      };
      const mockResponse = {
        id: '1',
        name: 'Updated Category',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockAudienceCategoriesApi.update.mockResolvedValue(mockResponse);

      const result = await dataProvider.update('audience-categories', { id: '1', data: mockInput });

      expect(mockAudienceCategoriesApi.update).toHaveBeenCalledWith('1', expect.objectContaining({
        name: 'Updated Category'
      }));
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        name: 'Updated Category'
      }));
    });

    test('should handle subscription-plans resource', async () => {
      const mockInput = {
        name: 'Updated Plan'
      };
      const mockResponse = {
        id: '1',
        name: 'Updated Plan',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockSubscriptionPlansApi.update.mockResolvedValue(mockResponse);

      const result = await dataProvider.update('subscription-plans', { id: '1', data: mockInput });

      expect(mockSubscriptionPlansApi.update).toHaveBeenCalledWith('1', expect.objectContaining({
        name: 'Updated Plan'
      }));
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        name: 'Updated Plan'
      }));
    });
  });

  describe('delete', () => {

    test('should handle media-descriptions resource', async () => {
      const mockResponse = {
        id: '1',
        episode_title: 'Deleted Episode',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockMediaApi.deleteMediaDescription.mockResolvedValue(mockResponse);

      const result = await dataProvider.delete('media-descriptions', { id: '1' });

      expect(mockMediaApi.deleteMediaDescription).toHaveBeenCalledWith('1');
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        episode_title: 'Deleted Episode'
      }));
    });

    test('should handle audience-categories resource', async () => {
      const mockResponse = {
        id: '1',
        name: 'Deleted Category',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockAudienceCategoriesApi.delete.mockResolvedValue(mockResponse);

      const result = await dataProvider.delete('audience-categories', { id: '1' });

      expect(mockAudienceCategoriesApi.delete).toHaveBeenCalledWith('1');
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        name: 'Deleted Category'
      }));
    });

    test('should handle subscription-plans resource', async () => {
      const mockResponse = {
        id: '1',
        name: 'Deleted Plan',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      mockSubscriptionPlansApi.delete.mockResolvedValue(mockResponse);

      const result = await dataProvider.delete('subscription-plans', { id: '1' });

      expect(mockSubscriptionPlansApi.delete).toHaveBeenCalledWith('1');
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        name: 'Deleted Plan'
      }));
    });
  });

  describe('video-file-reports resource', () => {
    test('should handle getList for video-file-reports', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            video_file_id: 'video-123',
            video_file_name: 'test.mp4',
            event: 'possible_orphan',
            timestamp: '2024-01-01T00:00:00Z'
          }
        ],
        pagination: { total: 1 }
      };

      mockVideoFileReportsApi.getReports.mockResolvedValue(mockResponse);

      const result = await dataProvider.getList('video-file-reports', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(mockVideoFileReportsApi.getReports).toHaveBeenCalledWith({
        skip: 0,
        limit: 20,
      });
      expect(result.total).toBe(1);
    });

    test('should handle getOne for video-file-reports', async () => {
      const mockResponse = {
        id: '1',
        video_file_id: 'video-123',
        video_file_name: 'test.mp4',
        event: 'possible_orphan',
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockVideoFileReportsApi.getReport.mockResolvedValue(mockResponse);

      const result = await dataProvider.getOne('video-file-reports', { id: '1' });

      expect(mockVideoFileReportsApi.getReport).toHaveBeenCalledWith('1');
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        video_file_id: 'video-123'
      }));
    });
  });

  describe('themes resource', () => {
    test('should handle getList for themes', async () => {
      const mockResponse = [
        {
          id: '1',
          name: 'Action',
          category: 'genre',
          creation_date_utc: '2024-01-01T00:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await dataProvider.getList('themes', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/themes?skip=0&limit=20');
      expect(result.total).toBe(1);
    });

    test('should handle getOne for themes', async () => {
      const mockResponse = {
        id: '1',
        name: 'Action',
        category: 'genre',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      (global.fetch as any).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await dataProvider.getOne('themes', { id: '1' });

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/themes/1');
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        name: 'Action'
      }));
    });
  });

  describe('media-themes resource', () => {
    test('should handle getList for media-themes', async () => {
      const mockResponse = [
        {
          id: '1',
          name: 'Romantic Comedy',
          creation_date_utc: '2024-01-01T00:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await dataProvider.getList('media-themes', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/media-themes?skip=0&limit=20');
      expect(result.total).toBe(1);
    });

    test('should handle getOne for media-themes', async () => {
      const mockResponse = {
        id: '1',
        name: 'Romantic Comedy',
        creation_date_utc: '2024-01-01T00:00:00Z'
      };

      (global.fetch as any).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await dataProvider.getOne('media-themes', { id: '1' });

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/media-themes/1');
      expect(result.data).toEqual(expect.objectContaining({
        id: '1',
        name: 'Romantic Comedy'
      }));
    });
  });
});