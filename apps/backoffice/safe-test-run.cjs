#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const TestExecutionLogger = require('./test-execution-logger.cjs');

async function runAllTestsSafely() {
  const logger = new TestExecutionLogger();
  
  try {
    logger.log('INFO', 'Starting comprehensive backoffice test execution');
    
    // Get all test files
    const testFiles = [
      'src/__tests__/authProvider.test.ts',
      'src/__tests__/dataProvider.test.ts',
      'src/__tests__/components/Countries.test.tsx',
      'src/__tests__/components/Languages.test.tsx',
      'src/__tests__/components/MediaDescriptions.test.tsx',
      'src/__tests__/components/MediaThemes.test.tsx',
      'src/__tests__/components/Pictures.test.tsx',
      'src/__tests__/components/Programs.test.tsx',
      'src/__tests__/components/PublicPersons.test.tsx',
      'src/__tests__/components/Seasons.test.tsx',
      'src/__tests__/components/Themes.test.tsx',
      'src/__tests__/components/Users.test.tsx',
      'src/__tests__/components/VideoFiles.test.tsx',
      'src/__tests__/components/VideoFileReports.test.tsx',
      'src/__tests__/components/AudienceCategories.test.tsx',
      'src/__tests__/components/SubscriptionPlans.test.tsx',
      'src/__tests__/components/Territories.test.tsx',
      'src/__tests__/components/ContentLists.test.tsx',
      'src/__tests__/components/ScreenContents.test.tsx',
      'src/__tests__/integration.test.tsx',
      'src/__tests__/errorHandling.test.tsx',
    ];

    let passedCount = 0;
    let failedCount = 0;
    const results = [];

    for (const testFile of testFiles) {
      logger.logTestStart(`Testing: ${testFile}`, testFile);
      let startTime = Date.now();
      
      try {
        
        // Run test with timeout
        const output = execSync(`npx vitest run ${testFile} --reporter=verbose`, {
          cwd: process.cwd(),
          timeout: 60000, // 60 second timeout per file
          encoding: 'utf8'
        });
        
        const duration = Date.now() - startTime;
        passedCount++;
        logger.logTestEnd(`✅ ${testFile}`, true, duration);
        results.push({ file: testFile, status: 'PASSED', duration });
        
        // Force cleanup between tests
        await logger.forceGarbageCollection();
        await logger.safeDelay(1000);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        failedCount++;
        logger.logTestEnd(`❌ ${testFile}`, false, duration, {
          error: error.message.substring(0, 500)
        });
        results.push({ file: testFile, status: 'FAILED', duration, error: error.message });
      }
    }

    // Summary
    logger.log('SUCCESS', 'Test execution completed', {
      totalFiles: testFiles.length,
      passed: passedCount,
      failed: failedCount,
      successRate: Math.round((passedCount / testFiles.length) * 100) + '%'
    });

    console.log('\n' + '='.repeat(80));
    console.log('🧪 BACKOFFICE TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Test Files: ${testFiles.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Success Rate: ${Math.round((passedCount / testFiles.length) * 100)}%`);
    console.log(`Detailed Log: ${logger.getLogPath()}`);
    console.log('='.repeat(80));

    if (failedCount > 0) {
      console.log('\n❌ FAILED TEST FILES:');
      results.filter(r => r.status === 'FAILED').forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.file}`);
        if (result.error) {
          console.log(`     Error: ${result.error.substring(0, 200)}...`);
        }
      });
    } else {
      console.log('\n🎉 ALL TESTS PASSED! Backoffice tests are comprehensive and up to date.');
    }

    logger.destroy();
    return { passedCount, failedCount, totalCount: testFiles.length };

  } catch (error) {
    logger.log('ERROR', 'Critical test execution failure', { error: error.message });
    logger.destroy();
    throw error;
  }
}

if (require.main === module) {
  runAllTestsSafely()
    .then(({ passedCount, failedCount }) => {
      process.exit(failedCount === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = runAllTestsSafely;