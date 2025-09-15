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

      expect(mockApiClient.get).toHaveBeenCalledWith('/users?');
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
        '/users?skip=0&limit=10&is_active=true&role=admin&search=admin'
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

      expect(mockApiClient.get).toHaveBeenCalledWith('/users?search=test%40domain.com');
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

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/user-1');
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

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/me');
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

      expect(mockApiClient.post).toHaveBeenCalledWith('/users', createData);
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

      expect(mockApiClient.post).toHaveBeenCalledWith('/users', createData);
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

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should update user email', async () => {
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      mockApiClient.put.mockResolvedValue({ data: updatedUser });

      const updateData: UserUpdate = {
        email: 'newemail@example.com',
      };

      const result = await usersApi.updateUser('user-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should update user admin status', async () => {
      const promotedUser = { ...mockUser, is_admin: true };
      mockApiClient.put.mockResolvedValue({ data: promotedUser });

      const updateData: UserUpdate = {
        is_admin: true,
      };

      const result = await usersApi.updateUser('user-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1', updateData);
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

      expect(mockApiClient.delete).toHaveBeenCalledWith('/users/user-1');
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

      expect(mockApiClient.patch).toHaveBeenCalledWith('/users/user-1/activate');
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

      expect(mockApiClient.patch).toHaveBeenCalledWith('/users/user-1/deactivate');
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

      expect(mockApiClient.get).toHaveBeenCalledWith('/users?');
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

      expect(mockApiClient.get).toHaveBeenCalledWith(`/users?search=${encodeURIComponent(longSearch)}`);
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

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1', updateData);
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

  // API 1.13 Subscription Management Tests
  describe('API 1.13 Subscription Management', () => {
    describe('addSubscriptionPlan', () => {
      it('should add subscription plan to user successfully', async () => {
        const mockResponse = {
          success: true,
          message: 'Subscription plan added successfully'
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const result = await usersApi.addSubscriptionPlan('user-1', 'plan-premium');

        expect(mockApiClient.post).toHaveBeenCalledWith('/users/user-1/subscription_plans/plan-premium');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Subscription plan added successfully');
      });

      it('should handle adding plan that user already has', async () => {
        const mockError = {
          response: {
            status: 409,
            data: { detail: 'User already has this subscription plan' }
          }
        };

        mockApiClient.post.mockRejectedValue(mockError);

        await expect(
          usersApi.addSubscriptionPlan('user-1', 'plan-basic')
        ).rejects.toEqual(mockError);

        expect(mockApiClient.post).toHaveBeenCalledWith('/users/user-1/subscription_plans/plan-basic');
      });

      it('should handle invalid plan ID', async () => {
        const mockError = {
          response: {
            status: 404,
            data: { detail: 'Subscription plan not found' }
          }
        };

        mockApiClient.post.mockRejectedValue(mockError);

        await expect(
          usersApi.addSubscriptionPlan('user-1', 'invalid-plan')
        ).rejects.toEqual(mockError);
      });

      it('should handle invalid user ID', async () => {
        const mockError = {
          response: {
            status: 404,
            data: { detail: 'User not found' }
          }
        };

        mockApiClient.post.mockRejectedValue(mockError);

        await expect(
          usersApi.addSubscriptionPlan('invalid-user', 'plan-premium')
        ).rejects.toEqual(mockError);
      });
    });

    describe('removeSubscriptionPlan', () => {
      it('should remove subscription plan from user successfully', async () => {
        const mockResponse = {
          success: true,
          message: 'Subscription plan removed successfully'
        };

        mockApiClient.delete.mockResolvedValue({ data: mockResponse });

        const result = await usersApi.removeSubscriptionPlan('user-1', 'plan-basic');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/users/user-1/subscription_plans/plan-basic');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Subscription plan removed successfully');
      });

      it('should handle removing plan user does not have', async () => {
        const mockError = {
          response: {
            status: 404,
            data: { detail: 'User does not have this subscription plan' }
          }
        };

        mockApiClient.delete.mockRejectedValue(mockError);

        await expect(
          usersApi.removeSubscriptionPlan('user-1', 'plan-premium')
        ).rejects.toEqual(mockError);

        expect(mockApiClient.delete).toHaveBeenCalledWith('/users/user-1/subscription_plans/plan-premium');
      });

      it('should handle removing from non-existent user', async () => {
        const mockError = {
          response: {
            status: 404,
            data: { detail: 'User not found' }
          }
        };

        mockApiClient.delete.mockRejectedValue(mockError);

        await expect(
          usersApi.removeSubscriptionPlan('non-existent-user', 'plan-basic')
        ).rejects.toEqual(mockError);
      });
    });

    describe('updateAllSubscriptionPlans', () => {
      it('should update all subscription plans for user', async () => {
        const planIds = ['plan-basic', 'plan-premium', 'plan-enterprise'];
        const mockResponse = {
          success: true,
          message: 'User subscription plans updated successfully'
        };

        mockApiClient.put.mockResolvedValue({ data: mockResponse });

        const result = await usersApi.updateAllSubscriptionPlans('user-1', planIds);

        expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/subscription_plans', planIds);
        expect(result.success).toBe(true);
        expect(result.message).toBe('User subscription plans updated successfully');
      });

      it('should handle updating with single plan', async () => {
        const planIds = ['plan-premium'];
        const mockResponse = {
          success: true,
          message: 'User subscription plans updated successfully'
        };

        mockApiClient.put.mockResolvedValue({ data: mockResponse });

        const result = await usersApi.updateAllSubscriptionPlans('user-1', planIds);

        expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/subscription_plans', planIds);
        expect(result.success).toBe(true);
      });

      it('should handle updating with empty plan list (removes all plans)', async () => {
        const planIds: string[] = [];
        const mockResponse = {
          success: true,
          message: 'All subscription plans removed from user'
        };

        mockApiClient.put.mockResolvedValue({ data: mockResponse });

        const result = await usersApi.updateAllSubscriptionPlans('user-1', planIds);

        expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/subscription_plans', []);
        expect(result.success).toBe(true);
        expect(result.message).toBe('All subscription plans removed from user');
      });

      it('should handle updating with duplicate plan IDs', async () => {
        const planIdsWithDuplicates = ['plan-basic', 'plan-premium', 'plan-basic']; // Contains duplicate
        const mockResponse = {
          success: true,
          message: 'User subscription plans updated successfully'
        };

        mockApiClient.put.mockResolvedValue({ data: mockResponse });

        const result = await usersApi.updateAllSubscriptionPlans('user-1', planIdsWithDuplicates);

        expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/subscription_plans', planIdsWithDuplicates);
        expect(result.success).toBe(true);
      });

      it('should handle updating with invalid plan IDs', async () => {
        const planIds = ['plan-basic', 'invalid-plan-id', 'plan-premium'];
        const mockError = {
          response: {
            status: 400,
            data: {
              detail: 'One or more subscription plans not found',
              invalid_plans: ['invalid-plan-id']
            }
          }
        };

        mockApiClient.put.mockRejectedValue(mockError);

        await expect(
          usersApi.updateAllSubscriptionPlans('user-1', planIds)
        ).rejects.toEqual(mockError);

        expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/subscription_plans', planIds);
      });

      it('should handle permission errors for admin-only operations', async () => {
        const planIds = ['plan-enterprise']; // Assume enterprise requires admin
        const mockError = {
          response: {
            status: 403,
            data: { detail: 'Not enough permissions' }
          }
        };

        mockApiClient.put.mockRejectedValue(mockError);

        await expect(
          usersApi.updateAllSubscriptionPlans('user-1', planIds)
        ).rejects.toEqual(mockError);
      });

      it('should handle large number of subscription plans', async () => {
        const manyPlanIds = Array.from({ length: 50 }, (_, i) => `plan-${i}`);
        const mockResponse = {
          success: true,
          message: 'User subscription plans updated successfully'
        };

        mockApiClient.put.mockResolvedValue({ data: mockResponse });

        const result = await usersApi.updateAllSubscriptionPlans('user-1', manyPlanIds);

        expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/subscription_plans', manyPlanIds);
        expect(result.success).toBe(true);
      });
    });

    describe('Subscription Management Integration', () => {
      it('should properly manage subscription plan lifecycle', async () => {
        const mockSuccessResponse = {
          success: true,
          message: 'Operation successful'
        };

        // Mock all responses
        mockApiClient.post.mockResolvedValue({ data: mockSuccessResponse });
        mockApiClient.delete.mockResolvedValue({ data: mockSuccessResponse });
        mockApiClient.put.mockResolvedValue({ data: mockSuccessResponse });

        // Test adding multiple plans individually
        await usersApi.addSubscriptionPlan('user-1', 'plan-basic');
        await usersApi.addSubscriptionPlan('user-1', 'plan-premium');

        // Test removing one plan
        await usersApi.removeSubscriptionPlan('user-1', 'plan-basic');

        // Test bulk update to final state
        await usersApi.updateAllSubscriptionPlans('user-1', ['plan-premium', 'plan-enterprise']);

        // Verify all API calls were made correctly
        expect(mockApiClient.post).toHaveBeenCalledWith('/users/user-1/subscription_plans/plan-basic');
        expect(mockApiClient.post).toHaveBeenCalledWith('/users/user-1/subscription_plans/plan-premium');
        expect(mockApiClient.delete).toHaveBeenCalledWith('/users/user-1/subscription_plans/plan-basic');
        expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/subscription_plans', ['plan-premium', 'plan-enterprise']);
      });

      it('should handle subscription plan management errors gracefully', async () => {
        // Test cascading error handling
        const networkError = new Error('Network Error');
        mockApiClient.post.mockRejectedValue(networkError);

        await expect(
          usersApi.addSubscriptionPlan('user-1', 'plan-premium')
        ).rejects.toThrow('Network Error');

        const serverError = {
          response: {
            status: 500,
            data: { detail: 'Internal server error' }
          }
        };
        mockApiClient.delete.mockRejectedValue(serverError);

        await expect(
          usersApi.removeSubscriptionPlan('user-1', 'plan-basic')
        ).rejects.toEqual(serverError);
      });
    });

    describe('API 1.13 Compliance', () => {
      it('should use correct API 1.13 endpoint patterns', async () => {
        const mockResponse = { success: true, message: 'Success' };
        mockApiClient.post.mockResolvedValue({ data: mockResponse });
        mockApiClient.delete.mockResolvedValue({ data: mockResponse });
        mockApiClient.put.mockResolvedValue({ data: mockResponse });

        // Test all endpoint patterns match API 1.13 spec
        await usersApi.addSubscriptionPlan('test-user', 'test-plan');
        expect(mockApiClient.post).toHaveBeenCalledWith('/users/test-user/subscription_plans/test-plan');

        await usersApi.removeSubscriptionPlan('test-user', 'test-plan');
        expect(mockApiClient.delete).toHaveBeenCalledWith('/users/test-user/subscription_plans/test-plan');

        await usersApi.updateAllSubscriptionPlans('test-user', ['plan1', 'plan2']);
        expect(mockApiClient.put).toHaveBeenCalledWith('/users/test-user/subscription_plans', ['plan1', 'plan2']);
      });

      it('should return API 1.13 compliant response structure', async () => {
        const api13Response = {
          success: true,
          message: 'Subscription plan added successfully'
        };

        mockApiClient.post.mockResolvedValue({ data: api13Response });

        const result = await usersApi.addSubscriptionPlan('user-1', 'plan-premium');

        // Verify response structure matches API 1.13
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.message).toBe('string');
      });
    });
  });
});