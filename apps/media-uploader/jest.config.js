export default {
  displayName: 'media-uploader',
  testEnvironment: 'node',

  // ES Modules support
  preset: null,
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },

  testMatch: [
    '<rootDir>/src/**/*.(test|spec).js',
    '<rootDir>/tests/**/*.(test|spec).js'
  ],

  // Setup files for server tests
  setupFilesAfterEnv: [
    '<rootDir>/src/subtools/server/tests/setup.js'
  ],

  // Test timeout for longer operations
  testTimeout: 30000,

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: '../../coverage/apps/media-uploader',

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/logs/'
  ],

  passWithNoTests: true
};