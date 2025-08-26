# Picture Upload Tool

A lightweight Node.js CLI tool for uploading pictures to AWS S3 and creating records in the KYOOL Media backend API. Designed to be easily embedded in other applications with individual, well-separated functions.

## Features

- ✅ **File Validation**: Checks if the picture file exists and is readable
- ☁️ **S3 Upload**: Uploads pictures to AWS S3 with automatic content-type detection
- 🔗 **API Integration**: Creates picture records in the backend database via REST API
- 🖼️ **Metadata Extraction**: Automatically reads image dimensions, size, and format using Sharp
- 📋 **JSON Configuration**: Simple JSON-based configuration for all parameters
- 🔧 **Embeddable**: Individual functions can be imported and used in other Node.js applications
- ⚡ **Modern JavaScript**: Uses ES modules and modern async/await syntax

## Installation

1. Navigate to the tool directory:
```bash
cd kyool-media/tools/picture-upload-tool
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Command Line Interface

```bash
# Basic usage
node src/index.js -c config.json

# With verbose output
node src/index.js -c config.json --verbose

# Dry run (validate config and check file without uploading)
node src/index.js -c config.json --dry-run
```

### Configuration File

Create a JSON configuration file with the following structure:

```json
{
  "picturePath": "/path/to/your/picture.jpg",
  "s3": {
    "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
    "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY",
    "region": "us-east-1",
    "bucket": "your-s3-bucket-name",
    "keyPrefix": "pictures/"
  },
  "api": {
    "baseUrl": "http://localhost:8000",
    "username": "admin@example.com",
    "password": "your_admin_password"
  },
  "metadata": {
    "fileName": "custom-filename.jpg",
    "altText": "Description of the image"
  }
}
```

#### Configuration Options

| Field | Required | Description |
|-------|----------|-------------|
| `picturePath` | ✅ | Local path to the picture file |
| `s3.accessKeyId` | ✅ | AWS Access Key ID |
| `s3.secretAccessKey` | ✅ | AWS Secret Access Key |
| `s3.region` | ✅ | AWS region (e.g., "us-east-1") |
| `s3.bucket` | ✅ | S3 bucket name |
| `s3.keyPrefix` | ❌ | S3 key prefix (default: "pictures/") |
| `api.baseUrl` | ✅ | Backend API base URL |
| `api.username` | ✅ | Admin username for authentication |
| `api.password` | ✅ | Admin password for authentication |
| `metadata.fileName` | ❌ | Custom filename (uses original if not provided) |
| `metadata.altText` | ❌ | Alt text for accessibility |

### Embedding in Other Applications

You can import and use individual functions:

```javascript
import { checkFileExists, uploadToS3, createPictureRecord } from './src/index.js';

// Check if file exists
const exists = await checkFileExists('/path/to/picture.jpg');

// Upload to S3
const s3Config = {
  accessKeyId: 'your-key',
  secretAccessKey: 'your-secret',
  region: 'us-east-1',
  bucket: 'your-bucket'
};
const s3Url = await uploadToS3('/path/to/picture.jpg', s3Config);

// Create API record
const apiConfig = {
  baseUrl: 'http://localhost:8000',
  username: 'admin',
  password: 'password'
};
const metadata = {
  fileName: 'picture.jpg',
  fileSizeBytes: 1024,
  width: 800,
  height: 600
};
const record = await createPictureRecord(s3Url, metadata, apiConfig);
```

## Examples

The `examples/` directory contains sample configuration files:

- `basic-upload.json`: Complete configuration with all optional fields
- `minimal-upload.json`: Minimal configuration with only required fields

## Testing

Run the built-in test to verify basic functionality:

```bash
npm test
```

This will test:
- Configuration loading
- File existence checking
- Basic function imports

For full integration testing, create a real configuration file and run:

```bash
node src/index.js -c your-real-config.json --dry-run
```

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- SVG (.svg)

## Error Handling

The tool includes comprehensive error handling with specific error codes:

- `FILE_NOT_FOUND`: Picture file doesn't exist or isn't readable
- `INVALID_IMAGE`: File is not a valid image format
- `S3_UPLOAD_FAILED`: AWS S3 upload failed
- `API_AUTH_FAILED`: Backend API authentication failed
- `API_REQUEST_FAILED`: Backend API request failed
- `CONFIG_VALIDATION_FAILED`: Configuration validation failed
- `METADATA_READ_FAILED`: Image metadata extraction failed

## Requirements

- Node.js >= 18.0.0
- AWS S3 bucket with appropriate permissions
- KYOOL Media backend API running and accessible
- Admin credentials for the backend API

## Dependencies

- `@aws-sdk/client-s3`: AWS S3 client
- `@aws-sdk/lib-storage`: AWS multipart upload support
- `axios`: HTTP client for API requests
- `commander`: Command-line interface
- `fs-extra`: Enhanced filesystem operations
- `joi`: JSON schema validation
- `sharp`: Image processing and metadata extraction

## Architecture

The tool is structured with clear separation of concerns:

- `src/index.js`: Main CLI application and orchestration
- `src/services/s3Service.js`: S3 upload functionality
- `src/services/apiService.js`: Backend API communication
- `src/utils/fileUtils.js`: File operations and metadata extraction
- `src/utils/errorHandler.js`: Error handling and logging
- `src/schemas/inputSchema.js`: Configuration validation
- `examples/`: Sample configuration files