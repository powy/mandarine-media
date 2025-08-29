import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subscriptionPlansApi } from '../api/subscription-plans';
import { apiClient } from '../api/client';
import type { SubscriptionPlan, SubscriptionPlanCreate, SubscriptionPlanUpdate, PaginatedSubscriptionPlansResponse } from '../types';

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

describe('Subscription Plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSubscriptionPlan: SubscriptionPlan = {
    id: 'subscription-plan-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    name: 'Premium',
  };

  const mockPaginatedResponse: PaginatedSubscriptionPlansResponse = {
    data: [mockSubscriptionPlan],
    pagination: {
      skip: 0,
      limit: 20,
      total: 1,
      page: 1,
      pages: 1
    }
  };

  describe('getAll', () => {
    it('should fetch all subscription plans without filters', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const result = await subscriptionPlansApi.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith('/subscription-plans?skip=0&limit=20');
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should fetch subscription plans with custom pagination', async () => {
      const customPaginated = {
        ...mockPaginatedResponse,
        pagination: { ...mockPaginatedResponse.pagination, skip: 10, limit: 5 }
      };
      mockApiClient.get.mockResolvedValue({ data: customPaginated });

      const result = await subscriptionPlansApi.getAll({ skip: 10, limit: 5 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/subscription-plans?skip=10&limit=5');
      expect(result).toEqual(customPaginated);
    });

    it('should fetch subscription plans with search query', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      const result = await subscriptionPlansApi.getAll({ q: 'Premium' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/subscription-plans?skip=0&limit=20&q=Premium');
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('getById', () => {
    it('should fetch a single subscription plan by ID', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockSubscriptionPlan });

      const result = await subscriptionPlansApi.getById('subscription-plan-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/subscription-plans/subscription-plan-1');
      expect(result).toEqual(mockSubscriptionPlan);
    });
  });

  describe('create', () => {
    it('should create a new subscription plan', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockSubscriptionPlan });

      const createData: SubscriptionPlanCreate = {
        name: 'Premium',
      };

      const result = await subscriptionPlansApi.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/subscription-plans', createData);
      expect(result).toEqual(mockSubscriptionPlan);
    });
  });

  describe('update', () => {
    it('should update an existing subscription plan', async () => {
      const updatedSubscriptionPlan = { ...mockSubscriptionPlan, name: 'Premium Plus' };
      mockApiClient.put.mockResolvedValue({ data: updatedSubscriptionPlan });

      const updateData: SubscriptionPlanUpdate = {
        name: 'Premium Plus',
      };

      const result = await subscriptionPlansApi.update('subscription-plan-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/subscription-plans/subscription-plan-1', updateData);
      expect(result).toEqual(updatedSubscriptionPlan);
    });
  });

  describe('delete', () => {
    it('should delete a subscription plan', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockSubscriptionPlan });

      const result = await subscriptionPlansApi.delete('subscription-plan-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/subscription-plans/subscription-plan-1');
      expect(result).toEqual(mockSubscriptionPlan);
    });
  });

  describe('Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { error: { code: 'NOT_FOUND', message: 'Subscription plan not found' } },
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(subscriptionPlansApi.getById('nonexistent')).rejects.toEqual(errorResponse);
    });

    it('should handle empty response arrays', async () => {
      const emptyResponse = {
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

      const result = await subscriptionPlansApi.getAll();

      expect(result).toEqual(emptyResponse);
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockApiClient.get.mockRejectedValue(timeoutError);

      await expect(subscriptionPlansApi.getAll()).rejects.toThrow('Network timeout');
    });
  });
});