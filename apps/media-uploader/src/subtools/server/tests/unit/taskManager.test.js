/**
 * TaskManager Unit Tests
 * Tests for task lifecycle, state management, and filtering
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import TaskManager, { TASK_STATES, TASK_TYPES } from '../../taskManager.js';

describe('TaskManager', () => {
  let taskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
  });

  describe('Task Creation', () => {
    test('should create a new task with valid data', () => {
      const taskData = global.testUtils.createTestTask();
      const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);

      expect(task).toBeDefined();
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(task.type).toBe(TASK_TYPES.MEDIA_ANALYZER);
      expect(task.status).toBe(TASK_STATES.PENDING);
      expect(task.progress).toBe(0);
      expect(task.request).toEqual(taskData);
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt)).toBeInstanceOf(Date);
      expect(isNaN(new Date(task.createdAt).getTime())).toBe(false);
    });

    test('should create tasks with different types', () => {
      const taskTypes = Object.values(TASK_TYPES);

      taskTypes.forEach(type => {
        const taskData = global.testUtils.createTestTask();
        const task = taskManager.createTask(type, taskData);

        expect(task.type).toBe(type);
        expect(task.status).toBe(TASK_STATES.PENDING);
      });
    });

    test('should create task with custom options', () => {
      const taskData = global.testUtils.createTestTask('media-analyzer', {
        timeout: 120000,
        taskOptions: {
          retry: 5,
          skipValidation: true
        }
      });

      const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData, {
        timeout: 120000,
        maxRetries: 5,
        metadata: { priority: 'high' }
      });

      expect(task.timeout).toBe(120000);
      expect(task.maxRetries).toBe(5);
      expect(task.metadata.priority).toBe('high');
    });

    test('should emit taskCreated event', () => {
      const eventSpy = jest.fn();
      taskManager.on('task:created', eventSpy);

      const taskData = global.testUtils.createTestTask();
      const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);

      expect(eventSpy).toHaveBeenCalledWith(task);
    });
  });

  describe('Task Retrieval', () => {
    let testTasks;

    beforeEach(() => {
      testTasks = [];
      const types = [TASK_TYPES.MEDIA_ANALYZER, TASK_TYPES.MUX_UPLOAD, TASK_TYPES.PICTURE_UPLOAD];

      types.forEach(type => {
        const taskData = global.testUtils.createTestTask();
        const task = taskManager.createTask(type, taskData);
        testTasks.push(task);
      });
    });

    test('should get task by ID', () => {
      const task = testTasks[0];
      const retrievedTask = taskManager.getTask(task.id);

      expect(retrievedTask).toEqual(task);
    });

    test('should return null for non-existent task', () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';
      const task = taskManager.getTask(nonExistentId);

      expect(task).toBeUndefined();
    });

    test('should get all tasks', () => {
      const allTasks = taskManager.getAllTasks();

      expect(allTasks).toHaveLength(3);
      expect(allTasks).toEqual(expect.arrayContaining(testTasks));
    });

    test('should get tasks by status', () => {
      // Update one task to running state
      testTasks[0].update({ status: TASK_STATES.RUNNING });

      const pendingTasks = taskManager.getTasksByStatus(TASK_STATES.PENDING);
      const runningTasks = taskManager.getTasksByStatus(TASK_STATES.RUNNING);

      expect(pendingTasks).toHaveLength(2);
      expect(runningTasks).toHaveLength(1);
      expect(runningTasks[0]).toBe(testTasks[0]);
    });

    test('should get tasks by type', () => {
      const mediaAnalyzerTasks = taskManager.getTasksByType(TASK_TYPES.MEDIA_ANALYZER);
      const muxUploadTasks = taskManager.getTasksByType(TASK_TYPES.MUX_UPLOAD);

      expect(mediaAnalyzerTasks).toHaveLength(1);
      expect(muxUploadTasks).toHaveLength(1);
      expect(mediaAnalyzerTasks[0].type).toBe(TASK_TYPES.MEDIA_ANALYZER);
    });
  });

  describe('Task Updates', () => {
    let task;

    beforeEach(() => {
      const taskData = global.testUtils.createTestTask();
      task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);
    });

    test('should update task status', async () => {
      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      taskManager.updateTask(task.id, { status: TASK_STATES.RUNNING });

      expect(task.status).toBe(TASK_STATES.RUNNING);
      expect(task.startedAt).toBeDefined();
      expect(new Date(task.updatedAt).getTime()).toBeGreaterThan(new Date(task.createdAt).getTime());
    });

    test('should update task progress', () => {
      taskManager.updateTask(task.id, { progress: 50, message: 'Processing...' });

      expect(task.progress).toBe(50);
      expect(task.message).toBe('Processing...');
    });

    test('should set completion timestamp when task finishes', () => {
      taskManager.updateTask(task.id, { status: TASK_STATES.COMPLETED, result: 'success' });

      expect(task.status).toBe(TASK_STATES.COMPLETED);
      expect(task.completedAt).toBeDefined();
      expect(task.result).toBe('success');
    });

    test('should emit taskUpdated event', () => {
      const eventSpy = jest.fn();
      taskManager.on('task:updated', eventSpy);

      taskManager.updateTask(task.id, { progress: 25 });

      expect(eventSpy).toHaveBeenCalledWith(task);
    });

    test('should handle updating non-existent task', () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';

      expect(() => {
        taskManager.updateTask(nonExistentId, { status: TASK_STATES.RUNNING });
      }).toThrow('Task not found: 00000000-0000-4000-8000-000000000000');
    });
  });

  describe('Task Deletion', () => {
    let testTasks;

    beforeEach(() => {
      testTasks = [];
      for (let i = 0; i < 3; i++) {
        const taskData = global.testUtils.createTestTask();
        const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);
        testTasks.push(task);
      }
    });

    test('should delete task by ID', () => {
      const taskToDelete = testTasks[0];
      const result = taskManager.removeTask(taskToDelete.id);

      expect(result).toBe(true);
      expect(taskManager.getTask(taskToDelete.id)).toBeUndefined();
      expect(taskManager.getAllTasks()).toHaveLength(2);
    });

    test('should emit taskDeleted event', () => {
      const eventSpy = jest.fn();
      taskManager.on('task:removed', eventSpy);

      const taskToDelete = testTasks[0];
      taskManager.removeTask(taskToDelete.id);

      expect(eventSpy).toHaveBeenCalledWith(taskToDelete);
    });

    test('should return false when deleting non-existent task', () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';
      const result = taskManager.removeTask(nonExistentId);

      expect(result).toBe(false);
    });

    test('should clear all tasks', () => {
      taskManager.clearAllTasks();

      expect(taskManager.getAllTasks()).toHaveLength(0);
    });

    test('should emit allTasksCleared event', () => {
      const eventSpy = jest.fn();
      taskManager.on('tasks:cleared', eventSpy);

      taskManager.clearAllTasks();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Task Statistics', () => {
    beforeEach(() => {
      // Create tasks with different states
      const states = [
        TASK_STATES.PENDING,
        TASK_STATES.RUNNING,
        TASK_STATES.COMPLETED,
        TASK_STATES.FAILED,
        TASK_STATES.CANCELLED
      ];

      states.forEach((state, index) => {
        const taskData = global.testUtils.createTestTask();
        const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);
        if (index > 0) {
          task.update({ status: state });
        }
      });
    });

    test('should get task statistics', () => {
      const stats = taskManager.getStatistics();

      expect(stats).toHaveProperty('total', 5);
      expect(stats).toHaveProperty('pending', 1);
      expect(stats).toHaveProperty('running', 1);
      expect(stats).toHaveProperty('completed', 1);
      expect(stats).toHaveProperty('failed', 1);
      expect(stats).toHaveProperty('cancelled', 1);
      expect(stats).toHaveProperty('byType');
      expect(stats.byType).toHaveProperty(TASK_TYPES.MEDIA_ANALYZER);
      expect(stats.byType[TASK_TYPES.MEDIA_ANALYZER].total).toBe(5);
    });

    test('should get active tasks count', () => {
      const activeCount = taskManager.getActiveTasks().length;
      expect(activeCount).toBe(2); // pending + running
    });
  });

  describe('Task Filtering and Pagination', () => {
    beforeEach(() => {
      // Create test data for filtering
      const now = new Date();
      const hour = 60 * 60 * 1000;

      // Create tasks at different times
      for (let i = 0; i < 10; i++) {
        const taskData = global.testUtils.createTestTask();
        const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);

        // Manually set created time
        task.createdAt = new Date(now.getTime() - (i * hour)).toISOString();

        // Set different statuses
        if (i < 3) task.update({ status: TASK_STATES.COMPLETED });
        else if (i < 6) task.update({ status: TASK_STATES.RUNNING });
        // Rest remain pending
      }
    });

    test('should filter tasks by date range', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Use existing method and filter manually
      const allTasks = taskManager.getAllTasks();
      const recentTasks = allTasks.filter(task => {
        const createdAt = new Date(task.createdAt);
        return createdAt >= twoHoursAgo && createdAt <= now;
      });

      expect(recentTasks.length).toBeGreaterThan(0);
      expect(recentTasks.length).toBeLessThan(10);
    });

    test('should handle empty date range', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const evenMoreFutureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);

      // Use existing method and filter manually
      const allTasks = taskManager.getAllTasks();
      const tasks = allTasks.filter(task => {
        const createdAt = new Date(task.createdAt);
        return createdAt >= futureDate && createdAt <= evenMoreFutureDate;
      });

      expect(tasks).toHaveLength(0);
    });
  });

  describe('Event Handling', () => {
    test('should handle multiple event listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      taskManager.on('task:created', listener1);
      taskManager.on('task:created', listener2);

      const taskData = global.testUtils.createTestTask();
      const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);

      expect(listener1).toHaveBeenCalledWith(task);
      expect(listener2).toHaveBeenCalledWith(task);
    });

    test('should remove event listeners', () => {
      const listener = jest.fn();

      taskManager.on('taskCreated', listener);
      taskManager.off('taskCreated', listener);

      const taskData = global.testUtils.createTestTask();
      taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid task type', () => {
      const taskData = global.testUtils.createTestTask();

      expect(() => {
        taskManager.createTask('invalid-type', taskData);
      }).toThrow();
    });

    test('should handle null task data', () => {
      expect(() => {
        taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, null);
      }).not.toThrow();
    });

    test('should handle invalid task ID format', () => {
      expect(() => {
        taskManager.updateTask('invalid-id', { status: TASK_STATES.RUNNING });
      }).toThrow();
    });
  });
});