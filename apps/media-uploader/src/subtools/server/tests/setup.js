/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Note: jest-extended matchers not available, using alternatives
import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

// Store original process methods
const originalProcess = {
  exit: process.exit,
  send: process.send
};

// Global test utilities
global.testUtils = {
  // Restore console methods
  restoreConsole: () => {
    Object.assign(console, originalConsole);
  },

  // Mock console methods
  mockConsole: () => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  },

  // Mock process methods for worker testing
  mockProcess: () => {
    const mockExit = jest.fn();
    const mockSend = jest.fn();

    // Don't call actual process.exit during tests
    process.exit = mockExit;
    process.send = mockSend;

    return {
      exit: mockExit,
      send: mockSend
    };
  },

  // Restore process methods
  restoreProcess: () => {
    process.exit = originalProcess.exit;
    process.send = originalProcess.send;
  },

  // Wait for a promise to resolve or timeout
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create a mock child process
  createMockChildProcess: () => {
    const EventEmitter = require('events');
    const mockProcess = new EventEmitter();
    mockProcess.pid = Math.floor(Math.random() * 10000) + 1000;
    mockProcess.kill = jest.fn();
    mockProcess.send = jest.fn();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.killed = false;

    return mockProcess;
  },

  // Generate test task data
  createTestTask: (type = 'media-analyzer', options = {}) => ({
    folderPath: options.folderPath || '/test/path',
    config: {
      configPath: options.configPath || '/test/config.ini'
    },
    options: {
      timeout: options.timeout || 60000,
      retry: options.retry || 3,
      ...options.taskOptions
    }
  }),

  // Common test file paths (using actual test files)
  testFiles: {
    video: 'C:\\GitHub\\kftv-kyool\\uploader-test-files\\EX 01 - pompom bag.mp4',
    image: 'C:\\GitHub\\kftv-kyool\\uploader-test-files\\pompom bag - 1080x1080.jpg',
    subtitle: 'C:\\GitHub\\kftv-kyool\\uploader-test-files\\EX 01 - pompom bag - en.srt',
    excel: 'C:\\GitHub\\kftv-kyool\\uploader-test-files\\0_desc_99999_pompom_bag_filled.xlsx',
    config: 'C:\\GitHub\\kftv-kyool\\uploader-test-files\\config.locale.ini',
    directory: 'C:\\GitHub\\kftv-kyool\\uploader-test-files'
  }
};

// Mock process.exit globally to prevent test interruption
const originalExit = process.exit;
const mockProcessExit = jest.fn((code) => {
  console.warn(`process.exit(${code}) called in test - this has been mocked`);
  // Don't actually exit
});
process.exit = mockProcessExit;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  global.testUtils.restoreConsole();
  global.testUtils.restoreProcess();

  // Reset process.exit mock
  mockProcessExit.mockClear();
});

// Restore original process.exit when tests complete
process.on('exit', () => {
  process.exit = originalExit;
});

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Minimize logging during tests
process.env.PORT = '0'; // Use random port for testing