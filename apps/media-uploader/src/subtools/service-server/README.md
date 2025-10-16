# Model Uploader Service-Server

Backend service for Model Uploader web interface.

## Features

- **Task Management**: SQLite database with full CRUD operations
- **Process Spawning**: Fork child processes for long-running tasks
- **Heartbeat Monitoring**: Automatic detection of hung processes
- **REST API**: Complete API for task creation, monitoring, and log streaming
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT

## Architecture

```
service-server (Port 3011)
├── Database (SQLite)
│   └── tasks.db
├── Task Manager
│   ├── Process Spawning (fork)
│   ├── Heartbeat Monitor
│   └── Health Check
├── REST API
│   ├── /api/task/create
│   ├── /api/task/list
│   ├── /api/task/:id/status
│   ├── /api/task/:id/log
│   ├── DELETE /api/task/:id
│   └── /api/health
└── Task Runner (Forked Process)
    └── Executes media-uploader functions
```

## Installation

```bash
# From media-uploader root
npm run model:install

# Or manually
cd src/subtools/service-server
node db/init-db.js
```

## Usage

```bash
# Start server
npm run model:server

# Or directly
node src/subtools/service-server/server.js
```

The server will start on port 3011 by default.

## Environment Variables

- `PORT`: Server port (default: 3011)
- `HOST`: Server host (default: localhost)
- `CORS_ORIGIN`: CORS origin (default: http://localhost:3010)

## Task Types

### Single Media Operations
- `prepare-excel-single`: Prepare Excel template
- `upload-media-single`: Complete media upload
- `upload-picture-single`: Upload picture
- `upload-subtitle-single`: Upload specific subtitle
- `reload-subtitles-single`: Reload all subtitles

### Batch Operations
- `prepare-excel-batch`: Prepare Excels for all subfolders
- `upload-media-batch`: Upload multiple media
- `upload-picture-batch`: Upload picture to all media
- `reload-subtitles-batch`: Reload subtitles for all media

## API Examples

### Create Task
```bash
curl -X POST http://localhost:3011/api/task/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "upload-media-single",
    "parameters": {
      "config": "/path/to/config.ini",
      "folder": "/path/to/media"
    }
  }'
```

### List Tasks
```bash
curl http://localhost:3011/api/task/list?status=processing
```

### Get Task Status
```bash
curl http://localhost:3011/api/task/1/status
```

### Get Task Log
```bash
curl http://localhost:3011/api/task/1/log?offset=0
```

### Stop Task
```bash
curl -X DELETE http://localhost:3011/api/task/1
```

## Directory Structure

```
service-server/
├── server.js              # Main Express server
├── task-manager.js        # Task spawning & management
├── task-runner.js         # Forked process worker
├── db/
│   ├── database.js        # SQLite operations
│   └── init-db.js         # Database initialization
├── routes/
│   ├── tasks.js           # Task endpoints
│   └── health.js          # Health check
├── utils/
│   ├── logger.js          # Logging
│   └── validation.js      # Input validation
├── config/
│   └── constants.js       # Configuration
└── data/                  # Created at runtime
    ├── tasks.db           # SQLite database
    ├── logs/              # Log files
    └── temp/              # Temporary files
```

## Configuration

See `config/constants.js` for all configuration options:

- Max concurrent tasks: 1000
- Heartbeat interval: 60 seconds
- Heartbeat timeout: 10 minutes
- Max task duration: 24 hours
- Process memory: 4GB

## Logs

Logs are stored in `logs/` directory:
- `server-YYYY-MM-DD.log`: Server logs
- `task-{id}.log`: Task-specific logs

## Development

```bash
# Run with nodemon for auto-restart
nodemon src/subtools/service-server/server.js

# Check health
curl http://localhost:3011/api/health

# View logs
tail -f src/subtools/service-server/logs/server-*.log
```

## Troubleshooting

### Port already in use
```bash
# Windows
netstat -ano | findstr :3011
taskkill /PID <pid> /F

# Unix/Mac
lsof -ti:3011 | xargs kill -9
```

### Database locked
Stop all running tasks and restart the server.

### High memory usage
Check running tasks and consider reducing max concurrent tasks in `config/constants.js`.

## License

MIT
