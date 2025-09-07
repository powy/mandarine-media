export default {
  displayName: 'media-uploader',
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '<rootDir>/src/**/*.(test|spec).js',
    '<rootDir>/tests/**/*.(test|spec).js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: '../../coverage/apps/media-uploader',
  passWithNoTests: true
};