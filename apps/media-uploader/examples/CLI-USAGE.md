# Enhanced Mux Upload CLI Usage Examples

## Basic Upload
```bash
node src/subtools/mux-upload/index.js --config minimal-config.json
```

## Enhanced Chunked Upload Examples

### Large File Upload with Custom Method
```bash
node src/subtools/mux-upload/index.js \
  --config enhanced-config.json \
  --upload-method custom \
  --chunk-size 20 \
  --memory-threshold 500 \
  --chunk-retries 10 \
  --chunk-timeout 300 \
  --verbose
```

### Resume-Disabled Upload for Testing
```bash
node src/subtools/mux-upload/index.js \
  --config production-config.json \
  --no-resume \
  --upload-method upchunk \
  --chunk-size 5 \
  --debug
```

### Quick Small File Upload
```bash
node src/subtools/mux-upload/index.js \
  --config minimal-config.json \
  --upload-method upchunk \
  --chunk-size 2 \
  --memory-threshold 50 \
  --no-adaptive-retry \
  --timeout 1800
```

### Production Upload with All Features
```bash
node src/subtools/mux-upload/index.js \
  --config production-config.json \
  --upload-method auto \
  --chunk-size 25 \
  --memory-threshold 1000 \
  --chunk-retries 15 \
  --chunk-timeout 600 \
  --dynamic-chunks \
  --adaptive-retry \
  --validate-upload \
  --verbose
```

### Dry Run Validation
```bash
node src/subtools/mux-upload/index.js \
  --config any-config.json \
  --dry-run \
  --verbose
```

## CLI Options Reference

### Enhanced Upload Options
- `--upload-method <method>`: auto, upchunk, or custom (default: auto)
- `--chunk-size <mb>`: Chunk size in MB, 1-50 (default: 5)
- `--memory-threshold <mb>`: Memory threshold for method selection, 50-1000 (default: 100)
- `--no-resume`: Disable upload resume capability
- `--chunk-retries <count>`: Per-chunk retry attempts, 1-10 (default: 5)
- `--chunk-timeout <seconds>`: Per-chunk timeout, 30-600 seconds (default: 120)
- `--adaptive-retry`: Enable adaptive retry delays (default: true)
- `--no-adaptive-retry`: Disable adaptive retry delays
- `--dynamic-chunks`: Enable dynamic chunk sizing
- `--validate-upload`: Validate before starting upload (default: true)
- `--no-validate-upload`: Skip upload validation

### Standard Options
- `-c, --config <path>`: Configuration JSON file path (required)
- `-d, --debug`: Enable debug logging
- `-t, --timeout <seconds>`: Upload timeout in seconds (default: 3600)
- `-r, --retry <count>`: Number of retry attempts (default: 3)
- `--dry-run`: Validate configuration without uploading
- `--progress`: Show upload progress bar (default: true)
- `--no-progress`: Disable upload progress bar
- `-v, --verbose`: Verbose output
- `-q, --quiet`: Quiet mode (errors only)
- `-h, --help`: Display help for command

## Environment Variables Support

You can override config values using environment variables:

```bash
export MUX_TOKEN_ID="your-token-id"
export MUX_TOKEN_SECRET="your-token-secret"
export BACKEND_SERVER_ADDRESS="https://api.yourcompany.com"
export BACKEND_USER="your-username"
export BACKEND_PASSWORD="your-password"
export LOG_LEVEL="debug"
export UPLOAD_TIMEOUT="7200000"
export CHUNK_SIZE="10485760"

node src/subtools/mux-upload/index.js --config minimal-config.json
```

## Upload Method Selection Guide

### auto (Recommended)
- Automatically selects best method based on file size
- Uses `upchunk` for files under memory threshold
- Uses `custom` for large files
- Best balance of performance and reliability

### upchunk
- Uses Mux's @mux/upchunk library
- Good for smaller files (< 100MB typically)
- Handles chunking automatically
- May have memory issues with very large files

### custom
- Memory-efficient streaming approach
- Best for large files (> 100MB)
- Advanced retry logic and resume capability
- Optimal for production environments

## Performance Tuning Recommendations

### Small Files (< 50MB)
```bash
--upload-method upchunk --chunk-size 2 --memory-threshold 50
```

### Medium Files (50MB - 500MB)
```bash
--upload-method auto --chunk-size 10 --memory-threshold 200
```

### Large Files (> 500MB)
```bash
--upload-method custom --chunk-size 20 --memory-threshold 500 --chunk-retries 10
```

### Very Large Files (> 2GB)
```bash
--upload-method custom --chunk-size 50 --memory-threshold 1000 --chunk-retries 15 --chunk-timeout 600 --dynamic-chunks
```