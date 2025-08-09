module.exports = {
  displayName: 'Critical Tests',
  testMatch: ['<rootDir>/tests/critical/**/*.test.js'],
  testEnvironment: 'node',
  verbose: true,
  bail: true, // Stop on first test failure for critical tests
};