#!/usr/bin/env node

/**
 * Uninstall Kyool Media Uploader Windows Services
 * Clean removal with proper logging
 */

import { Service } from 'node-windows';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================');
console.log('Kyool Media Uploader - Service Uninstaller');
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

// Paths - using source code (matching install script)
const SERVER_SCRIPT = path.join(__dirname, 'src', 'subtools', 'service-server', 'server.js');
const UI_SCRIPT = path.join(__dirname, 'src', 'subtools', 'service-interface', 'serve.js');

// Configure services (matching install script)
const serverService = new Service({
  name: 'KyoolMediaServer',
  script: SERVER_SCRIPT
});

const uiService = new Service({
  name: 'KyoolMediaUI',
  script: UI_SCRIPT
});

let uiUninstalled = false;
let serverUninstalled = false;

// Uninstall UI service first (it depends on server)
console.log('[1/2] Uninstalling KyoolMediaUI service...');

uiService.on('uninstall', function() {
  console.log('✓ KyoolMediaUI uninstalled successfully\n');
  uiUninstalled = true;

  // Uninstall server after UI is removed
  console.log('[2/2] Uninstalling KyoolMediaServer service...');
  serverService.uninstall();
});

uiService.on('alreadyuninstalled', function() {
  console.log('⚠ KyoolMediaUI is not installed (skipping)\n');
  uiUninstalled = true;

  // Try to uninstall server anyway
  console.log('[2/2] Uninstalling KyoolMediaServer service...');
  serverService.uninstall();
});

uiService.on('error', function(err) {
  console.error('⚠ Error uninstalling KyoolMediaUI:', err.message);
  console.log('  Continuing with server uninstall...\n');
  uiUninstalled = true;

  // Try to uninstall server anyway
  console.log('[2/2] Uninstalling KyoolMediaServer service...');
  serverService.uninstall();
});

// Uninstall server service
serverService.on('uninstall', function() {
  console.log('✓ KyoolMediaServer uninstalled successfully\n');
  serverUninstalled = true;

  if (uiUninstalled && serverUninstalled) {
    printCompletionMessage();
  }
});

serverService.on('alreadyuninstalled', function() {
  console.log('⚠ KyoolMediaServer is not installed (skipping)\n');
  serverUninstalled = true;

  if (uiUninstalled && serverUninstalled) {
    printCompletionMessage();
  }
});

serverService.on('error', function(err) {
  console.error('✗ Error uninstalling KyoolMediaServer:', err.message);
  console.error(err.stack);
  serverUninstalled = true;

  if (uiUninstalled && serverUninstalled) {
    printCompletionMessage();
  }
});

function printCompletionMessage() {
  console.log('========================================');
  console.log('Uninstallation Complete!');
  console.log('========================================\n');
  console.log('Services have been removed from Windows.\n');
  console.log('Note: The following were NOT deleted:');
  console.log('  • Application files in: ' + __dirname);
  console.log('  • Data in: %APPDATA%\\Kyool\\MediaUploader');
  console.log('  • Service logs in: ' + path.join(__dirname, 'daemon') + '\n');
  console.log('To completely remove the application:');
  console.log('  1. Delete this folder: ' + __dirname);
  console.log('  2. Delete data: %APPDATA%\\Kyool\\MediaUploader\n');

  process.exit(0);
}

// Start uninstallation
console.log('Uninstalling services (this may take a few seconds)...\n');
uiService.uninstall();

// Timeout safety
setTimeout(() => {
  if (!uiUninstalled || !serverUninstalled) {
    console.error('\n✗ Uninstallation timeout');
    console.error('Services may still be registered. Check Windows Services (services.msc)');
    process.exit(1);
  }
}, 60000); // 60 second timeout
