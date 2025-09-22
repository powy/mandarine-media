// Dynamic import will be used for the CommonJS main.js
import { ConfigReader } from './config/configReader.js';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);

/**
 * Upload GUI Wrapper
 * Provides functions to launch the GUI from CLI or programmatically
 */

/**
 * Launch the Upload GUI
 * @param {Object} options - Launch options
 * @param {string} options.config - Path to config.ini file (optional)
 * @param {boolean} options.createConfig - Create sample config if missing
 * @returns {Promise<void>}
 */
export async function launchUploadGUI(options = {}) {
  try {
    console.log('🚀 Launching Media Upload GUI...');

    // Determine config path
    let configPath = options.config || path.join(process.cwd(), 'config.ini');

    // Create sample config if requested and file doesn't exist
    if (options.createConfig && !fs.existsSync(configPath)) {
      console.log(`📝 Creating sample configuration at: ${configPath}`);
      ConfigReader.createSampleConfig(configPath);
      console.log('✅ Sample configuration created. Please edit it with your settings.');
      console.log(`📋 Config location: ${configPath}`);
      return;
    }

    // Validate config exists (don't exit - let GUI handle missing config)
    if (!fs.existsSync(configPath)) {
      console.log(`⚠️  Configuration file not found: ${configPath}`);
      console.log('💡 GUI will start and allow you to select a config file.');
      console.log('💡 Or run with --create-config to create a sample configuration file.');
      console.log('   Example: npm run gui -- --create-config');
    }

    // Launch Electron process
    const { spawn } = await import('child_process');
    const electronPath = require('electron');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const mainJsPath = path.join(__dirname, 'main.cjs');

    const electronProcess = spawn(electronPath, [mainJsPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        GUI_CONFIG_PATH: configPath
      }
    });

    console.log(`📋 Using configuration: ${configPath}`);
    console.log('🎉 GUI launched successfully!');

    // Handle process events
    electronProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ GUI process exited with code ${code}`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to launch GUI:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Create sample configuration file
 * @param {string} outputPath - Where to create the config file
 */
export function createSampleConfig(outputPath) {
  ConfigReader.createSampleConfig(outputPath);
  console.log(`✅ Sample configuration created: ${outputPath}`);
}

/**
 * Validate configuration file
 * @param {string} configPath - Path to config file
 * @returns {Object} Validation result
 */
export function validateConfig(configPath) {
  try {
    const config = ConfigReader.readConfig(configPath);
    return {
      valid: true,
      config,
      message: 'Configuration is valid'
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      message: `Configuration validation failed: ${error.message}`
    };
  }
}