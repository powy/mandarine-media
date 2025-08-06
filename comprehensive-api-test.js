#!/usr/bin/env node

/**
 * Comprehensive API Permission Test Suite
 * Tests all CRUD operations with both admin and normal user permissions
 */

// Mock localStorage for Node.js environment
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test configuration
const API_BASE_URL = 'http://localhost:8000';
const ADMIN_USER = {
  email: 'admin@kyool.com',
  password: 'admin123'
};

// We'll create a normal user for testing
const NORMAL_USER = {
  email: 'normaluser@test.com',
  password: 'testpass123',
  full_name: 'Normal Test User',
  is_active: true
};

// Color output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
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

function logInfo(message) {
  log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

class ComprehensiveAPITest {
  constructor() {
    this.adminToken = null;
    this.normalUserToken = null;
    this.normalUserId = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    };
    
    // Test data storage for cleanup
    this.createdResources = {
      mediaDescriptions: [],
      videoFiles: [],
      programs: [],
      seasons: [],
      persons: [],
      countries: [],
      languages: [],
      territories: [],
      pictures: [],
      categoryLists: [],
      contentLists: [],
      screenContents: []
    };
  }

  async run() {
    log(`${colors.bold}🚀 Starting Comprehensive API Permission Test Suite${colors.reset}`);
    log(`Testing all CRUD operations with Admin vs Normal User permissions`);
    log('─'.repeat(80));

    try {
      await this.setupEnvironment();
      await this.runAllTests();
      await this.cleanup();
      this.printResults();
    } catch (error) {
      logError(`Test suite failed: ${error.message}`);
      process.exit(1);
    }
  }

  async setupEnvironment() {
    logStep('SETUP', 'Checking server health...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error('Server is not healthy');
    }
    logSuccess('Server is healthy');

    logStep('SETUP', 'Authenticating admin user...');
    await this.authenticateAdmin();
    
    logStep('SETUP', 'Creating normal user for testing...');
    await this.createNormalUser();
    
    logStep('SETUP', 'Authenticating normal user...');
    await this.authenticateNormalUser();
    
    logSuccess('Environment setup complete');
  }

  async authenticateAdmin() {
    const loginData = new URLSearchParams();
    loginData.append('username', ADMIN_USER.email);
    loginData.append('password', ADMIN_USER.password);
    
    const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: loginData
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Admin login failed: ${loginResponse.status}`);
    }
    
    const loginResult = await loginResponse.json();
    this.adminToken = loginResult.access_token;
    logSuccess('Admin authenticated successfully');
  }

  async createNormalUser() {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(NORMAL_USER)
    });
    
    if (response.ok) {
      const user = await response.json();
      this.normalUserId = user.id;
      logSuccess('Normal user created successfully');
    } else if (response.status === 400) {
      // User might already exist
      logWarning('Normal user already exists, continuing...');
    } else {
      throw new Error(`Failed to create normal user: ${response.status}`);
    }
  }

  async authenticateNormalUser() {
    const loginData = new URLSearchParams();
    loginData.append('username', NORMAL_USER.email);
    loginData.append('password', NORMAL_USER.password);
    
    const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: loginData
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Normal user login failed: ${loginResponse.status}`);
    }
    
    const loginResult = await loginResponse.json();
    this.normalUserToken = loginResult.access_token;
    logSuccess('Normal user authenticated successfully');
  }

  async runAllTests() {
    log(`${colors.bold}🧪 Running Comprehensive API Tests${colors.reset}`);
    
    const testCategories = [
      { name: 'Authentication & Users', fn: () => this.testAuthenticationAndUsers() },
      { name: 'Media Descriptions', fn: () => this.testMediaDescriptions() },
      { name: 'Video Files', fn: () => this.testVideoFiles() },
      { name: 'Programs & Seasons', fn: () => this.testProgramsAndSeasons() },
      { name: 'Public Persons', fn: () => this.testPublicPersons() },
      { name: 'Geographic Data', fn: () => this.testGeographicData() },
      { name: 'Languages', fn: () => this.testLanguages() },
      { name: 'Pictures', fn: () => this.testPictures() },
      { name: 'Category Lists', fn: () => this.testCategoryLists() },
      { name: 'Content Lists', fn: () => this.testContentLists() },
      { name: 'Screen Contents', fn: () => this.testScreenContents() }
    ];

    for (const testCategory of testCategories) {
      await this.runSingleTestCategory(testCategory.name, testCategory.fn);
    }
  }

  async runSingleTestCategory(name, testFn) {
    log(`\n${colors.magenta}📂 Testing: ${name}${colors.reset}`);
    
    try {
      await testFn();
      logSuccess(`${name} - Category completed`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ category: name, error: error.message });
      logError(`${name} - Category failed: ${error.message}`);
    }
  }

  async testEndpoint(method, endpoint, userType, expectedStatus, data = null, description = '') {
    const token = userType === 'admin' ? this.adminToken : this.normalUserToken;
    const options = {
      method,
      headers: { 'Authorization': `Bearer ${token}` }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      const testName = `${method} ${endpoint} (${userType})`;
      
      if (Array.isArray(expectedStatus)) {
        if (expectedStatus.includes(response.status)) {
          this.testResults.passed++;
          logInfo(`  ✓ ${testName} - ${response.status} ${description}`);
          return { success: true, response, data: response.ok ? await response.json() : null };
        } else {
          this.testResults.failed++;
          logError(`  ✗ ${testName} - Expected ${expectedStatus.join('|')}, got ${response.status}`);
          return { success: false, response };
        }
      } else {
        if (response.status === expectedStatus) {
          this.testResults.passed++;
          logInfo(`  ✓ ${testName} - ${response.status} ${description}`);
          return { success: true, response, data: response.ok ? await response.json() : null };
        } else {
          this.testResults.failed++;
          logError(`  ✗ ${testName} - Expected ${expectedStatus}, got ${response.status}`);
          return { success: false, response };
        }
      }
    } catch (error) {
      this.testResults.failed++;
      logError(`  ✗ ${method} ${endpoint} (${userType}) - Network error: ${error.message}`);
      return { success: false, error };
    }
  }

  async testAuthenticationAndUsers() {
    // Test current user endpoint
    await this.testEndpoint('GET', '/api/v1/users/me', 'admin', 200, null, 'Admin can get own profile');
    await this.testEndpoint('GET', '/api/v1/users/me', 'normal', 200, null, 'Normal user can get own profile');
    
    // Test users list - admin only
    await this.testEndpoint('GET', '/api/v1/users/', 'admin', 200, null, 'Admin can list users');
    await this.testEndpoint('GET', '/api/v1/users/', 'normal', 403, null, 'Normal user cannot list users');
    
    // Test user creation - admin only
    const newUser = {
      email: 'testuser2@test.com',
      password: 'testpass',
      full_name: 'Test User 2',
      is_active: true
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/users/', 'admin', [201, 400], newUser, 'Admin can create users');
    await this.testEndpoint('POST', '/api/v1/users/', 'normal', 403, newUser, 'Normal user cannot create users');
    
    // Test getting user by ID - admin only
    if (this.normalUserId) {
      await this.testEndpoint('GET', `/api/v1/users/${this.normalUserId}`, 'admin', 200, null, 'Admin can get user by ID');
      await this.testEndpoint('GET', `/api/v1/users/${this.normalUserId}`, 'normal', 403, null, 'Normal user cannot get other users by ID');
    }
  }

  async testMediaDescriptions() {
    // Test listing media descriptions
    await this.testEndpoint('GET', '/api/v1/media-descriptions', 'admin', 200, null, 'Admin can list media');
    await this.testEndpoint('GET', '/api/v1/media-descriptions', 'normal', 200, null, 'Normal user can list media');
    
    // Test creating media description - admin only
    const mediaData = {
      title: 'Test Media',
      type: 'Movie',
      synopsis: 'A test movie',
      status: 'Published'
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/media-descriptions', 'admin', 201, mediaData, 'Admin can create media');
    await this.testEndpoint('POST', '/api/v1/media-descriptions', 'normal', 403, mediaData, 'Normal user cannot create media');
    
    if (createResult.success && createResult.data) {
      const mediaId = createResult.data.id;
      this.createdResources.mediaDescriptions.push(mediaId);
      
      // Test getting specific media
      await this.testEndpoint('GET', `/api/v1/media-descriptions/${mediaId}`, 'admin', 200, null, 'Admin can get media by ID');
      await this.testEndpoint('GET', `/api/v1/media-descriptions/${mediaId}`, 'normal', 200, null, 'Normal user can get media by ID');
      
      // Test updating media - admin only
      const updateData = { ...mediaData, title: 'Updated Test Media' };
      await this.testEndpoint('PUT', `/api/v1/media-descriptions/${mediaId}`, 'admin', 200, updateData, 'Admin can update media');
      await this.testEndpoint('PUT', `/api/v1/media-descriptions/${mediaId}`, 'normal', 403, updateData, 'Normal user cannot update media');
      
      // Test user interactions - authenticated users
      await this.testEndpoint('POST', `/api/v1/media-descriptions/${mediaId}/like`, 'normal', 200, null, 'Normal user can like media');
      await this.testEndpoint('POST', `/api/v1/media-descriptions/${mediaId}/share`, 'normal', 200, null, 'Normal user can share media');
    }
    
    // Test featured/trending endpoints
    await this.testEndpoint('GET', '/api/v1/media-descriptions/featured/list', 'admin', 200, null, 'Admin can get featured media');
    await this.testEndpoint('GET', '/api/v1/media-descriptions/featured/list', 'normal', 200, null, 'Normal user can get featured media');
    await this.testEndpoint('GET', '/api/v1/media-descriptions/trending/list', 'admin', 200, null, 'Admin can get trending media');
    await this.testEndpoint('GET', '/api/v1/media-descriptions/trending/list', 'normal', 200, null, 'Normal user can get trending media');
  }

  async testVideoFiles() {
    // Test listing video files
    await this.testEndpoint('GET', '/api/v1/video-files', 'admin', 200, null, 'Admin can list video files');
    await this.testEndpoint('GET', '/api/v1/video-files', 'normal', 200, null, 'Normal user can list video files');
    
    // Test creating video file - admin only
    const videoData = {
      title: 'Test Video',
      original_filename: 'test.mp4',
      file_size: 1024000,
      duration: 120,
      codec: 'h264',
      resolution: '1920x1080'
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/video-files', 'admin', 201, videoData, 'Admin can create video files');
    await this.testEndpoint('POST', '/api/v1/video-files', 'normal', 403, videoData, 'Normal user cannot create video files');
    
    if (createResult.success && createResult.data) {
      const videoId = createResult.data.id;
      this.createdResources.videoFiles.push(videoId);
      
      // Test getting specific video file
      await this.testEndpoint('GET', `/api/v1/video-files/${videoId}`, 'admin', 200, null, 'Admin can get video file by ID');
      await this.testEndpoint('GET', `/api/v1/video-files/${videoId}`, 'normal', 200, null, 'Normal user can get video file by ID');
      
      // Test updating video file - admin only
      const updateData = { ...videoData, title: 'Updated Test Video' };
      await this.testEndpoint('PUT', `/api/v1/video-files/${videoId}`, 'admin', 200, updateData, 'Admin can update video files');
      await this.testEndpoint('PUT', `/api/v1/video-files/${videoId}`, 'normal', 403, updateData, 'Normal user cannot update video files');
    }
    
    // Test video file reports
    await this.testEndpoint('GET', '/api/v1/video-file-reports/', 'admin', 200, null, 'Admin can list video file reports');
    await this.testEndpoint('GET', '/api/v1/video-file-reports/', 'normal', 200, null, 'Normal user can list video file reports');
  }

  async testProgramsAndSeasons() {
    // Test programs
    await this.testEndpoint('GET', '/api/v1/programs', 'admin', 200, null, 'Admin can list programs');
    await this.testEndpoint('GET', '/api/v1/programs', 'normal', 200, null, 'Normal user can list programs');
    
    const programData = {
      name: 'Test Program',
      description: 'A test TV program',
      status: 'Active'
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/programs', 'admin', 201, programData, 'Admin can create programs');
    await this.testEndpoint('POST', '/api/v1/programs', 'normal', 403, programData, 'Normal user cannot create programs');
    
    if (createResult.success && createResult.data) {
      const programId = createResult.data.id;
      this.createdResources.programs.push(programId);
      
      // Test seasons
      await this.testEndpoint('GET', '/api/v1/seasons', 'admin', 200, null, 'Admin can list seasons');
      await this.testEndpoint('GET', '/api/v1/seasons', 'normal', 200, null, 'Normal user can list seasons');
      
      const seasonData = {
        program_id: programId,
        season_number: 1,
        title: 'Season 1',
        description: 'First season'
      };
      
      const seasonResult = await this.testEndpoint('POST', '/api/v1/seasons', 'admin', 201, seasonData, 'Admin can create seasons');
      await this.testEndpoint('POST', '/api/v1/seasons', 'normal', 403, seasonData, 'Normal user cannot create seasons');
      
      if (seasonResult.success && seasonResult.data) {
        this.createdResources.seasons.push(seasonResult.data.id);
      }
    }
  }

  async testPublicPersons() {
    await this.testEndpoint('GET', '/api/v1/persons', 'admin', 200, null, 'Admin can list persons');
    await this.testEndpoint('GET', '/api/v1/persons', 'normal', 200, null, 'Normal user can list persons');
    
    const personData = {
      name: 'Test Actor',
      korean_name: '테스트 배우',
      profession: 'Actor',
      gender: 'Male',
      birth_year: 1990
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/persons', 'admin', 201, personData, 'Admin can create persons');
    await this.testEndpoint('POST', '/api/v1/persons', 'normal', 403, personData, 'Normal user cannot create persons');
    
    if (createResult.success && createResult.data) {
      this.createdResources.persons.push(createResult.data.id);
    }
    
    // Test search endpoints
    await this.testEndpoint('GET', '/api/v1/persons/search/by-name?name=Test', 'admin', 200, null, 'Admin can search persons');
    await this.testEndpoint('GET', '/api/v1/persons/search/by-name?name=Test', 'normal', 200, null, 'Normal user can search persons');
  }

  async testGeographicData() {
    // Countries
    await this.testEndpoint('GET', '/api/v1/countries', 'admin', 200, null, 'Admin can list countries');
    await this.testEndpoint('GET', '/api/v1/countries', 'normal', 200, null, 'Normal user can list countries');
    
    const countryData = { name: 'Test Country', code: 'TC' };
    const countryResult = await this.testEndpoint('POST', '/api/v1/countries', 'admin', 201, countryData, 'Admin can create countries');
    await this.testEndpoint('POST', '/api/v1/countries', 'normal', 403, countryData, 'Normal user cannot create countries');
    
    if (countryResult.success && countryResult.data) {
      const countryId = countryResult.data.id;
      this.createdResources.countries.push(countryId);
      
      // Territories
      await this.testEndpoint('GET', '/api/v1/territories', 'admin', 200, null, 'Admin can list territories');
      await this.testEndpoint('GET', '/api/v1/territories', 'normal', 200, null, 'Normal user can list territories');
      
      const territoryData = {
        name: 'Test Territory',
        country_id: countryId
      };
      
      const territoryResult = await this.testEndpoint('POST', '/api/v1/territories', 'admin', 201, territoryData, 'Admin can create territories');
      await this.testEndpoint('POST', '/api/v1/territories', 'normal', 403, territoryData, 'Normal user cannot create territories');
      
      if (territoryResult.success && territoryResult.data) {
        this.createdResources.territories.push(territoryResult.data.id);
      }
    }
  }

  async testLanguages() {
    await this.testEndpoint('GET', '/api/v1/languages', 'admin', 200, null, 'Admin can list languages');
    await this.testEndpoint('GET', '/api/v1/languages', 'normal', 200, null, 'Normal user can list languages');
    
    const languageData = {
      name: 'Test Language',
      code: 'tl',
      native_name: 'Test Lang'
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/languages', 'admin', 201, languageData, 'Admin can create languages');
    await this.testEndpoint('POST', '/api/v1/languages', 'normal', 403, languageData, 'Normal user cannot create languages');
    
    if (createResult.success && createResult.data) {
      this.createdResources.languages.push(createResult.data.id);
    }
  }

  async testPictures() {
    await this.testEndpoint('GET', '/api/v1/pictures', 'admin', 200, null, 'Admin can list pictures');
    await this.testEndpoint('GET', '/api/v1/pictures', 'normal', 200, null, 'Normal user can list pictures');
    
    const pictureData = {
      url: 'https://example.com/test-image.jpg',
      alt_text: 'Test Image',
      width: 1920,
      height: 1080
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/pictures', 'admin', 201, pictureData, 'Admin can create pictures');
    await this.testEndpoint('POST', '/api/v1/pictures', 'normal', 403, pictureData, 'Normal user cannot create pictures');
    
    if (createResult.success && createResult.data) {
      this.createdResources.pictures.push(createResult.data.id);
    }
  }

  async testCategoryLists() {
    await this.testEndpoint('GET', '/api/v1/category-lists/', 'admin', 200, null, 'Admin can list category lists');
    await this.testEndpoint('GET', '/api/v1/category-lists/', 'normal', 200, null, 'Normal user can list category lists');
    
    const categoryData = {
      name: 'Test Category',
      description: 'A test category list'
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/category-lists/', 'admin', 201, categoryData, 'Admin can create category lists');
    await this.testEndpoint('POST', '/api/v1/category-lists/', 'normal', 403, categoryData, 'Normal user cannot create category lists');
    
    if (createResult.success && createResult.data) {
      this.createdResources.categoryLists.push(createResult.data.id);
    }
  }

  async testContentLists() {
    await this.testEndpoint('GET', '/api/v1/content-lists/', 'admin', 200, null, 'Admin can list content lists');
    await this.testEndpoint('GET', '/api/v1/content-lists/', 'normal', 200, null, 'Normal user can list content lists');
    
    const contentListData = {
      title: 'Test Content List',
      description: 'A test content list',
      is_active: true
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/content-lists/', 'admin', 201, contentListData, 'Admin can create content lists');
    await this.testEndpoint('POST', '/api/v1/content-lists/', 'normal', 403, contentListData, 'Normal user cannot create content lists');
    
    if (createResult.success && createResult.data) {
      this.createdResources.contentLists.push(createResult.data.id);
    }
  }

  async testScreenContents() {
    await this.testEndpoint('GET', '/api/v1/screen-contents/', 'admin', 200, null, 'Admin can list screen contents');
    await this.testEndpoint('GET', '/api/v1/screen-contents/', 'normal', 200, null, 'Normal user can list screen contents');
    
    const screenContentData = {
      title: 'Test Screen',
      screen_type: 'homepage',
      is_active: true
    };
    
    const createResult = await this.testEndpoint('POST', '/api/v1/screen-contents/', 'admin', 201, screenContentData, 'Admin can create screen contents');
    await this.testEndpoint('POST', '/api/v1/screen-contents/', 'normal', 403, screenContentData, 'Normal user cannot create screen contents');
    
    if (createResult.success && createResult.data) {
      this.createdResources.screenContents.push(createResult.data.id);
    }
  }

  async cleanup() {
    logStep('CLEANUP', 'Cleaning up test resources...');
    
    // Clean up in reverse order to handle dependencies
    const cleanupOrder = [
      { name: 'screenContents', endpoint: '/api/v1/screen-contents' },
      { name: 'contentLists', endpoint: '/api/v1/content-lists' },
      { name: 'categoryLists', endpoint: '/api/v1/category-lists' },
      { name: 'territories', endpoint: '/api/v1/territories' },
      { name: 'countries', endpoint: '/api/v1/countries' },
      { name: 'languages', endpoint: '/api/v1/languages' },
      { name: 'pictures', endpoint: '/api/v1/pictures' },
      { name: 'seasons', endpoint: '/api/v1/seasons' },
      { name: 'programs', endpoint: '/api/v1/programs' },
      { name: 'persons', endpoint: '/api/v1/persons' },
      { name: 'videoFiles', endpoint: '/api/v1/video-files' },
      { name: 'mediaDescriptions', endpoint: '/api/v1/media-descriptions' }
    ];
    
    for (const resourceType of cleanupOrder) {
      const resources = this.createdResources[resourceType.name];
      for (const resourceId of resources) {
        try {
          const response = await fetch(`${API_BASE_URL}${resourceType.endpoint}/${resourceId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          });
          if (response.ok) {
            logInfo(`  Cleaned up ${resourceType.name} ${resourceId}`);
          }
        } catch (error) {
          logWarning(`  Failed to cleanup ${resourceType.name} ${resourceId}: ${error.message}`);
        }
      }
    }
    
    // Clean up normal user if we created it
    if (this.normalUserId) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/${this.normalUserId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        });
        if (response.ok) {
          logInfo('  Cleaned up normal test user');
        }
      } catch (error) {
        logWarning(`  Failed to cleanup normal user: ${error.message}`);
      }
    }
    
    logSuccess('Cleanup completed');
  }

  printResults() {
    log('\n' + '─'.repeat(80));
    log(`${colors.bold}📊 Comprehensive API Test Results${colors.reset}`);
    log(`${colors.green}✅ Passed: ${this.testResults.passed}${colors.reset}`);
    log(`${colors.red}❌ Failed: ${this.testResults.failed}${colors.reset}`);
    log(`${colors.yellow}⚠️  Warnings: ${this.testResults.warnings}${colors.reset}`);
    
    if (this.testResults.errors.length > 0) {
      log(`${colors.red}Error Details:${colors.reset}`);
      this.testResults.errors.forEach(({ category, error }) => {
        log(`  • ${category}: ${error}`);
      });
    }
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;
    
    log(`${colors.blue}Success Rate: ${successRate}%${colors.reset}`);
    
    if (this.testResults.failed === 0) {
      log(`${colors.green}${colors.bold}🎉 All API permission tests passed! Security model is working correctly.${colors.reset}`);
    } else {
      log(`${colors.red}${colors.bold}❌ Some API permission tests failed. Review security model.${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run the comprehensive test suite
const testSuite = new ComprehensiveAPITest();
testSuite.run().catch(error => {
  logError(`Test suite crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});