/**
 * End-to-End Real File Processing Tests
 * Tests using actual files from uploader-test-files directory
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import TaskManager, { TASK_STATES, TASK_TYPES } from '../../taskManager.js';
import WorkerManager from '../../workerManager.js';
import taskRoutes from '../../routes/tasks.js';
import mediaAnalyzerRoutes from '../../routes/mediaAnalyzer.js';
import uploadRoutes from '../../routes/uploads.js';
import { errorHandler, notFoundHandler } from '../../utils/errorHandler.js';

describe('E2E Real File Processing Tests', () => {
  let app;
  let taskManager;
  let workerManager;
  let testFilesDir;
  let realWorkers;

  beforeEach(async () => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Initialize managers
    taskManager = new TaskManager();
    workerManager = new WorkerManager(taskManager);

    // Test files directory
    testFilesDir = global.testUtils.testFiles.directory;

    // For E2E tests, we'll use real workers but with shorter timeouts
    realWorkers = process.env.E2E_REAL_WORKERS === 'true';

    if (!realWorkers) {
      // Mock workers for faster tests
      workerManager.startWorker = jest.fn().mockImplementation(async (taskId) => {
        const task = taskManager.getTask(taskId);
        if (task) {
          // Simulate worker progress
          setTimeout(() => {
            task.update({ status: TASK_STATES.RUNNING, progress: 25 });
          }, 100);
          setTimeout(() => {
            task.update({ progress: 50, message: 'Processing files...' });
          }, 200);
          setTimeout(() => {
            task.update({ progress: 75, message: 'Finalizing...' });
          }, 300);
          setTimeout(() => {
            task.update({
              status: TASK_STATES.COMPLETED,
              progress: 100,
              result: {
                filesProcessed: 5,
                totalSize: '15.2MB',
                duration: '00:02:15'
              }
            });
          }, 500);
        }
        return 'mock-worker-id';
      });
    }

    // Add managers to request
    app.use((req, res, next) => {
      req.taskManager = taskManager;
      req.workerManager = workerManager;
      next();
    });

    // Add routes
    app.use('/api/v1/tasks', taskRoutes);
    app.use('/api/v1/media-analyzer', mediaAnalyzerRoutes);
    app.use('/api/v1/uploads', uploadRoutes);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Verify test files exist
    try {
      await fs.access(testFilesDir);
    } catch (error) {
      console.warn(`Test files directory not accessible: ${testFilesDir}`);
      console.warn('Some E2E tests may be skipped');
    }
  });

  afterEach(async () => {
    await workerManager.cleanup();
    taskManager.clearAllTasks();
  });

  describe('Real File Analysis', () => {
    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should analyze media files in test directory', async () => {
      const requestBody = {
        folderPath: testFilesDir,
        config: {
          configPath: global.testUtils.testFiles.config
        },
        options: {
          includeMetadata: true,
          generateThumbnails: false,
          timeout: 30000
        }
      };

      const response = await request(app)
        .post('/api/v1/media-analyzer')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.taskId).toBeDefined();

      const taskId = response.body.data.taskId;

      // Wait for task completion (or mock completion)
      let attempts = 0;
      let task;
      while (attempts < 20) { // 10 seconds max wait
        task = taskManager.getTask(taskId);
        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      // Verify task completion
      expect(task.status).toBe(TASK_STATES.COMPLETED);
      expect(task.progress).toBe(100);
      expect(task.result).toBeDefined();

      if (realWorkers) {
        // With real workers, verify actual file processing results
        expect(task.result).toHaveProperty('filesProcessed');
        expect(task.result.filesProcessed).toBeGreaterThan(0);
      } else {
        // With mock workers, verify mock results
        expect(task.result).toEqual({
          filesProcessed: 5,
          totalSize: '15.2MB',
          duration: '00:02:15'
        });
      }
    });

    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should handle directory with mixed file types', async () => {
      const requestBody = {
        folderPath: testFilesDir,
        config: {
          configPath: global.testUtils.testFiles.config
        },
        options: {
          fileTypes: ['mp4', 'jpg', 'png', 'srt'],
          includeSubdirectories: true
        }
      };

      const response = await request(app)
        .post('/api/v1/media-analyzer')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Monitor task progress
      const progressUpdates = [];
      let attempts = 0;
      while (attempts < 20) {
        const task = taskManager.getTask(taskId);
        progressUpdates.push({
          status: task.status,
          progress: task.progress,
          message: task.message
        });

        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      // Verify progress tracking
      expect(progressUpdates.length).toBeGreaterThan(1);
      expect(progressUpdates[0].progress).toBe(0);
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);

      const finalTask = taskManager.getTask(taskId);
      expect(finalTask.status).toBe(TASK_STATES.COMPLETED);
    });

    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should handle non-existent directory gracefully', async () => {
      const requestBody = {
        folderPath: '/nonexistent/directory/path',
        config: {
          configPath: global.testUtils.testFiles.config
        }
      };

      const response = await request(app)
        .post('/api/v1/media-analyzer')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Wait for task to fail
      let attempts = 0;
      let task;
      while (attempts < 10) {
        task = taskManager.getTask(taskId);
        if (task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      if (realWorkers) {
        expect(task.status).toBe(TASK_STATES.FAILED);
        expect(task.error).toContain('not found');
      } else {
        // Mock workers might not simulate this failure - that's OK for unit testing
        expect([TASK_STATES.FAILED, TASK_STATES.COMPLETED]).toContain(task.status);
      }
    });
  });

  describe('Real File Upload Workflows', () => {
    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should process complete upload workflow', async () => {
      const requestBody = {
        folderPath: testFilesDir,
        config: {
          configPath: global.testUtils.testFiles.config,
          workflow: {
            steps: [
              'analyze',
              'upload-mux',
              'upload-pictures',
              'generate-excel'
            ]
          }
        },
        options: {
          skipExisting: false,
          generateThumbnails: true,
          timeout: 60000
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/single')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Monitor workflow progress
      const workflowSteps = [];
      let attempts = 0;
      while (attempts < 40) { // Extended wait for workflow
        const task = taskManager.getTask(taskId);

        if (task.message && !workflowSteps.includes(task.message)) {
          workflowSteps.push(task.message);
        }

        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      const finalTask = taskManager.getTask(taskId);
      expect(finalTask.status).toBe(TASK_STATES.COMPLETED);

      // Verify workflow progression
      expect(workflowSteps.length).toBeGreaterThan(0);

      if (realWorkers) {
        // With real workers, expect specific workflow messages
        expect(workflowSteps).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/analyz/i),
            expect.stringMatching(/upload/i),
            expect.stringMatching(/process/i)
          ])
        );
      }
    });

    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should handle batch upload with multiple folders', async () => {
      // For this test, we'll create subdirectories if they don't exist
      const batchFolders = [
        testFilesDir,
        testFilesDir, // Same directory twice to test deduplication
        testFilesDir
      ];

      const requestBody = {
        batchFolders,
        config: {
          configPath: global.testUtils.testFiles.config,
          workflow: {
            steps: ['analyze', 'upload-mux']
          }
        },
        options: {
          sequential: true,
          continueOnError: true,
          maxRetries: 2
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/batch')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Wait for batch completion
      let attempts = 0;
      let task;
      while (attempts < 60) { // Extended wait for batch processing
        task = taskManager.getTask(taskId);
        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(1000);
        attempts++;
      }

      expect(task.status).toBe(TASK_STATES.COMPLETED);
      expect(task.progress).toBe(100);

      if (realWorkers) {
        // Verify batch processing results
        expect(task.result).toHaveProperty('foldersProcessed');
        expect(task.result.foldersProcessed).toBeGreaterThan(0);
      }
    });

    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should handle parallel upload with resource constraints', async () => {
      const requestBody = {
        batchFolders: [testFilesDir],
        config: {
          configPath: global.testUtils.testFiles.config,
          workflow: {
            steps: ['analyze']
          }
        },
        options: {
          maxConcurrent: 2,
          resourceLimits: {
            maxMemory: '2GB',
            maxCpu: 50
          },
          timeout: 45000
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/parallel')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Monitor resource usage during processing
      const resourceSnapshots = [];
      let attempts = 0;
      while (attempts < 30) {
        const task = taskManager.getTask(taskId);

        // Capture resource usage if available
        if (task.metadata && task.metadata.resourceUsage) {
          resourceSnapshots.push({
            memory: task.metadata.resourceUsage.memory,
            cpu: task.metadata.resourceUsage.cpu,
            timestamp: Date.now()
          });
        }

        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      const finalTask = taskManager.getTask(taskId);
      expect(finalTask.status).toBe(TASK_STATES.COMPLETED);

      if (realWorkers && resourceSnapshots.length > 0) {
        // Verify resource constraints were respected
        resourceSnapshots.forEach(snapshot => {
          expect(snapshot.cpu).toBeLessThanOrEqual(60); // Allow some buffer
        });
      }
    });
  });

  describe('File-Specific Processing', () => {
    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should process video files with metadata extraction', async () => {
      const videoFile = global.testUtils.testFiles.video;

      try {
        await fs.access(videoFile);
      } catch (error) {
        console.warn(`Video file not accessible, skipping test: ${videoFile}`);
        return;
      }

      const requestBody = {
        folderPath: path.dirname(videoFile),
        config: {
          configPath: global.testUtils.testFiles.config
        },
        options: {
          fileTypes: ['mp4'],
          extractMetadata: true,
          generateThumbnails: true
        }
      };

      const response = await request(app)
        .post('/api/v1/media-analyzer')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Wait for completion
      let attempts = 0;
      let task;
      while (attempts < 20) {
        task = taskManager.getTask(taskId);
        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      expect(task.status).toBe(TASK_STATES.COMPLETED);

      if (realWorkers) {
        // Verify video-specific processing results
        expect(task.result).toHaveProperty('videoFiles');
        expect(task.result.videoFiles).toBeGreaterThan(0);

        if (task.result.metadata) {
          expect(task.result.metadata).toEqual(
            expect.objectContaining({
              duration: expect.any(String),
              resolution: expect.any(String),
              codec: expect.any(String)
            })
          );
        }
      }
    });

    test('should process image files with different formats', async () => {
      const imageFile = global.testUtils.testFiles.image;

      try {
        await fs.access(imageFile);
      } catch (error) {
        console.warn(`Image file not accessible, skipping test: ${imageFile}`);
        return;
      }

      const requestBody = {
        folderPath: path.dirname(imageFile),
        config: {
          configPath: global.testUtils.testFiles.config,
          s3Settings: {
            bucket: 'test-bucket',
            region: 'us-east-1'
          }
        },
        options: {
          imageFormats: ['jpg', 'jpeg', 'png'],
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

      const taskId = response.body.data.taskId;

      // Wait for processing
      let attempts = 0;
      let task;
      while (attempts < 15) {
        task = taskManager.getTask(taskId);
        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      expect(task.status).toBe(TASK_STATES.COMPLETED);

      if (realWorkers) {
        expect(task.result).toHaveProperty('imagesProcessed');
        expect(task.result.imagesProcessed).toBeGreaterThan(0);
      }
    });

    test('should process subtitle files', async () => {
      const subtitleFile = global.testUtils.testFiles.subtitle;

      try {
        await fs.access(subtitleFile);
      } catch (error) {
        console.warn(`Subtitle file not accessible, skipping test: ${subtitleFile}`);
        return;
      }

      const requestBody = {
        folderPath: path.dirname(subtitleFile),
        config: {
          configPath: global.testUtils.testFiles.config,
          subtitleSettings: {
            languages: ['en', 'fr'],
            format: 'srt'
          }
        },
        options: {
          validateSrt: true,
          autoSync: false
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/subtitle')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Monitor subtitle processing
      let attempts = 0;
      let task;
      while (attempts < 10) {
        task = taskManager.getTask(taskId);
        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      expect(task.status).toBe(TASK_STATES.COMPLETED);

      if (realWorkers) {
        expect(task.result).toHaveProperty('subtitlesProcessed');
        expect(task.result.subtitlesProcessed).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should handle corrupted config file', async () => {
      // Create a temporary corrupted config file
      const tempConfigPath = path.join(testFilesDir, 'corrupted-config.ini');

      try {
        await fs.writeFile(tempConfigPath, 'invalid config content [[[');

        const requestBody = {
          folderPath: testFilesDir,
          config: {
            configPath: tempConfigPath
          }
        };

        const response = await request(app)
          .post('/api/v1/media-analyzer')
          .send(requestBody)
          .expect(201);

        const taskId = response.body.data.taskId;

        // Wait for task to handle the error
        let attempts = 0;
        let task;
        while (attempts < 10) {
          task = taskManager.getTask(taskId);
          if (task.status === TASK_STATES.FAILED || task.status === TASK_STATES.COMPLETED) {
            break;
          }
          await global.testUtils.waitFor(500);
          attempts++;
        }

        if (realWorkers) {
          expect(task.status).toBe(TASK_STATES.FAILED);
          expect(task.error).toMatch(/config|invalid|parse/i);
        }

      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tempConfigPath);
        } catch (error) {
          // File might not exist, ignore
        }
      }
    });

    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should handle task cancellation during processing', async () => {
      const requestBody = {
        folderPath: testFilesDir,
        config: {
          configPath: global.testUtils.testFiles.config
        },
        options: {
          timeout: 30000
        }
      };

      const response = await request(app)
        .post('/api/v1/media-analyzer')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Wait for task to start running
      await global.testUtils.waitFor(1000);

      // Cancel the task
      const cancelResponse = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);

      // Wait a bit more and verify cancellation
      await global.testUtils.waitFor(1000);

      const task = taskManager.getTask(taskId);
      expect(task.status).toBe(TASK_STATES.CANCELLED);
    });

    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should handle disk space constraints', async () => {
      // This test simulates low disk space conditions
      const requestBody = {
        folderPath: testFilesDir,
        config: {
          configPath: global.testUtils.testFiles.config
        },
        options: {
          generateThumbnails: true,
          outputPath: '/tmp/test-output', // Might fail if no space
          timeout: 20000
        }
      };

      const response = await request(app)
        .post('/api/v1/uploads/single')
        .send({
          ...requestBody,
          config: {
            ...requestBody.config,
            workflow: { steps: ['analyze'] }
          }
        })
        .expect(201);

      const taskId = response.body.data.taskId;

      // Monitor for disk space related errors
      let attempts = 0;
      let task;
      while (attempts < 20) {
        task = taskManager.getTask(taskId);
        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      // Task should complete or fail gracefully (not crash)
      expect([TASK_STATES.COMPLETED, TASK_STATES.FAILED]).toContain(task.status);

      if (task.status === TASK_STATES.FAILED && realWorkers) {
        // If it failed due to space, error should be descriptive
        expect(task.error).toMatch(/space|disk|write|permission/i);
      }
    });
  });

  describe('Performance with Real Files', () => {
    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should process files within reasonable time limits', async () => {
      const startTime = Date.now();

      const requestBody = {
        folderPath: testFilesDir,
        config: {
          configPath: global.testUtils.testFiles.config
        },
        options: {
          timeout: 30000
        }
      };

      const response = await request(app)
        .post('/api/v1/media-analyzer')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Wait for completion
      let attempts = 0;
      let task;
      while (attempts < 30) {
        task = taskManager.getTask(taskId);
        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(1000);
        attempts++;
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(task.status).toBe(TASK_STATES.COMPLETED);

      if (realWorkers) {
        // Real processing should complete within reasonable time (30 seconds)
        expect(processingTime).toBeLessThan(30000);
        console.log(`File processing completed in ${processingTime}ms`);
      } else {
        // Mock processing should be much faster
        expect(processingTime).toBeLessThan(5000);
      }
    });

    // Skipped: needs local sample files (old kftv-kyool/uploader-test-files path) and targets the #36 server API, needs rewriting
    test.skip('should handle memory usage efficiently', async () => {
      const initialMemory = process.memoryUsage();

      const requestBody = {
        folderPath: testFilesDir,
        config: {
          configPath: global.testUtils.testFiles.config
        },
        options: {
          includeMetadata: true,
          generateThumbnails: true
        }
      };

      const response = await request(app)
        .post('/api/v1/media-analyzer')
        .send(requestBody)
        .expect(201);

      const taskId = response.body.data.taskId;

      // Monitor memory usage during processing
      const memorySnapshots = [initialMemory];
      let attempts = 0;
      while (attempts < 20) {
        const task = taskManager.getTask(taskId);
        memorySnapshots.push(process.memoryUsage());

        if (task.status === TASK_STATES.COMPLETED || task.status === TASK_STATES.FAILED) {
          break;
        }
        await global.testUtils.waitFor(500);
        attempts++;
      }

      // Verify memory doesn't grow excessively
      const maxHeapUsed = Math.max(...memorySnapshots.map(m => m.heapUsed));
      const memoryGrowth = maxHeapUsed - initialMemory.heapUsed;

      // Memory growth should be reasonable (less than 100MB for test files)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
    });
  });
});