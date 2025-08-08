import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersApi } from '../api/users';
import { apiClient } from '../api/client';
import type { User, UserCreate, UserUpdate, UserListResponse, UserFilters } from '../types';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = apiClient as any;

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser: User = {
    id: 'user-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    email: 'user@example.com',
    full_name: 'Test User',
    is_active: true,
    is_admin: false,
    hashed_password: '$2b$12$...',
  };

  const mockAdminUser: User = {
    id: 'admin-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    email: 'admin@example.com',
    full_name: 'Admin User',
    is_active: true,
    is_admin: true,
    hashed_password: '$2b$12$...',
  };

  describe('getUsers', () => {
    it('should fetch users without filters', async () => {
      const mockResponse: UserListResponse = {
        data: [mockUser, mockAdminUser],
        pagination: { skip: 0, limit: 20, total: 2, page: 1, pages: 1 },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await usersApi.getUsers();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/users?');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch users with filters', async () => {
      const mockResponse: UserListResponse = {
        data: [mockAdminUser],
        pagination: { skip: 0, limit: 10, total: 1, page: 1, pages: 1 },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const filters: UserFilters = {
        skip: 0,
        limit: 10,
        is_active: true,
        role: 'admin',
        search: 'admin',
      };

      const result = await usersApi.getUsers(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/users?skip=0&limit=10&is_active=true&role=admin&search=admin'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle search with special characters', async () => {
      const mockResponse: UserListResponse = {
        data: [],
        pagination: { skip: 0, limit: 20, total: 0, page: 1, pages: 0 },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const filters: UserFilters = {
        search: 'test@domain.com',
      };

      const result = await usersApi.getUsers(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/users?search=test%40domain.com');
      expect(result).toEqual(mockResponse);
    });

    it('should handle authorization errors', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions to list users',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(usersApi.getUsers()).rejects.toEqual(errorResponse);
    });
  });

  describe('getUser', () => {
    it('should fetch user by ID', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockUser });

      const result = await usersApi.getUser('user-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/users/user-1');
      expect(result).toEqual(mockUser);
    });

    it('should handle user not found', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(usersApi.getUser('nonexistent')).rejects.toEqual(errorResponse);
    });

    it('should handle unauthorized access to user details', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot access other user details',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(usersApi.getUser('other-user')).rejects.toEqual(errorResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user profile', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockUser });

      const result = await usersApi.getCurrentUser();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/users/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthenticated requests', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(usersApi.getCurrentUser()).rejects.toEqual(errorResponse);
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockUser });

      const createData: UserCreate = {
        email: 'newuser@example.com',
        password: 'securePassword123!',
        full_name: 'New User',
        is_admin: false,
      };

      const result = await usersApi.createUser(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/users', createData);
      expect(result).toEqual(mockUser);
    });

    it('should create admin user', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockAdminUser });

      const createData: UserCreate = {
        email: 'admin@example.com',
        password: 'adminPassword123!',
        full_name: 'Admin User',
        is_admin: true,
      };

      const result = await usersApi.createUser(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/users', createData);
      expect(result).toEqual(mockAdminUser);
    });

    it('should handle duplicate email error', async () => {
      const errorResponse = {
        response: {
          status: 409,
          data: {
            error: {
              code: 'CONFLICT',
              message: 'Email already exists',
            },
          },
        },
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      const createData: UserCreate = {
        email: 'existing@example.com',
        password: 'password123',
        full_name: 'Duplicate User',
        is_admin: false,
      };

      await expect(usersApi.createUser(createData)).rejects.toEqual(errorResponse);
    });

    it('should handle validation errors', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Password must be at least 8 characters',
              details: {
                field: 'password',
                min_length: 8,
              },
            },
          },
        },
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      const createData: UserCreate = {
        email: 'user@example.com',
        password: '123',
        full_name: 'Test User',
        is_admin: false,
      };

      await expect(usersApi.createUser(createData)).rejects.toEqual(errorResponse);
    });

    it('should handle insufficient permissions', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Only administrators can create users',
            },
          },
        },
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      const createData: UserCreate = {
        email: 'user@example.com',
        password: 'password123',
        full_name: 'Test User',
        is_admin: false,
      };

      await expect(usersApi.createUser(createData)).rejects.toEqual(errorResponse);
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const updatedUser = { ...mockUser, full_name: 'Updated Name' };
      mockApiClient.put.mockResolvedValue({ data: updatedUser });

      const updateData: UserUpdate = {
        full_name: 'Updated Name',
      };

      const result = await usersApi.updateUser('user-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/users/user-1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should update user email', async () => {
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      mockApiClient.put.mockResolvedValue({ data: updatedUser });

      const updateData: UserUpdate = {
        email: 'newemail@example.com',
      };

      const result = await usersApi.updateUser('user-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/users/user-1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should update user admin status', async () => {
      const promotedUser = { ...mockUser, is_admin: true };
      mockApiClient.put.mockResolvedValue({ data: promotedUser });

      const updateData: UserUpdate = {
        is_admin: true,
      };

      const result = await usersApi.updateUser('user-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/users/user-1', updateData);
      expect(result).toEqual(promotedUser);
    });

    it('should handle email conflict during update', async () => {
      const errorResponse = {
        response: {
          status: 409,
          data: {
            error: {
              code: 'CONFLICT',
              message: 'Email already in use by another user',
            },
          },
        },
      };

      mockApiClient.put.mockRejectedValue(errorResponse);

      const updateData: UserUpdate = {
        email: 'existing@example.com',
      };

      await expect(usersApi.updateUser('user-1', updateData)).rejects.toEqual(errorResponse);
    });

    it('should handle insufficient permissions for admin promotion', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot modify admin status',
            },
          },
        },
      };

      mockApiClient.put.mockRejectedValue(errorResponse);

      const updateData: UserUpdate = {
        is_admin: true,
      };

      await expect(usersApi.updateUser('user-1', updateData)).rejects.toEqual(errorResponse);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockUser });

      const result = await usersApi.deleteUser('user-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/users/user-1');
      expect(result).toEqual(mockUser);
    });

    it('should handle user not found during deletion', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          },
        },
      };

      mockApiClient.delete.mockRejectedValue(errorResponse);

      await expect(usersApi.deleteUser('nonexistent')).rejects.toEqual(errorResponse);
    });

    it('should handle insufficient permissions for deletion', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot delete users',
            },
          },
        },
      };

      mockApiClient.delete.mockRejectedValue(errorResponse);

      await expect(usersApi.deleteUser('user-1')).rejects.toEqual(errorResponse);
    });

    it('should handle deletion of user with dependencies', async () => {
      const errorResponse = {
        response: {
          status: 409,
          data: {
            error: {
              code: 'CONFLICT',
              message: 'Cannot delete user with existing content',
            },
          },
        },
      };

      mockApiClient.delete.mockRejectedValue(errorResponse);

      await expect(usersApi.deleteUser('user-1')).rejects.toEqual(errorResponse);
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      const activatedUser = { ...mockUser, is_active: true };
      mockApiClient.patch.mockResolvedValue({ data: activatedUser });

      const result = await usersApi.activateUser('user-1');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/v1/users/user-1/activate');
      expect(result).toEqual(activatedUser);
    });

    it('should handle user already active', async () => {
      const errorResponse = {
        response: {
          status: 409,
          data: {
            error: {
              code: 'CONFLICT',
              message: 'User is already active',
            },
          },
        },
      };

      mockApiClient.patch.mockRejectedValue(errorResponse);

      await expect(usersApi.activateUser('user-1')).rejects.toEqual(errorResponse);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const deactivatedUser = { ...mockUser, is_active: false };
      mockApiClient.patch.mockResolvedValue({ data: deactivatedUser });

      const result = await usersApi.deactivateUser('user-1');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/v1/users/user-1/deactivate');
      expect(result).toEqual(deactivatedUser);
    });

    it('should handle user already inactive', async () => {
      const errorResponse = {
        response: {
          status: 409,
          data: {
            error: {
              code: 'CONFLICT',
              message: 'User is already inactive',
            },
          },
        },
      };

      mockApiClient.patch.mockRejectedValue(errorResponse);

      await expect(usersApi.deactivateUser('user-1')).rejects.toEqual(errorResponse);
    });

    it('should handle deactivation of admin user', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot deactivate admin users',
            },
          },
        },
      };

      mockApiClient.patch.mockRejectedValue(errorResponse);

      await expect(usersApi.deactivateUser('admin-1')).rejects.toEqual(errorResponse);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockApiClient.get.mockRejectedValue(timeoutError);

      await expect(usersApi.getUsers()).rejects.toThrow('Network timeout');
    });

    it('should handle malformed user IDs', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid user ID format',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(usersApi.getUser('invalid-id-format')).rejects.toEqual(errorResponse);
    });

    it('should handle empty search queries', async () => {
      const mockResponse: UserListResponse = {
        data: [mockUser, mockAdminUser],
        pagination: { skip: 0, limit: 20, total: 2, has_next: false, has_prev: false },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const filters: UserFilters = {
        search: '',
      };

      const result = await usersApi.getUsers(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/users?');
      expect(result).toEqual(mockResponse);
    });

    it('should handle extremely long search queries', async () => {
      const longSearch = 'a'.repeat(1000);
      const mockResponse: UserListResponse = {
        data: [],
        pagination: { skip: 0, limit: 20, total: 0, has_next: false, has_prev: false },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const filters: UserFilters = {
        search: longSearch,
      };

      const result = await usersApi.getUsers(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/users?search=${encodeURIComponent(longSearch)}`);
      expect(result).toEqual(mockResponse);
    });

    it('should handle partial updates with only some fields', async () => {
      const updatedUser = { ...mockUser, full_name: 'Partially Updated' };
      mockApiClient.put.mockResolvedValue({ data: updatedUser });

      const updateData: UserUpdate = {
        full_name: 'Partially Updated',
        // Only updating name, not email or other fields
      };

      const result = await usersApi.updateUser('user-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/users/user-1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should handle server errors gracefully', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(serverError);

      await expect(usersApi.getUsers()).rejects.toEqual(serverError);
    });
  });
});