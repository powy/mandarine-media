#!/usr/bin/env node

/**
 * Stop Kyool Media Uploader Windows Services
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('========================================');
console.log('Stopping Kyool Media Uploader Services');
console.log('========================================\n');

async function stopService(serviceName) {
  try {
    console.log(`Stopping ${serviceName}...`);
    await execAsync(`sc stop ${serviceName}`);
    console.log(`✓ ${serviceName} stopped\n`);
    return true;
  } catch (error) {
    if (error.stderr && error.stderr.includes('1062')) {
      console.log(`✓ ${serviceName} is already stopped\n`);
      return true;
    } else if (error.stderr && error.stderr.includes('1060')) {
      console.error(`✗ ${serviceName} is not installed\n`);
      return false;
    } else {
      console.error(`✗ Failed to stop ${serviceName}`);
      console.error(`  ${error.message}\n`);
      return false;
    }
  }
}

async function main() {
  // Stop UI first (it depends on server)
  const uiStopped = await stopService('KyoolMediaUI');

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  const serverStopped = await stopService('KyoolMediaServer');

  console.log('========================================');
  if (serverStopped && uiStopped) {
    console.log('Services stopped successfully!\n');
  } else {
    console.log('Some services failed to stop.');
    console.log('Check Windows Services (services.msc) for details\n');
    process.exit(1);
  }
}

main();
