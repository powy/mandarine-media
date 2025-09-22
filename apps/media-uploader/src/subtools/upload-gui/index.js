#!/usr/bin/env node

/**
 * Upload GUI Entry Point
 * Can be run directly or imported by other modules
 */

import { launchUploadGUI } from './wrapper.js';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--config' || arg === '-c') {
      options.config = args[i + 1];
      i++; // Skip next argument
    } else if (arg === '--create-config') {
      options.createConfig = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
📦 Media Upload GUI

Usage: node index.js [options]

Options:
  -c, --config <path>     Path to configuration file (default: ./config.ini)
  --create-config         Create a sample configuration file and exit
  -v, --verbose           Enable verbose output
  -h, --help             Show this help message

Examples:
  node index.js                              # Launch GUI with default config
  node index.js -c /path/to/config.ini      # Launch GUI with custom config
  node index.js --create-config             # Create sample config file
  node index.js -c custom.ini --create-config  # Create sample config at custom location

Configuration:
  The GUI reads settings from a .ini file. If no config is found, you'll be prompted
  to create one. The config file contains your API credentials and settings.

  Required settings:
  - Backend API credentials
  - Mux video service credentials
  - S3 storage credentials

  Run with --create-config to generate a template with all required fields.
`);
}

// Main function
async function main() {
  const options = parseArguments();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    await launchUploadGUI(options);
  } catch (error) {
    console.error('❌ Failed to start GUI:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Only run main if this file is executed directly (not imported)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error.message);
    process.exit(1);
  });
}

// Export functions for programmatic use
export { launchUploadGUI } from './wrapper.js';
export { ConfigReader } from './config/configReader.js';
export { UploadService } from './services/uploadService.js';