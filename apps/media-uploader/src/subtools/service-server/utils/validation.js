/**
 * Input Validation Utilities
 * Validates task parameters and file paths
 */

import fs from 'fs-extra';
import path from 'path';
import { CONFIG } from '../config/constants.js';

/**
 * Validate config file path
 * NOTE: Only validates format/extension, not file existence.
 * File existence is validated by workers at execution time for better error logging.
 */
export function validateConfigFile(configPath) {
  const errors = [];

  if (!configPath) {
    errors.push('Config file path is required');
    return { valid: false, errors };
  }

  // Validate extension only (file existence checked by worker)
  const ext = path.extname(configPath).toLowerCase();
  if (!CONFIG.VALIDATION.CONFIG_EXTENSIONS.includes(ext)) {
    errors.push(`Config must be ${CONFIG.VALIDATION.CONFIG_EXTENSIONS.join(' or ')} file`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate folder path
 * NOTE: Only validates that path is provided, not that it exists.
 * Folder existence is validated by workers at execution time for better error logging.
 */
export function validateFolder(folderPath) {
  const errors = [];

  if (!folderPath) {
    errors.push('Folder path is required');
    return { valid: false, errors };
  }

  // Folder existence and type checked by worker
  return { valid: errors.length === 0, errors };
}

/**
 * Validate image file
 * NOTE: Only validates format/extension, not file existence.
 * File existence is validated by workers at execution time for better error logging.
 */
export function validateImageFile(imagePath, resolutionRequired = false) {
  const errors = [];

  if (!imagePath) {
    errors.push('Image file path is required');
    return { valid: false, errors };
  }

  // Validate extension only (file existence checked by worker)
  const ext = path.extname(imagePath).toLowerCase();
  if (!CONFIG.VALIDATION.IMAGE_EXTENSIONS.includes(ext)) {
    errors.push(`Invalid image format. Supported: ${CONFIG.VALIDATION.IMAGE_EXTENSIONS.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate subtitle file
 * NOTE: Only validates that path is provided, not format or existence.
 * File format and existence are validated by workers at execution time for better error logging.
 */
export function validateSubtitleFile(subtitlePath, languageRequired = false) {
  const errors = [];

  if (!subtitlePath) {
    errors.push('Subtitle file path is required');
    return { valid: false, errors };
  }

  // Extension and file existence checked by worker
  return { valid: errors.length === 0, errors };
}

/**
 * Validate resolution
 */
export function validateResolution(resolution) {
  const errors = [];

  if (!resolution) {
    errors.push('Resolution is required');
    return { valid: false, errors };
  }

  if (!CONFIG.RESOLUTIONS[resolution]) {
    errors.push(`Invalid resolution. Must be one of: ${Object.keys(CONFIG.RESOLUTIONS).join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate language
 */
export function validateLanguage(language) {
  const errors = [];

  if (!language) {
    errors.push('Language is required');
    return { valid: false, errors };
  }

  if (!CONFIG.LANGUAGES[language]) {
    errors.push(`Invalid language. Must be one of: ${Object.keys(CONFIG.LANGUAGES).join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate task parameters based on task type
 *
 * NOTE: API validation is MINIMAL - only checks task type exists.
 * ALL business logic validation (required params, file existence, formats, etc.)
 * happens in WORKERS for better error logging and task tracking.
 *
 * This ensures tasks are always created, even with invalid inputs,
 * so users can see detailed error logs in the task viewer.
 */
export function validateTaskParameters(taskType, parameters) {
  const errors = [];

  const taskConfig = CONFIG.TASK_TYPES[taskType];
  if (!taskConfig) {
    errors.push(`Unknown task type: ${taskType}`);
    return { valid: false, errors };
  }

  // All other validation happens in workers
  // Workers validate:
  // - Required parameters
  // - File existence
  // - File formats/extensions
  // - Cross-field dependencies
  // - Business logic
  //
  // This allows tasks to be created immediately and fail gracefully
  // with detailed error logs that users can view in the task viewer.

  return { valid: true, errors: [] };
}

export default {
  validateConfigFile,
  validateFolder,
  validateImageFile,
  validateSubtitleFile,
  validateResolution,
  validateLanguage,
  validateTaskParameters
};
