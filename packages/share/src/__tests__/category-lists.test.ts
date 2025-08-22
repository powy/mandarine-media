import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryListsApi } from '../api/category-lists';
import { apiClient } from '../api/client';
import type {
  CategoryList,
  CategoryListItem,
  CategoryListWithItemCount,
  CategoryListJSON
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

describe('Category Lists API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCategoryList: CategoryList = {
    id: 'category-list-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    last_updated_utc: '2024-01-15T14:30:00Z',
    name: 'homepage',
    title: 'Homepage Content',
    description: 'Main homepage category list',
    is_active: true,
    display_order: 1,
  };

  const mockCategoryListWithItemCount: CategoryListWithItemCount = {
    ...mockCategoryList,
    item_count: 5,
  };

  const mockCategoryListItem: CategoryListItem = {
    id: 'item-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    last_updated_utc: '2024-01-15T14:30:00Z',
    category_list_id: 'category-list-1',
    title: 'Featured Episode',
    display_order: 1,
    is_active: true,
    size_width: 300,
    size_height: 200,
    forward_link: '/watch/episode-730',
    media_description_id: 'media-1',
  };

  const mockCategoryListJSON: CategoryListJSON = {
    id: 'category-list-1',
    name: 'homepage',
    title: 'Homepage Content',
    last_updated: '2024-01-15T14:30:00Z',
    items: [
      {
        id: 'item-1',
        title: 'Featured Episode',
        display_order: 1,
        size_width: 300,
        size_height: 200,
        forward_link: '/watch/episode-730',
        media_description_id: 'media-1',
      },
    ],
  };

  describe('getCategoryLists', () => {
    it('should fetch category lists without filters', async () => {
      const mockResponse = {
        data: [mockCategoryListWithItemCount],
        pagination: { skip: 0, limit: 20, total: 1, has_next: false, has_prev: false },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await categoryListsApi.getCategoryLists();

      expect(mockApiClient.get).toHaveBeenCalledWith('/category-lists?');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch category lists with filters', async () => {
      const mockResponse = {
        data: [mockCategoryListWithItemCount],
        pagination: { skip: 0, limit: 10, total: 1, has_next: false, has_prev: false },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const filters = { skip: 0, limit: 10, active_only: true };
      const result = await categoryListsApi.getCategoryLists(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/category-lists?skip=0&limit=10&active_only=true'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createCategoryList', () => {
    it('should create a new category list', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockCategoryList });

      const createData = {
        name: 'homepage',
        title: 'Homepage Content',
        description: 'Main homepage category list',
        is_active: true,
        display_order: 1,
      };

      const result = await categoryListsApi.createCategoryList(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/category-lists', createData);
      expect(result).toEqual(mockCategoryList);
    });
  });

  describe('getCategoryList', () => {
    it('should fetch a single category list', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockCategoryList });

      const result = await categoryListsApi.getCategoryList('category-list-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/category-lists/category-list-1');
      expect(result).toEqual(mockCategoryList);
    });
  });

  describe('updateCategoryList', () => {
    it('should update an existing category list', async () => {
      mockApiClient.put.mockResolvedValue({ data: mockCategoryList });

      const updateData = { title: 'Updated Homepage Content' };
      const result = await categoryListsApi.updateCategoryList('category-list-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/category-lists/category-list-1', updateData);
      expect(result).toEqual(mockCategoryList);
    });
  });

  describe('deleteCategoryList', () => {
    it('should delete a category list', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockCategoryList });

      const result = await categoryListsApi.deleteCategoryList('category-list-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/category-lists/category-list-1');
      expect(result).toEqual(mockCategoryList);
    });
  });

  describe('getCategoryListItems', () => {
    it('should fetch items for a category list', async () => {
      const mockResponse = {
        data: [mockCategoryListItem],
        pagination: { skip: 0, limit: 20, total: 1, has_next: false, has_prev: false },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await categoryListsApi.getCategoryListItems('category-list-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/category-lists/category-list-1/items?');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch items with filters', async () => {
      const mockResponse = {
        data: [mockCategoryListItem],
        pagination: { skip: 0, limit: 10, total: 1, has_next: false, has_prev: false },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const filters = { skip: 0, limit: 10, active_only: true };
      const result = await categoryListsApi.getCategoryListItems('category-list-1', filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/category-lists/category-list-1/items?skip=0&limit=10&active_only=true'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createCategoryListItem', () => {
    it('should create a new category list item', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockCategoryListItem });

      const createData = {
        category_list_id: 'category-list-1',
        title: 'Featured Episode',
        display_order: 1,
        is_active: true,
        size_width: 300,
        size_height: 200,
        forward_link: '/watch/episode-730',
        media_description_id: 'media-1',
      };

      const result = await categoryListsApi.createCategoryListItem('category-list-1', createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/category-lists/category-list-1/items', createData);
      expect(result).toEqual(mockCategoryListItem);
    });
  });

  describe('updateCategoryListItem', () => {
    it('should update a category list item', async () => {
      mockApiClient.put.mockResolvedValue({ data: mockCategoryListItem });

      const updateData = { title: 'Updated Featured Episode' };
      const result = await categoryListsApi.updateCategoryListItem('category-list-1', 'item-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/category-lists/category-list-1/items/item-1', updateData);
      expect(result).toEqual(mockCategoryListItem);
    });
  });

  describe('deleteCategoryListItem', () => {
    it('should delete a category list item', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockCategoryListItem });

      const result = await categoryListsApi.deleteCategoryListItem('category-list-1', 'item-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/category-lists/category-list-1/items/item-1');
      expect(result).toEqual(mockCategoryListItem);
    });
  });

  describe('updateCategoryListItemsOrder', () => {
    it('should update the order of items in a category list', async () => {
      mockApiClient.put.mockResolvedValue({ data: { message: 'Order updated successfully' } });

      const orderData = {
        items: [
          { id: 'item-1', display_order: 2 },
          { id: 'item-2', display_order: 1 },
        ],
      };

      const result = await categoryListsApi.updateCategoryListItemsOrder('category-list-1', orderData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/category-lists/category-list-1/items/order', orderData);
      expect(result).toEqual({ message: 'Order updated successfully' });
    });
  });

  describe('getCategoryListJSON', () => {
    it('should fetch category list JSON content', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockCategoryListJSON });

      const result = await categoryListsApi.getCategoryListJSON('homepage');

      expect(mockApiClient.get).toHaveBeenCalledWith('/category-lists/homepage/json');
      expect(result).toEqual(mockCategoryListJSON);
    });
  });

  describe('regenerateCategoryListJSON', () => {
    it('should regenerate JSON for a category list', async () => {
      mockApiClient.post.mockResolvedValue({ data: { message: 'JSON regenerated successfully' } });

      const result = await categoryListsApi.regenerateCategoryListJSON('category-list-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/category-lists/category-list-1/regenerate-json');
      expect(result).toEqual({ message: 'JSON regenerated successfully' });
    });
  });

  describe('regenerateAllCategoryListsJSON', () => {
    it('should regenerate JSON for all category lists', async () => {
      const mockResponse = {
        updated_count: 5,
        failed_count: 0,
        updated_ids: ['list-1', 'list-2', 'list-3', 'list-4', 'list-5'],
        failed_ids: [],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await categoryListsApi.regenerateAllCategoryListsJSON();

      expect(mockApiClient.post).toHaveBeenCalledWith('/category-lists/regenerate-all-json');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('initializeDefaultCategories', () => {
    it('should initialize default category lists', async () => {
      const mockResponse = {
        message: 'Default categories initialized successfully',
        created_categories: ['homepage', 'featured', 'trending'],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await categoryListsApi.initializeDefaultCategories();

      expect(mockApiClient.post).toHaveBeenCalledWith('/category-lists/initialize-defaults');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(categoryListsApi.getCategoryLists()).rejects.toEqual(errorResponse);
    });

    it('should handle empty response arrays', async () => {
      const emptyResponse = {
        data: [],
        pagination: { skip: 0, limit: 20, total: 0, has_next: false, has_prev: false },
      };

      mockApiClient.get.mockResolvedValue({ data: emptyResponse });

      const result = await categoryListsApi.getCategoryLists();

      expect(result).toEqual(emptyResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle missing optional fields', async () => {
      const minimalCreateData = {
        name: 'minimal',
        title: 'Minimal Category',
      };

      mockApiClient.post.mockResolvedValue({ data: mockCategoryList });

      await categoryListsApi.createCategoryList(minimalCreateData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/category-lists', minimalCreateData);
    });
  });
});