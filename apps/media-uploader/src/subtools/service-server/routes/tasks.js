/**
 * Task Management Routes
 */

import express from 'express';
import logger from '../utils/logger.js';
import { validateTaskParameters } from '../utils/validation.js';
import { CONFIG } from '../config/constants.js';

const router = express.Router();

/**
 * Initialize routes with TaskManager instance
 */
export function createTaskRoutes(taskManager) {
  /**
   * POST /api/task/create - Create a new task
   */
  router.post('/create', async (req, res) => {
    try {
      const { type, parameters } = req.body;

      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Task type is required'
        });
      }

      if (!parameters || typeof parameters !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Parameters object is required'
        });
      }

      // Validate task type
      if (!CONFIG.TASK_TYPES[type]) {
        return res.status(400).json({
          success: false,
          error: `Unknown task type: ${type}`
        });
      }

      // Validate parameters
      const validation = validateTaskParameters(type, parameters);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validation.errors
        });
      }

      // Create task
      const task = await taskManager.createTask(type, parameters);

      logger.info(`Task created via API`, { taskId: task.id, type });

      res.status(201).json({
        success: true,
        task
      });

    } catch (error) {
      logger.error('Failed to create task', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/task/list - List all tasks
   */
  router.get('/list', async (req, res) => {
    try {
      const { status, type, limit } = req.query;

      const filters = {};
      if (status) {
        // Handle comma-separated statuses
        filters.status = status.includes(',') ? status.split(',') : status;
      }
      if (type) {
        filters.type = type;
      }
      if (limit) {
        filters.limit = parseInt(limit);
      }

      const tasks = await taskManager.listTasks(filters);

      res.json({
        success: true,
        tasks,
        count: tasks.length
      });

    } catch (error) {
      logger.error('Failed to list tasks', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/task/:id/status - Get specific task status
   */
  router.get('/:id/status', (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid task ID'
        });
      }

      const task = taskManager.getTaskStatus(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      res.json({
        success: true,
        task
      });

    } catch (error) {
      logger.error('Failed to get task status', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/task/:id/log - Get task log content
   */
  router.get('/:id/log', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid task ID'
        });
      }

      const offset = parseInt(req.query.offset) || 0;

      const logData = await taskManager.getTaskLog(taskId, offset);

      res.json({
        success: true,
        ...logData
      });

    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      logger.error('Failed to get task log', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/task/:id - Cancel/stop a task
   */
  router.delete('/:id', (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid task ID'
        });
      }

      const task = taskManager.getTaskStatus(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Check if task is already finished
      const finishedStatuses = ['success', 'failed', 'canceled', 'partial'];
      if (finishedStatuses.includes(task.status)) {
        return res.json({
          success: true,
          message: 'Task already finished',
          task
        });
      }

      const stopped = taskManager.stopTask(taskId);

      if (stopped) {
        logger.info(`Task ${taskId} stopped via API`);
        const updatedTask = taskManager.getTaskStatus(taskId);
        res.json({
          success: true,
          message: 'Task stopped',
          task: updatedTask
        });
      } else {
        res.json({
          success: false,
          error: 'Task is not running'
        });
      }

    } catch (error) {
      logger.error('Failed to stop task', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/task/stats - Get task statistics
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = taskManager.db.getTaskStats();

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      logger.error('Failed to get task stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

export default createTaskRoutes;
