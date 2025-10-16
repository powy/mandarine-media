#!/usr/bin/env node

/**
 * Start Kyool Media Uploader Windows Services
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('========================================');
console.log('Starting Kyool Media Uploader Services');
console.log('========================================\n');

async function startService(serviceName) {
  try {
    console.log(`Starting ${serviceName}...`);
    await execAsync(`sc start ${serviceName}`);
    console.log(`✓ ${serviceName} started\n`);
    return true;
  } catch (error) {
    if (error.stderr && error.stderr.includes('1056')) {
      console.log(`✓ ${serviceName} is already running\n`);
      return true;
    } else if (error.stderr && error.stderr.includes('1060')) {
      console.error(`✗ ${serviceName} is not installed\n`);
      return false;
    } else {
      console.error(`✗ Failed to start ${serviceName}`);
      console.error(`  ${error.message}\n`);
      return false;
    }
  }
}

async function main() {
  const serverStarted = await startService('KyoolMediaServer');

  // Wait a bit for server to initialize
  if (serverStarted) {
    console.log('Waiting for server to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const uiStarted = await startService('KyoolMediaUI');

  console.log('========================================');
  if (serverStarted && uiStarted) {
    console.log('Services started successfully!');
    console.log('Access UI at: http://localhost:3010\n');
  } else {
    console.log('Some services failed to start.');
    console.log('Check Windows Services (services.msc) for details\n');
    process.exit(1);
  }
}

main();
