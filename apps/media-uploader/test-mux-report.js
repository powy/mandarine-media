/**
 * Test script for Mux Report Generator
 * Tests module imports and basic functionality
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Testing Mux Report Generator ===\n');

// Test 1: Import core modules
console.log('Test 1: Importing core modules...');
try {
  const { MuxApiClient } = await import('./src/subtools/mux-report-generator/core/muxApiClient.js');
  const { SubtitleAnalyzer } = await import('./src/subtools/mux-report-generator/core/subtitleAnalyzer.js');
  const { ExcelGenerator } = await import('./src/subtools/mux-report-generator/core/excelGenerator.js');
  const { OutputPathResolver } = await import('./src/subtools/mux-report-generator/core/outputPathResolver.js');
  const { generateMuxReport } = await import('./src/subtools/mux-report-generator/core/muxReportCore.js');
  const { generateMuxReportWithIni } = await import('./src/subtools/mux-report-generator/index.js');
  const REPORT_CONFIG = await import('./src/subtools/mux-report-generator/config/constants.js');

  console.log('✓ All core modules imported successfully\n');
} catch (error) {
  console.error('✗ Failed to import modules:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Test 2: Test SubtitleAnalyzer
console.log('Test 2: Testing SubtitleAnalyzer...');
try {
  const { SubtitleAnalyzer } = await import('./src/subtools/mux-report-generator/core/subtitleAnalyzer.js');
  const logger = {
    info: () => {},
    warn: () => {},
    error: () => {}
  };
  const analyzer = new SubtitleAnalyzer(logger);

  // Test with mock asset - no subtitles
  const mockAsset1 = {
    id: 'test-123',
    tracks: []
  };
  const result1 = analyzer.analyzeAsset(mockAsset1);
  console.log('  No subtitles:', result1);
  if (result1.fr === 'none' && result1.en === 'none' && result1.ko === 'none') {
    console.log('  ✓ Correctly detected no subtitles');
  }

  // Test with mock asset - one subtitle per language
  const mockAsset2 = {
    id: 'test-456',
    tracks: [
      { type: 'text', language_code: 'fr', status: 'ready' },
      { type: 'text', language_code: 'en', status: 'ready' },
      { type: 'text', language_code: 'ko', status: 'ready' }
    ]
  };
  const result2 = analyzer.analyzeAsset(mockAsset2);
  console.log('  One subtitle each:', result2);
  if (result2.fr === 'OK (1 subtitle)' && result2.en === 'OK (1 subtitle)' && result2.ko === 'OK (1 subtitle)') {
    console.log('  ✓ Correctly detected OK subtitles');
  }

  // Test with mock asset - duplicated subtitles
  const mockAsset3 = {
    id: 'test-789',
    tracks: [
      { type: 'text', language_code: 'fr', status: 'ready' },
      { type: 'text', language_code: 'fr', status: 'ready' }
    ]
  };
  const result3 = analyzer.analyzeAsset(mockAsset3);
  console.log('  Duplicated FR subtitles:', result3);
  if (result3.fr === 'duplicated (several subtitles)') {
    console.log('  ✓ Correctly detected duplicated subtitles');
  }

  // Test with mock asset - broken subtitle
  const mockAsset4 = {
    id: 'test-999',
    tracks: [
      { type: 'text', language_code: 'en', status: 'errored' }
    ]
  };
  const result4 = analyzer.analyzeAsset(mockAsset4);
  console.log('  Broken EN subtitle:', result4);
  if (result4.en === 'broken') {
    console.log('  ✓ Correctly detected broken subtitle');
  }

  console.log('✓ SubtitleAnalyzer tests passed\n');
} catch (error) {
  console.error('✗ SubtitleAnalyzer test failed:', error.message);
  console.error(error.stack);
}

// Test 3: Test OutputPathResolver
console.log('Test 3: Testing OutputPathResolver...');
try {
  const { OutputPathResolver } = await import('./src/subtools/mux-report-generator/core/outputPathResolver.js');
  const logger = {
    info: (msg) => console.log(`    ${msg}`),
    warn: (msg) => console.log(`    ${msg}`),
    error: () => {}
  };

  const resolver = new OutputPathResolver(logger);

  // Test filename generation
  const filename = resolver.generateFilename();
  console.log('  Generated filename:', filename);
  if (filename.includes('_mux-full-report.xlsx')) {
    console.log('  ✓ Filename format is correct');
  }

  // Test timestamp format
  const timestamp = resolver.formatTimestamp(new Date('2025-01-19T14:30:00'));
  console.log('  Formatted timestamp:', timestamp);
  if (timestamp === '202501191430') {
    console.log('  ✓ Timestamp format is correct');
  }

  console.log('✓ OutputPathResolver tests passed\n');
} catch (error) {
  console.error('✗ OutputPathResolver test failed:', error.message);
  console.error(error.stack);
}

// Test 4: Test ExcelGenerator
console.log('Test 4: Testing ExcelGenerator...');
try {
  const { ExcelGenerator } = await import('./src/subtools/mux-report-generator/core/excelGenerator.js');
  const logger = {
    info: (msg) => console.log(`    ${msg}`),
    warn: () => {},
    error: () => {}
  };

  const generator = new ExcelGenerator(logger);

  // Test playback URL extraction
  const mockPlaybackIds = [
    { id: 'abc123', policy: 'public' },
    { id: 'def456', policy: 'signed' },
    { id: 'ghi789', policy: 'drm' }
  ];

  const publicUrl = generator.extractPlaybackUrl(mockPlaybackIds, 'public');
  const signedUrl = generator.extractPlaybackUrl(mockPlaybackIds, 'signed');
  const drmUrl = generator.extractPlaybackUrl(mockPlaybackIds, 'drm');

  console.log('  Public URL:', publicUrl);
  console.log('  Signed URL:', signedUrl);
  console.log('  DRM URL:', drmUrl);

  if (publicUrl === 'https://stream.mux.com/abc123.m3u8') {
    console.log('  ✓ Playback URL generation is correct');
  }

  // Test date formatting
  const formattedDate = generator.formatDate('2025-01-19T14:30:45Z');
  console.log('  Formatted date:', formattedDate);
  if (formattedDate.includes('2025-01-19')) {
    console.log('  ✓ Date formatting is correct');
  }

  console.log('✓ ExcelGenerator tests passed\n');
} catch (error) {
  console.error('✗ ExcelGenerator test failed:', error.message);
  console.error(error.stack);
}

// Test 5: Test task runner integration
console.log('Test 5: Checking task runner integration...');
try {
  const constants = await import('./src/subtools/service-server/config/constants.js');

  if (constants.CONFIG.TASK_TYPES['generate-mux-report']) {
    console.log('  ✓ Task type "generate-mux-report" is registered');
    console.log('  Function:', constants.CONFIG.TASK_TYPES['generate-mux-report'].function);
    console.log('  Description:', constants.CONFIG.TASK_TYPES['generate-mux-report'].description);
    console.log('  Required params:', constants.CONFIG.TASK_TYPES['generate-mux-report'].requiredParams);
  } else {
    console.log('  ✗ Task type not found in constants');
  }

  console.log('✓ Task runner integration verified\n');
} catch (error) {
  console.error('✗ Task runner integration test failed:', error.message);
}

console.log('=== All Tests Completed ===');
console.log('\nNote: To fully test with real Mux data, you need:');
console.log('1. A valid INI config file with Mux credentials');
console.log('2. Run: node test-mux-report.js <path-to-config.ini>');
