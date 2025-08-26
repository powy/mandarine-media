# Mux Subtitle Upload Tool - Usage Guide

This guide provides step-by-step instructions for using the Mux Subtitle Upload Tool.

## Prerequisites Setup

### 1. AWS S3 Bucket Setup

1. **Create an S3 bucket** (if you don't have one):
   ```bash
   aws s3 mb s3://your-mux-subtitles-bucket --region us-east-1
   ```

2. **Create IAM policy** for bucket access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::your-mux-subtitles-bucket/*",
           "arn:aws:s3:::your-mux-subtitles-bucket"
         ]
       }
     ]
   }
   ```

3. **Create IAM user** with the policy attached and save the credentials.

### 2. Mux Account Setup

1. **Get your Mux API tokens**:
   - Log into your Mux dashboard
   - Go to Settings → API Access Keys
   - Create a new key or use existing one
   - Note down the Token ID and Token Secret

2. **Get your asset ID**:
   - Go to Video → Assets in your Mux dashboard
   - Find your video asset
   - Copy the Asset ID (starts with something like `abc123def456`)

## Step-by-Step Usage

### Step 1: Prepare Your Subtitle Files

Ensure your subtitle files are in supported formats:

- **SRT files**: Most common format
  ```
  1
  00:00:01,000 --> 00:00:04,000
  Hello, this is the first subtitle.

  2
  00:00:05,000 --> 00:00:08,000
  This is the second subtitle.
  ```

- **VTT files**: Web standard format
  ```
  WEBVTT

  00:00:01.000 --> 00:00:04.000
  Hello, this is the first subtitle.

  00:00:05.000 --> 00:00:08.000
  This is the second subtitle.
  ```

### Step 2: Create Configuration File

Create a JSON configuration file (e.g., `my-subtitles-config.json`):

```json
{
  "auth": {
    "mux_token_id": "your-actual-mux-token-id",
    "mux_token_secret": "your-actual-mux-token-secret"
  },
  "s3": {
    "access_key_id": "your-aws-access-key-id",
    "secret_access_key": "your-aws-secret-access-key",
    "region": "us-east-1",
    "bucket_name": "your-mux-subtitles-bucket"
  },
  "mux_asset_id": "your-actual-mux-asset-id",
  "subtitles": [
    {
      "file_path": "/absolute/path/to/english.srt",
      "language_code": "en",
      "name": "English"
    },
    {
      "file_path": "/absolute/path/to/spanish.vtt",
      "language_code": "es",
      "name": "Español"
    }
  ]
}
```

**Important Notes**:
- Use **absolute file paths** to avoid confusion
- Ensure all files exist and are readable
- Use correct ISO 639-1 language codes

### Step 3: Test Your Configuration (Dry Run)

Before uploading, test your configuration:

```bash
cd mux_subtitle_upload_tool
npm start -- -c my-subtitles-config.json --dry-run
```

This will validate:
- Configuration file syntax
- File paths and accessibility
- Mux asset existence
- AWS S3 credentials

### Step 4: Upload Subtitles

If the dry run passes, perform the actual upload:

```bash
npm start -- -c my-subtitles-config.json
```

For verbose output:
```bash
npm start -- -c my-subtitles-config.json --verbose
```

### Step 5: Monitor Progress

The tool will show real-time progress:

```
Mux Subtitle Upload Tool v1.0.0

Configuration: /path/to/my-subtitles-config.json
Asset ID: abc123def456
Subtitles: 2 files

✓ Starting subtitle upload...
✓ All subtitle uploads completed successfully

=== Subtitle Upload Results ===

Session Information:
  Session ID: 265b3507-8698-46c1-817e-8d6af0b05365
  Asset ID: abc123def456
  Total Time: 15.43s

Summary:
  Total Subtitles: 2
  Successful: 2

Successful Track IDs:
  EN: track_xyz123
  ES: track_abc789

Log Files:
  Main: ./logs/subtitle-uploads.log
  Errors: ./logs/errors.log
```

## Advanced Usage Scenarios

### Scenario 1: Multiple Languages for International Content

```json
{
  "mux_asset_id": "your-asset-id",
  "subtitles": [
    {
      "file_path": "/content/movie/english.srt",
      "language_code": "en",
      "name": "English"
    },
    {
      "file_path": "/content/movie/spanish.srt",
      "language_code": "es",
      "name": "Español"
    },
    {
      "file_path": "/content/movie/french.srt",
      "language_code": "fr",
      "name": "Français"
    },
    {
      "file_path": "/content/movie/german.srt",
      "language_code": "de",
      "name": "Deutsch"
    },
    {
      "file_path": "/content/movie/japanese.srt",
      "language_code": "ja",
      "name": "日本語"
    }
  ],
  "options": {
    "max_retry_attempts": 5,
    "cleanup_delay_minutes": 240
  }
}
```

### Scenario 2: Subtitles and Closed Captions

```json
{
  "mux_asset_id": "your-asset-id",
  "subtitles": [
    {
      "file_path": "/content/subtitles.srt",
      "language_code": "en",
      "name": "English Subtitles",
      "text_type": "subtitles",
      "closed_captions": false,
      "passthrough": "en-subtitles"
    },
    {
      "file_path": "/content/closed-captions.vtt",
      "language_code": "en",
      "name": "English Closed Captions",
      "text_type": "captions",
      "closed_captions": true,
      "passthrough": "en-captions"
    }
  ]
}
```

### Scenario 3: Production Environment with Enhanced Logging

```json
{
  "mux_asset_id": "your-asset-id",
  "subtitles": [...],
  "logging": {
    "enabled": true,
    "level": "info",
    "console": true,
    "format": "json",
    "file": "/var/log/mux-subtitles/production.log"
  },
  "options": {
    "cleanup_delay_minutes": 360,
    "max_retry_attempts": 5,
    "retry_delay": 3000,
    "monitoring_timeout": 120000
  }
}
```

## Environment-Specific Usage

### Development Environment

```bash
# Use environment variables for credentials
export MUX_TOKEN_ID="dev-token-id"
export MUX_TOKEN_SECRET="dev-token-secret"
export AWS_ACCESS_KEY_ID="dev-access-key"
export AWS_SECRET_ACCESS_KEY="dev-secret-key"
export S3_BUCKET_NAME="dev-mux-subtitles"
export LOG_LEVEL="debug"

npm start -- -c dev-config.json --verbose
```

### Production Environment

```bash
# Production with minimal logging
export LOG_LEVEL="info"
export CLEANUP_DELAY_MINUTES="180"
export MAX_RETRY_ATTEMPTS="5"

npm start -- -c prod-config.json --quiet
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Upload Subtitles
  env:
    MUX_TOKEN_ID: ${{ secrets.MUX_TOKEN_ID }}
    MUX_TOKEN_SECRET: ${{ secrets.MUX_TOKEN_SECRET }}
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: |
    cd mux_subtitle_upload_tool
    npm start -- -c configs/automated-upload.json --quiet
```

## Monitoring and Maintenance

### Log File Analysis

```bash
# Check recent uploads
tail -f logs/subtitle-uploads.log

# Find failed uploads
grep '"success":false' logs/subtitle-uploads.log

# Show upload performance
grep '"totalTimeMs"' logs/subtitle-uploads.log | \
  jq '.totalTimeMs / 1000' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count, "seconds"}'
```

### S3 Bucket Monitoring

```bash
# List recent subtitle uploads in S3
aws s3 ls s3://your-mux-subtitles-bucket/subtitles/ --recursive --human-readable

# Check bucket size
aws s3 ls s3://your-mux-subtitles-bucket --summarize --human-readable --recursive
```

### Mux Asset Track Verification

After upload, verify tracks were added:

```bash
# Using Mux CLI (if available)
mux video assets get YOUR_ASSET_ID

# Or check in Mux Dashboard:
# Video → Assets → [Your Asset] → Tracks tab
```

## Common Workflows

### Workflow 1: Single Video with Multiple Languages

1. **Prepare files**:
   ```
   /content/
   ├── video.mp4 (already uploaded to Mux)
   ├── subtitles/
   │   ├── english.srt
   │   ├── spanish.srt
   │   ├── french.srt
   │   └── german.srt
   ```

2. **Create config**:
   ```json
   {
     "mux_asset_id": "asset-from-video-upload",
     "subtitles": [
       {"file_path": "/content/subtitles/english.srt", "language_code": "en", "name": "English"},
       {"file_path": "/content/subtitles/spanish.srt", "language_code": "es", "name": "Español"},
       {"file_path": "/content/subtitles/french.srt", "language_code": "fr", "name": "Français"},
       {"file_path": "/content/subtitles/german.srt", "language_code": "de", "name": "Deutsch"}
     ]
   }
   ```

3. **Upload**:
   ```bash
   npm start -- -c multi-lang-config.json
   ```

### Workflow 2: Batch Processing Multiple Videos

Create individual config files for each video:

```bash
# Process video 1
npm start -- -c configs/video-1-subtitles.json

# Process video 2  
npm start -- -c configs/video-2-subtitles.json

# Or use a script
for config in configs/video-*-subtitles.json; do
  echo "Processing $config..."
  npm start -- -c "$config"
done
```

### Workflow 3: Update Existing Subtitles

To replace existing subtitle tracks:

1. **Upload new subtitles** (they will be added as additional tracks)
2. **Remove old tracks** via Mux API or dashboard
3. Or use the `passthrough` field to identify and manage tracks

## Integration Examples

### Node.js Application Integration

```javascript
import SubtitleService from './mux_subtitle_upload_tool/src/services/subtitleService.js';
import { createLogger } from './mux_subtitle_upload_tool/src/config/logger.js';

async function uploadSubtitles(assetId, subtitleFiles) {
  const config = {
    auth: {
      mux_token_id: process.env.MUX_TOKEN_ID,
      mux_token_secret: process.env.MUX_TOKEN_SECRET
    },
    s3: {
      access_key_id: process.env.AWS_ACCESS_KEY_ID,
      secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-east-1',
      bucket_name: process.env.S3_BUCKET_NAME
    },
    mux_asset_id: assetId,
    subtitles: subtitleFiles
  };

  const logger = createLogger(config);
  const service = new SubtitleService(config, logger);
  
  try {
    const result = await service.uploadSubtitles();
    console.log(`Uploaded ${result.successful}/${result.totalSubtitles} subtitles`);
    return result;
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw error;
  }
}

// Usage
await uploadSubtitles('your-asset-id', [
  {
    file_path: '/path/to/english.srt',
    language_code: 'en',
    name: 'English'
  }
]);
```

### Express.js API Endpoint

```javascript
import express from 'express';
import multer from 'multer';
import SubtitleService from './mux_subtitle_upload_tool/src/services/subtitleService.js';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/assets/:assetId/subtitles', upload.array('subtitles'), async (req, res) => {
  try {
    const assetId = req.params.assetId;
    const subtitles = req.files.map((file, index) => ({
      file_path: file.path,
      language_code: req.body.languages[index],
      name: req.body.names[index]
    }));

    const config = {
      auth: { /* ... */ },
      s3: { /* ... */ },
      mux_asset_id: assetId,
      subtitles: subtitles
    };

    const service = new SubtitleService(config, logger);
    const result = await service.uploadSubtitles();

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Best Practices

1. **Always use absolute file paths** in configuration files
2. **Test with --dry-run** before actual uploads
3. **Use environment variables** for sensitive credentials
4. **Monitor log files** for upload patterns and issues
5. **Set appropriate cleanup delays** based on your workflow
6. **Use meaningful passthrough values** for track identification
7. **Validate subtitle files** before upload (proper format, encoding)
8. **Keep track of uploaded track IDs** for future reference
9. **Use version control** for configuration files
10. **Implement proper error handling** in automated workflows

## Troubleshooting Checklist

- [ ] Configuration file syntax is valid JSON
- [ ] All file paths are absolute and files exist
- [ ] Mux asset ID is correct and asset is ready
- [ ] AWS credentials have S3 bucket access
- [ ] S3 bucket exists in specified region
- [ ] Subtitle files are in supported format
- [ ] Language codes are valid ISO 639-1 codes
- [ ] Network connectivity to AWS and Mux APIs
- [ ] No firewall blocking outbound connections
- [ ] Sufficient disk space for log files

Run with `--debug` flag to get detailed information for troubleshooting.