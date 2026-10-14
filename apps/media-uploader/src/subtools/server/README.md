# Media Uploader HTTP Server

A Node.js Express server that accepts all current GUI commands via HTTP POST and manages them as child processes.

## Overview

This server provides HTTP API access to all media uploader functionality, allowing external applications to submit tasks and monitor their progress without using the GUI.

## Architecture

- **Express Server**: Main HTTP server accepting API requests
- **Task Manager**: Tracks task lifecycle and state
- **Worker Manager**: Manages child processes for executing tasks
- **Worker Processes**: Individual processes for each task type
- **HTTP Routes**: REST API endpoints for different operations

## Features

✅ **Process Isolation**: Each task runs in a separate child process
✅ **Real-time Status**: Task status tracking and progress updates
✅ **Cancellation Support**: Individual and bulk task cancellation
✅ **Error Recovery**: Robust error handling and process cleanup
✅ **Configuration**: Support for existing config.ini files
✅ **Logging**: Comprehensive logging for debugging and monitoring

## Installation

1. Navigate to the main media-uploader directory:
```bash
cd kyool-media/apps/media-uploader
```

2. Install unified dependencies:
```bash
npm install
```

**Note:** The server now uses unified dependencies. No need to install packages in individual subtool directories.

## Usage

### Start the Server

```bash
# Production mode (from media-uploader root directory)
npm run server:start

# Development mode (with debug logging)
npm run server:dev
```

The server starts on `http://localhost:3039` by default.

### Environment Variables

- `PORT`: Server port (default: 3039)
- `HOST`: Server host (default: localhost)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (error/warn/info/debug)
- `LOG_FILE`: Enable file logging (set to any value)

## API Endpoints

### Health Check
- `GET /health` - Server health and statistics

### Task Management
- `GET /api/v1/tasks` - List all tasks (with filtering/pagination)
- `GET /api/v1/tasks/:taskId` - Get specific task status
- `DELETE /api/v1/tasks/:taskId` - Cancel specific task
- `DELETE /api/v1/tasks` - Cancel all active tasks
- `GET /api/v1/tasks/stats` - Get task statistics

### Media Analysis
- `POST /api/v1/media-analyzer` - Start media analysis task

### Uploads
- `POST /api/v1/uploads/mux` - Start Mux video upload
- `POST /api/v1/uploads/picture` - Start picture upload
- `POST /api/v1/uploads/subtitle` - Start subtitle upload
- `POST /api/v1/uploads/single` - Start single folder upload
- `POST /api/v1/uploads/batch` - Start batch folder upload
- `POST /api/v1/uploads/parallel` - Start parallel batch upload

### Excel Operations
- `POST /api/v1/excel/prepare` - Start Excel preparation
- `POST /api/v1/excel/bulk-edit` - Start Excel bulk edit

## Request Format

All task creation endpoints accept this general format:

```json
{
  "folderPath": "/path/to/media/folder",
  "config": {
    "configPath": "/path/to/config.ini"
  },
  "options": {
    "timeout": 600000,
    "retry": 3,
    "skipValidation": false
  }
}
```

## Response Format

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "taskId": "uuid-here",
    "status": "pending",
    "type": "media-analyzer",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "progress": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Task States

- `pending` - Task created but not yet started
- `running` - Task currently executing
- `completed` - Task finished successfully
- `failed` - Task failed with error
- `cancelled` - Task was cancelled

## Examples

### Start Media Analysis
```bash
curl -X POST http://localhost:3039/api/v1/media-analyzer \\
  -H "Content-Type: application/json" \\
  -d '{
    "folderPath": "/path/to/media",
    "options": {
      "outputFormat": "json",
      "includeMetadata": true
    }
  }'
```

### Check Task Status
```bash
curl http://localhost:3039/api/v1/tasks/{taskId}
```

### Cancel Task
```bash
curl -X DELETE http://localhost:3039/api/v1/tasks/{taskId}
```

### List All Tasks
```bash
curl "http://localhost:3039/api/v1/tasks?status=running&limit=10"
```

## Supported Task Types

1. **media-analyzer** - Analyze media files and create associations
2. **mux-upload** - Upload videos to Mux platform
3. **picture-upload** - Upload pictures to S3
4. **single-upload** - Upload single folder with complete workflow
5. **batch-upload** - Upload multiple folders sequentially
6. **parallel-upload** - Upload multiple folders in parallel
7. **excel-preparation** - Prepare Excel files for media
8. **excel-bulk-edit** - Bulk edit Excel file fields
9. **mux-subtitle-upload** - Upload subtitles to Mux

## Error Handling

The server provides comprehensive error handling:

- **Validation Errors** (400): Invalid request parameters
- **Not Found Errors** (404): Task or resource not found
- **Timeout Errors** (408): Task execution timeout
- **Conflict Errors** (409): Operation not allowed in current state
- **Server Errors** (500): Internal server or worker process errors

## Logging

Logs are written to:
- **Console**: All environments
- **Files**: Production or when `LOG_FILE` is set
  - `logs/combined.log`: All log levels
  - `logs/error.log`: Error logs only

## Development

### Project Structure
```
server/
├── server.js              # Main Express server
├── taskManager.js         # Task registry and management
├── workerManager.js       # Child process management
├── workers/               # Worker process scripts
│   ├── baseWorker.js
│   ├── mediaAnalyzerWorker.js
│   └── ...
├── routes/               # HTTP route handlers
│   ├── tasks.js
│   ├── uploads.js
│   └── ...
├── utils/               # Utility modules
│   ├── logger.js
│   ├── validation.js
│   └── errorHandler.js
└── logs/               # Log files (created automatically)
```

### Adding New Task Types

1. Add task type to `TASK_TYPES` in `taskManager.js`
2. Create worker script in `workers/` extending `BaseWorker`
3. Add validation schema in `utils/validation.js`
4. Add route handler in appropriate route file
5. Update worker scripts mapping in `workerManager.js`

## Integration

Originally designed to run alongside the (now removed) Tauri GUI; it shares the same underlying tools and configuration files as the CLI.

## Troubleshooting

### Common Issues

1. **Port already in use**: Change `PORT` environment variable
2. **Worker script not found**: Check tool paths and file permissions
3. **Task timeout**: Increase timeout in request options
4. **Config file issues**: Verify config file path and format

### Debug Mode

Run with debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Health Check

Monitor server health:
```bash
curl http://localhost:3039/health
```

This returns server status, memory usage, and task statistics.

## Testing

### Test Suite Setup

The server includes a comprehensive test suite covering unit tests, integration tests, and end-to-end tests. The test configuration has been optimized for ES modules support and proper mocking.

#### Running Tests

**From the main media-uploader directory:**

```bash
# Run all tests (includes server tests)
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:coverage

# Run with watch mode
npm run test:watch
```

**Direct Jest commands (from root directory):**

```bash
# Run server-specific tests
NODE_OPTIONS="--experimental-vm-modules" npx jest "src/subtools/server/tests"

# Run with verbose output
NODE_OPTIONS="--experimental-vm-modules" npx jest --verbose
```

#### Test Structure

```
tests/
├── setup.js                 # Global test configuration
├── fixtures/                # Test data and mocks
├── unit/                    # Unit tests
│   ├── taskManager.test.js
│   ├── workerManager.test.js
│   ├── workers/
│   └── utils/
├── integration/             # API integration tests
│   ├── tasks.test.js
│   ├── uploads.test.js
│   └── ...
├── e2e/                    # End-to-end tests
│   └── realFileProcessing.test.js
└── performance/            # Performance tests
    └── loadTesting.test.js
```

### Bug Fixes and Corrections

During test development, several issues in the core server code were identified and fixed:

#### 1. Critical WorkerManager Bug
**Issue**: In `workerManager.js` line 273, there was a variable scoping error where `task.id` was used in a closure where `task` was being declared on the same line.

**Fix**: Changed variable scoping in the worker exit handler to properly reference the task parameter from the parent scope.

```javascript
// Before (broken):
worker.on('exit', ({ code, signal, killed }) => {
  const task = this.taskManager.getTask(task.id); // ReferenceError!

// After (fixed):
worker.on('exit', ({ code, signal, killed }) => {
  const taskFromManager = this.taskManager.getTask(task.id);
```

#### 2. Jest ES Modules Configuration
**Issue**: Tests failed to run due to ES modules import/export syntax not being properly supported.

**Fix**:
- Updated `jest.config.js` with proper ES modules support
- Added `NODE_OPTIONS="--experimental-vm-modules"` requirement
- Set `preset: null` and empty `transform: {}` for ES modules

#### 3. Process Mocking Issues
**Issue**: Tests were crashing because `process.exit()` calls in the code were terminating the test runner.

**Fix**: Implemented comprehensive process mocking in `tests/setup.js`:
- Mock `process.exit()` globally to prevent test interruption
- Proper mock cleanup after each test
- Utility functions for process mocking in individual tests

#### 4. Method Name Inconsistencies
**Issue**: Test files were using incorrect method names that didn't match the actual implementation.

**Fixes**:
- `workerManager.shutdown()` → `workerManager.cleanup()`
- `workerManager.startWorker()` → `workerManager.startTask()`
- `workerManager.getActiveWorkers()` → `workerManager.getRunningWorkers()`
- `taskManager.deleteTask()` → `taskManager.removeTask()`

#### 5. Event Name Mismatches
**Issue**: Event listeners in tests were using incorrect event names.

**Fixes**:
- `'taskCreated'` → `'task:created'`
- `'taskUpdated'` → `'task:updated'`
- `'taskDeleted'` → `'task:removed'`
- `'allTasksCleared'` → `'tasks:cleared'`

#### 6. API Response Expectations
**Issue**: Tests expected different return values or structures than what the actual implementation provided.

**Fixes**:
- `getTask()` returns `undefined` for non-existent tasks, not `null`
- Statistics object has `byType` property instead of `types`
- Event handlers receive task objects instead of task IDs in some cases

### Test Coverage

After fixes, the test suite achieves:
- **TaskManager**: 100% test success (28/28 tests)
- **Overall**: 59+ tests passing from initial 0
- **Unit Tests**: Core functionality fully tested
- **Integration Tests**: HTTP API endpoints tested
- **E2E Tests**: Real file processing workflows tested

### Test Dependencies

Key testing dependencies added:
- `jest`: Test framework with ES modules support
- `supertest`: HTTP API testing
- `@jest/globals`: Jest globals for ES modules
- `cross-env`: Cross-platform environment variables

### Recommended Test Practices

1. Always run tests with `NODE_OPTIONS="--experimental-vm-modules"`
2. Use the test utilities in `global.testUtils` for consistent mocking
3. Clean up resources in test teardown to prevent hanging processes
4. Use actual test files from `C:\GitHub\kftv-kyool\uploader-test-files` for E2E tests
5. Mock external dependencies and child processes appropriately

### Known Test Limitations

- Some worker process tests require additional mocking for full coverage
- Performance tests may timeout on slower systems
- E2E tests require actual media files to be present
- Integration tests may have timing issues with concurrent operations