/**
 * Task management routes
 * Handles task listing, status checking, and cancellation
 */

import express from 'express';
import { asyncHandler, ResponseHelper, TaskNotFoundError } from '../utils/errorHandler.js';
import { validateQuery, validateParams, combinedSchemas } from '../utils/validation.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /tasks
 * List all tasks with filtering, pagination, and sorting
 */
router.get('/',
  validateQuery(combinedSchemas.taskListQuery),
  asyncHandler(async (req, res) => {
    const { taskManager } = req;
    const { page, limit, status, type, since, until, sortBy, sortOrder } = req.query;

    // Get all tasks
    let tasks = taskManager.getAllTasks();

    // Apply filters
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }

    if (type) {
      tasks = tasks.filter(task => task.type === type);
    }

    if (since) {
      const sinceDate = new Date(since);
      tasks = tasks.filter(task => new Date(task.createdAt) >= sinceDate);
    }

    if (until) {
      const untilDate = new Date(until);
      tasks = tasks.filter(task => new Date(task.createdAt) <= untilDate);
    }

    // Apply sorting
    tasks.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'createdAt':
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
        case 'updatedAt':
          aVal = new Date(a.updatedAt);
          bVal = new Date(b.updatedAt);
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Apply pagination
    const total = tasks.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    // Prepare response
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };

    logger.info(`Listed ${paginatedTasks.length} tasks`, {
      total,
      page,
      limit,
      filters: { status, type, since, until }
    });

    return ResponseHelper.paginated(res, paginatedTasks, pagination, 'Tasks retrieved successfully');
  })
);

/**
 * GET /tasks/stats
 * Get task statistics
 */
router.get('/stats',
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;

    const taskStats = taskManager.getStatistics();
    const workerStats = workerManager.getWorkerStatistics();

    const stats = {
      tasks: taskStats,
      workers: workerStats,
      timestamp: new Date().toISOString()
    };

    return ResponseHelper.success(res, stats, 'Statistics retrieved successfully');
  })
);

/**
 * GET /tasks/:taskId
 * Get specific task details
 */
router.get('/:taskId',
  validateParams(combinedSchemas.taskParams),
  asyncHandler(async (req, res) => {
    const { taskManager } = req;
    const { taskId } = req.params;

    const task = taskManager.getTask(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    logger.info(`Retrieved task details`, { taskId, status: task.status });

    return ResponseHelper.success(res, task.toJSON(), 'Task retrieved successfully');
  })
);

/**
 * DELETE /tasks/:taskId
 * Cancel a specific task
 */
router.delete('/:taskId',
  validateParams(combinedSchemas.taskParams),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { taskId } = req.params;

    const task = taskManager.getTask(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    if (task.isFinished()) {
      return ResponseHelper.conflict(res, 'Task is already finished and cannot be cancelled');
    }

    // Cancel the task
    const cancelled = await workerManager.cancelTask(taskId, 'Cancelled via API');

    logger.info(`Cancelled task`, { taskId, success: cancelled });

    return ResponseHelper.success(res, {
      taskId,
      cancelled,
      status: task.status
    }, 'Task cancelled successfully');
  })
);

/**
 * DELETE /tasks
 * Cancel all active tasks
 */
router.delete('/',
  asyncHandler(async (req, res) => {
    const { workerManager } = req;

    const results = await workerManager.cancelAllTasks('Bulk cancellation via API');
    const cancelled = results.filter(r => r.cancelled).length;
    const failed = results.filter(r => !r.cancelled).length;

    logger.info(`Bulk task cancellation completed`, {
      total: results.length,
      cancelled,
      failed
    });

    return ResponseHelper.success(res, {
      total: results.length,
      cancelled,
      failed,
      results
    }, `Cancelled ${cancelled} tasks successfully`);
  })
);

/**
 * POST /tasks/:taskId/cancel
 * Alternative endpoint to cancel a task (for better REST semantics)
 */
router.post('/:taskId/cancel',
  validateParams(combinedSchemas.taskParams),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { taskId } = req.params;

    const task = taskManager.getTask(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    if (task.isFinished()) {
      return ResponseHelper.conflict(res, 'Task is already finished and cannot be cancelled');
    }

    const cancelled = await workerManager.cancelTask(taskId, 'Cancelled via API');

    logger.info(`Cancelled task via POST`, { taskId, success: cancelled });

    return ResponseHelper.success(res, {
      taskId,
      cancelled,
      status: task.status
    }, 'Task cancelled successfully');
  })
);

/**
 * POST /tasks/cleanup
 * Clean up finished tasks
 */
router.post('/cleanup',
  asyncHandler(async (req, res) => {
    const { taskManager } = req;

    const clearedCount = taskManager.clearFinishedTasks();

    logger.info(`Cleaned up finished tasks`, { count: clearedCount });

    return ResponseHelper.success(res, {
      cleaned: clearedCount
    }, `Cleaned up ${clearedCount} finished tasks`);
  })
);

/**
 * GET /tasks/active
 * Get all active (pending or running) tasks
 */
router.get('/status/active',
  asyncHandler(async (req, res) => {
    const { taskManager } = req;

    const activeTasks = taskManager.getActiveTasks();

    return ResponseHelper.success(res, activeTasks, `Retrieved ${activeTasks.length} active tasks`);
  })
);

/**
 * GET /tasks/running
 * Get all running tasks
 */
router.get('/status/running',
  asyncHandler(async (req, res) => {
    const { taskManager } = req;

    const runningTasks = taskManager.getRunningTasks();

    return ResponseHelper.success(res, runningTasks, `Retrieved ${runningTasks.length} running tasks`);
  })
);

/**
 * GET /tasks/completed
 * Get all completed tasks
 */
router.get('/status/completed',
  asyncHandler(async (req, res) => {
    const { taskManager } = req;

    const completedTasks = taskManager.getCompletedTasks();

    return ResponseHelper.success(res, completedTasks, `Retrieved ${completedTasks.length} completed tasks`);
  })
);

/**
 * GET /tasks/failed
 * Get all failed tasks
 */
router.get('/status/failed',
  asyncHandler(async (req, res) => {
    const { taskManager } = req;

    const failedTasks = taskManager.getFailedTasks();

    return ResponseHelper.success(res, failedTasks, `Retrieved ${failedTasks.length} failed tasks`);
  })
);

export default router;