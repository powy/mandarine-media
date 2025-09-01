#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

class TestExecutionLogger {
  constructor() {
    this.logFile = path.join(__dirname, 'test-execution.log');
    this.startTime = Date.now();
    this.memoryThreshold = 2 * 1024 * 1024 * 1024; // 2GB threshold
    this.monitoringInterval = null;
    
    // Clear previous log
    this.clearLog();
    this.logSystemInfo();
    this.startMonitoring();
  }

  clearLog() {
    fs.writeFileSync(this.logFile, '');
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const memUsage = process.memoryUsage();
    const systemMem = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };
    
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      memory: {
        process: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
        },
        system: {
          total: Math.round(systemMem.total / 1024 / 1024 / 1024) + 'GB',
          free: Math.round(systemMem.free / 1024 / 1024 / 1024) + 'GB',
          used: Math.round(systemMem.used / 1024 / 1024 / 1024) + 'GB',
          freePercent: Math.round((systemMem.free / systemMem.total) * 100) + '%'
        }
      },
      uptime: Math.round((Date.now() - this.startTime) / 1000) + 's'
    };

    const logLine = JSON.stringify(logEntry, null, 2) + '\n---\n';
    fs.appendFileSync(this.logFile, logLine);
    
    // Console output with colors
    const colors = {
      ERROR: '\x1b[31m',
      WARN: '\x1b[33m',
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      RESET: '\x1b[0m'
    };
    
    console.log(`${colors[level] || colors.INFO}[${timestamp}] ${level}: ${message}${colors.RESET}`);
    
    // Check memory thresholds
    if (memUsage.rss > this.memoryThreshold) {
      this.log('WARN', 'Memory usage approaching dangerous levels', {
        currentUsage: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        threshold: Math.round(this.memoryThreshold / 1024 / 1024) + 'MB'
      });
    }
    
    // Check system memory
    if (systemMem.free < (systemMem.total * 0.1)) { // Less than 10% free
      this.log('ERROR', 'CRITICAL: System memory critically low - stopping execution', {
        freeMemory: Math.round(systemMem.free / 1024 / 1024 / 1024) + 'GB',
        freePercent: Math.round((systemMem.free / systemMem.total) * 100) + '%'
      });
      this.stopMonitoring();
      throw new Error('CRITICAL MEMORY SHORTAGE - STOPPING TO PREVENT SYSTEM CRASH');
    }
  }

  startMonitoring() {
    this.log('INFO', 'Starting system monitoring');
    this.monitoringInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const systemMem = {
        total: os.totalmem(),
        free: os.freemem()
      };
      
      // Log periodic memory status
      if (memUsage.rss > (1024 * 1024 * 1024)) { // 1GB
        this.log('WARN', 'High memory usage detected', {
          processMemory: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          systemFree: Math.round(systemMem.free / 1024 / 1024 / 1024) + 'GB'
        });
      }
    }, 5000); // Check every 5 seconds
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.log('INFO', 'Stopped system monitoring');
    }
  }

  logSystemInfo() {
    this.log('INFO', 'System Information', {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB'
    });
  }

  logTestStart(testName, testFile) {
    this.log('INFO', `Starting test: ${testName}`, { file: testFile });
  }

  logTestEnd(testName, success, duration, details = {}) {
    this.log(success ? 'SUCCESS' : 'ERROR', `Test completed: ${testName}`, {
      success,
      duration: duration + 'ms',
      ...details
    });
  }

  logTestSuite(suiteName, action) {
    this.log('INFO', `Test suite ${action}: ${suiteName}`);
  }

  async forceGarbageCollection() {
    if (global.gc) {
      this.log('INFO', 'Forcing garbage collection');
      global.gc();
    } else {
      this.log('WARN', 'Garbage collection not available (run with --expose-gc)');
    }
  }

  async safeDelay(ms = 1000) {
    this.log('INFO', `Waiting ${ms}ms for system to stabilize`);
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  getLogPath() {
    return this.logFile;
  }

  destroy() {
    this.stopMonitoring();
    this.log('INFO', 'Test execution logger destroyed');
  }
}

module.exports = TestExecutionLogger;