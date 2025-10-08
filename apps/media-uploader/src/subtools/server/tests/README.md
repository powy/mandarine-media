# Media Uploader Server Test Suite

This directory contains comprehensive tests for the Media Uploader HTTP Server, covering all aspects of functionality, performance, and reliability.

## Test Structure

```
tests/
├── unit/                   # Unit tests for individual components
│   ├── taskManager.test.js      # Task lifecycle and state management
│   ├── workerManager.test.js    # Process management and IPC
│   ├── workers/
│   │   └── baseWorker.test.js   # Worker base functionality
│   └── utils/                   # Utility modules
│       ├── validation.test.js   # Request validation
│       └── errorHandler.test.js # Error handling
├── integration/            # API endpoint integration tests
│   ├── tasks.test.js           # Task management endpoints
│   └── uploads.test.js         # Upload endpoints
├── e2e/                    # End-to-end tests with real files
│   └── realFileProcessing.test.js
├── performance/            # Load and performance tests
│   └── loadTesting.test.js
├── fixtures/               # Test data and utilities
│   └── mockData.js
├── setup.js               # Global test setup
└── README.md              # This file
```

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Ensure test files are available:
```bash
# Test files should be in C:\GitHub\kftv-kyool\uploader-test-files
# Or update the path in tests/setup.js
```

### Running All Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Running Specific Test Categories

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Performance tests only
npm run test:performance
```

## Test Categories

### Unit Tests

**Purpose**: Test individual components in isolation
**Scope**:
- TaskManager: Task creation, state management, filtering
- WorkerManager: Process spawning, IPC communication, cleanup
- BaseWorker: Message handling, error recovery, shutdown
- Utilities: Validation schemas, error handling, logging

**Characteristics**:
- Fast execution (< 5 seconds total)
- No external dependencies
- Mock all I/O operations
- High code coverage target (80%+)

### Integration Tests

**Purpose**: Test API endpoints and component interactions
**Scope**:
- All HTTP endpoints (/tasks, /uploads, /media-analyzer)
- Request/response validation
- Error handling across API surface
- Database-like operations (task filtering, pagination)

**Characteristics**:
- Medium execution time (10-30 seconds)
- Uses real Express server
- Mocked worker processes
- Tests full request/response cycle

### End-to-End Tests

**Purpose**: Test complete workflows with real files
**Scope**:
- Real file processing using test files
- Complete upload workflows
- Error handling with actual file system
- Resource usage monitoring

**Characteristics**:
- Longer execution time (30-60 seconds)
- Uses real test files from uploader-test-files
- Can use real or mocked workers (controlled by E2E_REAL_WORKERS env var)
- Tests realistic scenarios

### Performance Tests

**Purpose**: Validate server performance under load
**Scope**:
- Concurrent request handling
- Memory usage under sustained load
- Response time degradation analysis
- Resource cleanup verification

**Characteristics**:
- Variable execution time based on load
- Stress testing with 50-100 concurrent requests
- Memory and timing analysis
- Benchmark reporting

## Test Data

### Real Test Files

Located in `C:\GitHub\kftv-kyool\uploader-test-files`:
- `EX 01 - pompom bag.mp4` - Sample video file
- `pompom bag - 1080x1080.jpg` - Sample image file
- `EX 01 - pompom bag - en.srt` - Sample subtitle file
- `0_desc_99999_pompom_bag_filled.xlsx` - Sample Excel file
- `config.locale.ini` - Sample configuration file

### Mock Data

The `fixtures/mockData.js` file provides:
- **mockConfigs**: Various configuration objects
- **mockRequests**: Complete request payloads for all endpoints
- **mockResults**: Expected successful operation results
- **mockErrors**: Common error scenarios
- **mockTaskStates**: Tasks in various lifecycle states
- **Helper functions**: For creating test data dynamically

## Configuration

### Environment Variables

- `NODE_ENV=test` - Enables test mode
- `LOG_LEVEL=error` - Reduces log noise during tests
- `E2E_REAL_WORKERS=true` - Use real worker processes in E2E tests
- `PORT=0` - Use random port for test server

### Jest Configuration

See `jest.config.js` for:
- ES modules support
- Test timeout settings (30 seconds)
- Coverage thresholds (80% across all metrics)
- Setup files and test patterns

## Writing Tests

### Best Practices

1. **Isolation**: Each test should be independent and clean up after itself
2. **Descriptive Names**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
4. **Mock Appropriately**: Mock external dependencies but test real interactions where valuable
5. **Test Edge Cases**: Include error conditions, boundary values, and unusual inputs

### Example Test Structure

```javascript
describe('Component Name', () => {
  let component;

  beforeEach(() => {
    // Setup
    component = new Component();
  });

  afterEach(() => {
    // Cleanup
    component.cleanup();
  });

  describe('Method Name', () => {
    test('should handle normal case', () => {
      // Arrange
      const input = 'test data';

      // Act
      const result = component.method(input);

      // Assert
      expect(result).toBe('expected output');
    });

    test('should handle error case', () => {
      // Test error scenarios
      expect(() => {
        component.method(null);
      }).toThrow('Expected error message');
    });
  });
});
```

### Mock Utilities

Use the provided utilities in `global.testUtils`:
- `createTestTask()` - Generate test task data
- `waitFor(ms)` - Async delay utility
- `mockConsole()` - Mock console methods
- `mockProcess()` - Mock process methods for worker testing

## Debugging Tests

### Running Individual Tests

```bash
# Run specific test file
npm test -- tasks.test.js

# Run specific test case
npm test -- --testNamePattern="should create task"

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Common Issues

1. **Test Timeouts**: Increase timeout in individual tests or jest.config.js
2. **Port Conflicts**: Tests use random ports, but conflicts can still occur
3. **File Access**: Ensure test files exist and are accessible
4. **Memory Leaks**: Check for unclosed resources in afterEach hooks
5. **Race Conditions**: Use proper async/await patterns and timeouts

### Debugging E2E Tests

```bash
# Run E2E with real workers for debugging
E2E_REAL_WORKERS=true npm run test:e2e

# Enable verbose logging
LOG_LEVEL=debug npm run test:e2e
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI integration
- `coverage/coverage-final.json` - Machine-readable JSON

### Coverage Targets

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

## Continuous Integration

The test suite is designed to run in CI environments:

### GitHub Actions Example

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Performance Benchmarks

The performance tests establish benchmarks for:

- **Response Time**: < 200ms average for API endpoints
- **Concurrent Requests**: Handle 50+ simultaneous requests
- **Memory Usage**: < 100MB growth under sustained load
- **Task Processing**: Complete within timeout limits
- **Error Recovery**: Maintain stability under failure conditions

## Maintenance

### Updating Tests

When adding new features:
1. Add unit tests for new components
2. Update integration tests for API changes
3. Add E2E scenarios for new workflows
4. Update mock data for new request/response formats
5. Consider performance implications

### Test Data Refresh

Periodically verify:
- Test files are current and representative
- Mock data matches actual API responses
- Error scenarios cover real failure modes
- Performance benchmarks remain relevant

## Troubleshooting

### Common Test Failures

1. **File Not Found**: Update test file paths in setup.js
2. **Worker Spawn Errors**: Check worker script paths and permissions
3. **Port Already in Use**: Tests should use random ports
4. **Memory Issues**: Increase Node.js heap size if needed
5. **Timeout Errors**: Adjust Jest timeout or test-specific timeouts

### Getting Help

- Check Jest documentation for testing patterns
- Review existing tests for examples
- Use `console.log` sparingly for debugging
- Consider adding temporary `test.only()` for focused debugging