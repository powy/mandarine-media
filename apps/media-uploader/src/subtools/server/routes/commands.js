/**
 * Commands routes - Frontend-friendly API wrapper
 * Maps frontend command names to existing server endpoints
 */

import express from 'express';
import { asyncHandler, ResponseHelper } from '../utils/errorHandler.js';
import { validateRequest, taskRequestSchemas } from '../utils/validation.js';
import { TASK_TYPES } from '../taskManager.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /commands/excel-prepare
 * Excel preparation task
 */
router.post('/excel-prepare',
  validateRequest(taskRequestSchemas[TASK_TYPES.EXCEL_PREPARATION]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { folderPath, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.EXCEL_PREPARATION, {
      folderPath,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 43200000, // 12 hours default
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
 * POST /commands/batch-excel-prepare
 * Batch Excel preparation task (for multiple subfolders)
 */
router.post('/batch-excel-prepare',
  validateRequest(taskRequestSchemas[TASK_TYPES.BATCH_EXCEL_PREPARATION]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { parentFolderPath, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.BATCH_EXCEL_PREPARATION, {
      parentFolderPath,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 86400000, // 24 hours default for batch operations
      metadata: {
        prepareOnly: options.prepareOnly !== false,
        continueOnError: options.continueOnError !== false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      parentFolderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Batch Excel preparation task started');
  })
);

/**
 * POST /commands/single-upload
 * Single folder upload task
 */
router.post('/single-upload',
  validateRequest(taskRequestSchemas[TASK_TYPES.SINGLE_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { folderPath, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.SINGLE_UPLOAD, {
      folderPath,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 43200000, // 12 hours default
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
 * POST /commands/batch-upload
 * Batch upload task (sequential)
 */
router.post('/batch-upload',
  validateRequest(taskRequestSchemas[TASK_TYPES.BATCH_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { parentFolderPath, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.BATCH_UPLOAD, {
      parentFolderPath,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 86400000, // 24 hours default for batch operations
      maxRetries: options.retry || 0,
      metadata: {
        skipValidation: options.skipValidation || false,
        maxConcurrency: options.maxConcurrency || 1000
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
 * POST /commands/parallel-upload
 * Parallel batch upload task
 */
router.post('/parallel-upload',
  validateRequest(taskRequestSchemas[TASK_TYPES.PARALLEL_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { parentFolderPath, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.PARALLEL_UPLOAD, {
      parentFolderPath,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 86400000, // 24 hours default for batch operations
      maxRetries: options.retry || 0,
      metadata: {
        maxConcurrency: options.maxConcurrency || 10,
        skipValidation: options.skipValidation || false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      parentFolderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Parallel upload task started');
  })
);

/**
 * POST /commands/excel-bulk-edit
 * Excel bulk edit task
 */
router.post('/excel-bulk-edit',
  validateRequest(taskRequestSchemas[TASK_TYPES.EXCEL_BULK_EDIT]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { folderPath, fieldName, fieldValue, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.EXCEL_BULK_EDIT, {
      folderPath,
      fieldName,
      fieldValue,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 43200000, // 12 hours default
      metadata: {
        dryRun: options.dryRun !== false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      folderPath,
      fieldName,
      fieldValue,
      options
    });

    return ResponseHelper.task(res, task, 'Excel bulk edit task started');
  })
);

/**
 * POST /commands/media-analyzer
 * Media analyzer task
 */
router.post('/media-analyzer',
  validateRequest(taskRequestSchemas[TASK_TYPES.MEDIA_ANALYZER]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { folderPath, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.MEDIA_ANALYZER, {
      folderPath,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 43200000, // 12 hours default
      metadata: {
        outputFormat: options.outputFormat || 'json',
        includeMetadata: options.includeMetadata !== false,
        associateImages: options.associateImages !== false,
        validateContent: options.validateContent !== false
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      folderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Media analyzer task started');
  })
);

/**
 * POST /commands/mux-upload
 * Mux upload task
 */
router.post('/mux-upload',
  validateRequest(taskRequestSchemas[TASK_TYPES.MUX_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { videoPath, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.MUX_UPLOAD, {
      videoPath,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 43200000, // 12 hours default
      maxRetries: options.retry || 0,
      metadata: {
        chunkSize: options.chunkSize || 10,
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
 * POST /commands/picture-upload
 * Picture upload task
 */
router.post('/picture-upload',
  validateRequest(taskRequestSchemas[TASK_TYPES.PICTURE_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { imagePath, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.PICTURE_UPLOAD, {
      imagePath,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 43200000, // 12 hours default
      maxRetries: options.retry || 0,
      metadata: {
        quality: options.quality || 0.9,
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
 * POST /commands/subtitle-upload
 * Subtitle upload task (maps to SUBTITLE_SPECIFIC_UPLOAD)
 */
router.post('/subtitle-upload',
  validateRequest(taskRequestSchemas[TASK_TYPES.SUBTITLE_SPECIFIC_UPLOAD]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { subtitlePath, mediaDescriptionId, folderPath, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.SUBTITLE_SPECIFIC_UPLOAD, {
      subtitlePath,
      mediaDescriptionId,
      folderPath,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 43200000, // 12 hours default
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
      folderPath,
      options
    });

    return ResponseHelper.task(res, task, 'Subtitle upload task started');
  })
);

/**
 * POST /commands/propagate-season-data
 * Propagate data from season to all its episodes
 */
router.post('/propagate-season-data',
  validateRequest(taskRequestSchemas[TASK_TYPES.PROPAGATE_SEASON_DATA]),
  asyncHandler(async (req, res) => {
    const { taskManager, workerManager } = req;
    const { seasonId, config, configPath, options = {} } = req.body;

    // Normalize config structure - accept either nested config object or direct configPath
    // The worker expects: { config: { configPath: "..." } }
    const normalizedConfig = config || (configPath ? { configPath } : undefined);

    const task = taskManager.createTask(TASK_TYPES.PROPAGATE_SEASON_DATA, {
      seasonId,
      config: normalizedConfig,
      options
    }, {
      timeout: options.timeout || 300000, // 5 minutes default
      metadata: {
        verbose: options.verbose || false,
        dryRun: false // Always false - no dry-run option in UI
      }
    });

    await workerManager.startTask(task.id);

    logger.logTaskEvent('created', task.id, {
      type: task.type,
      seasonId,
      options
    });

    return ResponseHelper.task(res, task, 'Propagate season data task started');
  })
);

export default router;