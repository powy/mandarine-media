#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { ProcessManager } from './src/subtools/upload-gui/services/processManager.js';

/**
 * Direct test script for parallel upload functionality
 */
class ParallelUploadTester {
  constructor(configPath) {
    this.configPath = configPath;
    this.processManager = null;
    this.testResults = [];
  }

  async setup() {
    console.log('🧪 Setting up Parallel Upload Test...');
    console.log(`📋 Using config: ${this.configPath}`);

    // Clean up any existing progress/logs
    const baseDir = path.dirname(this.configPath);
    const progressDir = path.join(baseDir, 'kyool-media/apps/media-uploader/.upload-progress');
    const logsDir = path.join(baseDir, 'kyool-media/apps/media-uploader/.upload-logs');

    await fs.ensureDir(progressDir);
    await fs.ensureDir(logsDir);

    // Clear old test files
    const progressFiles = await fs.readdir(progressDir).catch(() => []);
    const logFiles = await fs.readdir(logsDir).catch(() => []);

    for (const file of progressFiles) {
      if (file.endsWith('.json')) {
        await fs.remove(path.join(progressDir, file));
      }
    }

    for (const file of logFiles) {
      if (file.endsWith('.log')) {
        await fs.remove(path.join(logsDir, file));
      }
    }

    console.log('✅ Cleaned up previous test files');

    // Initialize ProcessManager
    this.processManager = new ProcessManager({
      maxConcurrentUploads: 2, // Test with 2 concurrent processes
      retryAttempts: 1,
      retryDelay: 2000
    });

    await this.processManager.initialize();
    console.log('✅ ProcessManager initialized');
  }

  async runTest() {
    try {
      await this.setup();

      // Prepare test folders
      const testFolders = [
        'C:/GitHub/kftv-kyool/monarch/02',
        'C:/GitHub/kftv-kyool/monarch/03'
      ];

      console.log(`🚀 Starting parallel upload test with ${testFolders.length} folders`);
      console.log('📁 Test folders:', testFolders);

      // Start uploads
      const tasks = [];
      for (const folder of testFolders) {
        const taskId = await this.processManager.queueUpload(folder, this.configPath);
        tasks.push({ taskId, folder });
        console.log(`📤 Added upload task: ${taskId} for ${path.basename(folder)}`);
      }

      // Monitor progress
      console.log('👀 Monitoring upload progress...');
      await this.monitorProgress(tasks);

      // Analyze results
      await this.analyzeResults(tasks);

    } catch (error) {
      console.error('💥 Test failed:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }

  async monitorProgress(tasks) {
    const maxWaitTime = 300000; // 5 minutes max
    const checkInterval = 2000; // Check every 2 seconds
    const startTime = Date.now();

    console.log(`⏱️ Maximum wait time: ${maxWaitTime / 1000} seconds`);

    while (Date.now() - startTime < maxWaitTime) {
      let allCompleted = true;
      let activeProcesses = 0;

      console.log('\n📊 Current Status:');

      for (const task of tasks) {
        const processInfo = this.processManager.processes.get(task.taskId);
        if (processInfo) {
          console.log(`  ${path.basename(task.folder)}: ${processInfo.status} (PID: ${processInfo.pid || 'N/A'})`);

          if (processInfo.status === 'running') {
            activeProcesses++;
            allCompleted = false;
          } else if (processInfo.status === 'queued') {
            allCompleted = false;
          }
        }
      }

      console.log(`🔄 Active processes: ${activeProcesses}`);

      if (allCompleted) {
        console.log('✅ All uploads completed or failed');
        break;
      }

      // Check for any new log entries
      await this.checkLogs();

      await this.sleep(checkInterval);
    }

    if (Date.now() - startTime >= maxWaitTime) {
      console.log('⏰ Maximum wait time exceeded');
    }
  }

  async checkLogs() {
    try {
      const logsDir = 'C:/GitHub/kftv-kyool/kyool-media/apps/media-uploader/.upload-logs';
      const files = await fs.readdir(logsDir).catch(() => []);

      for (const file of files) {
        if (file.endsWith('.log')) {
          const logPath = path.join(logsDir, file);
          const stats = await fs.stat(logPath);

          // Check if log was modified in the last 5 seconds
          if (Date.now() - stats.mtime.getTime() < 5000) {
            const content = await fs.readFile(logPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            const recentLines = lines.slice(-3); // Show last 3 lines

            console.log(`📝 Recent activity in ${file}:`);
            for (const line of recentLines) {
              if (line.trim()) {
                console.log(`    ${line.trim()}`);
              }
            }
          }
        }
      }
    } catch (error) {
      // Ignore log checking errors
    }
  }

  async analyzeResults(tasks) {
    console.log('\n📋 Final Results Analysis:');
    console.log('=' .repeat(60));

    let successCount = 0;
    let failureCount = 0;

    for (const task of tasks) {
      const processInfo = this.processManager.processes.get(task.taskId);
      const folderName = path.basename(task.folder);

      if (processInfo) {
        console.log(`\n📁 ${folderName}:`);
        console.log(`   Status: ${processInfo.status}`);
        console.log(`   Start Time: ${processInfo.startTime || 'N/A'}`);
        console.log(`   End Time: ${processInfo.endTime || 'N/A'}`);
        console.log(`   Retry Count: ${processInfo.retryCount || 0}`);

        if (processInfo.error) {
          console.log(`   Error: ${processInfo.error}`);
          failureCount++;
        } else if (processInfo.status === 'completed') {
          successCount++;
        } else {
          failureCount++;
        }

        // Check log file
        const logFile = path.join('C:/GitHub/kftv-kyool/kyool-media/apps/media-uploader/.upload-logs', `${task.taskId}.log`);
        if (await fs.pathExists(logFile)) {
          const logContent = await fs.readFile(logFile, 'utf8');
          const lines = logContent.split('\n').filter(line => line.trim());
          console.log(`   Log Lines: ${lines.length}`);

          // Show errors from log
          const errorLines = lines.filter(line =>
            line.includes('[ERROR]') || line.includes('ERROR') ||
            line.includes('Failed') || line.includes('failed')
          );

          if (errorLines.length > 0) {
            console.log(`   Log Errors: ${errorLines.length}`);
            for (const errorLine of errorLines.slice(-3)) {
              console.log(`     ${errorLine.trim()}`);
            }
          }
        }

      } else {
        console.log(`\n📁 ${folderName}: No process info found`);
        failureCount++;
      }
    }

    console.log('\n🎯 Summary:');
    console.log(`✅ Successful uploads: ${successCount}`);
    console.log(`❌ Failed uploads: ${failureCount}`);
    console.log(`📊 Success rate: ${Math.round((successCount / tasks.length) * 100)}%`);

    if (successCount === tasks.length) {
      console.log('🎉 All tests passed! Parallel uploads working 100%');
    } else {
      console.log('🚨 Some tests failed. Check logs for debugging.');

      // Show any remaining issues
      console.log('\n🔍 Debug Information:');
      console.log('Check these log files for detailed error information:');
      const logsDir = 'C:/GitHub/kftv-kyool/kyool-media/apps/media-uploader/.upload-logs';
      const files = await fs.readdir(logsDir).catch(() => []);
      for (const file of files) {
        if (file.endsWith('.log')) {
          console.log(`  ${path.join(logsDir, file)}`);
        }
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test
async function main() {
  const configPath = process.argv[2] || 'C:/GitHub/kftv-kyool/config.locale.ini';

  console.log('🧪 Parallel Upload Test Starting...');
  console.log(`Using config: ${configPath}`);

  if (!await fs.pathExists(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    process.exit(1);
  }

  const tester = new ParallelUploadTester(configPath);
  await tester.runTest();
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(error => {
  console.error('💥 Main execution failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});