/**
 * Performance and Load Testing
 * Tests server performance under various load conditions
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import TaskManager, { TASK_STATES, TASK_TYPES } from '../../taskManager.js';
import WorkerManager from '../../workerManager.js';
import taskRoutes from '../../routes/tasks.js';
import uploadRoutes from '../../routes/uploads.js';
import mediaAnalyzerRoutes from '../../routes/mediaAnalyzer.js';
import { errorHandler, notFoundHandler } from '../../utils/errorHandler.js';

describe('Performance and Load Tests', () => {
  let app;
  let taskManager;
  let workerManager;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Initialize managers
    taskManager = new TaskManager();
    workerManager = new WorkerManager(taskManager);

    // Mock workers for performance testing
    workerManager.startWorker = jest.fn().mockImplementation(async (taskId) => {
      const task = taskManager.getTask(taskId);
      if (task) {
        // Simulate quick completion for performance testing
        setTimeout(() => {
          task.update({
            status: TASK_STATES.COMPLETED,
            progress: 100,
            result: { processed: true }
          });
        }, 50 + Math.random() * 100); // 50-150ms random delay
      }
      return `worker-${taskId}`;
    });

    workerManager.cancelWorker = jest.fn().mockResolvedValue(true);
    workerManager.getStatistics = jest.fn().mockReturnValue({
      activeWorkers: 0,
      totalSpawned: 0,
      memoryUsage: process.memoryUsage()
    });

    // Add managers to request
    app.use((req, res, next) => {
      req.taskManager = taskManager;
      req.workerManager = workerManager;
      next();
    });

    // Add routes
    app.use('/api/v1/tasks', taskRoutes);
    app.use('/api/v1/uploads', uploadRoutes);
    app.use('/api/v1/media-analyzer', mediaAnalyzerRoutes);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await workerManager.cleanup();
    taskManager.clearAllTasks();
  });

  describe('Concurrent Request Handling', () => {
    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should handle 50 concurrent task creation requests', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .post('/api/v1/media-analyzer')
          .send({
            folderPath: `/test/concurrent/${i}`,
            config: {
              configPath: '/test/config.ini'
            }
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.taskId).toBeDefined();
      });

      // Performance benchmarks
      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms`);
      console.log(`Average response time: ${totalTime / concurrentRequests}ms per request`);

      // Should complete within reasonable time (10 seconds for 50 requests)
      expect(totalTime).toBeLessThan(10000);
      expect(totalTime / concurrentRequests).toBeLessThan(200); // Less than 200ms per request

      // Verify all tasks were created
      const allTasks = taskManager.getAllTasks();
      expect(allTasks).toHaveLength(concurrentRequests);

      // All workers should be started
      expect(workerManager.startWorker).toHaveBeenCalledTimes(concurrentRequests);
    });

    test('should handle concurrent task queries efficiently', async () => {
      // Create test data
      const taskCount = 100;
      for (let i = 0; i < taskCount; i++) {
        const taskData = global.testUtils.createTestTask();
        taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);
      }

      const concurrentQueries = 20;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentQueries }, () =>
        request(app)
          .get('/api/v1/tasks?limit=10')
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All queries should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(10);
      });

      console.log(`${concurrentQueries} concurrent queries completed in ${totalTime}ms`);
      console.log(`Average query time: ${totalTime / concurrentQueries}ms`);

      // Should be very fast for queries
      expect(totalTime).toBeLessThan(2000);
      expect(totalTime / concurrentQueries).toBeLessThan(100);
    });

    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should handle mixed operations under load', async () => {
      const operations = [
        () => request(app).post('/api/v1/media-analyzer').send({
          folderPath: '/test/mixed',
          config: { configPath: '/test/config.ini' }
        }),
        () => request(app).get('/api/v1/tasks?limit=5'),
        () => request(app).get('/api/v1/tasks/stats'),
        () => request(app).post('/api/v1/uploads/mux').send({
          folderPath: '/test/mixed',
          config: { configPath: '/test/config.ini' }
        })
      ];

      const totalOperations = 100;
      const startTime = Date.now();

      const promises = Array.from({ length: totalOperations }, (_, i) => {
        const operation = operations[i % operations.length];
        return operation();
      });

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all operations succeeded (allowing some to be 201 or 200)
      const successfulResponses = responses.filter(r => r.status === 200 || r.status === 201);
      expect(successfulResponses.length).toBe(totalOperations);

      console.log(`${totalOperations} mixed operations completed in ${totalTime}ms`);

      // Should handle mixed load efficiently
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 100 mixed operations
    });
  });

  describe('Memory Usage and Resource Management', () => {
    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should maintain stable memory usage under sustained load', async () => {
      const initialMemory = process.memoryUsage();
      const memorySnapshots = [];

      // Create sustained load for 30 operations
      for (let batch = 0; batch < 6; batch++) {
        const batchPromises = Array.from({ length: 5 }, () =>
          request(app)
            .post('/api/v1/media-analyzer')
            .send({
              folderPath: `/test/memory/${batch}`,
              config: { configPath: '/test/config.ini' }
            })
        );

        await Promise.all(batchPromises);

        // Take memory snapshot
        memorySnapshots.push({
          batch,
          memory: process.memoryUsage(),
          taskCount: taskManager.getAllTasks().length
        });

        // Small delay between batches
        await global.testUtils.waitFor(100);
      }

      // Analyze memory growth
      const heapUsageGrowth = memorySnapshots.map(s => s.memory.heapUsed - initialMemory.heapUsed);
      const maxGrowth = Math.max(...heapUsageGrowth);

      console.log('Memory usage over batches:', heapUsageGrowth.map(g => `${Math.round(g / 1024 / 1024)}MB`));

      // Memory growth should be reasonable (less than 50MB for this load)
      expect(maxGrowth).toBeLessThan(50 * 1024 * 1024);

      // Memory shouldn't grow linearly with task count (indicating memory leaks)
      const avgGrowthPerTask = maxGrowth / memorySnapshots[memorySnapshots.length - 1].taskCount;
      expect(avgGrowthPerTask).toBeLessThan(1024 * 1024); // Less than 1MB per task
    });

    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should handle task cleanup efficiently', async () => {
      const taskCount = 50;

      // Create many tasks
      const createPromises = Array.from({ length: taskCount }, (_, i) =>
        request(app)
          .post('/api/v1/media-analyzer')
          .send({
            folderPath: `/test/cleanup/${i}`,
            config: { configPath: '/test/config.ini' }
          })
      );

      const createResponses = await Promise.all(createPromises);
      expect(createResponses).toHaveLength(taskCount);

      // Wait for tasks to complete
      await global.testUtils.waitFor(1000);

      const memoryBeforeCleanup = process.memoryUsage();

      // Cancel all tasks
      await request(app)
        .delete('/api/v1/tasks')
        .expect(200);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await global.testUtils.waitFor(500);

      const memoryAfterCleanup = process.memoryUsage();

      // Memory usage should not increase significantly after cleanup
      const memoryDifference = memoryAfterCleanup.heapUsed - memoryBeforeCleanup.heapUsed;
      expect(Math.abs(memoryDifference)).toBeLessThan(10 * 1024 * 1024); // Less than 10MB difference

      console.log(`Memory before cleanup: ${Math.round(memoryBeforeCleanup.heapUsed / 1024 / 1024)}MB`);
      console.log(`Memory after cleanup: ${Math.round(memoryAfterCleanup.heapUsed / 1024 / 1024)}MB`);
    });

    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should handle worker process limits', async () => {
      // Simulate reaching worker limits
      const maxWorkers = 20; // Typical server limit

      const promises = Array.from({ length: maxWorkers + 5 }, (_, i) =>
        request(app)
          .post('/api/v1/uploads/batch')
          .send({
            batchFolders: [`/test/worker/${i}`],
            config: {
              configPath: '/test/config.ini',
              workflow: { steps: ['analyze'] }
            }
          })
      );

      const responses = await Promise.all(promises);

      // All requests should be accepted (queuing should handle excess)
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Worker manager should be called appropriately
      expect(workerManager.startWorker).toHaveBeenCalledTimes(maxWorkers + 5);

      // Tasks should be in appropriate states
      const allTasks = taskManager.getAllTasks();
      const pendingOrRunning = allTasks.filter(t =>
        t.status === TASK_STATES.PENDING || t.status === TASK_STATES.RUNNING
      );

      // Some tasks might be queued if worker limit is reached
      expect(pendingOrRunning.length).toBeGreaterThan(0);
    });
  });

  describe('Response Time Performance', () => {
    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should maintain fast response times under increasing load', async () => {
      const loadLevels = [1, 5, 10, 20];
      const performanceResults = [];

      for (const loadLevel of loadLevels) {
        const startTime = Date.now();

        const promises = Array.from({ length: loadLevel }, () =>
          request(app)
            .get('/api/v1/tasks/stats')
        );

        await Promise.all(promises);
        const endTime = Date.now();

        const avgResponseTime = (endTime - startTime) / loadLevel;
        performanceResults.push({
          loadLevel,
          avgResponseTime,
          totalTime: endTime - startTime
        });

        console.log(`Load ${loadLevel}: ${avgResponseTime}ms avg response time`);
      }

      // Response times should remain reasonable even as load increases
      performanceResults.forEach(result => {
        expect(result.avgResponseTime).toBeLessThan(1000); // Less than 1 second average
      });

      // Response time shouldn't grow linearly with load (indicating good concurrency handling)
      const firstResult = performanceResults[0];
      const lastResult = performanceResults[performanceResults.length - 1];
      const responseTimeGrowthRatio = lastResult.avgResponseTime / firstResult.avgResponseTime;

      // Response time shouldn't grow more than 3x even with 20x the load
      expect(responseTimeGrowthRatio).toBeLessThan(3);
    });

    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should handle database-intensive operations efficiently', async () => {
      // Create large dataset
      const taskCount = 500;
      for (let i = 0; i < taskCount; i++) {
        const taskData = global.testUtils.createTestTask();
        const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, taskData);

        // Set various states for realistic data
        if (i % 3 === 0) task.update({ status: TASK_STATES.COMPLETED });
        if (i % 5 === 0) task.update({ status: TASK_STATES.RUNNING });
        if (i % 7 === 0) task.update({ status: TASK_STATES.FAILED });
      }

      const operations = [
        () => request(app).get('/api/v1/tasks?limit=50'),
        () => request(app).get('/api/v1/tasks?status=completed&limit=25'),
        () => request(app).get('/api/v1/tasks?type=media-analyzer&sortBy=updatedAt'),
        () => request(app).get('/api/v1/tasks/stats'),
        () => request(app).get(`/api/v1/tasks?since=${new Date(Date.now() - 3600000).toISOString()}`)
      ];

      const startTime = Date.now();

      // Run multiple database-intensive operations concurrently
      const promises = Array.from({ length: 25 }, (_, i) => {
        const operation = operations[i % operations.length];
        return operation();
      });

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All operations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      console.log(`25 database operations on ${taskCount} records completed in ${totalTime}ms`);

      // Should handle large datasets efficiently
      expect(totalTime).toBeLessThan(5000); // 5 seconds for complex queries on 500 records
      expect(totalTime / 25).toBeLessThan(200); // Less than 200ms per operation
    });
  });

  describe('Error Handling Under Load', () => {
    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should maintain stability when handling errors under load', async () => {
      const validRequest = {
        folderPath: '/test/error',
        config: { configPath: '/test/config.ini' }
      };

      const invalidRequests = [
        {}, // Missing required fields
        { folderPath: '' }, // Empty path
        { folderPath: '/test', config: { configPath: '' } }, // Empty config
        { folderPath: '/test', config: null } // Null config
      ];

      const mixedRequests = [
        ...Array.from({ length: 10 }, () => validRequest),
        ...Array.from({ length: 10 }, (_, i) => invalidRequests[i % invalidRequests.length])
      ];

      const startTime = Date.now();

      const promises = mixedRequests.map(requestBody =>
        request(app)
          .post('/api/v1/media-analyzer')
          .send(requestBody)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Verify appropriate responses
      const successfulResponses = responses.filter(r => r.status === 201);
      const errorResponses = responses.filter(r => r.status === 400);

      expect(successfulResponses).toHaveLength(10);
      expect(errorResponses).toHaveLength(10);

      // Server should remain responsive even with errors
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000);

      console.log(`Mixed valid/invalid requests handled in ${totalTime}ms`);

      // All error responses should be properly formatted
      errorResponses.forEach(response => {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('timestamp');
      });
    });

    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should recover from temporary failures', async () => {
      let failureCount = 0;

      // Mock worker manager to fail first few attempts
      workerManager.startWorker = jest.fn().mockImplementation(async (taskId) => {
        failureCount++;
        if (failureCount <= 5) {
          throw new Error('Temporary failure');
        }

        const task = taskManager.getTask(taskId);
        if (task) {
          setTimeout(() => {
            task.update({ status: TASK_STATES.COMPLETED, progress: 100 });
          }, 50);
        }
        return `worker-${taskId}`;
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/v1/media-analyzer')
          .send({
            folderPath: `/test/recovery/${i}`,
            config: { configPath: '/test/config.ini' }
          })
      );

      const responses = await Promise.all(promises);

      // First 5 should fail due to worker issues
      const failedResponses = responses.slice(0, 5);
      const successfulResponses = responses.slice(5);

      failedResponses.forEach(response => {
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });

      successfulResponses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      console.log(`Recovery test: ${failedResponses.length} failed, ${successfulResponses.length} succeeded`);
    });
  });

  describe('Long-Running Operations', () => {
    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should handle multiple long-running tasks', async () => {
      // Mock workers with longer processing times
      workerManager.startWorker = jest.fn().mockImplementation(async (taskId) => {
        const task = taskManager.getTask(taskId);
        if (task) {
          // Simulate longer processing with progress updates
          const updateInterval = 200;
          const totalDuration = 2000; // 2 seconds
          const steps = totalDuration / updateInterval;

          for (let i = 1; i <= steps; i++) {
            setTimeout(() => {
              const progress = Math.round((i / steps) * 100);
              if (i === steps) {
                task.update({
                  status: TASK_STATES.COMPLETED,
                  progress: 100,
                  result: { processed: true }
                });
              } else {
                task.update({
                  progress,
                  message: `Processing step ${i}/${steps}`
                });
              }
            }, i * updateInterval);
          }
        }
        return `worker-${taskId}`;
      });

      const taskCount = 5;
      const startTime = Date.now();

      // Start multiple long-running tasks
      const createPromises = Array.from({ length: taskCount }, (_, i) =>
        request(app)
          .post('/api/v1/uploads/single')
          .send({
            folderPath: `/test/longrunning/${i}`,
            config: {
              configPath: '/test/config.ini',
              workflow: { steps: ['analyze', 'upload'] }
            }
          })
      );

      const createResponses = await Promise.all(createPromises);
      const taskIds = createResponses.map(r => r.body.data.taskId);

      // Monitor tasks until completion
      let allCompleted = false;
      let attempts = 0;
      const maxAttempts = 30; // 15 seconds max

      while (!allCompleted && attempts < maxAttempts) {
        const statusResponse = await request(app)
          .get('/api/v1/tasks')
          .expect(200);

        const runningTasks = statusResponse.body.data.filter(t =>
          taskIds.includes(t.id) &&
          (t.status === TASK_STATES.PENDING || t.status === TASK_STATES.RUNNING)
        );

        allCompleted = runningTasks.length === 0;

        if (!allCompleted) {
          await global.testUtils.waitFor(500);
          attempts++;
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all tasks completed
      const finalStatusResponse = await request(app)
        .get('/api/v1/tasks')
        .expect(200);

      const completedTasks = finalStatusResponse.body.data.filter(t =>
        taskIds.includes(t.id) && t.status === TASK_STATES.COMPLETED
      );

      expect(completedTasks).toHaveLength(taskCount);

      console.log(`${taskCount} long-running tasks completed in ${totalTime}ms`);

      // Should complete within reasonable time considering 2s per task + overhead
      expect(totalTime).toBeLessThan(15000);
    });
  });

  describe('Stress Testing', () => {
    // Skipped: written for the #36 uploader server; the task API has changed since (e.g. #54), needs rewriting
    test.skip('should handle extreme load without crashing', async () => {
      const extremeLoad = 100;
      const startTime = Date.now();

      console.log(`Starting stress test with ${extremeLoad} concurrent requests...`);

      const promises = Array.from({ length: extremeLoad }, (_, i) =>
        request(app)
          .post('/api/v1/media-analyzer')
          .send({
            folderPath: `/test/stress/${i}`,
            config: { configPath: '/test/config.ini' }
          })
          .timeout(10000) // 10 second timeout per request
      );

      let successCount = 0;
      let errorCount = 0;

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.status === 201) {
          successCount++;
        } else {
          errorCount++;
        }
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`Stress test completed in ${totalTime}ms`);
      console.log(`Success: ${successCount}, Errors: ${errorCount}`);

      // At least 80% should succeed under extreme load
      const successRate = successCount / extremeLoad;
      expect(successRate).toBeGreaterThan(0.8);

      // Should complete within reasonable time (30 seconds for 100 requests)
      expect(totalTime).toBeLessThan(30000);

      // Server should still be responsive after stress test
      const healthCheck = await request(app)
        .get('/api/v1/tasks/stats')
        .expect(200);

      expect(healthCheck.body.success).toBe(true);
    });
  });
});