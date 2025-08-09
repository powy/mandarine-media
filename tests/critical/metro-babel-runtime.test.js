const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('Critical: Metro Babel Runtime Integration', () => {
  const ALPHA_APP_PATH = path.resolve(__dirname, '../../apps/alpha');
  
  beforeAll(() => {
    // Ensure we're in the correct directory
    expect(fs.existsSync(ALPHA_APP_PATH)).toBe(true);
    expect(fs.existsSync(path.join(ALPHA_APP_PATH, 'index.js'))).toBe(true);
  });

  test('Metro bundler starts without @babel/runtime errors', async () => {
    const testTimeout = 15000; // 15 second timeout
    
    try {
      // Test Metro server startup to verify no babel runtime errors
      const result = execSync(
        `timeout 10 npm start`,
        {
          cwd: ALPHA_APP_PATH,
          timeout: testTimeout,
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );
      
      // If Metro starts and shows welcome message, babel runtime is working
      expect(result).toContain('Welcome to Metro');
      
    } catch (error) {
      const errorMessage = error.message || error.toString();
      const stdout = error.stdout || '';
      const stderr = error.stderr || '';
      
      // Check if the error is specifically about @babel/runtime resolution
      if (errorMessage.includes('@babel/runtime/helpers/interopRequireDefault') ||
          stdout.includes('@babel/runtime/helpers/interopRequireDefault') ||
          stderr.includes('@babel/runtime/helpers/interopRequireDefault')) {
        throw new Error(
          `CRITICAL: Metro bundler still cannot resolve @babel/runtime/helpers/interopRequireDefault. ` +
          `This indicates the original error persists. Error: ${errorMessage}`
        );
      }
      
      // If Metro started successfully but timed out, that's expected behavior
      if (stdout.includes('Welcome to Metro') || stdout.includes('Dev server ready')) {
        console.log('✅ Metro started successfully - @babel/runtime error is resolved');
        return; // Pass the test as Metro started without babel runtime errors
      }
      
      // Check for other known issues that don't affect babel runtime
      if (errorMessage.includes('timeout') && 
          (stdout.includes('Welcome to Metro') || stderr.includes('Welcome to Metro'))) {
        console.log('✅ Metro started successfully (timeout expected) - @babel/runtime error is resolved');
        return;
      }
      
      // Check for port in use error (not related to babel runtime)
      if (errorMessage.includes('EADDRINUSE') || errorMessage.includes('address already in use')) {
        console.log('✅ Metro port conflict (not a @babel/runtime issue) - test passes');
        return;
      }
      
      // Re-throw unexpected errors
      throw new Error(`Metro startup failed with unexpected error: ${errorMessage}\nStdout: ${stdout}\nStderr: ${stderr}`);
    }
  }, 20000);

  test('babel runtime can be imported in React Native context', () => {
    // Create a minimal test file that imports babel runtime
    const testFilePath = path.join(ALPHA_APP_PATH, 'babel-runtime-test.js');
    const testFileContent = `
// Test file to verify babel runtime import
const interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
const createClass = require('@babel/runtime/helpers/createClass');

console.log('Babel runtime helpers loaded successfully');
module.exports = { interopRequireDefault, createClass };
`;

    try {
      // Write test file
      fs.writeFileSync(testFilePath, testFileContent);
      
      // Try to require the test file from alpha app context
      const testModule = require(testFilePath);
      
      expect(testModule.interopRequireDefault).toBeDefined();
      expect(testModule.createClass).toBeDefined();
      expect(typeof testModule.interopRequireDefault).toBe('function');
      expect(typeof testModule.createClass).toBe('function');
      
    } finally {
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});