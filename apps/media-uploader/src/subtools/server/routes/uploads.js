/**
 * Upload routes
 * Handles all upload-related tasks (mux, picture, single, batch, parallel)
 */

import express from 'express';
import { asyncHandler, ResponseHelper } from '../utils/errorHandler.js';
import { validateRequest, taskRequestSchemas } from '../utils/validation.js';
import { TASK_TYPES } from '../taskManager.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /uploads/mux
 * Start a Mux video upload task
 */
router.post('/mux',
  validateRequest(taskRequestSchemas[TASK_TYPES.MUX_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { videoPath, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.MUX_UPLOAD, {
      videoPath,
      config,
      options
    }, {
      timeout: options.timeout,
      maxRetries: options.retry || 0,
      metadata: {
        chunkSize: options.chunkSize,
        uploadMethod: options.uploadMethod || 'auto',
        validateUpload: options.validateUpload !== false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      videoPath,
      options
    });

    return ResponseHelper.task(res, task, 'Mux upload task started');
  })
);

/**
 * POST /uploads/picture
 * Start a picture upload task
 */
router.post('/picture',
  validateRequest(taskRequestSchemas[TASK_TYPES.PICTURE_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { imagePath, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.PICTURE_UPLOAD, {
      imagePath,
      config,
      options
    }, {
      timeout: options.timeout,
      maxRetries: options.retry || 0,
      metadata: {
        quality: options.quality,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      imagePath,
      options
    });

    return ResponseHelper.task(res, task, 'Picture upload task started');
  })
);

/**
 * POST /uploads/single-picture
 * Start a single picture upload task with format detection and Excel integration
 */
router.post('/single-picture',
  validateRequest(taskRequestSchemas[TASK_TYPES.SINGLE_PICTURE_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { picturePath, folderPath, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.SINGLE_PICTURE_UPLOAD, {
      picturePath,
      folderPath,
      config,
      options
    }, {
      timeout: options.timeout,
      maxRetries: options.retry || 0,
      metadata: {
        detectFormat: true,
        requireExcelId: true,
        supportedFormats: ['1920_1080', '1920_720', '1080_1080', '810_1080', '1080_1920']
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      picturePath,
      folderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Single picture upload task started');
  })
);

/**
 * POST /uploads/batch-picture
 * Start a batch picture upload task that uploads once then associates to all subfolders
 */
router.post('/batch-picture',
  validateRequest(taskRequestSchemas[TASK_TYPES.BATCH_PICTURE_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { picturePath, parentFolderPath, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.BATCH_PICTURE_UPLOAD, {
      picturePath,
      parentFolderPath,
      config,
      options
    }, {
      timeout: options.timeout || 86400000, // 24 hours default for batch operations
      maxRetries: options.retry || 0,
      metadata: {
        detectFormat: true,
        requireExcelId: true,
        supportedFormats: ['1920_1080', '1920_720', '1080_1080', '810_1080', '1080_1920'],
        continueOnError: options.continueOnError !== false,
        pattern: options.pattern || '0_desc'
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      picturePath,
      parentFolderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Batch picture upload task started');
  })
);

/**
 * POST /uploads/subtitle
 * Start a subtitle upload task
 */
router.post('/subtitle',
  validateRequest(taskRequestSchemas[TASK_TYPES.MUX_SUBTITLE_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { subtitlePath, videoId, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.MUX_SUBTITLE_UPLOAD, {
      subtitlePath,
      videoId,
      config,
      options
    }, {
      timeout: options.timeout,
      maxRetries: options.retry || 0,
      metadata: {
        language: options.language
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      subtitlePath,
      videoId,
      options
    });

    return ResponseHelper.task(res, task, 'Subtitle upload task started');
  })
);

/**
 * POST /uploads/subtitle-specific
 * Start a subtitle-specific upload task with language detection and Excel integration
 */
router.post('/subtitle-specific',
  validateRequest(taskRequestSchemas[TASK_TYPES.SUBTITLE_SPECIFIC_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { subtitlePath, mediaDescriptionId, folderPath, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.SUBTITLE_SPECIFIC_UPLOAD, {
      subtitlePath,
      mediaDescriptionId,
      folderPath,
      config,
      options
    }, {
      timeout: options.timeout,
      maxRetries: options.retry || 0,
      metadata: {
        detectedLanguage: options.detectedLanguage,
        languageOverride: options.languageOverride,
        autoDetectLanguage: options.autoDetectLanguage !== false,
        autoLookupMediaId: options.autoLookupMediaId !== false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      subtitlePath,
      mediaDescriptionId,
      folderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Subtitle-specific upload task started');
  })
);

/**
 * POST /uploads/single
 * Start a single folder upload task
 */
router.post('/single',
  validateRequest(taskRequestSchemas[TASK_TYPES.SINGLE_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { folderPath, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.SINGLE_UPLOAD, {
      folderPath,
      config,
      options
    }, {
      timeout: options.timeout,
      maxRetries: options.retry || 0,
      metadata: {
        skipValidation: options.skipValidation || false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      folderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Single upload task started');
  })
);

/**
 * POST /uploads/batch
 * Start a batch upload task (sequential)
 */
router.post('/batch',
  validateRequest(taskRequestSchemas[TASK_TYPES.BATCH_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { parentFolderPath, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.BATCH_UPLOAD, {
      parentFolderPath,
      config,
      options
    }, {
      timeout: options.timeout || 86400000, // 24 hours default for batch operations
      maxRetries: options.retry || 0,
      metadata: {
        skipValidation: options.skipValidation || false,
        continueOnError: options.continueOnError !== false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      parentFolderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Batch upload task started');
  })
);

/**
 * POST /uploads/parallel
 * Start a parallel batch upload task
 */
router.post('/parallel',
  validateRequest(taskRequestSchemas[TASK_TYPES.PARALLEL_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { parentFolderPath, config, options = {} } = req.body;

    const task = taskManager.createTask(TASK_TYPES.PARALLEL_UPLOAD, {
      parentFolderPath,
      config,
      options
    }, {
      timeout: options.timeout,
      maxRetries: options.retry || 0,
      metadata: {
        maxConcurrent: options.maxConcurrent || 5,
        skipValidation: options.skipValidation || false,
        continueOnError: options.continueOnError !== false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      parentFolderPath,
      maxConcurrent: options.maxConcurrent,
      options
    });

    return ResponseHelper.task(res, task, 'Parallel upload task started');
  })
);

/**
 * POST /uploads/validate
 * Validate upload request without starting task
 */
router.post('/validate',
  asyncHandler(async (req, res) => {
    const { type, ...requestData } = req.body;

    if (!type || !Object.values(TASK_TYPES).includes(type)) {
      return ResponseHelper.validationError(res, [
        { field: 'type', message: `Invalid task type. Valid types: ${Object.values(TASK_TYPES).join(', ')}` }
      ]);
    }

    // Validate against the specific schema
    const schema = taskRequestSchemas[type];
    if (!schema) {
      return ResponseHelper.validationError(res, [
        { field: 'type', message: `No validation schema available for task type: ${type}` }
      ]);
    }

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
      type,
      validatedRequest: value
    }, 'Request validation successful');
  })
);

export default router;