import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { dataProvider } from '../dataProvider';
import { authProvider } from '../authProvider';

// Mock console.error to prevent error logs in test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Mock share with error scenarios
const mockErrorApi = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('share', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
    getCurrentUser: vi.fn(),
    getCachedUser: vi.fn(),
  },
  countriesApi: mockErrorApi,
  territoriesApi: mockErrorApi,
  languagesApi: mockErrorApi,
  picturesApi: mockErrorApi,
  programsApi: mockErrorApi,
  seasonsApi: mockErrorApi,
  personsApi: mockErrorApi,
  usersApi: mockErrorApi,
  audienceCategoriesApi: mockErrorApi,
  subscriptionPlansApi: mockErrorApi,
  videoFileReportsApi: {
    getReports: vi.fn(),
    getReport: vi.fn(),
  },
  mediaApi: {
    getMediaDescriptions: vi.fn(),
    getMediaDescription: vi.fn(),
    createMediaDescription: vi.fn(),
    updateMediaDescription: vi.fn(),
    deleteMediaDescription: vi.fn(),
    getVideoFiles: vi.fn(),
    getVideoFile: vi.fn(),
  },
  getContentLists: vi.fn(),
  getContentList: vi.fn(),
  createContentList: vi.fn(),
  updateContentList: vi.fn(),
  deleteContentList: vi.fn(),
  getScreenDescriptions: vi.fn(),
  getScreenDescription: vi.fn(),
  createScreenDescription: vi.fn(),
  updateScreenDescription: vi.fn(),
  deleteScreenDescription: vi.fn(),
}));

// Mock fetch with error scenarios
global.fetch = vi.fn();

describe('Error Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DataProvider Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      mockErrorApi.getAll.mockRejectedValue(new Error('Network error'));

      await expect(
        dataProvider.getList('countries', {
          pagination: { page: 1, perPage: 20 },
          sort: { field: 'id', order: 'ASC' },
          filter: {},
        })
      ).rejects.toThrow('Network error');

      expect(console.error).toHaveBeenCalledWith('Error fetching countries:', expect.any(Error));
    });

    test('should handle 404 errors for getOne', async () => {
      mockErrorApi.getById.mockRejectedValue({
        response: { status: 404 },
        message: 'Not found'
      });

      await expect(
        dataProvider.getOne('countries', { id: 'nonexistent' })
      ).rejects.toBeDefined();

      expect(console.error).toHaveBeenCalledWith(
        'Error fetching countries with id nonexistent:', 
        expect.any(Object)
      );
    });

    test('should handle validation errors on create', async () => {
      mockErrorApi.create.mockRejectedValue({
        response: { 
          status: 422,
          data: { detail: 'Validation failed' }
        }
      });

      await expect(
        dataProvider.create('countries', { data: { name: '' } })
      ).rejects.toBeDefined();

      expect(console.error).toHaveBeenCalledWith('Error creating countries:', expect.any(Object));
    });

    test('should handle unknown resource errors', async () => {
      await expect(
        dataProvider.getList('unknown-resource', {
          pagination: { page: 1, perPage: 20 },
          sort: { field: 'id', order: 'ASC' },
          filter: {},
        })
      ).rejects.toThrow('Unknown resource: unknown-resource');
    });

    test('should handle fetch errors for themes', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Fetch failed'));

      await expect(
        dataProvider.getList('themes', {
          pagination: { page: 1, perPage: 20 },
          sort: { field: 'id', order: 'ASC' },
          filter: {},
        })
      ).rejects.toThrow('Fetch failed');
    });

    test('should handle malformed response for themes', async () => {
      (global.fetch as any).mockResolvedValue({
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(
        dataProvider.getList('themes', {
          pagination: { page: 1, perPage: 20 },
          sort: { field: 'id', order: 'ASC' },
          filter: {},
        })
      ).rejects.toThrow('Invalid JSON');
    });
  });

  describe('AuthProvider Error Handling', () => {
    test('should handle authentication failures', async () => {
      const mockAuthApi = require('share').authApi;
      mockAuthApi.login.mockRejectedValue({
        response: { status: 401 },
        message: 'Invalid credentials'
      });

      await expect(
        authProvider.login({ username: 'wrong', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });

    test('should handle network failures during auth', async () => {
      const mockAuthApi = require('share').authApi;
      mockAuthApi.login.mockRejectedValue({
        code: 'ERR_NETWORK'
      });

      await expect(
        authProvider.login({ username: 'user', password: 'pass' })
      ).rejects.toThrow('Cannot connect to server');
    });

    test('should handle checkAuth failures', async () => {
      const mockAuthApi = require('share').authApi;
      mockAuthApi.isAuthenticated.mockRejectedValue(new Error('Auth check failed'));

      await expect(authProvider.checkAuth()).rejects.toThrow('Authentication check failed');
    });

    test('should handle identity fetch failures gracefully', async () => {
      const mockAuthApi = require('share').authApi;
      mockAuthApi.isAuthenticated.mockResolvedValue(true);
      mockAuthApi.getCachedUser.mockResolvedValue(null);
      mockAuthApi.getCurrentUser.mockRejectedValue(new Error('User fetch failed'));

      const identity = await authProvider.getIdentity();
      
      expect(identity).toEqual({
        id: 'current-user',
        fullName: 'Admin User',
        avatar: undefined
      });
    });

    test('should handle permission check failures gracefully', async () => {
      const mockAuthApi = require('share').authApi;
      mockAuthApi.isAuthenticated.mockResolvedValue(true);
      mockAuthApi.getCachedUser.mockResolvedValue(null);
      mockAuthApi.getCurrentUser.mockRejectedValue(new Error('User fetch failed'));

      const permissions = await authProvider.getPermissions();
      
      expect(permissions).toEqual(['user']); // Fallback to user permissions
    });

    test('should handle 401/403 errors in checkError', async () => {
      await expect(authProvider.checkError({ status: 401 })).rejects.toThrow('Authentication failed');
      await expect(authProvider.checkError({ response: { status: 403 } })).rejects.toThrow('Authentication failed');
    });

    test('should allow non-auth errors in checkError', async () => {
      await expect(authProvider.checkError({ status: 500 })).resolves.toBeUndefined();
      await expect(authProvider.checkError({ status: 404 })).resolves.toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty API responses', async () => {
      mockErrorApi.getAll.mockResolvedValue({ data: [], pagination: { total: 0 } });

      const result = await dataProvider.getList('countries', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    test('should handle malformed pagination data', async () => {
      mockErrorApi.getAll.mockResolvedValue([
        { id: '1', name: 'Test', creation_date_utc: '2024-01-01T00:00:00Z' }
      ]);

      const result = await dataProvider.getList('countries', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1); // Should fallback to array length
    });

    test('should handle undefined API responses', async () => {
      mockErrorApi.getAll.mockResolvedValue(undefined);

      const result = await dataProvider.getList('countries', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});