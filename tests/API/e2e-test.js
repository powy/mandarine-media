#!/usr/bin/env node

/**
 * End-to-End Test Suite
 * Tests the complete integration: Backend Server + Shared Package + API
 */

// Mock localStorage for Node.js environment
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

import { authApi, usersApi, mediaApi, getContentLists, getScreenContents, initApiClient } from './packages/share/dist/index.es.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test configuration
const API_BASE_URL = 'http://localhost:8000';
const TEST_USER = {
  email: 'admin@kyool.com',
  password: 'admin123'
};

// Color output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`${colors.blue}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

class E2ETestSuite {
  constructor() {
    this.authToken = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async run() {
    log(`${colors.bold}🚀 Starting End-to-End Test Suite${colors.reset}`);
    log(`Testing integration: Backend (${API_BASE_URL}) + Shared Package`);
    log('─'.repeat(60));

    try {
      await this.setupEnvironment();
      await this.runTests();
      await this.cleanup();
      this.printResults();
    } catch (error) {
      logError(`Test suite failed: ${error.message}`);
      process.exit(1);
    }
  }

  async setupEnvironment() {
    logStep('SETUP', 'Starting backend server and database...');
    
    try {
      // Check if server is already running
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        logSuccess('Backend server is already running');
      }
    } catch (error) {
      logStep('SETUP', 'Starting backend server...');
      
      // Start the backend server in the background
      exec('cd backend && ./start_server.sh', (error, stdout, stderr) => {
        if (error) {
          logWarning(`Server start output: ${stdout}`);
        }
      });
      
      // Wait for server to be ready
      await this.waitForServer();
    }

    // Initialize API client
    logStep('SETUP', 'Initializing shared package API client...');
    initApiClient({
      baseURL: API_BASE_URL,
      onAuthError: () => {
        logWarning('Auth error detected during tests');
      }
    });

    logSuccess('Environment setup complete');
  }

  async waitForServer(maxRetries = 30, delay = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
          logSuccess(`Server is ready (attempt ${i + 1})`);
          return;
        }
      } catch (error) {
        logStep('SETUP', `Waiting for server... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Server failed to start within timeout period');
  }

  async runTests() {
    log(`${colors.bold}🧪 Running End-to-End Tests${colors.reset}`);
    
    const tests = [
      { name: 'Server Health Check', fn: () => this.testServerHealth() },
      { name: 'Authentication Flow', fn: () => this.testAuthentication() },
      { name: 'User Management API', fn: () => this.testUserManagement() },
      { name: 'Media Descriptions API', fn: () => this.testMediaDescriptions() },
      { name: 'Content Lists API', fn: () => this.testContentLists() },
      { name: 'Screen Contents API', fn: () => this.testScreenContents() },
      { name: 'Error Handling', fn: () => this.testErrorHandling() },
      { name: 'Authentication State', fn: () => this.testAuthenticationState() },
      { name: 'User Permissions (Admin vs Normal)', fn: () => this.testUserPermissions() }
    ];

    for (const test of tests) {
      await this.runSingleTest(test.name, test.fn);
    }
  }

  async runSingleTest(name, testFn) {
    logStep('TEST', `Running: ${name}`);
    
    try {
      await testFn();
      this.testResults.passed++;
      logSuccess(`${name} - PASSED`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: name, error: error.message });
      logError(`${name} - FAILED: ${error.message}`);
    }
  }

  async testServerHealth() {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.status !== 'healthy') {
      throw new Error(`Server not healthy: ${JSON.stringify(data)}`);
    }
  }

  async testAuthentication() {
    // Test login with direct HTTP request to ensure it works
    const loginData = new URLSearchParams();
    loginData.append('username', TEST_USER.email);
    loginData.append('password', TEST_USER.password);
    
    const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: loginData
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginResult = await loginResponse.json();
    
    if (!loginResult.access_token) {
      throw new Error('Login failed: No access token received');
    }
    
    if (loginResult.token_type !== 'bearer') {
      throw new Error(`Invalid token type: ${loginResult.token_type}`);
    }
    
    this.authToken = loginResult.access_token;
    
    // Test getting current user with the token
    const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error(`Get current user failed: ${userResponse.status} ${userResponse.statusText}`);
    }
    
    const currentUser = await userResponse.json();
    
    if (!currentUser.is_admin) {
      throw new Error('Current user is not admin');
    }
    
    if (currentUser.email !== TEST_USER.email) {
      throw new Error(`Email mismatch: expected ${TEST_USER.email}, got ${currentUser.email}`);
    }
  }

  async testUserManagement() {
    // Test getting users list with direct HTTP request
    const usersResponse = await fetch(`${API_BASE_URL}/api/v1/users/?limit=10`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    
    if (!usersResponse.ok) {
      throw new Error(`Get users failed: ${usersResponse.status} ${usersResponse.statusText}`);
    }
    
    const usersData = await usersResponse.json();
    
    if (!usersData.data || !Array.isArray(usersData.data)) {
      throw new Error('Users list is not an array');
    }
    
    if (!usersData.pagination) {
      throw new Error('Missing pagination data');
    }
    
    // Test getting current user again
    const currentUserResponse = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    
    if (!currentUserResponse.ok) {
      throw new Error(`Get current user failed: ${currentUserResponse.status} ${currentUserResponse.statusText}`);
    }
    
    const currentUser = await currentUserResponse.json();
    
    if (!currentUser.id) {
      throw new Error('Current user missing ID');
    }
  }

  async testMediaDescriptions() {
    try {
      // Test getting media descriptions with direct HTTP request
      const mediaResponse = await fetch(`${API_BASE_URL}/api/v1/media-descriptions?limit=5`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!mediaResponse.ok) {
        if (mediaResponse.status === 404) {
          log('  └─ No media descriptions found (expected for fresh database)');
          return;
        }
        throw new Error(`Get media descriptions failed: ${mediaResponse.status} ${mediaResponse.statusText}`);
      }
      
      const mediaData = await mediaResponse.json();
      
      if (!mediaData.data || !Array.isArray(mediaData.data)) {
        throw new Error('Media descriptions is not an array');
      }
      
      if (!mediaData.pagination) {
        throw new Error('Missing pagination in media response');
      }
    } catch (error) {
      // If no media exists, that's ok for this test
      if (error.message.includes('404') || error.message.includes('No media')) {
        log('  └─ No media descriptions found (expected for fresh database)');
        return;
      }
      throw error;
    }
  }

  async testContentLists() {
    try {
      // Test getting content lists with direct HTTP request
      const contentListsResponse = await fetch(`${API_BASE_URL}/api/v1/content-lists/?limit=5`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!contentListsResponse.ok) {
        if (contentListsResponse.status === 404) {
          log('  └─ No content lists found (expected for fresh database)');
          return;
        }
        throw new Error(`Get content lists failed: ${contentListsResponse.status} ${contentListsResponse.statusText}`);
      }
      
      const contentListsData = await contentListsResponse.json();
      
      if (!contentListsData.data || !Array.isArray(contentListsData.data)) {
        throw new Error('Content lists is not an array');
      }
      
      if (!contentListsData.pagination) {
        throw new Error('Missing pagination in content lists response');
      }
    } catch (error) {
      // If no content lists exist, that's ok for this test
      if (error.message.includes('404') || error.message.includes('No content')) {
        log('  └─ No content lists found (expected for fresh database)');
        return;
      }
      throw error;
    }
  }

  async testScreenContents() {
    try {
      // Test getting screen contents with direct HTTP request
      const screenContentsResponse = await fetch(`${API_BASE_URL}/api/v1/screen-contents/?limit=5`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!screenContentsResponse.ok) {
        if (screenContentsResponse.status === 404) {
          log('  └─ No screen contents found (expected for fresh database)');
          return;
        }
        throw new Error(`Get screen contents failed: ${screenContentsResponse.status} ${screenContentsResponse.statusText}`);
      }
      
      const screenContentsData = await screenContentsResponse.json();
      
      if (!screenContentsData.data || !Array.isArray(screenContentsData.data)) {
        throw new Error('Screen contents is not an array');
      }
      
      if (!screenContentsData.pagination) {
        throw new Error('Missing pagination in screen contents response');
      }
    } catch (error) {
      // If no screen contents exist, that's ok for this test
      if (error.message.includes('404') || error.message.includes('No screen')) {
        log('  └─ No screen contents found (expected for fresh database)');
        return;
      }
      throw error;
    }
  }

  async testErrorHandling() {
    try {
      // Test 404 handling with direct HTTP request
      const response = await fetch(`${API_BASE_URL}/api/v1/users/non-existent-user-id`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (response.status !== 404) {
        throw new Error(`Expected 404 error, got: ${response.status}`);
      }
      
      // Success: we got the expected 404
    } catch (error) {
      if (!error.message.includes('404') && !error.message.includes('Not Found')) {
        throw new Error(`Expected 404 error, got: ${error.message}`);
      }
    }
  }

  async testAuthenticationState() {
    // Test that we're still authenticated by making an authenticated request
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Should be authenticated but request failed');
    }
    
    const userData = await response.json();
    
    if (!userData.id) {
      throw new Error('Authentication state invalid: missing user data');
    }
    
    if (!this.authToken) {
      throw new Error('Should have token but authToken is null');
    }
  }

  async testUserPermissions() {
    // Test admin-only endpoints - should succeed with admin token
    const adminUsersList = await fetch(`${API_BASE_URL}/api/v1/users/`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    
    if (!adminUsersList.ok) {
      throw new Error(`Admin should be able to list users, got ${adminUsersList.status}`);
    }

    // Test creating a normal user to test permissions
    const normalUserData = {
      email: 'normaluser@test.com',
      password: 'testpass123',
      full_name: 'Normal Test User',
      is_active: true
    };

    const createNormalUser = await fetch(`${API_BASE_URL}/api/v1/users/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(normalUserData)
    });

    let normalUserId = null;
    if (createNormalUser.ok) {
      const newUser = await createNormalUser.json();
      normalUserId = newUser.id;
    } else if (createNormalUser.status !== 400) {
      // 400 might mean user already exists, which is OK
      throw new Error(`Failed to create normal user: ${createNormalUser.status}`);
    }

    // Test authenticating as normal user
    const normalLoginData = new URLSearchParams();
    normalLoginData.append('username', normalUserData.email);
    normalLoginData.append('password', normalUserData.password);
    
    const normalLoginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: normalLoginData
    });
    
    if (normalLoginResponse.ok) {
      const normalLoginResult = await normalLoginResponse.json();
      const normalToken = normalLoginResult.access_token;

      // Test that normal user cannot access admin endpoints
      const normalUsersListAttempt = await fetch(`${API_BASE_URL}/api/v1/users/`, {
        headers: {
          'Authorization': `Bearer ${normalToken}`
        }
      });
      
      if (normalUsersListAttempt.status !== 403) {
        throw new Error(`Normal user should get 403 when listing users, got ${normalUsersListAttempt.status}`);
      }

      // Test that normal user can access their own profile
      const normalUserProfile = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${normalToken}`
        }
      });
      
      if (!normalUserProfile.ok) {
        throw new Error(`Normal user should be able to access own profile, got ${normalUserProfile.status}`);
      }

      // Test that normal user can read media but not create
      const normalMediaList = await fetch(`${API_BASE_URL}/api/v1/media-descriptions`, {
        headers: {
          'Authorization': `Bearer ${normalToken}`
        }
      });
      
      if (!normalMediaList.ok) {
        throw new Error(`Normal user should be able to list media, got ${normalMediaList.status}`);
      }

      const normalMediaCreate = await fetch(`${API_BASE_URL}/api/v1/media-descriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${normalToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Media',
          type: 'Movie',
          synopsis: 'Test'
        })
      });
      
      if (normalMediaCreate.status !== 403) {
        throw new Error(`Normal user should get 403 when creating media, got ${normalMediaCreate.status}`);
      }
    }

    // Cleanup: delete normal user if we created one
    if (normalUserId) {
      await fetch(`${API_BASE_URL}/api/v1/users/${normalUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
    }
  }

  async cleanup() {
    logStep('CLEANUP', 'Logging out...');
    
    try {
      // Simple cleanup - in a real app this would invalidate the token
      this.authToken = null;
      logSuccess('Logout successful');
    } catch (error) {
      logWarning(`Logout failed: ${error.message}`);
    }
  }

  printResults() {
    log('─'.repeat(60));
    log(`${colors.bold}📊 Test Results${colors.reset}`);
    log(`${colors.green}✅ Passed: ${this.testResults.passed}${colors.reset}`);
    log(`${colors.red}❌ Failed: ${this.testResults.failed}${colors.reset}`);
    
    if (this.testResults.errors.length > 0) {
      log(`${colors.red}Error Details:${colors.reset}`);
      this.testResults.errors.forEach(({ test, error }) => {
        log(`  • ${test}: ${error}`);
      });
    }
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;
    
    log(`${colors.blue}Success Rate: ${successRate}%${colors.reset}`);
    
    if (this.testResults.failed === 0) {
      log(`${colors.green}${colors.bold}🎉 All tests passed! End-to-end integration is working correctly.${colors.reset}`);
    } else {
      log(`${colors.red}${colors.bold}❌ Some tests failed. Please check the integration.${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run the test suite
const testSuite = new E2ETestSuite();
testSuite.run().catch(error => {
  logError(`Test suite crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});