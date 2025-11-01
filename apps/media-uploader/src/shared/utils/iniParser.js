/**
 * INI Parser Utility
 * Converts INI configuration files to JSON objects for use with core functions
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Sanitize file path by removing invisible Unicode characters
 * @param {string} filePath - Path to sanitize
 * @returns {string} Cleaned path
 */
function sanitizePath(filePath) {
  if (!filePath) return filePath;

  return filePath
    .trim()  // Remove leading/trailing whitespace
    .normalize('NFC')  // Normalize Unicode to composed form
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u206F\uFEFF]/g, '');  // Remove all Unicode control characters
}

/**
 * Parse INI file content into a structured object
 * @param {string} iniContent - Raw INI file content
 * @returns {Object} Parsed configuration object
 */
export function parseIniContent(iniContent) {
  const config = {};
  const lines = iniContent.split('\n');
  let currentSection = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
      continue;
    }

    // Check for section headers
    const sectionMatch = trimmedLine.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!config[currentSection]) {
        config[currentSection] = {};
      }
      continue;
    }

    // Parse key-value pairs
    const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim();
      const value = keyValueMatch[2].trim();

      const target = currentSection ? config[currentSection] : config;
      target[key] = parseValue(value);
    }
  }

  return config;
}

/**
 * Parse a value string into appropriate JavaScript type
 * @param {string} value - Raw value from INI file
 * @returns {any} Parsed value (string, number, boolean, or array)
 */
function parseValue(value) {
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  // Handle boolean values
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  // Handle numbers
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

  // Handle arrays (comma-separated values)
  if (value.includes(',')) {
    return value.split(',').map(item => parseValue(item.trim()));
  }

  // Return as string
  return value;
}

/**
 * Read and parse INI file
 * @param {string} filePath - Path to INI file
 * @returns {Promise<Object>} Parsed configuration object
 */
export async function readIniFile(filePath) {
  try {
    const cleanPath = sanitizePath(filePath);
    const content = await fs.readFile(cleanPath, 'utf-8');
    return parseIniContent(content);
  } catch (error) {
    throw new Error(`Failed to read INI file at ${filePath}: ${error.message}`);
  }
}

/**
 * Convert INI configuration to standardized JSON format for media tools
 * @param {Object} iniConfig - Parsed INI configuration
 * @returns {Object} Standardized JSON configuration
 */
export function iniToStandardConfig(iniConfig) {
  const standardConfig = {
    // General settings
    verbose: iniConfig.general?.verbose || false,
    maxConcurrentUploads: iniConfig.general?.maxConcurrentUploads || iniConfig.parallel?.maxConcurrentUploads || 1000,
    retryAttempts: iniConfig.general?.retryAttempts || iniConfig.parallel?.retryAttempts || 3,
    retryDelay: iniConfig.general?.retryDelay || iniConfig.parallel?.retryDelay || 5000,

    // Process management
    process: {
      workerTimeout: iniConfig.process?.workerTimeout || 43200000,
      heartbeatInterval: iniConfig.process?.heartbeatInterval || 5000,
      cleanupAge: iniConfig.process?.cleanupAge || 86400000,
    },

    // Backend API configuration
    backend: {
      baseUrl: iniConfig.backend?.baseUrl,
      username: iniConfig.backend?.username != null ? String(iniConfig.backend.username) : undefined,
      password: iniConfig.backend?.password != null ? String(iniConfig.backend.password) : undefined,
    },

    // Mux configuration
    mux: {
      tokenId: iniConfig.mux?.tokenId,
      tokenSecret: iniConfig.mux?.tokenSecret,
    },

    // DRM configuration (optional)
    drm: {
      configurationId: iniConfig.drm?.configurationId,
    },

    // S3 configuration
    s3: {
      accessKeyId: iniConfig.s3?.accessKeyId,
      secretAccessKey: iniConfig.s3?.secretAccessKey,
      region: iniConfig.s3?.region || 'us-east-1',
      pictures: {
        bucket: iniConfig['s3.pictures']?.bucket,
        keyPrefix: iniConfig['s3.pictures']?.keyPrefix || 'pictures/',
      },
      subtitles: {
        bucket: iniConfig['s3.subtitles']?.bucket,
        keyPrefix: iniConfig['s3.subtitles']?.keyPrefix || 'subtitles/',
      },
    },

    // Logging configuration
    logging: {
      enabled: iniConfig.logging?.enabled !== false,
      level: iniConfig.logging?.level || 'info',
      file: iniConfig.logging?.file,
      console: iniConfig.logging?.console !== false,
    },

    // Parallel processing configuration
    parallel: {
      enabled: iniConfig.parallel?.enabled !== false,
      maxConcurrentUploads: iniConfig.parallel?.maxConcurrentUploads || 10,
      retryAttempts: iniConfig.parallel?.retryAttempts || 3,
      retryDelay: iniConfig.parallel?.retryDelay || 5000,
    }
  };

  // Remove undefined values to keep config clean
  return removeUndefinedValues(standardConfig);
}

/**
 * Recursively remove undefined values from an object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
function removeUndefinedValues(obj) {
  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Keep undefined values for validation - let schema validation catch them
      cleaned[key] = undefined;
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const cleanedNested = removeUndefinedValues(value);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Validate that required configuration sections are present
 * @param {Object} config - Configuration object to validate
 * @param {Array<string>} requiredSections - List of required section names
 * @throws {Error} If required sections are missing
 */
export function validateRequiredSections(config, requiredSections = []) {
  const missing = [];

  for (const section of requiredSections) {
    const keys = section.split('.');
    let current = config;

    for (const key of keys) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        missing.push(section);
        break;
      }
      current = current[key];
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required configuration sections: ${missing.join(', ')}`);
  }
}
