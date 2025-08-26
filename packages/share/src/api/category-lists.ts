import { apiClient } from './client';
import { 
  CategoryList, 
  CategoryListItem, 
  CategoryListWithItemCount, 
  CategoryListJSON 
} from '../types';

export interface CategoryListResponse {
  data: CategoryListWithItemCount[];
  pagination: {
    skip: number;
    limit: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface CategoryListItemResponse {
  data: CategoryListItem[];
  pagination: {
    skip: number;
    limit: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface CategoryListCreate {
  name: string;
  title: string;
  description?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface CategoryListUpdate {
  name?: string;
  title?: string;
  description?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface CategoryListItemCreate {
  category_list_id: string;
  title: string;
  display_order?: number;
  is_active?: boolean;
  size_width?: number;
  size_height?: number;
  forward_link?: string;
  media_description_id?: string;
}

export interface CategoryListItemUpdate {
  title?: string;
  display_order?: number;
  is_active?: boolean;
  size_width?: number;
  size_height?: number;
  forward_link?: string;
  media_description_id?: string;
}

export interface CategoryListItemOrderUpdate {
  id: string;
  display_order: number;
}

export interface UpdateCategoryListItemsOrderRequest {
  items: CategoryListItemOrderUpdate[];
}

export interface BulkUpdateCategoryListsResponse {
  updated_count: number;
  failed_count: number;
  updated_ids: string[];
  failed_ids: string[];
}

// Category List API functions
export const categoryListsApi = {
  /**
   * Get list of category lists
   */
  getCategoryLists: async (params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<CategoryListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.active_only !== undefined) searchParams.append('active_only', params.active_only.toString());

    // v1.9: Updated to flat URL structure
    const response = await apiClient.get(`/category-lists?${searchParams}`);
    return response.data;
  },

  /**
   * Create a new category list
   */
  createCategoryList: async (data: CategoryListCreate): Promise<CategoryList> => {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.post('/category-lists', data);
    return response.data;
  },

  /**
   * Get specific category list by ID
   */
  getCategoryList: async (categoryListId: string): Promise<CategoryList> => {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.get(`/category-lists/${categoryListId}`);
    return response.data;
  },

  /**
   * Update a category list
   */
  updateCategoryList: async (categoryListId: string, data: CategoryListUpdate): Promise<CategoryList> => {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.put(`/category-lists/${categoryListId}`, data);
    return response.data;
  },

  /**
   * Delete a category list
   */
  deleteCategoryList: async (categoryListId: string): Promise<CategoryList> => {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.delete(`/category-lists/${categoryListId}`);
    return response.data;
  },

  /**
   * Get items for a specific category list
   */
  getCategoryListItems: async (
    categoryListId: string,
    params?: {
      skip?: number;
      limit?: number;
      active_only?: boolean;
    }
  ): Promise<CategoryListItemResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.active_only !== undefined) searchParams.append('active_only', params.active_only.toString());

    const response = await apiClient.get(`/category-lists/${categoryListId}/items?${searchParams}`);
    return response.data;
  },

  /**
   * Create a new item in a category list
   */
  createCategoryListItem: async (
    categoryListId: string,
    data: CategoryListItemCreate
  ): Promise<CategoryListItem> => {
    const response = await apiClient.post(`/category-lists/${categoryListId}/items`, data);
    return response.data;
  },

  /**
   * Update a category list item
   */
  updateCategoryListItem: async (
    categoryListId: string,
    itemId: string,
    data: CategoryListItemUpdate
  ): Promise<CategoryListItem> => {
    const response = await apiClient.put(`/category-lists/${categoryListId}/items/${itemId}`, data);
    return response.data;
  },

  /**
   * Delete a category list item
   */
  deleteCategoryListItem: async (categoryListId: string, itemId: string): Promise<CategoryListItem> => {
    const response = await apiClient.delete(`/category-lists/${categoryListId}/items/${itemId}`);
    return response.data;
  },

  /**
   * Update the order of items in a category list
   */
  updateCategoryListItemsOrder: async (
    categoryListId: string,
    data: UpdateCategoryListItemsOrderRequest
  ): Promise<{ message: string }> => {
    const response = await apiClient.put(`/category-lists/${categoryListId}/items/order`, data);
    return response.data;
  },

  /**
   * Get category list JSON content by name (for frontend consumption)
   */
  getCategoryListJSON: async (categoryListName: string): Promise<CategoryListJSON> => {
    // v1.9: Updated to flat URL structure (note: /json endpoint uses name not ID)
    const response = await apiClient.get(`/category-lists/${categoryListName}/json`);
    return response.data;
  },

  /**
   * Regenerate JSON for a specific category list
   */
  regenerateCategoryListJSON: async (categoryListId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/category-lists/${categoryListId}/regenerate-json`);
    return response.data;
  },

  /**
   * Regenerate JSON for all category lists
   */
  regenerateAllCategoryListsJSON: async (): Promise<BulkUpdateCategoryListsResponse> => {
    const response = await apiClient.post('/category-lists/regenerate-all-json');
    return response.data;
  },

  /**
   * Initialize default category lists (admin only, for setup)
   */
  initializeDefaultCategories: async (): Promise<{
    message: string;
    created_categories: string[];
  }> => {
    const response = await apiClient.post('/category-lists/initialize-defaults');
    return response.data;
  },
};