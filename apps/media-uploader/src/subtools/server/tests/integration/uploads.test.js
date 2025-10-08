/**
 * Upload API Integration Tests
 * Tests for all upload-related endpoints
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import TaskManager, { TASK_STATES, TASK_TYPES } from '../../taskManager.js';
import WorkerManager from '../../workerManager.js';
import uploadRoutes from '../../routes/uploads.js';
import { errorHandler, notFoundHandler } from '../../utils/errorHandler.js';

describe('Upload API Integration Tests', () => {
  let app;
  let taskManager;
  let workerManager;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Create managers
    taskManager = new TaskManager();
    workerManager = new WorkerManager(taskManager);

    // Mock WorkerManager to avoid spawning real processes
    workerManager.startWorker = jest.fn().mockResolvedValue('mock-worker-id');
    workerManager.cancelWorker = jest.fn().mockResolvedValue(true);
    workerManager.getActiveWorkers = jest.fn().mockReturnValue([]);

    // Add managers to request object
    app.use((req, res, next) => {
      req.taskManager = taskManager;
      req.workerManager = workerManager;
      next();
    });

    // Add routes
    app.use('/api/v1/uploads', uploadRoutes);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await workerManager.cleanup();
    taskManager.clearAllTasks();
  });

  describe('POST /api/v1/uploads/mux', () => {
    test('should create mux upload task', async () => {
      const requestBody = {
        folderPath: global.testUtils.testFiles.directory,
        config: {
          configPath: global.testUtils.testFiles.config,
          muxSettings: {
            playbackPolicy: 'public',
            encoding: 'standard'
          }
        },
        options: {
          timeout: 300000,
          skipExisting: false
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/mux')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Mux upload task created');
      expect(response.body.data).toHaveProperty('taskId');
      expect(response.body.data).toHaveProperty('status', TASK_STATES.PENDING);
      expect(response.body.data).toHaveProperty('type', TASK_TYPES.MUX_UPLOAD);

      // Verify task was created in task manager
      const task = taskManager.getTask(response.body.data.taskId);
      expect(task).toBeDefined();
      expect(task.request).toEqual(requestBody);

      // Verify worker was started
      expect(workerManager.startWorker).toHaveBeenCalledWith(response.body.data.taskId);
    });

    test('should validate required fields', async () => {
      const invalidRequests = [
        {}, // Missing all fields
        { folderPath: '/test/path' }, // Missing config
        { config: { configPath: '/test/config.ini' } }, // Missing folderPath
        {
          folderPath: '',
          config: { configPath: '/test/config.ini' }
        }, // Empty folderPath
        {
          folderPath: '/test/path',
          config: { configPath: '' }
        } // Empty config path
      ];

      for (const invalidRequest of invalidRequests) {
        await request(app)
          .post('/api/v1/uploads/mux')
          .send(invalidRequest)
          .expect(400);
      }
    });

    test('should apply default options', async () => {
      const requestBody = {
        folderPath: '/test/uploads',
        config: {
          configPath: '/test/config.ini'
        }
        // No options provided
      };

      const response = await request(app)
        .post('/api/v1/uploads/mux')
        .send(requestBody)
        .expect(201);

      const task = taskManager.getTask(response.body.data.taskId);
      expect(task.timeout).toBe(600000); // Default timeout
    });

    test('should handle worker startup failure', async () => {
      workerManager.startWorker.mockRejectedValue(new Error('Worker spawn failed'));

      const requestBody = {
        folderPath: '/test/uploads',
        config: {
          configPath: '/test/config.ini'
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/mux')
        .send(requestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to start upload task');
    });
  });

  describe('POST /api/v1/uploads/picture', () => {
    test('should create picture upload task', async () => {
      const requestBody = {
        folderPath: global.testUtils.testFiles.directory,
        config: {
          configPath: global.testUtils.testFiles.config,
          s3Settings: {
            bucket: 'test-bucket',
            region: 'us-east-1',
            prefix: 'uploads/'
          }
        },
        options: {
          imageFormats: ['jpg', 'png', 'webp'],
          resizeOptions: {
            width: 1920,
            height: 1080,
            quality: 85
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/picture')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(TASK_TYPES.PICTURE_UPLOAD);

      const task = taskManager.getTask(response.body.data.taskId);
      expect(task.request).toEqual(requestBody);
    });

    test('should validate image format options', async () => {
      const requestBody = {
        folderPath: '/test/images',
        config: {
          configPath: '/test/config.ini'
        },
        options: {
          imageFormats: ['invalid-format'] // Invalid format
        }
      };

      await request(app)
        .post('/api/v1/uploads/picture')
        .send(requestBody)
        .expect(400);
    });

    test('should validate resize options', async () => {
      const requestBody = {
        folderPath: '/test/images',
        config: {
          configPath: '/test/config.ini'
        },
        options: {
          resizeOptions: {
            width: 0, // Invalid width
            height: -100, // Invalid height
            quality: 150 // Invalid quality > 100
          }
        }
      };

      await request(app)
        .post('/api/v1/uploads/picture')
        .send(requestBody)
        .expect(400);
    });
  });

  describe('POST /api/v1/uploads/subtitle', () => {
    test('should create subtitle upload task', async () => {
      const requestBody = {
        folderPath: global.testUtils.testFiles.directory,
        config: {
          configPath: global.testUtils.testFiles.config,
          subtitleSettings: {
            languages: ['en', 'fr', 'es'],
            format: 'srt',
            autoGenerate: false
          }
        },
        options: {
          validateSrt: true,
          encodingOptions: {
            charset: 'utf-8'
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/subtitle')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(TASK_TYPES.MUX_SUBTITLE_UPLOAD);

      const task = taskManager.getTask(response.body.data.taskId);
      expect(task.request).toEqual(requestBody);
    });

    test('should validate subtitle languages', async () => {
      const requestBody = {
        folderPath: '/test/subtitles',
        config: {
          configPath: '/test/config.ini',
          subtitleSettings: {
            languages: ['invalid-lang-code'] // Invalid language code
          }
        }
      };

      await request(app)
        .post('/api/v1/uploads/subtitle')
        .send(requestBody)
        .expect(400);
    });

    test('should validate subtitle format', async () => {
      const requestBody = {
        folderPath: '/test/subtitles',
        config: {
          configPath: '/test/config.ini',
          subtitleSettings: {
            format: 'invalid-format' // Only 'srt' and 'vtt' should be allowed
          }
        }
      };

      await request(app)
        .post('/api/v1/uploads/subtitle')
        .send(requestBody)
        .expect(400);
    });
  });

  describe('POST /api/v1/uploads/single', () => {
    test('should create single folder upload task', async () => {
      const requestBody = {
        folderPath: global.testUtils.testFiles.directory,
        config: {
          configPath: global.testUtils.testFiles.config,
          workflow: {
            steps: ['analyze', 'upload-mux', 'upload-pictures', 'generate-excel']
          }
        },
        options: {
          skipAnalysis: false,
          overwriteExisting: true,
          generateThumbnails: true
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/single')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(TASK_TYPES.SINGLE_UPLOAD);

      const task = taskManager.getTask(response.body.data.taskId);
      expect(task.request).toEqual(requestBody);
    });

    test('should validate workflow steps', async () => {
      const requestBody = {
        folderPath: '/test/folder',
        config: {
          configPath: '/test/config.ini',
          workflow: {
            steps: ['invalid-step'] // Invalid workflow step
          }
        }
      };

      await request(app)
        .post('/api/v1/uploads/single')
        .send(requestBody)
        .expect(400);
    });

    test('should require workflow configuration for single uploads', async () => {
      const requestBody = {
        folderPath: '/test/folder',
        config: {
          configPath: '/test/config.ini'
          // Missing workflow
        }
      };

      await request(app)
        .post('/api/v1/uploads/single')
        .send(requestBody)
        .expect(400);
    });
  });

  describe('POST /api/v1/uploads/batch', () => {
    test('should create batch upload task', async () => {
      const requestBody = {
        batchFolders: [
          '/test/folder1',
          '/test/folder2',
          '/test/folder3'
        ],
        config: {
          configPath: global.testUtils.testFiles.config,
          workflow: {
            steps: ['analyze', 'upload-mux']
          }
        },
        options: {
          sequential: true,
          continueOnError: false,
          maxRetries: 3
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/batch')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(TASK_TYPES.BATCH_UPLOAD);

      const task = taskManager.getTask(response.body.data.taskId);
      expect(task.request).toEqual(requestBody);
    });

    test('should validate batch folders array', async () => {
      const invalidRequests = [
        {
          // Missing batchFolders
          config: {
            configPath: '/test/config.ini',
            workflow: { steps: ['analyze'] }
          }
        },
        {
          batchFolders: [], // Empty array
          config: {
            configPath: '/test/config.ini',
            workflow: { steps: ['analyze'] }
          }
        },
        {
          batchFolders: 'not-an-array', // Not an array
          config: {
            configPath: '/test/config.ini',
            workflow: { steps: ['analyze'] }
          }
        }
      ];

      for (const invalidRequest of invalidRequests) {
        await request(app)
          .post('/api/v1/uploads/batch')
          .send(invalidRequest)
          .expect(400);
      }
    });

    test('should validate maximum batch size', async () => {
      const requestBody = {
        batchFolders: Array.from({ length: 101 }, (_, i) => `/test/folder${i}`), // Too many folders
        config: {
          configPath: '/test/config.ini',
          workflow: { steps: ['analyze'] }
        }
      };

      await request(app)
        .post('/api/v1/uploads/batch')
        .send(requestBody)
        .expect(400);
    });
  });

  describe('POST /api/v1/uploads/parallel', () => {
    test('should create parallel upload task', async () => {
      const requestBody = {
        batchFolders: [
          '/test/parallel1',
          '/test/parallel2',
          '/test/parallel3'
        ],
        config: {
          configPath: global.testUtils.testFiles.config,
          workflow: {
            steps: ['analyze', 'upload-mux']
          }
        },
        options: {
          maxConcurrent: 3,
          priority: 'high',
          resourceLimits: {
            maxMemory: '4GB',
            maxCpu: 80
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/parallel')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(TASK_TYPES.PARALLEL_UPLOAD);

      const task = taskManager.getTask(response.body.data.taskId);
      expect(task.request).toEqual(requestBody);
    });

    test('should validate concurrency limits', async () => {
      const requestBody = {
        batchFolders: ['/test/folder1', '/test/folder2'],
        config: {
          configPath: '/test/config.ini',
          workflow: { steps: ['analyze'] }
        },
        options: {
          maxConcurrent: 0 // Invalid concurrency
        }
      };

      await request(app)
        .post('/api/v1/uploads/parallel')
        .send(requestBody)
        .expect(400);

      // Test maximum concurrency limit
      requestBody.options.maxConcurrent = 21; // Too high
      await request(app)
        .post('/api/v1/uploads/parallel')
        .send(requestBody)
        .expect(400);
    });

    test('should validate resource limits', async () => {
      const requestBody = {
        batchFolders: ['/test/folder1'],
        config: {
          configPath: '/test/config.ini',
          workflow: { steps: ['analyze'] }
        },
        options: {
          resourceLimits: {
            maxMemory: 'invalid-memory-format', // Invalid format
            maxCpu: 150 // Invalid percentage > 100
          }
        }
      };

      await request(app)
        .post('/api/v1/uploads/parallel')
        .send(requestBody)
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    test('should handle task creation failures', async () => {
      // Mock task manager to throw error
      taskManager.createTask = jest.fn().mockImplementation(() => {
        throw new Error('Task creation failed');
      });

      const requestBody = {
        folderPath: '/test/path',
        config: {
          configPath: '/test/config.ini'
        }
      };

      await request(app)
        .post('/api/v1/uploads/mux')
        .send(requestBody)
        .expect(500);
    });

    test('should handle worker manager failures', async () => {
      workerManager.startWorker.mockRejectedValue(new Error('Worker failed'));

      const requestBody = {
        folderPath: '/test/path',
        config: {
          configPath: '/test/config.ini'
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/mux')
        .send(requestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to start upload task');
    });

    test('should clean up task if worker fails to start', async () => {
      workerManager.startWorker.mockRejectedValue(new Error('Worker failed'));

      const requestBody = {
        folderPath: '/test/path',
        config: {
          configPath: '/test/config.ini'
        }
      };

      await request(app)
        .post('/api/v1/uploads/mux')
        .send(requestBody)
        .expect(500);

      // Task should be marked as failed
      const tasks = taskManager.getAllTasks();
      const failedTasks = tasks.filter(t => t.status === TASK_STATES.FAILED);
      expect(failedTasks.length).toBeGreaterThan(0);
    });

    test('should handle invalid JSON in request body', async () => {
      await request(app)
        .post('/api/v1/uploads/mux')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    test('should handle missing Content-Type header', async () => {
      await request(app)
        .post('/api/v1/uploads/mux')
        .send({ folderPath: '/test' })
        .expect(400);
    });
  });

  describe('Request Validation', () => {
    test('should validate path formats', async () => {
      const testCases = [
        {
          folderPath: '/valid/unix/path',
          config: { configPath: '/valid/config.ini' },
          shouldPass: true
        },
        {
          folderPath: 'C:\\valid\\windows\\path',
          config: { configPath: 'C:\\valid\\config.ini' },
          shouldPass: true
        },
        {
          folderPath: '/path/with spaces',
          config: { configPath: '/config with spaces.ini' },
          shouldPass: true
        },
        {
          folderPath: '', // Empty path
          config: { configPath: '/config.ini' },
          shouldPass: false
        }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/v1/uploads/mux')
          .send(testCase);

        if (testCase.shouldPass) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    test('should validate timeout values', async () => {
      const testCases = [
        { timeout: 60000, shouldPass: true }, // 1 minute
        { timeout: 3600000, shouldPass: true }, // 1 hour
        { timeout: 0, shouldPass: false }, // Zero timeout
        { timeout: -1000, shouldPass: false }, // Negative timeout
        { timeout: 'invalid', shouldPass: false } // Non-numeric
      ];

      for (const testCase of testCases) {
        const requestBody = {
          folderPath: '/test/path',
          config: {
            configPath: '/test/config.ini'
          },
          options: {
            timeout: testCase.timeout
          }
        };

        const response = await request(app)
          .post('/api/v1/uploads/mux')
          .send(requestBody);

        if (testCase.shouldPass) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    test('should sanitize and validate file paths', async () => {
      const requestBody = {
        folderPath: '/test/../../../etc/passwd', // Path traversal attempt
        config: {
          configPath: '/test/config.ini'
        }
      };

      // Should either reject or sanitize the path
      const response = await request(app)
        .post('/api/v1/uploads/mux')
        .send(requestBody);

      if (response.status === 201) {
        // If accepted, ensure path was sanitized
        const task = taskManager.getTask(response.body.data.taskId);
        expect(task.request.folderPath).not.toContain('../');
      } else {
        // Should be rejected with 400
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Response Consistency', () => {
    test('should return consistent response format across all upload endpoints', async () => {
      const endpoints = [
        { path: '/api/v1/uploads/mux', type: TASK_TYPES.MUX_UPLOAD },
        { path: '/api/v1/uploads/picture', type: TASK_TYPES.PICTURE_UPLOAD },
        { path: '/api/v1/uploads/subtitle', type: TASK_TYPES.MUX_SUBTITLE_UPLOAD },
        { path: '/api/v1/uploads/single', type: TASK_TYPES.SINGLE_UPLOAD }
      ];

      for (const endpoint of endpoints) {
        const requestBody = {
          folderPath: '/test/path',
          config: {
            configPath: '/test/config.ini'
          }
        };

        // Add specific requirements for single upload
        if (endpoint.type === TASK_TYPES.SINGLE_UPLOAD) {
          requestBody.config.workflow = { steps: ['analyze'] };
        }

        const response = await request(app)
          .post(endpoint.path)
          .send(requestBody)
          .expect(201);

        // Verify response structure
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');

        expect(response.body.data).toHaveProperty('taskId');
        expect(response.body.data).toHaveProperty('status', TASK_STATES.PENDING);
        expect(response.body.data).toHaveProperty('type', endpoint.type);
        expect(response.body.data).toHaveProperty('createdAt');
        expect(response.body.data).toHaveProperty('progress', 0);
      }
    });

    test('should include task creation timestamp', async () => {
      const beforeRequest = new Date();

      const requestBody = {
        folderPath: '/test/path',
        config: {
          configPath: '/test/config.ini'
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/mux')
        .send(requestBody)
        .expect(201);

      const afterRequest = new Date();
      const taskCreatedAt = new Date(response.body.data.createdAt);

      expect(taskCreatedAt.getTime()).toBeGreaterThan(beforeRequest.getTime());
      expect(taskCreatedAt.getTime()).toBeLessThan(afterRequest.getTime());
    });

    test('should return appropriate HTTP status codes', async () => {
      // Test successful creation
      const validRequest = {
        folderPath: '/test/path',
        config: {
          configPath: '/test/config.ini'
        }
      };

      await request(app)
        .post('/api/v1/uploads/mux')
        .send(validRequest)
        .expect(201);

      // Test validation errors
      await request(app)
        .post('/api/v1/uploads/mux')
        .send({}) // Missing required fields
        .expect(400);

      // Test server errors (mock worker failure)
      workerManager.startWorker.mockRejectedValue(new Error('Server error'));

      await request(app)
        .post('/api/v1/uploads/mux')
        .send(validRequest)
        .expect(500);
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle multiple simultaneous upload requests', async () => {
      const requestBody = {
        folderPath: '/test/path',
        config: {
          configPath: '/test/config.ini'
        }
      };

      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/v1/uploads/mux')
          .send(requestBody)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Should create 5 different tasks
      const taskIds = responses.map(r => r.body.data.taskId);
      const uniqueTaskIds = new Set(taskIds);
      expect(uniqueTaskIds.size).toBe(5);

      // All workers should be started
      expect(workerManager.startWorker).toHaveBeenCalledTimes(5);
    });

    test('should maintain data integrity during concurrent operations', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        folderPath: `/test/path/${i}`,
        config: {
          configPath: `/test/config${i}.ini`
        }
      }));

      const promises = requests.map(requestBody =>
        request(app)
          .post('/api/v1/uploads/mux')
          .send(requestBody)
      );

      const responses = await Promise.all(promises);

      // Verify each task has correct data
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);

        const task = taskManager.getTask(response.body.data.taskId);
        expect(task.request.folderPath).toBe(requests[index].folderPath);
        expect(task.request.config.configPath).toBe(requests[index].config.configPath);
      });
    });
  });
});