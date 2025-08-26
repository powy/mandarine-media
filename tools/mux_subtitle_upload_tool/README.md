# Mux Subtitle Upload Tool

A comprehensive Node.js command-line tool for uploading subtitle files to existing Mux video assets via AWS S3. This tool provides a reliable, monitored, and well-logged subtitle upload process with automatic cleanup.

## Features

- ✅ **Multiple Format Support**: SRT, VTT, and SBV subtitle formats
- ✅ **Multi-language Support**: Upload multiple subtitle tracks in different languages
- ✅ **AWS S3 Integration**: Secure upload via S3 with presigned URLs
- ✅ **Comprehensive Logging**: Detailed logging with multiple output formats
- ✅ **Error Handling & Retry**: Robust error handling with exponential backoff retry
- ✅ **Progress Monitoring**: Real-time monitoring of subtitle processing status
- ✅ **Automatic Cleanup**: Scheduled S3 file cleanup after successful processing
- ✅ **Validation**: Pre-upload validation of files and Mux assets
- ✅ **Dry Run Mode**: Test configurations without actual uploads

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Examples](#examples)
6. [API Reference](#api-reference)
7. [Error Handling](#error-handling)
8. [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **AWS Account**: S3 bucket access
- **Mux Account**: API tokens and existing video assets

### Install Dependencies

```bash
cd mux_subtitle_upload_tool
npm install
```

### Global Installation (Optional)

```bash
npm link
# Now you can use 'mux-subtitle-upload' from anywhere
```

## Quick Start

1. **Create a configuration file** (see [examples/](#examples)):

```json
{
  "auth": {
    "mux_token_id": "YOUR_MUX_TOKEN_ID",
    "mux_token_secret": "YOUR_MUX_TOKEN_SECRET"
  },
  "s3": {
    "access_key_id": "YOUR_AWS_ACCESS_KEY_ID",
    "secret_access_key": "YOUR_AWS_SECRET_ACCESS_KEY",
    "region": "us-east-1",
    "bucket_name": "your-mux-subtitles-bucket"
  },
  "mux_asset_id": "your-existing-mux-asset-id",
  "subtitles": [
    {
      "file_path": "/path/to/subtitles/english.srt",
      "language_code": "en",
      "name": "English"
    }
  ]
}
```

2. **Run the tool**:

```bash
npm start -- -c your-config.json
```

3. **Check the results** in the console output and log files.

## Configuration

### Configuration Schema

The tool uses a JSON configuration file with the following structure:

#### Required Fields

```typescript
{
  // Mux API authentication
  auth: {
    mux_token_id: string,      // Your Mux API Token ID
    mux_token_secret: string   // Your Mux API Token Secret
  },
  
  // AWS S3 configuration
  s3: {
    access_key_id: string,        // AWS Access Key ID
    secret_access_key: string,    // AWS Secret Access Key
    region: string,               // AWS region (default: "us-east-1")
    bucket_name: string,          // S3 bucket name
    presigned_url_expiry?: number // URL expiry in seconds (default: 3600)
  },
  
  // Target Mux asset ID
  mux_asset_id: string,
  
  // Subtitle files to upload
  subtitles: Array<{
    file_path: string,           // Path to subtitle file
    language_code: string,       // ISO 639-1 language code (e.g., "en", "es")
    name: string,                // Display name for the subtitle track
    text_type?: string,          // "subtitles" | "captions" (default: "subtitles")
    closed_captions?: boolean,   // Whether this is closed captions (default: false)
    passthrough?: string         // Custom metadata
  }>
}
```

#### Optional Fields

```typescript
{
  // Logging configuration
  logging?: {
    enabled?: boolean,           // Enable logging (default: true)
    level?: string,              // "error" | "warn" | "info" | "debug" (default: "info")
    console?: boolean,           // Log to console (default: true)
    format?: string,             // "json" | "simple" (default: "json")
    file?: string               // Custom log file path
  },
  
  // Tool options
  options?: {
    cleanup_delay_minutes?: number,    // S3 cleanup delay (default: 120)
    max_retry_attempts?: number,       // Max retries (default: 3)
    retry_delay?: number,              // Retry delay in ms (default: 5000)
    validate_before_upload?: boolean,  // Pre-upload validation (default: true)
    monitoring_timeout?: number,       // Processing timeout in ms (default: 60000)
    monitoring_interval?: number       // Status check interval in ms (default: 5000)
  }
}
```

### Environment Variables

You can override configuration values using environment variables:

```bash
# Mux API
export MUX_TOKEN_ID="your-mux-token-id"
export MUX_TOKEN_SECRET="your-mux-token-secret"

# AWS S3
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
export S3_BUCKET_NAME="your-bucket-name"

# Tool options
export LOG_LEVEL="debug"
export CLEANUP_DELAY_MINUTES="180"
export MAX_RETRY_ATTEMPTS="5"
```

### Supported Subtitle Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| **SRT** | `.srt` | SubRip Text format (most common) |
| **VTT** | `.vtt` | WebVTT format (web standard) |
| **SBV** | `.sbv` | SubViewer format |

### Supported Languages

The tool supports all ISO 639-1 language codes. Common examples:

| Code | Language | Code | Language |
|------|----------|------|----------|
| `en` | English | `es` | Spanish |
| `fr` | French | `de` | German |
| `it` | Italian | `pt` | Portuguese |
| `ja` | Japanese | `ko` | Korean |
| `zh` | Chinese | `ru` | Russian |
| `ar` | Arabic | `hi` | Hindi |

## Usage

### Command Line Options

```bash
mux-subtitle-upload [options]

Options:
  -c, --config <path>           Configuration JSON file path (required)
  -d, --debug                   Enable debug logging
  -r, --retry <count>          Number of retry attempts (default: 3)
  --dry-run                    Validate configuration without uploading
  -v, --verbose                Verbose output
  -q, --quiet                  Quiet mode (errors only)
  --no-cleanup                 Skip S3 file cleanup after upload
  --cleanup-delay <minutes>    S3 cleanup delay in minutes (default: 120)
  -h, --help                   Display help for command
```

### Basic Usage

```bash
# Upload subtitles with configuration file
npm start -- -c examples/simple-subtitle-upload.json

# Enable debug logging
npm start -- -c config.json --debug

# Dry run (validate only)
npm start -- -c config.json --dry-run

# Verbose output with custom retry count
npm start -- -c config.json --verbose --retry 5

# Quiet mode (errors only)
npm start -- -c config.json --quiet
```

### Using as a Module

You can also use the tool programmatically:

```javascript
import SubtitleService from './src/services/subtitleService.js';
import { createLogger } from './src/config/logger.js';
import { validateConfig } from './src/schemas/inputSchema.js';

// Load and validate config
const config = validateConfig(yourConfigObject);

// Create logger
const logger = createLogger(config);

// Create service and upload
const service = new SubtitleService(config, logger);
const result = await service.uploadSubtitles();

console.log('Upload result:', result);
```

## Examples

### Example 1: Simple Single Subtitle

```json
{
  "auth": {
    "mux_token_id": "YOUR_MUX_TOKEN_ID",
    "mux_token_secret": "YOUR_MUX_TOKEN_SECRET"
  },
  "s3": {
    "access_key_id": "YOUR_AWS_ACCESS_KEY_ID",
    "secret_access_key": "YOUR_AWS_SECRET_ACCESS_KEY",
    "region": "us-east-1",
    "bucket_name": "my-subtitle-bucket"
  },
  "mux_asset_id": "abc123def456",
  "subtitles": [
    {
      "file_path": "/path/to/english.srt",
      "language_code": "en",
      "name": "English"
    }
  ]
}
```

### Example 2: Multiple Languages

```json
{
  "auth": {
    "mux_token_id": "YOUR_MUX_TOKEN_ID",
    "mux_token_secret": "YOUR_MUX_TOKEN_SECRET"
  },
  "s3": {
    "access_key_id": "YOUR_AWS_ACCESS_KEY_ID",
    "secret_access_key": "YOUR_AWS_SECRET_ACCESS_KEY",
    "region": "us-east-1",
    "bucket_name": "my-subtitle-bucket"
  },
  "mux_asset_id": "abc123def456",
  "subtitles": [
    {
      "file_path": "/path/to/english.srt",
      "language_code": "en",
      "name": "English",
      "passthrough": "english-track"
    },
    {
      "file_path": "/path/to/spanish.vtt",
      "language_code": "es",
      "name": "Español",
      "passthrough": "spanish-track"
    },
    {
      "file_path": "/path/to/french.srt",
      "language_code": "fr",
      "name": "Français",
      "text_type": "captions",
      "closed_captions": true,
      "passthrough": "french-captions"
    }
  ],
  "options": {
    "cleanup_delay_minutes": 180,
    "max_retry_attempts": 5
  }
}
```

### Example 3: Advanced Configuration

```json
{
  "auth": {
    "mux_token_id": "YOUR_MUX_TOKEN_ID",
    "mux_token_secret": "YOUR_MUX_TOKEN_SECRET"
  },
  "s3": {
    "access_key_id": "YOUR_AWS_ACCESS_KEY_ID",
    "secret_access_key": "YOUR_AWS_SECRET_ACCESS_KEY",
    "region": "us-east-1",
    "bucket_name": "my-subtitle-bucket",
    "presigned_url_expiry": 7200
  },
  "mux_asset_id": "abc123def456",
  "subtitles": [
    {
      "file_path": "/path/to/subtitles/english.srt",
      "language_code": "en",
      "name": "English",
      "text_type": "subtitles",
      "closed_captions": false,
      "passthrough": "en-track-001"
    }
  ],
  "logging": {
    "enabled": true,
    "level": "debug",
    "console": true,
    "format": "simple",
    "file": "./logs/my-upload.log"
  },
  "options": {
    "cleanup_delay_minutes": 60,
    "max_retry_attempts": 3,
    "retry_delay": 3000,
    "validate_before_upload": true,
    "monitoring_timeout": 120000,
    "monitoring_interval": 2000
  }
}
```

## API Reference

### SubtitleService Class

The main service class for handling subtitle uploads.

#### Constructor

```javascript
new SubtitleService(config, logger)
```

- `config`: Validated configuration object
- `logger`: Winston logger instance

#### Methods

##### `uploadSubtitles()`

Main method to upload all subtitles defined in the configuration.

**Returns**: `Promise<UploadResult>`

```typescript
type UploadResult = {
  sessionId: string;
  success: boolean;
  totalSubtitles: number;
  successful: number;
  failed: number;
  totalTimeMs: number;
  results: SubtitleResult[];
}

type SubtitleResult = {
  success: boolean;
  subtitle: SubtitleConfig;
  index: number;
  trackId?: string;
  s3Key?: string;
  uploadTimeMs?: number;
  processingTimeMs?: number;
  totalTimeMs: number;
  error?: string;
}
```

##### `validateInputs()`

Validates all input files and Mux asset before upload.

**Returns**: `Promise<void>`

**Throws**: Error if validation fails

##### `getSessionInfo()`

Returns information about the current upload session.

**Returns**: `SessionInfo`

```typescript
type SessionInfo = {
  sessionId: string;
  assetId: string;
  subtitleCount: number;
  options: UploadOptions;
}
```

### Logging

The tool uses Winston for comprehensive logging with multiple outputs:

#### Log Files

- **`logs/subtitle-uploads.log`**: Main log file with all operations
- **`logs/errors.log`**: Error-only log file
- **`logs/subtitles-YYYY-MM-DD.log`**: Daily log file
- Custom log file (if specified in configuration)

#### Log Levels

- **`error`**: Errors and failures
- **`warn`**: Warnings and non-critical issues
- **`info`**: General information and progress updates
- **`debug`**: Detailed debugging information

#### Log Format

```json
{
  "timestamp": "2024-01-15 14:23:45",
  "level": "info",
  "message": "Subtitle upload successful",
  "sessionId": "abc-123-def",
  "trackId": "track_xyz789",
  "language": "en",
  "uploadTimeMs": 1250,
  "processingTimeMs": 8500
}
```

## Error Handling

The tool provides comprehensive error handling with specific error codes and user-friendly messages.

### Error Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| `AUTH_FAILED` | Mux API authentication failed | Invalid token ID/secret |
| `CONFIG_INVALID` | Configuration validation failed | Missing required fields, invalid JSON |
| `FILE_NOT_FOUND` | Subtitle file not found | Incorrect file path |
| `S3_ACCESS_DENIED` | AWS S3 access denied | Invalid AWS credentials, missing permissions |
| `MUX_ASSET_NOT_FOUND` | Mux asset not found | Invalid asset ID |
| `MUX_PROCESSING_TIMEOUT` | Subtitle processing timeout | Large files, network issues |
| `NETWORK_ERROR` | Network connection failed | Internet connectivity issues |

### Error Examples

```bash
# Authentication Error
✗ Subtitle Upload Failed!

Error: Authentication failed. Please check your Mux API credentials.
Code: AUTH_FAILED

Suggestions:
  • Verify your MUX_TOKEN_ID and MUX_TOKEN_SECRET are correct
  • Check if your Mux API key has the necessary permissions
  • Ensure you are using the correct environment tokens

# File Not Found Error
✗ Subtitle Upload Failed!

Error: Subtitle file not found. Please check the file path.
Code: FILE_NOT_FOUND

Suggestions:
  • Verify the subtitle file path is correct
  • Ensure the file exists and is readable
  • Use absolute file paths to avoid confusion
```

### Retry Logic

The tool implements automatic retry with exponential backoff:

1. **Initial attempt**: Immediate execution
2. **First retry**: Wait 5 seconds (configurable)
3. **Second retry**: Wait 10 seconds (2x delay)
4. **Third retry**: Wait 20 seconds (4x delay)

Configure retry behavior:

```json
{
  "options": {
    "max_retry_attempts": 5,
    "retry_delay": 3000
  }
}
```

## Troubleshooting

### Common Issues

#### 1. AWS S3 Access Issues

**Problem**: `S3_ACCESS_DENIED` or access denied errors

**Solutions**:
- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure bucket exists in the specified region
- Test AWS access with AWS CLI: `aws s3 ls s3://your-bucket-name`

#### 2. Mux Asset Not Found

**Problem**: `MUX_ASSET_NOT_FOUND` error

**Solutions**:
- Verify the asset ID in Mux dashboard
- Ensure asset is in 'ready' state
- Check if you're using the correct environment (dev/prod)

#### 3. Subtitle Processing Timeout

**Problem**: `MUX_PROCESSING_TIMEOUT` error

**Solutions**:
- Increase `monitoring_timeout` in options
- Check subtitle file size and format
- Verify network connectivity
- Check Mux status page for service issues

#### 4. Large File Issues

**Problem**: Uploads failing for large subtitle files

**Solutions**:
- Files larger than 1MB will generate warnings
- Maximum recommended size: 10MB
- Consider splitting large files
- Increase S3 presigned URL expiry

### Debug Mode

Enable debug mode for detailed logging:

```bash
npm start -- -c config.json --debug
```

This will show:
- Detailed AWS S3 operations
- Mux API request/response details
- File validation steps
- Retry attempts and delays

### Health Check

Create a simple health check script:

```javascript
import { validateConfig } from './src/schemas/inputSchema.js';
import { loadConfigFile } from './src/utils/fileUtils.js';

async function healthCheck() {
  try {
    const { config } = await loadConfigFile('your-config.json');
    validateConfig(config);
    console.log('✓ Configuration is valid');
    
    // Test file access
    for (const subtitle of config.subtitles) {
      const exists = await fs.pathExists(subtitle.file_path);
      console.log(`${exists ? '✓' : '✗'} ${subtitle.file_path}`);
    }
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
  }
}

healthCheck();
```

### Log Analysis

Analyze logs for patterns:

```bash
# Show only errors
grep '"level":"error"' logs/subtitle-uploads.log

# Show successful uploads
grep '"message":"Subtitle upload successful"' logs/subtitle-uploads.log

# Show processing times
grep '"processingTimeMs"' logs/subtitle-uploads.log | jq '.processingTimeMs'

# Show S3 upload times  
grep '"uploadTimeMs"' logs/subtitle-uploads.log | jq '.uploadTimeMs'
```

### Performance Monitoring

Monitor performance metrics:

- **Upload Time**: Time to upload to S3
- **Processing Time**: Time for Mux to process
- **Total Time**: End-to-end time
- **Success Rate**: Percentage of successful uploads
- **Retry Rate**: Number of retries needed

Example performance query:

```bash
# Average processing time by language
grep '"processingTimeMs"' logs/subtitle-uploads.log | \
  jq -r '[.language, .processingTimeMs] | @csv'
```

### Support

If you encounter issues not covered in this troubleshooting guide:

1. Enable debug logging and check log files
2. Verify all prerequisites are met
3. Test with a minimal configuration
4. Check AWS S3 and Mux service status
5. Review the error codes and suggestions

---

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- Support for SRT, VTT, SBV formats
- Multi-language subtitle upload
- AWS S3 integration
- Comprehensive logging and monitoring
- Automatic retry and error handling
- Dry run mode and validation