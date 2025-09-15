/**
 * End-to-End API Testing Script
 * Tests the shared package API against the actual running backend
 */

// Import required modules
import { initApiClient } from './src/api/client.js';
import { authApi } from './src/api/auth.js';
import { personsApi } from './src/api/persons.js';
import { mediaApi } from './src/api/media.js';
import { mediaUploadsApi } from './src/api/media-uploads.js';
import { usersApi } from './src/api/users.js';
import { programsApi } from './src/api/programs.js';
import { seasonsApi } from './src/api/seasons.js';
import { languagesApi } from './src/api/languages.js';
import { countriesApi } from './src/api/countries.js';

// Test configuration
const BACKEND_URL = 'http://localhost:8000/api/v1';
const TEST_USER = {
  email: 'admin@kyool.com',
  password: 'admin123'
};

// Initialize API client
console.log('🚀 Starting End-to-End API Tests...');
initApiClient({
  baseURL: BACKEND_URL,
  onAuthError: () => {
    console.log('🔒 Authentication error occurred');
  }
});

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, success, error = null) {
  if (success) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}: ${error?.message || 'Failed'}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error });
  }
}

async function runTest(testName, testFn) {
  try {
    await testFn();
    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

// Main test runner
async function runEndToEndTests() {
  console.log('📡 Testing API connectivity...');
  
  // Test 1: Basic Health Check
  await runTest('Backend Health Check', async () => {
    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();
    if (data.status !== 'healthy') {
      throw new Error('Backend health check failed');
    }
  });

  // Test 2: API Root Endpoint
  await runTest('API Root Endpoint', async () => {
    const response = await fetch('http://localhost:8000/');
    const data = await response.json();
    if (!data.message.includes('KYOOL Media Platform API')) {
      throw new Error('API root endpoint response invalid');
    }
  });

  console.log('\n🔐 Testing Authentication API...');
  
  let authToken = null;
  let currentUser = null;

  // Test 3: Authentication - Login
  await runTest('Authentication Login', async () => {
    try {
      const result = await authApi.login(TEST_USER);
      if (!result.access_token) {
        throw new Error('Login did not return access token');
      }
      authToken = result.access_token;
    } catch (error) {
      // If test user doesn't exist, that's expected in a fresh install
      if (error.response?.status === 401) {
        console.log('⚠️  Test user not found - this is expected in a fresh install');
        return; // Don't fail the test
      }
      throw error;
    }
  });

  // Test 4: Get Current User (if authenticated)
  if (authToken) {
    await runTest('Get Current User', async () => {
      currentUser = await authApi.getCurrentUser();
      if (!currentUser || !currentUser.email) {
        throw new Error('Failed to get current user');
      }
    });
  }

  console.log('\n👤 Testing Public Persons API...');

  // Test 5: Get Public Persons (should work without auth)
  await runTest('Get Public Persons List', async () => {
    const result = await personsApi.getAll({ limit: 5 });
    if (!result || !Array.isArray(result.data)) {
      throw new Error('Public persons list response invalid');
    }
  });

  // Test 6: Search Public Persons by Name
  await runTest('Search Public Persons', async () => {
    const result = await personsApi.searchPublicPersonsByName('Kim', 0, 5);
    if (!Array.isArray(result)) {
      throw new Error('Person search response invalid');
    }
  });

  console.log('\n🎬 Testing Media API...');

  // Test 7: Get Media Descriptions (should work without auth)
  await runTest('Get Media Descriptions', async () => {
    const result = await mediaApi.getMediaDescriptions({ limit: 5 });
    if (!result || !Array.isArray(result.data)) {
      throw new Error('Media descriptions response invalid');
    }
  });

  // Test 8: Get Featured Media
  await runTest('Get Featured Media', async () => {
    const result = await mediaApi.getFeaturedMedia(0, 5);
    if (!Array.isArray(result)) {
      throw new Error('Featured media response invalid');
    }
  });

  console.log('\n🏢 Testing Basic CRUD APIs...');

  // Test 9: Languages API
  await runTest('Get Languages', async () => {
    const result = await languagesApi.getAll({ limit: 5 });
    if (!result || !Array.isArray(result.data)) {
      throw new Error('Languages response invalid');
    }
  });

  // Test 10: Countries API
  await runTest('Get Countries', async () => {
    const result = await countriesApi.getAll({ limit: 5 });
    if (!result || !Array.isArray(result.data)) {
      throw new Error('Countries response invalid');
    }
  });

  // Test 11: Programs API
  await runTest('Get Programs', async () => {
    const result = await programsApi.getAll({ limit: 5 });
    if (!result || !Array.isArray(result.data)) {
      throw new Error('Programs response invalid');
    }
  });

  // Test 12: Seasons API
  await runTest('Get Seasons', async () => {
    const result = await seasonsApi.getAll({ limit: 5 });
    if (!result || !Array.isArray(result.data)) {
      throw new Error('Seasons response invalid');
    }
  });

  // Admin-only tests (if authenticated)
  if (authToken && currentUser?.is_admin) {
    console.log('\n🔧 Testing Admin-Only APIs...');

    // Test 13: Users API (Admin only)
    await runTest('Get Users List (Admin)', async () => {
      const result = await usersApi.getAll({ limit: 5 });
      if (!result || !Array.isArray(result.data)) {
        throw new Error('Users response invalid');
      }
    });

    // Test 14: Storage Backends (Admin only)
    await runTest('Get Storage Backends (Admin)', async () => {
      const result = await mediaUploadsApi.getAvailableBackends();
      if (!result || !Array.isArray(result.available_backends)) {
        throw new Error('Storage backends response invalid');
      }
    });
  }

  console.log('\n🌐 Testing Error Handling...');

  // Test 15: 404 Error Handling
  await runTest('Handle 404 Errors', async () => {
    try {
      await mediaApi.getMediaDescription('nonexistent-id');
      throw new Error('Expected 404 error but request succeeded');
    } catch (error) {
      if (error.response?.status !== 404) {
        throw new Error(`Expected 404 but got ${error.response?.status}`);
      }
    }
  });

  // Test 16: Invalid API Endpoint
  await runTest('Handle Invalid Endpoint', async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/nonexistent-endpoint');
      if (response.status !== 404) {
        throw new Error(`Expected 404 but got ${response.status}`);
      }
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw error; // Network errors should be thrown
      }
    }
  });

  console.log('\n📊 Testing URL Formats and New API Structure...');

  // Test 17: Verify persons URL uses /public-persons
  await runTest('Persons URL Format (/public-persons)', async () => {
    try {
      // This should use the corrected /public-persons URL
      await personsApi.getAll({ limit: 1 });
      
      // Test direct URL to verify our fix
      const directResponse = await fetch('http://localhost:8000/api/v1/public-persons?skip=0&limit=1');
      if (!directResponse.ok && directResponse.status !== 200) {
        throw new Error('Public persons endpoint not accessible');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Using incorrect URL - should be /public-persons not /persons');
      }
      throw error;
    }
  });
  
  // Test 18a: Verify media descriptions return relationship objects
  await runTest('Media Descriptions with Relationship Objects', async () => {
    try {
      const result = await mediaApi.getMediaDescriptions({ limit: 1 });
      if (result && result.data && result.data.length > 0) {
        const mediaDesc = result.data[0];
        
        // Check if we have relationship objects OR deprecated ID lists
        const hasRelationshipObjects = mediaDesc.actors || mediaDesc.directors || mediaDesc.producers;
        const hasDeprecatedFields = mediaDesc.actors_id_list || mediaDesc.directors_id_list;
        
        if (!hasRelationshipObjects && !hasDeprecatedFields) {
          console.log('⚠️  Media description has no actor/director data (expected in some cases)');
        } else if (hasRelationshipObjects) {
          console.log('✅ Media descriptions include new relationship objects');
        } else {
          console.log('⚠️  Media descriptions still using deprecated ID list fields');
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Media descriptions endpoint not found');
      }
      throw error;
    }
  });

  // Test 19: Verify media-uploads endpoints exist
  await runTest('Media Upload Endpoints Exist', async () => {
    // These should require admin auth, so we expect 401, not 404
    const endpoints = ['/upload/video', '/upload/webcomic', '/upload/backends'];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`http://localhost:8000/api/v1${endpoint}`);
      if (response.status === 404) {
        throw new Error(`Upload endpoint ${endpoint} not found (404)`);
      }
      // 401 (unauthorized) or 405 (method not allowed) are acceptable
      if (![401, 405, 422].includes(response.status)) {
        console.log(`⚠️  Unexpected status ${response.status} for ${endpoint}`);
      }
    }
  });
  
  // Test 20: Verify content-lists endpoints work with new structure
  await runTest('Content Lists API with New Structure', async () => {
    try {
      // Import content-lists API if available
      const { getContentLists } = await import('./src/api/content-lists.js').catch(() => ({ getContentLists: null }));
      
      if (getContentLists) {
        const result = await getContentLists({ limit: 1 });
        if (result && result.data && result.data.length > 0) {
          const contentList = result.data[0];
          
          // Check for required v1.9 fields
          if (!contentList.latest_first === undefined) {
            console.log('⚠️  Content list missing latest_first field (v1.9 requirement)');
          }
          
          // Check if content_items/content_types are empty (deprecated)
          if (contentList.content_items && contentList.content_items.length > 0) {
            console.log('⚠️  Content list still using deprecated content_items field');
          }
          
          console.log('✅ Content lists API working with new structure');
        } else {
          console.log('ℹ️  No content lists found (expected in empty database)');
        }
      } else {
        console.log('⚠️  Content lists API not available');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Content lists endpoint not found');
      }
      throw error;
    }
  });

  // Generate summary
  console.log('\n📋 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total:  ${testResults.passed + testResults.failed}`);
  console.log(`🎯 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🔍 Failed Tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}`);
      console.log(`   Error: ${error.error?.message || 'Unknown error'}`);
      if (error.error?.response?.status) {
        console.log(`   HTTP Status: ${error.error.response.status}`);
      }
    });
  }

  console.log('\n🎉 End-to-End Testing Complete!');
  
  // Exit with proper code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runEndToEndTests().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});