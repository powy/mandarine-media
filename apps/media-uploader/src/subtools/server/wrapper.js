#!/usr/bin/env node

/**
 * Server Wrapper Script
 * Provides a simple CLI interface to start the media uploader server
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import MediaUploaderServer from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isDev = args.includes('--dev') || args.includes('-d');
const port = args.find(arg => arg.startsWith('--port='))?.split('=')[1] ||
             process.env.PORT || 3039;
const host = args.find(arg => arg.startsWith('--host='))?.split('=')[1] ||
             process.env.HOST || 'localhost';

// Set environment
if (isDev) {
  process.env.NODE_ENV = 'development';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
}

process.env.PORT = port;
process.env.HOST = host;

// Display help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Media Uploader HTTP Server

Usage:
  node wrapper.js [options]

Options:
  --dev, -d              Run in development mode with debug logging
  --port=<port>          Server port (default: 3039)
  --host=<host>          Server host (default: localhost)
  --help, -h             Show this help message

Environment Variables:
  PORT                   Server port
  HOST                   Server host
  NODE_ENV              Environment (development/production)
  LOG_LEVEL             Log level (error/warn/info/debug)
  LOG_FILE              Enable file logging

Examples:
  node wrapper.js                    # Start server on localhost:3039
  node wrapper.js --dev             # Start in development mode
  node wrapper.js --port=8080       # Start on port 8080
  node wrapper.js --host=0.0.0.0    # Listen on all interfaces

API Documentation:
  GET  /health                       # Health check
  GET  /api/v1/tasks                 # List tasks
  POST /api/v1/media-analyzer        # Start media analysis
  POST /api/v1/uploads/single        # Start single upload
  POST /api/v1/uploads/batch         # Start batch upload
  POST /api/v1/uploads/parallel      # Start parallel upload
  POST /api/v1/excel/prepare         # Start Excel preparation
  POST /api/v1/excel/bulk-edit       # Start Excel bulk edit

For full API documentation, see README.md
  `);
  process.exit(0);
}

// Start the server
console.log(`
🚀 Starting Media Uploader HTTP Server
   Environment: ${process.env.NODE_ENV || 'development'}
   Host: ${host}
   Port: ${port}
   Log Level: ${process.env.LOG_LEVEL || 'info'}
`);

// Create and start server
const server = new MediaUploaderServer();
server.start().catch(error => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

export default server;