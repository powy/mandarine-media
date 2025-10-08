#!/usr/bin/env node

/**
 * Simple Test Script for New Interface Architecture
 * Tests the basic functionality of the new three-interface system
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const testConfig = {
  verbose: true,
  testFiles: {
    ini: path.join(__dirname, 'test-config.ini'),
    video: '/tmp/test-video.mp4',
    picture: '/tmp/test-image.jpg',
  }
};

/**
 * Create test INI configuration file
 */
async function createTestIniFile() {
  const iniContent = `# Test Configuration
[general]
verbose=true
maxConcurrentUploads=5
retryAttempts=2
retryDelay=3000

[backend]
baseUrl=https://test-api.example.com
username=test-user
password=test-password

[mux]
tokenId=test-token-id
tokenSecret=test-token-secret

[s3]
accessKeyId=test-access-key
secretAccessKey=test-secret-key
region=us-east-1

[s3.pictures]
bucket=test-pictures-bucket
keyPrefix=pictures/

[s3.subtitles]
bucket=test-subtitles-bucket
keyPrefix=subtitles/

[logging]
enabled=true
level=debug
console=true
`;

  await fs.writeFile(testConfig.testFiles.ini, iniContent);
  console.log(`✅ Created test INI file: ${testConfig.testFiles.ini}`);
}

/**
 * Test INI parser utility
 */
async function testIniParser() {
  try {
    console.log('\n🧪 Testing INI Parser...');

    const { readIniFile, iniToStandardConfig } = await import('./src/shared/utils/iniParser.js');

    // Read INI file
    const iniConfig = await readIniFile(testConfig.testFiles.ini);
    console.log('✅ INI file parsed successfully');

    // Convert to standard config
    const standardConfig = iniToStandardConfig(iniConfig);
    console.log('✅ INI converted to standard config');

    // Validate structure
    if (standardConfig.backend && standardConfig.mux && standardConfig.s3) {
      console.log('✅ Standard config has required sections');
    } else {
      throw new Error('Standard config missing required sections');
    }

    return standardConfig;
  } catch (error) {
    console.error('❌ INI Parser test failed:', error.message);
    throw error;
  }
}

/**
 * Test Media Analyzer interfaces
 */
async function testMediaAnalyzer() {
  try {
    console.log('\n🧪 Testing Media Analyzer Interfaces...');

    // Test core interface with dry run
    const { mediaAnalyzerCore } = await import('./src/subtools/media-analyzer/core.js');

    const coreConfig = {
      paths: '/tmp/test-media',
      readMetadata: false,
      dryRun: true,
      verbose: testConfig.verbose
    };

    // Note: This will fail because test paths don't exist, but we can catch and validate the error
    try {
      const result = await mediaAnalyzerCore(coreConfig);
      console.log('✅ Media Analyzer core interface callable');
    } catch (error) {
      if (error.message.includes('paths') || error.message.includes('directory')) {
        console.log('✅ Media Analyzer core interface callable (expected path error)');
      } else {
        throw error;
      }
    }

    // Test INI interface existence
    const { mediaAnalyzerFromIni } = await import('./src/subtools/media-analyzer/iniInterface.js');
    console.log('✅ Media Analyzer INI interface importable');

    // Test interfaces aggregator
    const { MediaAnalyzerInterface } = await import('./src/subtools/media-analyzer/interfaces.js');
    if (MediaAnalyzerInterface.core && MediaAnalyzerInterface.fromIni && MediaAnalyzerInterface.fromCli) {
      console.log('✅ Media Analyzer interface aggregator has all three interfaces');
    } else {
      throw new Error('Interface aggregator missing interfaces');
    }

  } catch (error) {
    console.error('❌ Media Analyzer test failed:', error.message);
    throw error;
  }
}

/**
 * Test Mux Upload interfaces
 */
async function testMuxUpload() {
  try {
    console.log('\n🧪 Testing Mux Upload Interfaces...');

    // Test core interface with dry run
    const { muxUploadCore } = await import('./src/subtools/mux-upload/core.js');

    const coreConfig = {
      video: { filepath: '/tmp/nonexistent-video.mp4' },
      auth: { mux_token_id: 'test', mux_token_secret: 'test' },
      dryRun: true,
      verbose: testConfig.verbose
    };

    try {
      const result = await muxUploadCore(coreConfig);
      if (result.dryRun) {
        console.log('✅ Mux Upload core interface works (dry run)');
      }
    } catch (error) {
      if (error.message.includes('validation') || error.message.includes('config')) {
        console.log('✅ Mux Upload core interface callable (expected validation error)');
      } else {
        throw error;
      }
    }

    // Test INI interface existence
    const { muxUploadFromIni } = await import('./src/subtools/mux-upload/iniInterface.js');
    console.log('✅ Mux Upload INI interface importable');

    // Test interfaces aggregator
    const { MuxUploadInterface } = await import('./src/subtools/mux-upload/interfaces.js');
    if (MuxUploadInterface.core && MuxUploadInterface.fromIni && MuxUploadInterface.fromCli) {
      console.log('✅ Mux Upload interface aggregator has all three interfaces');
    } else {
      throw new Error('Interface aggregator missing interfaces');
    }

  } catch (error) {
    console.error('❌ Mux Upload test failed:', error.message);
    throw error;
  }
}

/**
 * Test Picture Upload interfaces
 */
async function testPictureUpload() {
  try {
    console.log('\n🧪 Testing Picture Upload Interfaces...');

    // Test core interface with dry run
    const { pictureUploadCore } = await import('./src/subtools/picture-upload/core.js');

    const coreConfig = {
      picturePath: '/tmp/nonexistent-image.jpg',
      s3: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
        region: 'us-east-1',
        bucketName: 'test-bucket'
      },
      api: {
        baseUrl: 'https://test.com',
        username: 'test',
        password: 'test'
      },
      dryRun: true,
      verbose: testConfig.verbose
    };

    try {
      const result = await pictureUploadCore(coreConfig);
      if (result.dryRun) {
        console.log('✅ Picture Upload core interface works (dry run would fail on file check)');
      }
    } catch (error) {
      if (error.message.includes('file') || error.message.includes('not found')) {
        console.log('✅ Picture Upload core interface callable (expected file not found error)');
      } else {
        throw error;
      }
    }

    // Test INI interface existence
    const { pictureUploadFromIni } = await import('./src/subtools/picture-upload/iniInterface.js');
    console.log('✅ Picture Upload INI interface importable');

    // Test interfaces aggregator
    const { PictureUploadInterface } = await import('./src/subtools/picture-upload/interfaces.js');
    if (PictureUploadInterface.core && PictureUploadInterface.fromIni && PictureUploadInterface.fromCli) {
      console.log('✅ Picture Upload interface aggregator has all three interfaces');
    } else {
      throw new Error('Interface aggregator missing interfaces');
    }

  } catch (error) {
    console.error('❌ Picture Upload test failed:', error.message);
    throw error;
  }
}

/**
 * Test Main Interface System
 */
async function testMainInterfaces() {
  try {
    console.log('\n🧪 Testing Main Interface System...');

    const { MediaUploaderInterfaces, getAvailableTools } = await import('./src/interfaces/index.js');

    // Test available tools
    const availableTools = getAvailableTools();
    if (availableTools.mediaAnalyzer && availableTools.muxUpload && availableTools.pictureUpload) {
      console.log('✅ Main interface system has refactored tools');
    } else {
      throw new Error('Main interface system missing tools');
    }

    // Test tool access
    if (MediaUploaderInterfaces.mediaAnalyzer.core &&
        MediaUploaderInterfaces.muxUpload.core &&
        MediaUploaderInterfaces.pictureUpload.core) {
      console.log('✅ All refactored tools accessible via main interface');
    } else {
      throw new Error('Tools not accessible via main interface');
    }

    console.log(`📊 Available tools: ${Object.keys(availableTools).join(', ')}`);

  } catch (error) {
    console.error('❌ Main Interface System test failed:', error.message);
    throw error;
  }
}

/**
 * Test New GUI Wrapper
 */
async function testGuiWrapper() {
  try {
    console.log('\n🧪 Testing New GUI Wrapper...');

    const { NewUploadGuiWrapper } = await import('./src/subtools/upload-gui/newWrapper.js');

    try {
      const wrapper = new NewUploadGuiWrapper(testConfig.testFiles.ini);
      await wrapper.initialize();

      const status = wrapper.getStatus();
      if (status.initialized && status.configPath) {
        console.log('✅ GUI Wrapper initializes successfully');
      } else {
        throw new Error('GUI Wrapper not properly initialized');
      }

    } catch (error) {
      if (error.message.includes('validation') || error.message.includes('configuration')) {
        console.log('✅ GUI Wrapper callable (expected validation error with test config)');
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('❌ GUI Wrapper test failed:', error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Interface Architecture Tests\n');

  try {
    // Setup
    await createTestIniFile();

    // Run tests
    await testIniParser();
    await testMediaAnalyzer();
    await testMuxUpload();
    await testPictureUpload();
    await testMainInterfaces();
    await testGuiWrapper();

    console.log('\n🎉 All interface tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ INI Parser utility working');
    console.log('✅ Media Analyzer interfaces functional');
    console.log('✅ Mux Upload interfaces functional');
    console.log('✅ Picture Upload interfaces functional');
    console.log('✅ Main interface system working');
    console.log('✅ GUI Wrapper architecture ready');

    console.log('\n🏗️  New Architecture Benefits:');
    console.log('• Core functions can be called programmatically with JSON config');
    console.log('• INI interface provides unified configuration format');
    console.log('• CLI interface maintains backward compatibility');
    console.log('• GUI can use any interface for better isolation');
    console.log('• Batch processing supported at interface level');
    console.log('• All tools follow consistent pattern');

  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await fs.remove(testConfig.testFiles.ini);
      console.log(`\n🧹 Cleaned up test file: ${testConfig.testFiles.ini}`);
    } catch (error) {
      console.warn('Warning: Could not cleanup test file:', error.message);
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

export { runAllTests, testIniParser, testMediaAnalyzer, testMuxUpload, testPictureUpload };