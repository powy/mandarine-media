/**
 * Tool Interface Base Class
 * Provides standardized interfaces for all media uploader tools
 */

import { readIniFile, iniToStandardConfig, validateRequiredSections } from '../utils/iniParser.js';
import fs from 'fs-extra';

/**
 * Base class for implementing the three-interface pattern
 */
export class ToolInterface {
  constructor(toolName) {
    this.toolName = toolName;
  }

  /**
   * Core function interface - to be implemented by each tool
   * @param {Object} config - JSON configuration object
   * @returns {Promise<any>} Tool execution result
   */
  async executeCore(config) {
    throw new Error(`executeCore must be implemented by ${this.toolName}`);
  }

  /**
   * INI interface - reads INI file and converts to JSON for core function
   * @param {string} iniFilePath - Path to INI configuration file
   * @param {Object} options - Additional options
   * @returns {Promise<any>} Tool execution result
   */
  async executeFromIni(iniFilePath, options = {}) {
    try {
      // Validate INI file exists
      if (!await fs.pathExists(iniFilePath)) {
        throw new Error(`INI configuration file not found: ${iniFilePath}`);
      }

      // Read and parse INI file
      const iniConfig = await readIniFile(iniFilePath);

      // Convert to standard JSON format
      const jsonConfig = iniToStandardConfig(iniConfig);

      // Validate required sections if specified
      if (options.requiredSections) {
        validateRequiredSections(jsonConfig, options.requiredSections);
      }

      // Merge with additional options
      const finalConfig = {
        ...jsonConfig,
        ...options,
        // Preserve the original INI file path for reference
        _iniFilePath: iniFilePath,
      };

      // Execute core function
      return await this.executeCore(finalConfig);

    } catch (error) {
      throw new Error(`${this.toolName} INI execution failed: ${error.message}`);
    }
  }

  /**
   * CLI interface wrapper - to be implemented by each tool
   * Parses CLI arguments and converts to JSON for core function
   * @param {Object} cliOptions - Parsed CLI options
   * @returns {Promise<any>} Tool execution result
   */
  async executeFromCli(cliOptions) {
    throw new Error(`executeFromCli must be implemented by ${this.toolName}`);
  }

  /**
   * Utility method to convert CLI options to core config format
   * @param {Object} cliOptions - Raw CLI options
   * @param {Object} mappings - Mapping of CLI keys to config keys
   * @returns {Object} Converted configuration
   */
  static mapCliToConfig(cliOptions, mappings = {}) {
    const config = {};

    // Apply direct mappings
    for (const [cliKey, configPath] of Object.entries(mappings)) {
      if (cliOptions[cliKey] !== undefined) {
        setNestedValue(config, configPath, cliOptions[cliKey]);
      }
    }

    // Handle common CLI options
    if (cliOptions.verbose !== undefined) {
      config.verbose = cliOptions.verbose;
    }

    if (cliOptions.debug !== undefined) {
      config.debug = cliOptions.debug;
    }

    if (cliOptions.dryRun !== undefined) {
      config.dryRun = cliOptions.dryRun;
    }

    return config;
  }

  /**
   * Utility method to load JSON config file (for backward compatibility)
   * @param {string} configPath - Path to JSON config file
   * @returns {Promise<Object>} Loaded configuration
   */
  static async loadJsonConfig(configPath) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load JSON config from ${configPath}: ${error.message}`);
    }
  }

  /**
   * Utility method to validate configuration has required properties
   * @param {Object} config - Configuration to validate
   * @param {Array<string>} requiredProps - Required property paths (dot notation)
   * @throws {Error} If required properties are missing
   */
  static validateRequiredProps(config, requiredProps = []) {
    const missing = [];

    for (const prop of requiredProps) {
      if (getNestedValue(config, prop) === undefined) {
        missing.push(prop);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required configuration properties: ${missing.join(', ')}`);
    }
  }
}

/**
 * Set nested value in object using dot notation
 * @param {Object} obj - Target object
 * @param {string} path - Dot notation path (e.g., 'backend.baseUrl')
 * @param {any} value - Value to set
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Source object
 * @param {string} path - Dot notation path (e.g., 'backend.baseUrl')
 * @returns {any} Value at path, or undefined if not found
 */
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Factory function to create a tool with all three interfaces
 * @param {string} toolName - Name of the tool
 * @param {Function} coreFunction - Core function implementation
 * @param {Object} options - Configuration options
 * @returns {Object} Object with all three interface methods
 */
export function createToolInterface(toolName, coreFunction, options = {}) {
  const tool = new ToolInterface(toolName);

  // Override the core function
  tool.executeCore = coreFunction;

  // Create CLI wrapper if mapping provided
  if (options.cliMapping) {
    tool.executeFromCli = async function(cliOptions) {
      try {
        // Load JSON config if provided via CLI
        let baseConfig = {};
        if (cliOptions.config) {
          baseConfig = await ToolInterface.loadJsonConfig(cliOptions.config);
        }

        // Map CLI options to config format
        const cliConfig = ToolInterface.mapCliToConfig(cliOptions, options.cliMapping);

        // Merge configurations (CLI options override file config)
        const finalConfig = { ...baseConfig, ...cliConfig };

        // Validate required properties
        if (options.requiredProps) {
          ToolInterface.validateRequiredProps(finalConfig, options.requiredProps);
        }

        return await coreFunction(finalConfig);
      } catch (error) {
        throw new Error(`${toolName} CLI execution failed: ${error.message}`);
      }
    };
  }

  return {
    // Core interface
    core: tool.executeCore.bind(tool),

    // INI interface
    fromIni: tool.executeFromIni.bind(tool),

    // CLI interface
    fromCli: tool.executeFromCli.bind(tool),

    // Tool instance for advanced usage
    _instance: tool,
  };
}