#!/usr/bin/env node

/**
 * Install Kyool Media Uploader Windows Services
 * Uses node-windows for reliable service management with proper logging
 */

import { Service } from 'node-windows';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================');
console.log('Kyool Media Uploader - Service Installer');
console.log('========================================\n');

// Check for admin privileges
if (process.platform === 'win32') {
  const { exec } = await import('child_process');
  exec('net session', (err) => {
    if (err) {
      console.error('ERROR: This script requires Administrator privileges.');
      console.error('Please run PowerShell or Command Prompt as Administrator and try again.\n');
      process.exit(1);
    }
  });
}

// Paths - using source code with node
const NODE_EXE = 'node'; // node must be in PATH
const SERVER_SCRIPT = path.join(__dirname, 'src', 'subtools', 'service-server', 'server.js');
const UI_SCRIPT = path.join(__dirname, 'src', 'subtools', 'service-interface', 'serve.js');

// Verify source files exist
if (!fs.existsSync(SERVER_SCRIPT)) {
  console.error(`ERROR: Server source not found at: ${SERVER_SCRIPT}`);
  console.error('Please ensure source code is extracted properly.\n');
  process.exit(1);
}

if (!fs.existsSync(UI_SCRIPT)) {
  console.error(`ERROR: UI source not found at: ${UI_SCRIPT}`);
  console.error('Please ensure source code is extracted properly.\n');
  process.exit(1);
}

// Check if node_modules exists
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.error('ERROR: node_modules not found');
  console.error('Please run "npm install" first.\n');
  process.exit(1);
}

console.log('✓ Source files found');
console.log(`  Server: ${SERVER_SCRIPT}`);
console.log(`  UI: ${UI_SCRIPT}\n`);

// Configure server service
const serverService = new Service({
  name: 'KyoolMediaServer',
  description: 'Kyool Media Uploader - Backend task manager (Port 3011)',
  script: SERVER_SCRIPT,
  scriptOptions: '',
  nodeOptions: [],
  workingDirectory: __dirname,
  allowServiceLogon: true,
  env: [{
    name: 'KYOOL_USE_APPDATA',
    value: 'true'
  }]
});

// Configure UI service
const uiService = new Service({
  name: 'KyoolMediaUI',
  description: 'Kyool Media Uploader - Web Interface (Port 3010)',
  script: UI_SCRIPT,
  scriptOptions: '',
  nodeOptions: [],
  workingDirectory: __dirname,
  allowServiceLogon: true,
  dependencies: ['KyoolMediaServer'], // UI depends on server
  env: [{
    name: 'KYOOL_USE_APPDATA',
    value: 'true'
  }]
});

let serverInstalled = false;
let uiInstalled = false;

// Install server service
console.log('[1/2] Installing KyoolMediaServer service...');

serverService.on('install', function() {
  console.log('✓ KyoolMediaServer installed successfully');
  console.log(`  Logs: ${path.join(__dirname, 'daemon', 'KyoolMediaServer.out.log')}`);
  console.log(`  Errors: ${path.join(__dirname, 'daemon', 'KyoolMediaServer.err.log')}`);

  serverInstalled = true;

  // Start server service
  console.log('  Starting service...');
  serverService.start();
});

serverService.on('start', function() {
  console.log('✓ KyoolMediaServer started\n');

  // Install UI service after server is started
  if (!uiInstalled) {
    console.log('[2/2] Installing KyoolMediaUI service...');
    uiService.install();
  }
});

serverService.on('alreadyinstalled', function() {
  console.log('⚠ KyoolMediaServer is already installed');
  console.log('  Use uninstall-services.js first to remove existing service\n');
  process.exit(1);
});

serverService.on('error', function(err) {
  console.error('✗ Error installing KyoolMediaServer:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Install UI service
uiService.on('install', function() {
  console.log('✓ KyoolMediaUI installed successfully');
  console.log(`  Logs: ${path.join(__dirname, 'daemon', 'KyoolMediaUI.out.log')}`);
  console.log(`  Errors: ${path.join(__dirname, 'daemon', 'KyoolMediaUI.err.log')}`);

  uiInstalled = true;

  // Start UI service
  console.log('  Starting service...');
  uiService.start();
});

uiService.on('start', function() {
  console.log('✓ KyoolMediaUI started\n');

  console.log('========================================');
  console.log('Installation Complete!');
  console.log('========================================\n');
  console.log('Services installed and started:');
  console.log('  • KyoolMediaServer (Port 3011)');
  console.log('  • KyoolMediaUI (Port 3010)\n');
  console.log('Access the UI at: http://localhost:3010\n');
  console.log('Service logs are in: ' + path.join(__dirname, 'daemon') + '\n');
  console.log('To manage services:');
  console.log('  • Windows Services: services.msc');
  console.log('  • Uninstall: node uninstall-services.js');
  console.log('  • Stop: node stop-services.js');
  console.log('  • Start: node start-services.js\n');

  process.exit(0);
});

uiService.on('alreadyinstalled', function() {
  console.log('⚠ KyoolMediaUI is already installed');
  console.log('  Use uninstall-services.js first to remove existing service\n');
  process.exit(1);
});

uiService.on('error', function(err) {
  console.error('✗ Error installing KyoolMediaUI:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Start installation
console.log('Installing services (this may take a few seconds)...\n');
serverService.install();

// Timeout safety
setTimeout(() => {
  if (!serverInstalled || !uiInstalled) {
    console.error('\n✗ Installation timeout - services may not have installed correctly');
    console.error('Check the logs in: ' + path.join(__dirname, 'daemon'));
    process.exit(1);
  }
}, 60000); // 60 second timeout
