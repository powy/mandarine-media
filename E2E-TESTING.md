# End-to-End Testing Guide

This document explains how to run comprehensive end-to-end tests that verify the complete integration between the **Backend Server**, **Shared Package**, and **Frontend Applications**.

## 🎯 What the E2E Tests Verify

The end-to-end tests ensure that:

✅ **Backend Server** is running correctly  
✅ **Shared Package** can communicate with live API  
✅ **Authentication Flow** works end-to-end  
✅ **All Major API Endpoints** are accessible and working  
✅ **Error Handling** works properly across the stack  
✅ **Database Integration** is functioning  
✅ **API Response Formats** match shared package expectations  

## 🚀 Quick Start

### Option 1: Using npm script (Recommended)
```bash
npm run test:e2e
```

### Option 2: Using shell script directly
```bash
./run-e2e-tests.sh
```

### Option 3: Manual setup
```bash
# 1. Build shared package
cd packages/share && npm run build && cd ../..

# 2. Start backend server
npm run start:backend

# 3. Run e2e tests
node e2e-test.js
```

## 📋 Prerequisites

### System Requirements
- **Node.js** >= 18.0.0
- **Docker** and **Docker Compose**
- **Python 3** (for backend)
- **Bash** shell (for scripts)

### Environment Setup
1. **Backend Dependencies**: Ensure backend Python dependencies are installed
2. **Database**: PostgreSQL will be started automatically via Docker
3. **Shared Package**: Must be built before running tests

## 🔧 Test Configuration

### Backend Configuration
- **API URL**: `http://localhost:8000`
- **Database**: PostgreSQL (auto-started via Docker)
- **Admin User**: `admin@kyool.com` / `admin123`

### Test Coverage
The E2E tests cover these API endpoints:

#### Core APIs
- **🔐 Authentication**: `/api/v1/auth/login`
- **👥 Users**: `/api/v1/users/`
- **📺 Media Descriptions**: `/api/v1/media-descriptions/`
- **📋 Content Lists**: `/api/v1/content-lists/`
- **🖥️ Screen Contents**: `/api/v1/screen-contents/`

#### System APIs
- **🏥 Health Check**: `/health`
- **📊 Error Handling**: Various error scenarios

## 📊 Test Results

### Success Output
```
🚀 Starting End-to-End Test Suite
Testing integration: Backend (http://localhost:8000) + Shared Package
────────────────────────────────────────────────────────────────

[SETUP] Starting backend server and database...
✅ Backend server is already running
[SETUP] Initializing shared package API client...
✅ Environment setup complete

🧪 Running End-to-End Tests
[TEST] Running: Server Health Check
✅ Server Health Check - PASSED
[TEST] Running: Authentication Flow
✅ Authentication Flow - PASSED
[TEST] Running: User Management API
✅ User Management API - PASSED
...

────────────────────────────────────────────────────────────────
📊 Test Results
✅ Passed: 8
❌ Failed: 0
Success Rate: 100.0%
🎉 All tests passed! End-to-end integration is working correctly.
```

### Failure Output
```
❌ Authentication Flow - FAILED: Login failed: No access token received
❌ Some tests failed. Please check the integration.
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Server Not Starting
**Symptoms**: Server fails to start or health check fails
**Solutions**:
```bash
# Check Docker is running
docker --version

# Check port availability
netstat -tulpn | grep :8000

# Manual server start
cd backend && docker compose -f docker-compose.dev.yml up
```

#### 2. Authentication Failures
**Symptoms**: Login API calls fail
**Solutions**:
```bash
# Recreate admin user
cd backend && python3 scripts/create_admin.py

# Check server logs
docker compose -f backend/docker-compose.dev.yml logs api
```

#### 3. Shared Package Build Issues
**Symptoms**: Import errors or module not found
**Solutions**:
```bash
# Rebuild shared package
cd packages/share && npm run build

# Check build output
ls -la packages/share/dist/
```

#### 4. Database Connection Issues
**Symptoms**: Database-related API calls fail
**Solutions**:
```bash
# Restart database
cd backend && docker compose -f docker-compose.dev.yml restart db

# Check database logs
docker compose -f backend/docker-compose.dev.yml logs db
```

## 🔍 Debug Mode

For detailed debugging, you can:

### 1. Check API Health Manually
```bash
curl http://localhost:8000/health
```

### 2. Test Authentication Manually
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@kyool.com&password=admin123"
```

### 3. View API Documentation
Open: http://localhost:8000/docs

### 4. Check Server Logs
```bash
cd backend && docker compose -f docker-compose.dev.yml logs -f api
```

## 🎛️ Advanced Usage

### Running Specific Test Categories
You can modify `e2e-test.js` to run only specific tests by commenting out test categories in the `runTests()` method.

### Custom Test Configuration
Edit the configuration section in `e2e-test.js`:
```javascript
const API_BASE_URL = 'http://localhost:8000';  // Change API URL
const TEST_USER = {
  email: 'admin@kyool.com',    // Change test user
  password: 'admin123'
};
```

### Adding New Tests
To add new test cases, add them to the `tests` array in the `runTests()` method:
```javascript
const tests = [
  // ... existing tests
  { name: 'Your New Test', fn: () => this.testYourNewFeature() }
];
```

## 📝 CI/CD Integration

### GitHub Actions
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:e2e
```

### Docker Integration
The E2E tests work with the existing Docker setup and will automatically start required services.

## 🎉 Success Criteria

The E2E tests are considered successful when:

- ✅ All 8 core test cases pass
- ✅ Backend server starts and responds to health checks
- ✅ Authentication flow completes successfully
- ✅ All major API endpoints return expected data structures
- ✅ Error handling works as expected
- ✅ Cleanup (logout) works properly

When all tests pass, you can be confident that:
- The **backend API** is working correctly
- The **shared package** integrates properly with the live API
- The **complete stack** is ready for production use

---

*This end-to-end testing ensures that the Kyool Media platform works correctly from the database layer through the API layer to the frontend applications.*