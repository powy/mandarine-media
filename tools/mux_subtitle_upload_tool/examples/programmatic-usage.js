#!/usr/bin/env node

/**
 * Example: Using SubtitleService programmatically with explicit credentials
 */

import SubtitleService from '../src/services/subtitleService.js';

async function exampleWithExplicitCredentials() {
  console.log('=== Example: Using SubtitleService.withCredentials() ===');
  
  try {
    const result = await SubtitleService.withCredentials({
      awsCredentials: {
        accessKeyId: 'YOUR_AWS_ACCESS_KEY',
        secretAccessKey: 'YOUR_AWS_SECRET_KEY', 
        region: 'us-east-1',
        bucket: 'your-subtitle-bucket'
      },
      muxCredentials: {
        tokenId: 'YOUR_MUX_TOKEN_ID',
        tokenSecret: 'YOUR_MUX_TOKEN_SECRET'
      },
      assetId: 'your-mux-asset-id',
      subtitles: [
        {
          file_path: './test-data/test_english.srt',
          language_code: 'en',
          name: 'English',
          text_type: 'subtitles',
          closed_captions: false
        }
      ],
      options: {
        cleanupDelayMinutes: 60,
        maxRetryAttempts: 2,
        logLevel: 'debug'
      }
    });

    console.log('Upload completed:', result);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}

async function exampleWithEnvironmentVariables() {
  console.log('\n=== Example: Using SubtitleService.withEnvironment() ===');
  
  try {
    const result = await SubtitleService.withEnvironment(
      'your-mux-asset-id', // Asset ID
      [
        {
          file_path: './test-data/test_english.srt',
          language_code: 'en',
          name: 'English'
        }
      ], // Subtitles array
      { 
        cleanupDelayMinutes: 60,
        logLevel: 'info' 
      } // Options
    );

    console.log('Upload completed:', result);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}

async function exampleWithConfigObject() {
  console.log('\n=== Example: Using traditional constructor (unchanged) ===');
  
  const config = {
    auth: {
      mux_token_id: 'YOUR_MUX_TOKEN_ID',
      mux_token_secret: 'YOUR_MUX_TOKEN_SECRET'
    },
    s3: {
      access_key_id: 'YOUR_AWS_ACCESS_KEY',
      secret_access_key: 'YOUR_AWS_SECRET_KEY',
      region: 'us-east-1',
      bucket_name: 'your-subtitle-bucket'
    },
    mux_asset_id: 'your-mux-asset-id',
    subtitles: [
      {
        file_path: './test-data/test_english.srt',
        language_code: 'en', 
        name: 'English'
      }
    ]
  };

  try {
    const { createLogger } = await import('../src/config/logger.js');
    const logger = createLogger(config);
    
    const service = new SubtitleService(config, logger);
    const result = await service.uploadSubtitles();
    
    console.log('Upload completed:', result);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}

// Run examples (commented out to avoid actual execution)
console.log('Subtitle Service Usage Examples');
console.log('================================');
console.log('');
console.log('Method 1: Explicit credentials (NEW)');
console.log('SubtitleService.withCredentials({ awsCredentials, muxCredentials, ... })');
console.log('');
console.log('Method 2: Environment variables (NEW)'); 
console.log('SubtitleService.withEnvironment(assetId, subtitles, options)');
console.log('');
console.log('Method 3: Config object (EXISTING)');
console.log('new SubtitleService(config, logger)');
console.log('');
console.log('Uncomment the function calls below to test with real credentials.');

// Uncomment to test with real credentials:
// await exampleWithExplicitCredentials();
// await exampleWithEnvironmentVariables(); 
// await exampleWithConfigObject();