/**
 * Excel routes
 * Handles Excel preparation and bulk editing tasks
 */

import express from 'express';
import { asyncHandler, ResponseHelper } from '../utils/errorHandler.js';
import { validateRequest, taskRequestSchemas } from '../utils/validation.js';
import { TASK_TYPES } from '../taskManager.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /excel/prepare
 * Start an Excel preparation task
 */
router.post('/prepare',
  validateRequest(taskRequestSchemas[TASK_TYPES.EXCEL_PREPARATION]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { folderPath, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.EXCEL_PREPARATION, {
      folderPath,
      config,
      options
    }, {
      timeout: options.timeout,
      metadata: {
        prepareOnly: options.prepareOnly !== false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      folderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Excel preparation task started');
  })
);

/**
 * POST /excel/bulk-edit
 * Start an Excel bulk edit task
 */
router.post('/bulk-edit',
  validateRequest(taskRequestSchemas[TASK_TYPES.EXCEL_BULK_EDIT]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { folderPath, fieldName, fieldValue, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.EXCEL_BULK_EDIT, {
      folderPath,
      fieldName,
      fieldValue,
      config,
      options
    }, {
      timeout: options.timeout,
      metadata: {
        dryRun: options.dryRun || false,
        pattern: options.pattern || '0_desc',
        backup: options.backup !== false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      folderPath,
      fieldName,
      fieldValue,
      dryRun: options.dryRun,
      options
    });

    return ResponseHelper.task(res, task, 'Excel bulk edit task started');
  })
);

/**
 * POST /excel/validate
 * Validate Excel request without starting task
 */
router.post('/validate',
  asyncHandler(async (req, res) => {
    const { operation, ...requestData } = req.body;

    let taskType;
    switch (operation) {
      case 'prepare':
        taskType = TASK_TYPES.EXCEL_PREPARATION;
        break;
      case 'bulk-edit':
        taskType = TASK_TYPES.EXCEL_BULK_EDIT;
        break;
      default:
        return ResponseHelper.validationError(res, [
          { field: 'operation', message: 'Invalid operation. Valid operations: prepare, bulk-edit' }
        ]);
    }

    const schema = taskRequestSchemas[taskType];
    const { error, value } = schema.validate(requestData);

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return ResponseHelper.validationError(res, details);
    }

    return ResponseHelper.success(res, {
      valid: true,
      operation,
      taskType,
      validatedRequest: value
    }, 'Excel request validation successful');
  })
);

/**
 * POST /excel/media-info
 * Get media description info from Excel file for subtitle processing
 */
router.post('/media-info',
  asyncHandler(async (req, res) => {
    const { folderPath } = req.body;

    if (!folderPath) {
      return ResponseHelper.validationError(res, [
        { field: 'folderPath', message: 'Folder path is required' }
      ]);
    }

    try {
      // Import ExcelService dynamically to avoid circular dependencies
      const { ExcelService } = await import('../../../one-media-complete-upload/services/excelService.js');

      // Create ExcelService instance
      const excelService = new ExcelService(folderPath, logger);

      // Get media description info
      const mediaInfo = await excelService.getMediaDescriptionInfo();

      return ResponseHelper.success(res, mediaInfo, 'Media description info retrieved successfully');

    } catch (error) {
      logger.error('Error getting media description info', {
        folderPath,
        error: error.message,
        stack: error.stack
      });

      return ResponseHelper.error(res, `Failed to get media description info: ${error.message}`, 500);
    }
  })
);

export default router;