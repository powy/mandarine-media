/**
 * Error Handler Utilities Unit Tests
 * Tests for error handling middleware and custom error classes
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  ResponseHelper,
  TaskNotFoundError,
  ValidationError,
  TimeoutError,
  WorkerError
} from '../../../utils/errorHandler.js';

describe('Error Handler Utilities', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'test-agent';
        return null;
      }),
      headers: { 'user-agent': 'test-agent' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false
    };
    mockNext = jest.fn();
  });

  describe('Custom Error Classes', () => {
    test('should create TaskNotFoundError with correct properties', () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new TaskNotFoundError(taskId);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TaskNotFoundError);
      expect(error.name).toBe('TaskNotFoundError');
      expect(error.message).toBe(`Task not found: ${taskId}`);
      expect(error.statusCode).toBe(404);
      expect(error.taskId).toBe(taskId);
    });

    test('should create ValidationError with correct properties', () => {
      const details = [
        { field: 'folderPath', message: 'folderPath is required' }
      ];
      const error = new ValidationError('Validation failed', details);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    test('should create TimeoutError with correct properties', () => {
      const message = 'Operation timed out: media analysis (60000ms)';
      const timeout = 60000;
      const error = new TimeoutError(message, timeout);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(408);
      expect(error.timeout).toBe(timeout);
    });

    test('should create WorkerError with correct properties', () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const message = 'Worker process crashed';
      const error = new WorkerError(message, taskId);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(WorkerError);
      expect(error.name).toBe('WorkerError');
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(500);
      expect(error.taskId).toBe(taskId);
    });
  });

  describe('ResponseHelper', () => {
    test('should create success response', () => {
      const data = { taskId: '123', status: 'completed' };
      const message = 'Task completed successfully';

      ResponseHelper.success(mockRes, data, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data,
        timestamp: expect.any(String)
      });
    });

    test('should create success response with default message', () => {
      const data = { result: 'ok' };

      ResponseHelper.success(mockRes, data);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Request successful',
        data,
        timestamp: expect.any(String)
      });
    });

    test('should create error response', () => {
      const message = 'Something went wrong';
      const statusCode = 400;
      const details = { field: 'folderPath', error: 'Required' };

      ResponseHelper.error(mockRes, message, statusCode, details);

      expect(mockRes.status).toHaveBeenCalledWith(statusCode);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        details,
        timestamp: expect.any(String)
      });
    });

    test('should create error response with default status code', () => {
      const message = 'Internal error';

      ResponseHelper.error(mockRes, message);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        timestamp: expect.any(String)
      });
    });

    test('should create paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      };

      ResponseHelper.paginated(mockRes, data, pagination);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Request successful',
        data,
        pagination,
        timestamp: expect.any(String)
      });
    });

    test('should create paginated response with custom message', () => {
      const data = [];
      const pagination = { page: 1, limit: 10, total: 0, pages: 0 };
      const message = 'No tasks found';

      ResponseHelper.paginated(mockRes, data, pagination, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data,
        pagination,
        timestamp: expect.any(String)
      });
    });
  });

  describe('AsyncHandler', () => {
    test('should handle successful async operations', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should catch and forward async errors', async () => {
      const error = new Error('Async operation failed');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('should handle thrown errors in async functions', async () => {
      const error = new ValidationError('Invalid input');
      const asyncFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('should preserve function context', async () => {
      let receivedThis;
      const asyncFn = function(req, res, next) {
        receivedThis = this;
        return Promise.resolve();
      };
      const wrappedFn = asyncHandler(asyncFn);
      const context = { test: 'context' };

      await wrappedFn.call(context, mockReq, mockRes, mockNext);

      expect(receivedThis).toBe(context);
    });
  });

  describe('NotFoundHandler', () => {
    test('should handle 404 errors', () => {
      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found',
        path: mockReq.originalUrl,
        method: mockReq.method,
        timestamp: expect.any(String)
      });
    });

    test('should include request details in 404 response', () => {
      mockReq.method = 'POST';
      mockReq.originalUrl = '/api/v1/nonexistent';

      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/v1/nonexistent',
          method: 'POST'
        })
      );
    });
  });

  describe('ErrorHandler', () => {
    test('should handle custom errors', () => {
      const error = new TaskNotFoundError('123e4567-e89b-12d3-a456-426614174000');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error.message,
        timestamp: expect.any(String)
      });
    });

    test('should handle validation errors with details', () => {
      const details = [
        { field: 'folderPath', message: 'folderPath is required' },
        { field: 'config.configPath', message: 'configPath is required' }
      ];
      const error = new ValidationError('Validation failed', details);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details,
        timestamp: expect.any(String)
      });
    });

    test('should handle timeout errors', () => {
      const error = new TimeoutError('media processing', 60000);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(408);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error.message,
        timeout: 60000,
        timestamp: expect.any(String)
      });
    });

    test('should handle worker errors', () => {
      const error = new WorkerError('task-123', 'Process crashed unexpectedly');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error.message,
        taskId: 'task-123',
        timestamp: expect.any(String)
      });
    });

    test('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        timestamp: expect.any(String)
      });
    });

    test('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Development error');
      error.stack = 'Error: Development error\n    at test.js:1:1';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: error.stack
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    test('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Production error');
      error.stack = 'Error: Production error\n    at test.js:1:1';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.anything()
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle errors when headers already sent', () => {
      mockRes.headersSent = true;
      const error = new Error('Headers already sent');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('should log errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error for logging');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in'),
        expect.stringContaining('GET /api/test:'),
        error.message
      );

      consoleSpy.mockRestore();
    });

    test('should handle circular references in error objects', () => {
      const error = new Error('Circular reference error');
      error.circular = error; // Create circular reference

      expect(() => {
        errorHandler(error, mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('should handle errors with custom status codes', () => {
      const error = new Error('Custom status error');
      error.statusCode = 422;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    test('should sanitize sensitive information in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Database connection failed: password=secret123');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        timestamp: expect.any(String)
      });

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle different error types correctly', () => {
      // Test different error scenarios
      const scenarios = [
        {
          error: new SyntaxError('Invalid JSON'),
          expectedStatus: 400,
          expectedError: 'Bad Request'
        },
        {
          error: new ReferenceError('Variable not defined'),
          expectedStatus: 500,
          expectedError: 'Internal Server Error'
        },
        {
          error: new TypeError('Invalid type'),
          expectedStatus: 500,
          expectedError: 'Internal Server Error'
        }
      ];

      scenarios.forEach(({ error, expectedStatus, expectedError }) => {
        const freshRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
          headersSent: false
        };

        errorHandler(error, mockReq, freshRes, mockNext);

        expect(freshRes.status).toHaveBeenCalledWith(expectedStatus);
        expect(freshRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expectedError
          })
        );
      });
    });
  });

  describe('Error Context', () => {
    test('should include request context in error logs', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockReq.method = 'POST';
      mockReq.originalUrl = '/api/v1/tasks';
      mockReq.ip = '192.168.1.100';
      mockReq.headers = { 'user-agent': 'test-agent' };

      const error = new Error('Context test error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('POST /api/v1/tasks'),
        error.message
      );

      consoleSpy.mockRestore();
    });

    test('should handle missing request properties gracefully', () => {
      const incompleteReq = {}; // Missing typical request properties
      const error = new Error('Incomplete request error');

      expect(() => {
        errorHandler(error, incompleteReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});