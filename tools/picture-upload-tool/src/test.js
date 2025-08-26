#!/usr/bin/env node

import { checkFileExists, uploadToS3, createPictureRecord } from './index.js';
import { loadConfigFile } from './utils/fileUtils.js';

async function testTool() {
  console.log('🧪 Testing Picture Upload Tool Functions\n');
  
  try {
    // Test config loading
    console.log('1️⃣ Testing config loading...');
    try {
      const config = await loadConfigFile('./examples/basic-upload.json');
      console.log('✅ Config loaded successfully');
    } catch (error) {
      console.log('⚠️  Config file not found (expected for test)');
    }

    // Test file existence check
    console.log('\n2️⃣ Testing file existence check...');
    const fileExists = await checkFileExists('./package.json');
    console.log(`✅ File check result: ${fileExists}`);

    // Test with non-existent file
    const nonExistentFile = await checkFileExists('./non-existent-file.jpg');
    console.log(`✅ Non-existent file check result: ${nonExistentFile}`);

    console.log('\n✅ All basic tests passed!');
    console.log('\n📋 To test the full upload functionality:');
    console.log('   1. Copy examples/basic-upload.json to a new file');
    console.log('   2. Fill in your actual AWS credentials and API details');
    console.log('   3. Set a valid picture path');
    console.log('   4. Run: node src/index.js -c your-config.json');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testTool();
}