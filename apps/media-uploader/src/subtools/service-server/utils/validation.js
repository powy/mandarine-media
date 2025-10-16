/**
 * Input Validation Utilities
 * Validates task parameters and file paths
 */

import fs from 'fs-extra';
import path from 'path';
import { CONFIG } from '../config/constants.js';

/**
 * Validate config file path
 */
export function validateConfigFile(configPath) {
  const errors = [];

  if (!configPath) {
    errors.push('Config file path is required');
    return { valid: false, errors };
  }

  if (!fs.existsSync(configPath)) {
    errors.push('Config file not found');
    return { valid: false, errors };
  }

  const ext = path.extname(configPath).toLowerCase();
  if (!CONFIG.VALIDATION.CONFIG_EXTENSIONS.includes(ext)) {
    errors.push(`Config must be ${CONFIG.VALIDATION.CONFIG_EXTENSIONS.join(' or ')} file`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate folder path
 */
export function validateFolder(folderPath) {
  const errors = [];

  if (!folderPath) {
    errors.push('Folder path is required');
    return { valid: false, errors };
  }

  if (!fs.existsSync(folderPath)) {
    errors.push('Folder does not exist');
    return { valid: false, errors };
  }

  const stats = fs.statSync(folderPath);
  if (!stats.isDirectory()) {
    errors.push('Path must be a directory');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate image file
 */
export function validateImageFile(imagePath, resolutionRequired = false) {
  const errors = [];

  if (!imagePath) {
    errors.push('Image file path is required');
    return { valid: false, errors };
  }

  if (!fs.existsSync(imagePath)) {
    errors.push('Image file not found');
    return { valid: false, errors };
  }

  const ext = path.extname(imagePath).toLowerCase();
  if (!CONFIG.VALIDATION.IMAGE_EXTENSIONS.includes(ext)) {
    errors.push(`Invalid image format. Supported: ${CONFIG.VALIDATION.IMAGE_EXTENSIONS.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate subtitle file
 */
export function validateSubtitleFile(subtitlePath, languageRequired = false) {
  const errors = [];

  if (!subtitlePath) {
    errors.push('Subtitle file path is required');
    return { valid: false, errors };
  }

  if (!fs.existsSync(subtitlePath)) {
    errors.push('Subtitle file not found');
    return { valid: false, errors };
  }

  const ext = path.extname(subtitlePath).toLowerCase();
  if (!CONFIG.VALIDATION.SUBTITLE_EXTENSIONS.includes(ext)) {
    errors.push(`Invalid subtitle format. Supported: ${CONFIG.VALIDATION.SUBTITLE_EXTENSIONS.join(', ')}`);
  }

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
 */
export function validateTaskParameters(taskType, parameters) {
  const errors = [];

  const taskConfig = CONFIG.TASK_TYPES[taskType];
  if (!taskConfig) {
    errors.push(`Unknown task type: ${taskType}`);
    return { valid: false, errors };
  }

  // Check required parameters
  const requiredParams = taskConfig.requiredParams || [];
  for (const param of requiredParams) {
    if (!parameters[param]) {
      errors.push(`Missing required parameter: ${param}`);
    }
  }

  // Validate specific parameters
  if (parameters.config) {
    const configValidation = validateConfigFile(parameters.config);
    if (!configValidation.valid) {
      errors.push(...configValidation.errors);
    }
  }

  if (parameters.folder) {
    const folderValidation = validateFolder(parameters.folder);
    if (!folderValidation.valid) {
      errors.push(...folderValidation.errors);
    }
  }

  if (parameters.parentFolder) {
    const folderValidation = validateFolder(parameters.parentFolder);
    if (!folderValidation.valid) {
      errors.push(...folderValidation.errors.map(e => e.replace('Folder', 'Parent folder')));
    }
  }

  if (parameters.picture) {
    const imageValidation = validateImageFile(parameters.picture);
    if (!imageValidation.valid) {
      errors.push(...imageValidation.errors);
    }

    // Resolution required when picture is provided
    if (parameters.picture && !parameters.resolution) {
      errors.push('Resolution is required when picture is provided');
    }
  }

  if (parameters.resolution) {
    const resolutionValidation = validateResolution(parameters.resolution);
    if (!resolutionValidation.valid) {
      errors.push(...resolutionValidation.errors);
    }
  }

  if (parameters.subtitle) {
    const subtitleValidation = validateSubtitleFile(parameters.subtitle);
    if (!subtitleValidation.valid) {
      errors.push(...subtitleValidation.errors);
    }

    // Language required when subtitle is provided
    if (parameters.subtitle && !parameters.language) {
      errors.push('Language is required when subtitle is provided');
    }
  }

  if (parameters.language) {
    const languageValidation = validateLanguage(parameters.language);
    if (!languageValidation.valid) {
      errors.push(...languageValidation.errors);
    }
  }

  return { valid: errors.length === 0, errors };
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
