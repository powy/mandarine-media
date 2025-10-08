#!/usr/bin/env node

/**
 * Test Runner Script
 * Provides enhanced test execution with reporting and validation
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class TestRunner {
  constructor() {
    this.testResults = {
      unit: null,
      integration: null,
      e2e: null,
      performance: null
    };
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async checkPrerequisites() {
    this.log('\n🔍 Checking test prerequisites...', 'cyan');

    // Check if test files exist
    const testFilesDir = 'C:\\GitHub\\kftv-kyool\\uploader-test-files';
    try {
      await fs.access(testFilesDir);
      this.log('✅ Test files directory found', 'green');
    } catch (error) {
      this.log('⚠️  Test files directory not found - some E2E tests may be skipped', 'yellow');
    }

    // Check if package.json exists and has required dependencies
    try {
      const packagePath = path.join(__dirname, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const pkg = JSON.parse(packageContent);

      const requiredDeps = ['jest', 'supertest', '@jest/globals'];
      const missingDeps = requiredDeps.filter(dep =>
        !pkg.devDependencies || !pkg.devDependencies[dep]
      );

      if (missingDeps.length > 0) {
        this.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`, 'red');
        this.log('Run: npm install', 'yellow');
        return false;
      }

      this.log('✅ All required dependencies found', 'green');
    } catch (error) {
      this.log('❌ Could not verify dependencies', 'red');
      return false;
    }

    // Check if server files exist
    const serverFiles = [
      'server.js',
      'taskManager.js',
      'workerManager.js'
    ];

    for (const file of serverFiles) {
      try {
        await fs.access(path.join(__dirname, file));
      } catch (error) {
        this.log(`❌ Required server file not found: ${file}`, 'red');
        return false;
      }
    }

    this.log('✅ All server files found', 'green');
    return true;
  }

  async runTestSuite(suite, description) {
    this.log(`\n🧪 Running ${description}...`, 'cyan');

    return new Promise((resolve) => {
      const startTime = Date.now();

      const jest = spawn('npm', ['run', `test:${suite}`], {
        stdio: 'pipe',
        shell: true,
        cwd: __dirname
      });

      let output = '';
      let errorOutput = '';

      jest.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      jest.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result = {
          suite,
          success: code === 0,
          duration,
          output,
          errorOutput
        };

        if (code === 0) {
          this.log(`✅ ${description} completed successfully (${duration}ms)`, 'green');
        } else {
          this.log(`❌ ${description} failed with code ${code}`, 'red');
        }

        this.testResults[suite] = result;
        resolve(result);
      });

      jest.on('error', (error) => {
        this.log(`❌ Failed to run ${description}: ${error.message}`, 'red');
        this.testResults[suite] = {
          suite,
          success: false,
          duration: Date.now() - startTime,
          error: error.message
        };
        resolve(this.testResults[suite]);
      });
    });
  }

  async runCoverageReport() {
    this.log('\n📊 Generating coverage report...', 'cyan');

    return new Promise((resolve) => {
      const jest = spawn('npm', ['run', 'test:coverage'], {
        stdio: 'pipe',
        shell: true,
        cwd: __dirname
      });

      let output = '';

      jest.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      jest.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      jest.on('close', (code) => {
        if (code === 0) {
          this.log('✅ Coverage report generated', 'green');

          // Try to extract coverage summary from output
          const coverageMatch = output.match(/All files[^|]+\|\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)/);
          if (coverageMatch) {
            const [, statements, branches, functions, lines] = coverageMatch;
            this.log(`📈 Coverage: Statements ${statements}%, Branches ${branches}%, Functions ${functions}%, Lines ${lines}%`, 'magenta');
          }
        } else {
          this.log('⚠️  Coverage report generation had issues', 'yellow');
        }
        resolve(code === 0);
      });
    });
  }

  generateSummary() {
    this.log('\n📋 Test Summary', 'cyan');
    this.log('='.repeat(50), 'cyan');

    const totalDuration = Date.now() - this.startTime;

    Object.entries(this.testResults).forEach(([suite, result]) => {
      if (result) {
        const status = result.success ? '✅' : '❌';
        const duration = result.duration ? `${result.duration}ms` : 'N/A';
        this.log(`${status} ${suite.padEnd(12)} - ${duration}`, result.success ? 'green' : 'red');
      }
    });

    this.log(`\n⏱️  Total execution time: ${totalDuration}ms`, 'magenta');

    const passedSuites = Object.values(this.testResults).filter(r => r && r.success).length;
    const totalSuites = Object.values(this.testResults).filter(r => r !== null).length;

    if (passedSuites === totalSuites) {
      this.log(`\n🎉 All test suites passed! (${passedSuites}/${totalSuites})`, 'green');
      return true;
    } else {
      this.log(`\n💥 ${totalSuites - passedSuites} test suite(s) failed (${passedSuites}/${totalSuites})`, 'red');
      return false;
    }
  }

  async runAll() {
    this.log('🚀 Media Uploader Server Test Suite', 'bright');
    this.log('===================================', 'bright');

    // Check prerequisites
    const prerequisitesPassed = await this.checkPrerequisites();
    if (!prerequisitesPassed) {
      this.log('\n❌ Prerequisites check failed. Please fix the issues above.', 'red');
      process.exit(1);
    }

    // Run test suites in order
    await this.runTestSuite('unit', 'Unit Tests');
    await this.runTestSuite('integration', 'Integration Tests');
    await this.runTestSuite('e2e', 'End-to-End Tests');
    await this.runTestSuite('performance', 'Performance Tests');

    // Generate coverage report
    await this.runCoverageReport();

    // Generate summary
    const allPassed = this.generateSummary();

    if (allPassed) {
      this.log('\n🏆 All tests completed successfully!', 'green');
      process.exit(0);
    } else {
      this.log('\n💔 Some tests failed. Check the output above for details.', 'red');
      process.exit(1);
    }
  }

  async runSingle(suite) {
    if (!Object.prototype.hasOwnProperty.call(this.testResults, suite)) {
      this.log(`❌ Unknown test suite: ${suite}`, 'red');
      this.log(`Available suites: ${Object.keys(this.testResults).join(', ')}`, 'yellow');
      process.exit(1);
    }

    const descriptions = {
      unit: 'Unit Tests',
      integration: 'Integration Tests',
      e2e: 'End-to-End Tests',
      performance: 'Performance Tests'
    };

    this.log(`🚀 Running ${descriptions[suite]}`, 'bright');

    const prerequisitesPassed = await this.checkPrerequisites();
    if (!prerequisitesPassed) {
      this.log('\n❌ Prerequisites check failed.', 'red');
      process.exit(1);
    }

    const result = await this.runTestSuite(suite, descriptions[suite]);

    if (result.success) {
      this.log('\n🎉 Test suite completed successfully!', 'green');
      process.exit(0);
    } else {
      this.log('\n💔 Test suite failed.', 'red');
      process.exit(1);
    }
  }
}

// Command line interface
async function main() {
  const runner = new TestRunner();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Run all tests
    await runner.runAll();
  } else if (args.length === 1) {
    // Run specific test suite
    await runner.runSingle(args[0]);
  } else {
    console.log('Usage:');
    console.log('  node test-runner.js           # Run all test suites');
    console.log('  node test-runner.js unit      # Run unit tests only');
    console.log('  node test-runner.js integration # Run integration tests only');
    console.log('  node test-runner.js e2e       # Run E2E tests only');
    console.log('  node test-runner.js performance # Run performance tests only');
    process.exit(1);
  }
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}Uncaught Exception: ${error.message}${colors.reset}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(`${colors.red}Unhandled Rejection: ${reason}${colors.reset}`);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}