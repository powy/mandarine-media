# Mux Video Upload Tool

A comprehensive Node.js command-line tool for uploading videos to Mux using Direct Upload technology with advanced features including subtitle support, DRM configuration, database integration, and extensive logging.

## Features

- **Direct Upload to Mux** - Efficient video uploads using Mux Direct Upload API
- **Subtitle Management** - Support for multiple subtitle tracks with various languages
- **DRM Support** - Integration with Mux DRM configurations
- **Database Integration** - Save upload metadata to PostgreSQL database
- **Comprehensive Logging** - Structured logging with Winston
- **Error Handling** - Robust retry logic and error reporting
- **Progress Tracking** - Real-time upload progress indication
- **Configuration Validation** - Input validation using Joi schemas
- **Webhook Support** - Integration with Mux webhooks for status updates

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd mux-upload-tool

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit the .env file with your Mux credentials
nano .env
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure your Mux API credentials:

```env
MUX_TOKEN_ID=your_mux_token_id_here
MUX_TOKEN_SECRET=your_mux_token_secret_here
```

### Upload Configuration

Create a JSON configuration file for your upload. See the `examples/` directory for templates:

- `examples/simple-upload.json` - Basic upload configuration
- `examples/full-featured.json` - Complete configuration with all features
- `examples/drm-upload.json` - DRM-enabled upload configuration

## Usage

### Basic Usage

```bash
# Upload with configuration file
node src/index.js --config examples/simple-upload.json

# With debugging enabled
node src/index.js --config examples/simple-upload.json --debug

# With custom timeout and retry settings
node src/index.js --config examples/simple-upload.json --timeout 7200 --retry 5
```

### Command Line Options

```bash
Options:
  -V, --version              Output the version number
  -c, --config <path>        Configuration JSON file path (required)
  -d, --debug               Enable debug logging
  -t, --timeout <seconds>   Upload timeout in seconds (default: 3600)
  -r, --retry <count>       Number of retry attempts (default: 3)
  --dry-run                 Validate configuration without uploading
  --progress                Show upload progress bar (default: true)
  -h, --help                Display help for command
```

### Configuration File Structure

#### Simple Upload Example

```json
{
  "auth": {
    "mux_token_id": "YOUR_MUX_TOKEN_ID",
    "mux_token_secret": "YOUR_MUX_TOKEN_SECRET"
  },
  "video": {
    "filepath": "/path/to/video.mp4"
  },
  "settings": {
    "playback_policy": ["public"],
    "video_quality": "basic"
  }
}
```

#### Full-Featured Example

```json
{
  "auth": {
    "mux_token_id": "YOUR_MUX_TOKEN_ID",
    "mux_token_secret": "YOUR_MUX_TOKEN_SECRET"
  },
  "video": {
    "filepath": "/path/to/video.mp4",
    "title": "My Amazing Video",
    "description": "A comprehensive tutorial"
  },
  "settings": {
    "playback_policy": ["signed"],
    "video_quality": "plus",
    "max_resolution_tier": "2160p",
    "normalize_audio": true,
    "master_access": "temporary",
    "mp4_support": "standard"
  },
  "subtitles": [
    {
      "url": "https://example.com/subtitles/english.srt",
      "language_code": "en-US",
      "name": "English",
      "text_type": "subtitles"
    }
  ],
  "drm": {
    "enabled": true,
    "configuration_id": "YOUR_DRM_CONFIG_ID"
  },
  "database": {
    "type": "postgresql",
    "connection": {
      "host": "localhost",
      "port": 5432,
      "database": "video_db",
      "user": "dbuser",
      "password": "dbpass"
    },
    "table": "mux_assets"
  }
}
```

## Database Schema

If using database integration, create the following tables:

```sql
CREATE TABLE mux_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id VARCHAR(255) UNIQUE NOT NULL,
  upload_id VARCHAR(255),
  status VARCHAR(50),
  duration FLOAT,
  resolution_tier VARCHAR(20),
  video_quality VARCHAR(20),
  playback_ids JSONB,
  tracks JSONB,
  metadata JSONB,
  passthrough VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  upload_completed_at TIMESTAMP,
  error_message TEXT,
  error_details JSONB
);

CREATE TABLE mux_subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id VARCHAR(255) REFERENCES mux_assets(asset_id),
  track_id VARCHAR(255) UNIQUE NOT NULL,
  language_code VARCHAR(10),
  name VARCHAR(255),
  text_type VARCHAR(50),
  closed_captions BOOLEAN,
  passthrough VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

The tool includes comprehensive error handling with specific error codes:

- `AUTH_FAILED` - Authentication with Mux API failed
- `FILE_NOT_FOUND` - Video file not found at specified path
- `UPLOAD_FAILED` - Upload to Mux failed
- `SUBTITLE_FAILED` - Subtitle upload failed
- `DATABASE_ERROR` - Database operation failed
- `VALIDATION_ERROR` - Configuration validation failed
- `TIMEOUT_ERROR` - Upload timeout exceeded
- `DRM_CONFIG_ERROR` - DRM configuration error

## Logging

Logs are written to both console and file (if configured). Log levels include:

- `error` - Critical errors
- `warn` - Warning messages
- `info` - General information
- `debug` - Detailed debugging information

Log files are automatically rotated when they reach 5MB, with up to 5 backup files maintained.

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Linting

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix
```

## Requirements

- Node.js 18+ 
- Valid Mux API credentials
- PostgreSQL database (optional, for metadata storage)

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please check the documentation or create an issue in the repository.