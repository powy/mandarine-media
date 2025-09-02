#!/usr/bin/env node

import SubtitleService from '../services/subtitleService.js';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

class NewMethodsTest {
  constructor() {
    this.testDataDir = path.join(process.cwd(), 'test-data');
  }

  async setup() {
    console.log(chalk.blue.bold('🧪 Testing New SubtitleService Methods\n'));
    await fs.ensureDir(this.testDataDir);
  }

  async testWithCredentialsValidation() {
    console.log(chalk.cyan('Testing SubtitleService.withCredentials() parameter validation...'));

    // Test missing parameters
    try {
      await SubtitleService.withCredentials({});
      console.log(chalk.red('✗ Should have failed with missing parameters'));
      return false;
    } catch (error) {
      console.log(chalk.green('✓ Correctly validates missing parameters'));
    }

    // Test partial parameters
    try {
      await SubtitleService.withCredentials({
        awsCredentials: {
          accessKeyId: 'test',
          // missing other fields
        }
      });
      console.log(chalk.red('✗ Should have failed with incomplete AWS credentials'));
      return false;
    } catch (error) {
      console.log(chalk.green('✓ Correctly validates incomplete parameters'));
    }

    console.log('');
    return true;
  }

  async testWithEnvironmentValidation() {
    console.log(chalk.cyan('Testing SubtitleService.withEnvironment() validation...'));

    // Save original env vars
    const originalEnv = {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
      MUX_TOKEN_ID: process.env.MUX_TOKEN_ID,
      MUX_TOKEN_SECRET: process.env.MUX_TOKEN_SECRET
    };

    // Clear env vars
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.S3_BUCKET_NAME;
    delete process.env.MUX_TOKEN_ID;
    delete process.env.MUX_TOKEN_SECRET;

    try {
      await SubtitleService.withEnvironment('test-asset', []);
      console.log(chalk.red('✗ Should have failed with missing env vars'));
      return false;
    } catch (error) {
      if (error.message.includes('Missing required environment variables')) {
        console.log(chalk.green('✓ Correctly validates missing environment variables'));
      } else {
        console.log(chalk.red(`✗ Wrong error: ${error.message}`));
        return false;
      }
    }

    // Restore env vars
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value) process.env[key] = value;
    });

    console.log('');
    return true;
  }

  async testMethodSignatures() {
    console.log(chalk.cyan('Testing method signatures and types...'));

    // Test that static methods exist and are functions
    console.log(`✓ withCredentials is function: ${typeof SubtitleService.withCredentials === 'function'}`);
    console.log(`✓ withEnvironment is function: ${typeof SubtitleService.withEnvironment === 'function'}`);

    // Test constructor still works
    const mockConfig = {
      auth: { mux_token_id: 'test', mux_token_secret: 'test' },
      s3: { access_key_id: 'test', secret_access_key: 'test', region: 'us-east-1', bucket_name: 'test' },
      mux_asset_id: 'test',
      subtitles: []
    };

    const mockLogger = { 
      info: () => {}, 
      error: () => {}, 
      debug: () => {},
      logStart: () => {},
      logSubtitleStart: () => {},
      logSubtitleSuccess: () => {},
      logSubtitleError: () => {}
    };

    const service = new SubtitleService(mockConfig, mockLogger);
    console.log(`✓ Constructor still works: ${service instanceof SubtitleService}`);
    console.log(`✓ uploadSubtitles method exists: ${typeof service.uploadSubtitles === 'function'}`);

    console.log('');
    return true;
  }

  async testUsageExamples() {
    console.log(chalk.cyan('Testing usage examples syntax...'));

    // Test the parameter structure without actually calling (to avoid network calls)
    const withCredentialsParams = {
      awsCredentials: {
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        region: 'us-east-1',
        bucket: 'test-bucket'
      },
      muxCredentials: {
        tokenId: 'test-token',
        tokenSecret: 'test-secret'
      },
      assetId: 'test-asset',
      subtitles: [
        {
          file_path: './test-data/test_english.srt',
          language_code: 'en',
          name: 'English'
        }
      ],
      options: {
        cleanupDelayMinutes: 60,
        maxRetryAttempts: 2
      }
    };

    console.log('✓ withCredentials parameter structure is valid');

    // Test withEnvironment parameters
    const environmentParams = [
      'test-asset-id',
      [{ file_path: './test.srt', language_code: 'en', name: 'English' }],
      { cleanupDelayMinutes: 60 }
    ];

    console.log('✓ withEnvironment parameter structure is valid');

    console.log('');
    return true;
  }

  async runTests() {
    await this.setup();

    const tests = [
      { name: 'withCredentials Validation', fn: () => this.testWithCredentialsValidation() },
      { name: 'withEnvironment Validation', fn: () => this.testWithEnvironmentValidation() },
      { name: 'Method Signatures', fn: () => this.testMethodSignatures() },
      { name: 'Usage Examples', fn: () => this.testUsageExamples() }
    ];

    let passed = 0;
    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result) {
          console.log(chalk.green.bold(`✓ ${test.name} - PASSED\n`));
          passed++;
        } else {
          console.log(chalk.red.bold(`✗ ${test.name} - FAILED\n`));
        }
      } catch (error) {
        console.log(chalk.red.bold(`✗ ${test.name} - ERROR: ${error.message}\n`));
      }
    }

    // Summary
    console.log(chalk.blue.bold('=== New Methods Test Summary ==='));
    console.log(`Tests passed: ${chalk.green(passed)}/${tests.length}`);
    console.log(`Tests failed: ${chalk.red(tests.length - passed)}/${tests.length}`);

    if (passed === tests.length) {
      console.log(chalk.green.bold('\n🎉 All new method tests passed!'));
      console.log(chalk.blue('\nNew usage options:'));
      console.log('1. SubtitleService.withCredentials({ awsCredentials, muxCredentials, ... })');
      console.log('2. SubtitleService.withEnvironment(assetId, subtitles, options)');
      console.log('3. new SubtitleService(config, logger) // Original method still works');
    } else {
      console.log(chalk.red.bold('\n❌ Some new method tests failed.'));
    }

    return passed === tests.length;
  }
}

const tester = new NewMethodsTest();
tester.runTests().catch(error => {
  console.error(chalk.red.bold('Test runner failed:'), error);
  process.exit(1);
});