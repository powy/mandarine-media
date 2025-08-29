import { apiClient } from './client';
import { SubscriptionPlan, SubscriptionPlanCreate, SubscriptionPlanUpdate, SubscriptionPlansApiParams, PaginatedSubscriptionPlansResponse } from '../types';

export const subscriptionPlansApi = {
  getAll: async (params: SubscriptionPlansApiParams = {}): Promise<PaginatedSubscriptionPlansResponse> => {
    const { skip = 0, limit = 20, q } = params;
    const searchParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (q) {
      searchParams.append('q', q);
    }
    
    const response = await apiClient.get(`/subscription-plans?${searchParams.toString()}`);
    return response.data as PaginatedSubscriptionPlansResponse;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/subscription-plans/${id}`);
    return response.data as SubscriptionPlan;
  },

  create: async (subscriptionPlan: SubscriptionPlanCreate) => {
    const response = await apiClient.post('/subscription-plans', subscriptionPlan);
    return response.data as SubscriptionPlan;
  },

  update: async (id: string, subscriptionPlan: SubscriptionPlanUpdate) => {
    const response = await apiClient.put(`/subscription-plans/${id}`, subscriptionPlan);
    return response.data as SubscriptionPlan;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/subscription-plans/${id}`);
    return response.data as SubscriptionPlan;
  },
};