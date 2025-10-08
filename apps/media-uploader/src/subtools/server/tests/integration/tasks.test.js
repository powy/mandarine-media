/**
 * Tasks API Integration Tests
 * Tests for all task management endpoints
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import TaskManager, { TASK_STATES, TASK_TYPES } from '../../taskManager.js';
import WorkerManager from '../../workerManager.js';
import taskRoutes from '../../routes/tasks.js';
import { errorHandler, notFoundHandler } from '../../utils/errorHandler.js';

describe('Tasks API Integration Tests', () => {
  let app;
  let taskManager;
  let workerManager;
  let testTasks;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Create managers
    taskManager = new TaskManager();
    workerManager = new WorkerManager(taskManager);

    // Mock WorkerManager methods to avoid spawning real processes
    workerManager.startWorker = jest.fn().mockResolvedValue('mock-worker-id');
    workerManager.cancelWorker = jest.fn().mockResolvedValue(true);
    workerManager.cancelAllWorkers = jest.fn().mockResolvedValue();
    workerManager.getStatistics = jest.fn().mockReturnValue({
      activeWorkers: 0,
      totalSpawned: 0,
      memoryUsage: process.memoryUsage()
    });

    // Add managers to request object
    app.use((req, res, next) => {
      req.taskManager = taskManager;
      req.workerManager = workerManager;
      next();
    });

    // Add routes
    app.use('/api/v1/tasks', taskRoutes);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Create test data
    testTasks = [];
    const taskTypes = [
      TASK_TYPES.MEDIA_ANALYZER,
      TASK_TYPES.MUX_UPLOAD,
      TASK_TYPES.PICTURE_UPLOAD
    ];

    taskTypes.forEach((type, index) => {
      const taskData = global.testUtils.createTestTask();
      const task = taskManager.createTask(type, taskData);

      // Set different states for testing
      if (index === 1) task.update({ status: TASK_STATES.RUNNING });
      if (index === 2) task.update({ status: TASK_STATES.COMPLETED });

      testTasks.push(task);
    });
  });

  afterEach(async () => {
    await workerManager.cleanup();
    taskManager.clearAllTasks();
  });

  describe('GET /api/v1/tasks', () => {
    test('should return all tasks', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(3);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 3,
        pages: 1
      });
    });

    test('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?status=pending')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(TASK_STATES.PENDING);
    });

    test('should filter tasks by type', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks?type=${TASK_TYPES.MEDIA_ANALYZER}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe(TASK_TYPES.MEDIA_ANALYZER);
    });

    test('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?page=1&limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        pages: 2
      });
    });

    test('should sort tasks by creation date', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?sortBy=createdAt&sortOrder=asc')
        .expect(200);

      const tasks = response.body.data;
      expect(tasks).toHaveLength(3);

      // Verify ascending order
      for (let i = 1; i < tasks.length; i++) {
        const prev = new Date(tasks[i - 1].createdAt);
        const curr = new Date(tasks[i].createdAt);
        expect(prev.getTime()).toBeLessThanOrEqual(curr.getTime());
      }
    });

    test('should filter by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/v1/tasks?since=${oneHourAgo.toISOString()}&until=${now.toISOString()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('should validate pagination parameters', async () => {
      await request(app)
        .get('/api/v1/tasks?page=0&limit=1000')
        .expect(400);

      await request(app)
        .get('/api/v1/tasks?page=-1')
        .expect(400);

      await request(app)
        .get('/api/v1/tasks?limit=0')
        .expect(400);
    });

    test('should validate filter parameters', async () => {
      await request(app)
        .get('/api/v1/tasks?status=invalid-status')
        .expect(400);

      await request(app)
        .get('/api/v1/tasks?type=invalid-type')
        .expect(400);

      await request(app)
        .get('/api/v1/tasks?sortBy=invalid-field')
        .expect(400);
    });

    test('should handle empty results', async () => {
      taskManager.clearAllTasks();

      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    test('should return tasks with all required fields', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(200);

      const task = response.body.data[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('type');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('progress');
      expect(task).toHaveProperty('createdAt');
      expect(task).toHaveProperty('updatedAt');

      // Verify UUID format
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('GET /api/v1/tasks/:taskId', () => {
    test('should return specific task', async () => {
      const task = testTasks[0];

      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(task.id);
      expect(response.body.data.type).toBe(task.type);
      expect(response.body.data.status).toBe(task.status);
    });

    test('should return 404 for non-existent task', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/v1/tasks/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Task not found');
    });

    test('should validate task ID format', async () => {
      await request(app)
        .get('/api/v1/tasks/invalid-uuid')
        .expect(400);
    });

    test('should include detailed task information', async () => {
      const task = testTasks[0];

      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('request');
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data).toHaveProperty('timeout');
      expect(response.body.data.request).toEqual(task.request);
    });
  });

  describe('DELETE /api/v1/tasks/:taskId', () => {
    test('should cancel specific task', async () => {
      const task = testTasks[1]; // Running task
      task.update({ status: TASK_STATES.RUNNING }); // Ensure it's running

      const response = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
      expect(workerManager.cancelWorker).toHaveBeenCalledWith(task.id);

      // Verify task state
      const updatedTask = taskManager.getTask(task.id);
      expect(updatedTask.status).toBe(TASK_STATES.CANCELLED);
    });

    test('should handle cancelling non-running task', async () => {
      const task = testTasks[2]; // Completed task

      const response = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');

      // Should not call worker manager for non-running tasks
      expect(workerManager.cancelWorker).not.toHaveBeenCalledWith(task.id);
    });

    test('should return 404 for non-existent task', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app)
        .delete(`/api/v1/tasks/${fakeId}`)
        .expect(404);
    });

    test('should validate task ID format', async () => {
      await request(app)
        .delete('/api/v1/tasks/invalid-uuid')
        .expect(400);
    });

    test('should handle worker cancellation failure', async () => {
      const task = testTasks[1];
      task.update({ status: TASK_STATES.RUNNING });

      // Mock worker cancellation failure
      workerManager.cancelWorker.mockResolvedValue(false);

      const response = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to cancel task');
    });
  });

  describe('DELETE /api/v1/tasks', () => {
    test('should cancel all active tasks', async () => {
      // Set some tasks as running
      testTasks[0].update({ status: TASK_STATES.RUNNING });
      testTasks[1].update({ status: TASK_STATES.RUNNING });

      const response = await request(app)
        .delete('/api/v1/tasks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('All active tasks cancelled');
      expect(workerManager.cancelAllWorkers).toHaveBeenCalled();

      // Verify all tasks are cancelled
      const allTasks = taskManager.getAllTasks();
      const activeTasks = allTasks.filter(t =>
        t.status === TASK_STATES.PENDING || t.status === TASK_STATES.RUNNING
      );
      expect(activeTasks).toHaveLength(0);
    });

    test('should handle no active tasks', async () => {
      // All tasks are completed/cancelled
      testTasks.forEach(task => task.update({ status: TASK_STATES.COMPLETED }));

      const response = await request(app)
        .delete('/api/v1/tasks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('No active tasks to cancel');
    });

    test('should handle worker manager failure', async () => {
      testTasks[0].update({ status: TASK_STATES.RUNNING });

      workerManager.cancelAllWorkers.mockRejectedValue(new Error('Worker shutdown failed'));

      const response = await request(app)
        .delete('/api/v1/tasks')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/tasks/stats', () => {
    test('should return task statistics', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total', 3);
      expect(response.body.data).toHaveProperty('pending', 1);
      expect(response.body.data).toHaveProperty('running', 1);
      expect(response.body.data).toHaveProperty('completed', 1);
      expect(response.body.data).toHaveProperty('failed', 0);
      expect(response.body.data).toHaveProperty('cancelled', 0);
      expect(response.body.data).toHaveProperty('types');
      expect(response.body.data).toHaveProperty('workers');
    });

    test('should include worker statistics', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/stats')
        .expect(200);

      expect(response.body.data.workers).toHaveProperty('activeWorkers', 0);
      expect(response.body.data.workers).toHaveProperty('totalSpawned', 0);
      expect(response.body.data.workers).toHaveProperty('memoryUsage');
    });

    test('should handle empty task manager', async () => {
      taskManager.clearAllTasks();

      const response = await request(app)
        .get('/api/v1/tasks/stats')
        .expect(200);

      expect(response.body.data.total).toBe(0);
      expect(response.body.data.pending).toBe(0);
      expect(response.body.data.running).toBe(0);
      expect(response.body.data.completed).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle task manager errors', async () => {
      // Mock task manager to throw error
      taskManager.getAllTasks = jest.fn().mockImplementation(() => {
        throw new Error('Task manager error');
      });

      await request(app)
        .get('/api/v1/tasks')
        .expect(500);
    });

    test('should handle malformed requests', async () => {
      await request(app)
        .get('/api/v1/tasks?page=abc')
        .expect(400);

      await request(app)
        .get('/api/v1/tasks?limit=xyz')
        .expect(400);
    });

    test('should handle concurrent task operations', async () => {
      const task = testTasks[0];

      // Simulate concurrent delete operations
      const promises = Array.from({ length: 5 }, () =>
        request(app).delete(`/api/v1/tasks/${task.id}`)
      );

      const responses = await Promise.all(promises);

      // First should succeed, others might fail with 404
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle task state transitions during operations', async () => {
      const task = testTasks[0];
      task.update({ status: TASK_STATES.RUNNING });

      // Simulate task completion during cancellation
      setTimeout(() => {
        task.update({ status: TASK_STATES.COMPLETED });
      }, 10);

      const response = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Response Format Validation', () => {
    test('should include proper timestamps', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      expect(isNaN(new Date(response.body.timestamp).getTime())).toBe(false);

      const task = response.body.data[0];
      expect(task).toHaveProperty('createdAt');
      expect(task).toHaveProperty('updatedAt');
      expect(new Date(task.createdAt)).toBeInstanceOf(Date);
      expect(isNaN(new Date(task.createdAt).getTime())).toBe(false);
      expect(new Date(task.updatedAt)).toBeInstanceOf(Date);
      expect(isNaN(new Date(task.updatedAt).getTime())).toBe(false);
    });

    test('should have consistent response structure', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/tasks' },
        { method: 'get', path: `/api/v1/tasks/${testTasks[0].id}` },
        { method: 'get', path: '/api/v1/tasks/stats' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('timestamp');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.timestamp).toBe('string');

        if (response.body.success) {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('message');
        } else {
          expect(response.body).toHaveProperty('error');
        }
      }
    });

    test('should handle special characters in task data', async () => {
      const taskData = {
        folderPath: '/test/path with spaces/special-chars-éñ',
        config: {
          configPath: '/test/config with émojis 🎬.ini'
        }
      };

      const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);

      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .expect(200);

      expect(response.body.data.request).toEqual(taskData);
    });
  });

  describe('Performance', () => {
    test('should handle large number of tasks efficiently', async () => {
      // Create many tasks
      const taskCount = 1000;
      for (let i = 0; i < taskCount; i++) {
        const taskData = global.testUtils.createTestTask();
        taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);
      }

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/tasks?limit=100')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.data).toHaveLength(100);
      expect(response.body.pagination.total).toBe(taskCount + 3); // +3 for initial test tasks

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle filtering on large datasets', async () => {
      // Create many tasks with different types
      const taskCount = 500;
      for (let i = 0; i < taskCount; i++) {
        const type = i % 2 === 0 ? TASK_TYPES.MEDIA_ANALYZER : TASK_TYPES.MUX_UPLOAD;
        const taskData = global.testUtils.createTestTask();
        taskManager.createTask(type, taskData);
      }

      const startTime = Date.now();
      const response = await request(app)
        .get(`/api/v1/tasks?type=${TASK_TYPES.MEDIA_ANALYZER}`)
        .expect(200);
      const endTime = Date.now();

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify all returned tasks are of correct type
      response.body.data.forEach(task => {
        expect(task.type).toBe(TASK_TYPES.MEDIA_ANALYZER);
      });
    });
  });
});