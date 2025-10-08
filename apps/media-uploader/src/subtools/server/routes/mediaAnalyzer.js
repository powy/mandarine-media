/**
 * Media Analyzer routes
 * Handles media analysis tasks
 */

import express from 'express';
import { asyncHandler, ResponseHelper } from '../utils/errorHandler.js';
import { validateRequest, taskRequestSchemas } from '../utils/validation.js';
import { TASK_TYPES } from '../taskManager.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /media-analyzer
 * Start a media analysis task
 */
router.post('/',
  validateRequest(taskRequestSchemas[TASK_TYPES.MEDIA_ANALYZER]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { folderPath, config, options = {} } = req.body;

    // Create task
    const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, {
      folderPath,
      config,
      options
    }, {
      timeout: options.timeout,
      metadata: {
        outputFormat: options.outputFormat || 'json',
        includeMetadata: options.includeMetadata !== false,
        associateImages: options.associateImages !== false,
        validateContent: options.validateContent !== false
      }
    });

    // Start worker
    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      folderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Media analysis task started');
  })
);

/**
 * POST /media-analyzer/validate
 * Validate media analyzer request without starting task
 */
router.post('/validate',
  validateRequest(taskRequestSchemas[TASK_TYPES.MEDIA_ANALYZER]),
  asyncHandler(async (req, res) => {
    const { folderPath, config, options = {} } = req.body;

    // Here you could add additional validation logic
    // such as checking if the folder exists, has valid media files, etc.

    return ResponseHelper.success(res, {
      valid: true,
      folderPath,
      config: config || null,
      options,
      estimatedFiles: null // Could be calculated if needed
    }, 'Request validation successful');
  })
);

export default router;