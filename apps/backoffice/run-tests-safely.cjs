#!/usr/bin/env node

const { spawn } = require('child_process');
const TestExecutionLogger = require('./test-execution-logger.cjs');

class SafeTestRunner {
  constructor() {
    this.logger = new TestExecutionLogger();
    this.testSuites = [
      { name: 'App Component', pattern: 'src/__tests__/App.test.tsx' },
      { name: 'AuthProvider', pattern: 'src/__tests__/authProvider.test.ts' },
      { name: 'DataProvider', pattern: 'src/__tests__/dataProvider.test.ts' },
      { name: 'Countries Component', pattern: 'src/__tests__/components/Countries.test.tsx' },
      { name: 'Languages Component', pattern: 'src/__tests__/components/Languages.test.tsx' },
      { name: 'MediaDescriptions Component', pattern: 'src/__tests__/components/MediaDescriptions.test.tsx' },
      { name: 'Programs Component', pattern: 'src/__tests__/components/Programs.test.tsx' },
      { name: 'Seasons Component', pattern: 'src/__tests__/components/Seasons.test.tsx' },
      { name: 'Users Component', pattern: 'src/__tests__/components/Users.test.tsx' },
      { name: 'Pictures Component', pattern: 'src/__tests__/components/Pictures.test.tsx' },
      { name: 'PublicPersons Component', pattern: 'src/__tests__/components/PublicPersons.test.tsx' },
      { name: 'ContentLists Component', pattern: 'src/__tests__/components/ContentLists.test.tsx' },
      { name: 'ScreenContents Component', pattern: 'src/__tests__/components/ScreenContents.test.tsx' },
      { name: 'VideoFiles Component', pattern: 'src/__tests__/components/VideoFiles.test.tsx' },
      { name: 'VideoFileReports Component', pattern: 'src/__tests__/components/VideoFileReports.test.tsx' },
      { name: 'Themes Component', pattern: 'src/__tests__/components/Themes.test.tsx' },
      { name: 'MediaThemes Component', pattern: 'src/__tests__/components/MediaThemes.test.tsx' },
      { name: 'AudienceCategories Component', pattern: 'src/__tests__/components/AudienceCategories.test.tsx' },
      { name: 'SubscriptionPlans Component', pattern: 'src/__tests__/components/SubscriptionPlans.test.tsx' },
      { name: 'Territories Component', pattern: 'src/__tests__/components/Territories.test.tsx' },
      { name: 'Integration Tests', pattern: 'src/__tests__/integration.test.tsx' },
      { name: 'Error Handling Tests', pattern: 'src/__tests__/errorHandling.test.tsx' },
    ];
    this.results = [];
  }

  async runTestSuite(suite) {
    this.logger.logTestSuite(suite.name, 'starting');
    const startTime = Date.now();

    return new Promise((resolve) => {
      const testProcess = spawn('npx', ['vitest', 'run', suite.pattern, '--reporter=verbose'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      testProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const success = code === 0;

        this.logger.logTestEnd(suite.name, success, duration, {
          exitCode: code,
          stdoutLength: stdout.length,
          stderrLength: stderr.length,
          hasStderr: stderr.length > 0
        });

        this.results.push({
          suite: suite.name,
          pattern: suite.pattern,
          success,
          duration,
          exitCode: code,
          stdout: stdout.substring(0, 1000), // Limit output size
          stderr: stderr.substring(0, 1000)
        });

        resolve({ success, duration, code, stdout, stderr });
      });

      testProcess.on('error', (error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.logger.logTestEnd(suite.name, false, duration, {
          error: error.message
        });

        this.results.push({
          suite: suite.name,
          pattern: suite.pattern,
          success: false,
          duration,
          error: error.message
        });

        resolve({ success: false, duration, error });
      });
    });
  }

  async runAllTests() {
    this.logger.log('INFO', 'Starting comprehensive test execution');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const suite of this.testSuites) {
      try {
        this.logger.log('INFO', `Running test suite: ${suite.name}`);
        
        const result = await this.runTestSuite(suite);
        
        if (result.success) {
          totalPassed++;
          this.logger.log('SUCCESS', `✅ ${suite.name} passed`);
        } else {
          totalFailed++;
          this.logger.log('ERROR', `❌ ${suite.name} failed`, {
            exitCode: result.code,
            error: result.error || 'Test failures detected'
          });
        }

        // Force garbage collection and wait between tests
        await this.logger.forceGarbageCollection();
        await this.logger.safeDelay(2000); // 2 second delay between test suites

      } catch (error) {
        totalFailed++;
        this.logger.log('ERROR', `❌ ${suite.name} crashed`, {
          error: error.message
        });
      }
    }

    this.printSummary(totalPassed, totalFailed);
    return { totalPassed, totalFailed };
  }

  printSummary(passed, failed) {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 COMPREHENSIVE TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Test Suites: ${this.testSuites.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / this.testSuites.length) * 100)}%`);
    console.log(`Log File: ${this.logger.getLogPath()}`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\n❌ FAILED TEST SUITES:');
      this.results
        .filter(r => !r.success)
        .forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.suite}`);
          if (result.error) {
            console.log(`     Error: ${result.error}`);
          }
          if (result.stderr) {
            console.log(`     Stderr: ${result.stderr.substring(0, 200)}...`);
          }
        });
    }

    if (passed === this.testSuites.length) {
      console.log('\n🎉 ALL TEST SUITES PASSED! The backoffice tests are comprehensive and up to date.');
    }
  }

  async cleanup() {
    this.logger.destroy();
  }
}

async function main() {
  const runner = new SafeTestRunner();

  try {
    const { totalPassed, totalFailed } = await runner.runAllTests();
    await runner.cleanup();
    
    // Exit with appropriate code
    process.exit(totalFailed === 0 ? 0 : 1);

  } catch (error) {
    runner.logger.log('ERROR', 'Test runner crashed', { error: error.message });
    await runner.cleanup();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SafeTestRunner;