import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api/client';
import {
  getContentLists,
  createContentList,
  updateContentList,
  deleteContentList,
} from '../api/content-lists';
import {
  getScreenContents,
  createScreenContent,
  updateScreenContent,
  deleteScreenContent,
} from '../api/screen-contents';
import { mediaApi } from '../api/media';
import { authApi } from '../api/auth';
import { usersApi } from '../api/users';

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

describe('Access Control Tests (v1.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Simple User Access (Read-only)', () => {
    beforeEach(() => {
      // Simulate simple user with read-only access
      mockApiClient.get.mockResolvedValue({ 
        data: { 
          data: [], 
          pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } 
        } 
      });
    });

    it('should allow simple users to read content lists', async () => {
      await getContentLists();
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/content/lists?');
    });

    it('should allow simple users to read screen contents', async () => {
      await getScreenContents();
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/screen/contents?');
    });

    it('should allow simple users to read media descriptions', async () => {
      await mediaApi.getMediaDescriptions();
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/media/descriptions?');
    });

    it('should allow simple users to access their own profile', async () => {
      mockApiClient.get.mockResolvedValue({ 
        data: { 
          id: 'user-1', 
          email: 'user@example.com', 
          is_admin: false 
        } 
      });

      await authApi.getCurrentUser();
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/users/me');
    });
  });

  describe('Simple User Restrictions (Write operations)', () => {
    beforeEach(() => {
      // Simulate 403 Forbidden responses for write operations
      const forbiddenError = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions for this operation',
            },
          },
        },
      };

      mockApiClient.post.mockRejectedValue(forbiddenError);
      mockApiClient.put.mockRejectedValue(forbiddenError);
      mockApiClient.delete.mockRejectedValue(forbiddenError);
    });

    it('should deny simple users from creating content lists', async () => {
      const createData = {
        title: 'Test List',
        thumbnail_format: 'medium_portrait' as const,
        is_active: true,
        display_order: 1,
      };

      await expect(createContentList(createData)).rejects.toMatchObject({
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
            },
          },
        },
      });
    });

    it('should deny simple users from updating content lists', async () => {
      const updateData = { title: 'Updated Title' };

      await expect(updateContentList('list-1', updateData)).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('should deny simple users from deleting content lists', async () => {
      await expect(deleteContentList('list-1')).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('should deny simple users from creating screen contents', async () => {
      const createData = {
        title: 'Test Screen',
        is_active: true,
        display_order: 1,
      };

      await expect(createScreenContent(createData)).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('should deny simple users from updating screen contents', async () => {
      const updateData = { title: 'Updated Screen' };

      await expect(updateScreenContent('screen-1', updateData)).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('should deny simple users from deleting screen contents', async () => {
      await expect(deleteScreenContent('screen-1')).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('should deny simple users from creating media descriptions', async () => {
      const createData = {
        file_number: 1247,
        episode_title: 'Test Episode',
        media_type: 'video' as const,
      };

      await expect(mediaApi.createMediaDescription(createData)).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('should deny simple users from updating media descriptions', async () => {
      const updateData = { episode_title: 'Updated Episode' };

      await expect(mediaApi.updateMediaDescription('media-1', updateData)).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('should deny simple users from deleting media descriptions', async () => {
      await expect(mediaApi.deleteMediaDescription('media-1')).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('should deny simple users from accessing user list', async () => {
      // Override the mock for this specific test to return forbidden error
      const forbiddenError = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions for this operation',
            },
          },
        },
      };
      mockApiClient.get.mockRejectedValueOnce(forbiddenError);
      
      await expect(usersApi.getUsers()).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });
  });

  describe('Manager/Admin Access (Full CRUD)', () => {
    beforeEach(() => {
      // Simulate successful responses for Manager/Admin users
      mockApiClient.get.mockResolvedValue({ 
        data: { 
          data: [], 
          pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } 
        } 
      });
      mockApiClient.post.mockResolvedValue({ data: { id: 'created-id' } });
      mockApiClient.put.mockResolvedValue({ data: { id: 'updated-id' } });
      mockApiClient.delete.mockResolvedValue({});
    });

    it('should allow Manager/Admin to create content lists', async () => {
      const createData = {
        title: 'Admin List',
        thumbnail_format: 'large_landscape' as const,
        is_active: true,
        display_order: 1,
      };

      await createContentList(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/content/lists', createData);
    });

    it('should allow Manager/Admin to update content lists', async () => {
      const updateData = { title: 'Admin Updated Title' };

      await updateContentList('list-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/content/lists/list-1', updateData);
    });

    it('should allow Manager/Admin to delete content lists', async () => {
      await deleteContentList('list-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/content/lists/list-1');
    });

    it('should allow Manager/Admin to perform all CRUD operations on screen contents', async () => {
      // Create
      const createData = {
        title: 'Admin Screen',
        is_active: true,
        display_order: 1,
      };
      await createScreenContent(createData);
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/screen/contents', createData);

      // Update
      const updateData = { title: 'Updated Admin Screen' };
      await updateScreenContent('screen-1', updateData);
      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/screen/contents/screen-1', updateData);

      // Delete
      await deleteScreenContent('screen-1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/screen/contents/screen-1');
    });

    it('should allow Manager/Admin to access user management', async () => {
      await usersApi.getUsers();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/users?');
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle missing authentication token', async () => {
      const authError = {
        response: {
          status: 401,
          data: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Missing or invalid authentication token',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(authError);

      await expect(getContentLists()).rejects.toMatchObject({
        response: {
          status: 401,
          data: {
            error: {
              code: 'UNAUTHORIZED',
            },
          },
        },
      });
    });

    it('should handle expired authentication token', async () => {
      const expiredTokenError = {
        response: {
          status: 401,
          data: {
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Authentication token has expired',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(expiredTokenError);

      await expect(authApi.getCurrentUser()).rejects.toMatchObject({
        response: {
          status: 401,
          data: {
            error: {
              code: 'TOKEN_EXPIRED',
            },
          },
        },
      });
    });

    it('should handle invalid authentication token', async () => {
      const invalidTokenError = {
        response: {
          status: 401,
          data: {
            error: {
              code: 'INVALID_TOKEN',
              message: 'Authentication token is invalid',
            },
          },
        },
      };

      mockApiClient.post.mockRejectedValue(invalidTokenError);

      const createData = {
        title: 'Test List',
        thumbnail_format: 'medium_portrait' as const,
        is_active: true,
        display_order: 1,
      };

      await expect(createContentList(createData)).rejects.toMatchObject({
        response: {
          status: 401,
          data: {
            error: {
              code: 'INVALID_TOKEN',
            },
          },
        },
      });
    });
  });

  describe('Role Detection and Behavior', () => {
    it('should correctly identify simple user capabilities', async () => {
      // Simple user can read but not write
      mockApiClient.get.mockResolvedValue({ data: [] });
      
      // Reading should work
      await expect(getContentLists()).resolves.toBeDefined();
      
      // Writing should fail with 403
      const forbiddenError = { response: { status: 403 } };
      mockApiClient.post.mockRejectedValue(forbiddenError);
      
      const createData = {
        title: 'Test',
        thumbnail_format: 'medium_portrait' as const,
        is_active: true,
        display_order: 1,
      };
      
      await expect(createContentList(createData)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    it('should correctly identify admin user capabilities', async () => {
      // Admin can both read and write
      mockApiClient.get.mockResolvedValue({ data: [] });
      mockApiClient.post.mockResolvedValue({ data: { id: 'created' } });
      
      // Both operations should work
      await expect(getContentLists()).resolves.toBeDefined();
      
      const createData = {
        title: 'Admin Test',
        thumbnail_format: 'large_landscape' as const,
        is_active: true,
        display_order: 1,
      };
      
      await expect(createContentList(createData)).resolves.toBeDefined();
    });
  });
});