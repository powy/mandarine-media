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
            created_at: '2024-01-01T00:00:00Z'
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
        created_at: '2024-01-01T00:00:00Z'
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
  });
});