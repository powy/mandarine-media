/**
 * End-to-End API Testing Script for Backoffice
 * Tests the backoffice app's integration with the backend API
 */

// Simple E2E test that verifies the API connectivity
async function runBackofficeE2ETest() {
  const BACKEND_URL = 'http://localhost:8000/api/v1';
  const TEST_USER = {
    username: 'admin@kyool.com',
    password: 'admin123'
  };

  console.log('🚀 Starting Backoffice E2E Tests...');
  console.log('📡 Backend URL:', BACKEND_URL);

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

  // Test 1: Backend is accessible
  await runTest('Backend Health Check', async () => {
    const response = await fetch('http://localhost:8000/');
    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.message?.includes('KYOOL')) {
      throw new Error('Unexpected backend response');
    }
  });

  // Test 2: Authentication endpoint works
  let authToken = null;
  await runTest('Authentication Login', async () => {
    const formData = new URLSearchParams();
    formData.append('username', TEST_USER.username);
    formData.append('password', TEST_USER.password);

    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Login failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('No access token received');
    }
    authToken = data.access_token;
    console.log('   Token received:', authToken.substring(0, 20) + '...');
  });

  // Test 3: Protected endpoint with auth
  await runTest('Get Current User', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${BACKEND_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const user = await response.json();
    if (!user.email) {
      throw new Error('Invalid user response');
    }
    console.log('   User email:', user.email);
  });

  // Test 4: Media descriptions endpoint (main backoffice resource)
  await runTest('Get Media Descriptions', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${BACKEND_URL}/media-descriptions?skip=0&limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid media descriptions response');
    }
    console.log(`   Found ${data.data.length} media descriptions`);
  });

  // Test 5: Persons endpoint (used in backoffice)
  await runTest('Get Persons', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${BACKEND_URL}/persons?skip=0&limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid persons response');
    }
    console.log(`   Found ${data.data.length} persons`);
  });

  // Test 6: Countries endpoint  
  await runTest('Get Countries', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${BACKEND_URL}/countries?skip=0&limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();
    // Some endpoints return simple arrays, others return paginated data
    const items = Array.isArray(data) ? data : (data.data || []);
    if (!Array.isArray(items)) {
      throw new Error('Invalid countries response');
    }
    console.log(`   Found ${items.length} countries`);
  });

  // Test 7: Languages endpoint
  await runTest('Get Languages', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${BACKEND_URL}/languages?skip=0&limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();
    // Some endpoints return simple arrays, others return paginated data
    const items = Array.isArray(data) ? data : (data.data || []);
    if (!Array.isArray(items)) {
      throw new Error('Invalid languages response');
    }
    console.log(`   Found ${items.length} languages`);
  });

  // Test 8: Programs endpoint
  await runTest('Get Programs', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${BACKEND_URL}/programs?skip=0&limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();
    // Some endpoints return simple arrays, others return paginated data
    const items = Array.isArray(data) ? data : (data.data || []);
    if (!Array.isArray(items)) {
      throw new Error('Invalid programs response');
    }
    console.log(`   Found ${items.length} programs`);
  });

  // Test 9: Content Lists endpoint
  await runTest('Get Content Lists', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${BACKEND_URL}/content-lists?skip=0&limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid content lists response');
    }
    console.log(`   Found ${data.data.length} content lists`);
  });

  // Generate summary
  console.log('\n📋 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total:  ${testResults.passed + testResults.failed}`);
  
  const successRate = testResults.passed + testResults.failed > 0 
    ? Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)
    : 0;
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🔍 Failed Tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}`);
      console.log(`   Error: ${error.error?.message || 'Unknown error'}`);
    });
    console.log('\n⚠️  The 500 errors indicate database or model issues in the backend.');
  } else {
    console.log('\n✨ All tests passed! Backend API is working correctly.');
  }

  console.log('\n🎉 Backoffice E2E Testing Complete!');
  
  // Exit with proper code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runBackofficeE2ETest().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});