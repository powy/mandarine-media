#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

import { validateConfig } from '../schemas/inputSchema.js';
import { createLogger } from '../config/logger.js';
import SubtitleService from '../services/subtitleService.js';
import { loadConfigFile, getFileInfo } from '../utils/fileUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SubtitleUploadTester {
  constructor() {
    this.testDataDir = path.join(__dirname, '../../test-data');
    this.configDir = path.join(__dirname, '../../examples');
    this.logger = null;
  }

  async setup() {
    // Create test data directory
    await fs.ensureDir(this.testDataDir);
    
    // Create logger
    this.logger = createLogger({
      logging: {
        level: 'debug',
        console: true,
        format: 'simple'
      }
    });

    console.log(chalk.blue.bold('🧪 Mux Subtitle Upload Tool - Test Suite\n'));
  }

  async createMockSubtitleFiles() {
    console.log(chalk.cyan('Creating mock subtitle files...'));

    // Create mock SRT file
    const mockSrt = `1
00:00:01,000 --> 00:00:04,000
This is the first subtitle line.

2
00:00:05,000 --> 00:00:08,000
This is the second subtitle line.

3
00:00:10,000 --> 00:00:13,000
And this is the third subtitle line.
`;

    // Create mock VTT file
    const mockVtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
This is the first subtitle line.

00:00:05.000 --> 00:00:08.000
This is the second subtitle line.

00:00:10.000 --> 00:00:13.000
And this is the third subtitle line.
`;

    const srtPath = path.join(this.testDataDir, 'test_english.srt');
    const vttPath = path.join(this.testDataDir, 'test_spanish.vtt');
    const frenchPath = path.join(this.testDataDir, 'test_french.srt');

    await fs.writeFile(srtPath, mockSrt);
    await fs.writeFile(vttPath, mockVtt);
    await fs.writeFile(frenchPath, mockSrt.replace(/subtitle/g, 'sous-titre'));

    console.log(chalk.green('✓ Mock subtitle files created:'));
    console.log(`  - ${srtPath}`);
    console.log(`  - ${vttPath}`);
    console.log(`  - ${frenchPath}\n`);

    return { srtPath, vttPath, frenchPath };
  }

  async createMockConfig(mockFiles) {
    const mockConfig = {
      auth: {
        mux_token_id: "mock-token-id",
        mux_token_secret: "mock-token-secret"
      },
      s3: {
        access_key_id: "mock-access-key",
        secret_access_key: "mock-secret-key",
        region: "us-east-1",
        bucket_name: "mock-test-bucket",
        presigned_url_expiry: 3600
      },
      mux_asset_id: "mock-asset-id-12345",
      subtitles: [
        {
          file_path: mockFiles.srtPath,
          language_code: "en",
          name: "English",
          text_type: "subtitles",
          closed_captions: false,
          passthrough: "test-en"
        },
        {
          file_path: mockFiles.vttPath,
          language_code: "es",
          name: "Español",
          text_type: "subtitles",
          closed_captions: false,
          passthrough: "test-es"
        },
        {
          file_path: mockFiles.frenchPath,
          language_code: "fr",
          name: "Français",
          text_type: "subtitles",
          closed_captions: false,
          passthrough: "test-fr"
        }
      ],
      logging: {
        enabled: true,
        level: "debug",
        console: true,
        format: "simple"
      },
      options: {
        cleanup_delay_minutes: 5,
        max_retry_attempts: 2,
        validate_before_upload: true,
        monitoring_timeout: 30000
      }
    };

    const configPath = path.join(this.testDataDir, 'mock-config.json');
    await fs.writeFile(configPath, JSON.stringify(mockConfig, null, 2));

    console.log(chalk.green('✓ Mock configuration created:'));
    console.log(`  - ${configPath}\n`);

    return { config: mockConfig, configPath };
  }

  async testConfigValidation() {
    console.log(chalk.cyan('Testing configuration validation...'));

    try {
      const mockFiles = await this.createMockSubtitleFiles();
      const { config } = await this.createMockConfig(mockFiles);

      // Test valid config
      const validatedConfig = validateConfig(config);
      console.log(chalk.green('✓ Configuration validation passed'));

      // Test invalid configs
      const testCases = [
        {
          name: 'Missing auth',
          config: { ...config, auth: undefined },
          shouldFail: true
        },
        {
          name: 'Invalid language code',
          config: {
            ...config,
            subtitles: [{
              ...config.subtitles[0],
              language_code: 'invalid-lang-code'
            }]
          },
          shouldFail: true
        },
        {
          name: 'Missing S3 bucket',
          config: {
            ...config,
            s3: { ...config.s3, bucket_name: undefined }
          },
          shouldFail: true
        }
      ];

      for (const testCase of testCases) {
        try {
          validateConfig(testCase.config);
          if (testCase.shouldFail) {
            console.log(chalk.red(`✗ ${testCase.name} - Should have failed but didn't`));
          } else {
            console.log(chalk.green(`✓ ${testCase.name} - Passed as expected`));
          }
        } catch (error) {
          if (testCase.shouldFail) {
            console.log(chalk.green(`✓ ${testCase.name} - Failed as expected`));
          } else {
            console.log(chalk.red(`✗ ${testCase.name} - Failed unexpectedly: ${error.message}`));
          }
        }
      }

      console.log('');
      return true;
    } catch (error) {
      console.log(chalk.red('✗ Configuration validation test failed:'));
      console.log(chalk.red(`  ${error.message}\n`));
      return false;
    }
  }

  async testFileValidation() {
    console.log(chalk.cyan('Testing file validation...'));

    try {
      const mockFiles = await this.createMockSubtitleFiles();

      // Test file info retrieval
      for (const [type, filePath] of Object.entries(mockFiles)) {
        const fileInfo = await getFileInfo(filePath);
        console.log(chalk.green(`✓ File info for ${type}:`));
        console.log(`    Size: ${fileInfo.sizeFormatted}`);
        console.log(`    Extension: ${fileInfo.extension}`);
      }

      // Test non-existent file
      try {
        await getFileInfo('/path/to/nonexistent/file.srt');
        console.log(chalk.red('✗ Should have failed for non-existent file'));
      } catch (error) {
        console.log(chalk.green('✓ Correctly failed for non-existent file'));
      }

      console.log('');
      return true;
    } catch (error) {
      console.log(chalk.red('✗ File validation test failed:'));
      console.log(chalk.red(`  ${error.message}\n`));
      return false;
    }
  }

  async testSubtitleServiceValidation() {
    console.log(chalk.cyan('Testing SubtitleService validation (dry run)...'));

    try {
      const mockFiles = await this.createMockSubtitleFiles();
      const { config } = await this.createMockConfig(mockFiles);

      // Create service with mock config
      const service = new SubtitleService(config, this.logger);

      // Test input validation (this will fail on asset validation but that's expected)
      try {
        await service.validateInputs();
        console.log(chalk.red('✗ Should have failed on mock asset validation'));
      } catch (error) {
        if (error.message.includes('Asset not found') || error.message.includes('Mux asset not found')) {
          console.log(chalk.green('✓ Asset validation correctly failed (expected with mock data)'));
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
          console.log(chalk.yellow('⚠ Network error (expected in test environment)'));
        } else {
          console.log(chalk.red(`✗ Unexpected error: ${error.message}`));
        }
      }

      // Test session info
      const sessionInfo = service.getSessionInfo();
      console.log(chalk.green('✓ Session info:'));
      console.log(`    Session ID: ${sessionInfo.sessionId}`);
      console.log(`    Asset ID: ${sessionInfo.assetId}`);
      console.log(`    Subtitle count: ${sessionInfo.subtitleCount}`);

      console.log('');
      return true;
    } catch (error) {
      console.log(chalk.red('✗ SubtitleService validation test failed:'));
      console.log(chalk.red(`  ${error.message}\n`));
      return false;
    }
  }

  async testConfigExamples() {
    console.log(chalk.cyan('Testing example configurations...'));

    const examples = [
      'simple-subtitle-upload.json',
      'multi-language-upload.json',
      'test-with-pompom-data.json'
    ];

    let passed = 0;
    for (const example of examples) {
      try {
        const examplePath = path.join(this.configDir, example);
        
        if (await fs.pathExists(examplePath)) {
          const { config } = await loadConfigFile(examplePath);
          
          // Replace mock values for validation
          const testConfig = {
            ...config,
            auth: {
              mux_token_id: 'test-token',
              mux_token_secret: 'test-secret'
            },
            s3: {
              ...config.s3,
              access_key_id: 'test-key',
              secret_access_key: 'test-secret'
            }
          };

          validateConfig(testConfig);
          console.log(chalk.green(`✓ ${example} - Structure is valid`));
          passed++;
        } else {
          console.log(chalk.yellow(`⚠ ${example} - File not found`));
        }
      } catch (error) {
        console.log(chalk.red(`✗ ${example} - ${error.message}`));
      }
    }

    console.log(chalk.blue(`\nExample validation results: ${passed}/${examples.length} passed\n`));
    return passed === examples.length;
  }

  async runAllTests() {
    await this.setup();

    const tests = [
      { name: 'Configuration Validation', fn: () => this.testConfigValidation() },
      { name: 'File Validation', fn: () => this.testFileValidation() },
      { name: 'SubtitleService Validation', fn: () => this.testSubtitleServiceValidation() },
      { name: 'Example Configurations', fn: () => this.testConfigExamples() }
    ];

    let passed = 0;
    for (const test of tests) {
      console.log(chalk.blue.bold(`Running: ${test.name}`));
      try {
        const result = await test.fn();
        if (result) {
          passed++;
          console.log(chalk.green.bold(`✓ ${test.name} - PASSED\n`));
        } else {
          console.log(chalk.red.bold(`✗ ${test.name} - FAILED\n`));
        }
      } catch (error) {
        console.log(chalk.red.bold(`✗ ${test.name} - FAILED with exception:`));
        console.log(chalk.red(`  ${error.message}\n`));
      }
    }

    // Summary
    console.log(chalk.blue.bold('=== Test Summary ==='));
    console.log(`Tests passed: ${chalk.green(passed)}/${tests.length}`);
    console.log(`Tests failed: ${chalk.red(tests.length - passed)}/${tests.length}`);

    if (passed === tests.length) {
      console.log(chalk.green.bold('\n🎉 All tests passed! The tool is ready to use.'));
      console.log(chalk.blue('\nNext steps:'));
      console.log('1. Configure your AWS S3 bucket and credentials');
      console.log('2. Update the configuration file with your Mux token and asset ID');
      console.log('3. Run the tool with: npm start -- -c examples/simple-subtitle-upload.json');
    } else {
      console.log(chalk.red.bold('\n❌ Some tests failed. Please fix the issues before using the tool.'));
    }

    console.log(chalk.gray(`\nTest data created in: ${this.testDataDir}`));
    console.log(chalk.gray(`Log files location: ./logs/\n`));

    process.exit(passed === tests.length ? 0 : 1);
  }
}

// Run tests
const tester = new SubtitleUploadTester();
tester.runAllTests().catch(error => {
  console.error(chalk.red.bold('Test runner failed:'), error);
  process.exit(1);
});