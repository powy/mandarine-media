# Batch Picture Upload

Uploads a picture once to S3/CloudFront, then automatically associates it to all subfolder media descriptions.

## Use Case

This tool is perfect for uploading season posters or other images that should be shared across all episodes:

```
Season 1/                    # Parent folder (season)
├── 0_desc_Season1.xlsx     # Season Excel
├── Episode 1/              # Subfolder (episode)
│   └── 0_desc_Ep1.xlsx    # Episode Excel
├── Episode 2/              # Subfolder (episode)
│   └── 0_desc_Ep2.xlsx    # Episode Excel
└── Episode 3/              # Subfolder (episode)
    └── 0_desc_Ep3.xlsx    # Episode Excel
```

Upload `poster.jpg` → Associates to Episode 1, Episode 2, and Episode 3 media descriptions.

## Features

- **Single Upload**: Picture is uploaded once to S3
- **Automatic Format Detection**: Detects format from image dimensions (1920x1080, 1920x720, etc.)
- **Batch Association**: Associates to all subfolder media descriptions
- **Error Handling**: Continues on errors (configurable)
- **Progress Reporting**: Shows real-time progress for each association

## Supported Image Formats

| Dimensions | Format | Media Description Field |
|------------|--------|------------------------|
| 1920x1080  | 16:9   | `image_1920x1080_id`  |
| 1920x720   | 8:3    | `image_1920x720_id`   |
| 1080x1080  | 1:1    | `image_1080x1080_id`  |
| 810x1080   | 3:4    | `image_810x1080_id`   |
| 1080x1920  | 9:16   | `image_1080x1920_id`  |

## Usage

### 1. JavaScript Function (Direct)

```javascript
import { batchPictureUploadCore } from './core.js';

const result = await batchPictureUploadCore({
  picturePath: '/path/to/poster.jpg',
  parentFolderPath: '/path/to/season/folder',
  s3: {
    accessKeyId: 'YOUR_ACCESS_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY',
    region: 'us-east-1',
    bucket: 'your-pictures-bucket',
    keyPrefix: 'pictures/'
  },
  cloudfront: {
    domain: 'your-cloudfront-domain.cloudfront.net'
  },
  api: {
    baseUrl: 'https://your-api.com',
    username: 'your-username',
    password: 'your-password'
  },
  verbose: true
});
```

### 2. JSON Config File

```javascript
import { batchPictureUpload } from './wrapper.js';

const result = await batchPictureUpload({
  config: './config.json',
  verbose: true
});
```

**config.json:**
```json
{
  "picturePath": "/path/to/poster.jpg",
  "parentFolderPath": "/path/to/season/folder",
  "s3": {
    "accessKeyId": "YOUR_ACCESS_KEY",
    "secretAccessKey": "YOUR_SECRET_KEY",
    "region": "us-east-1",
    "bucket": "your-pictures-bucket",
    "keyPrefix": "pictures/"
  },
  "cloudfront": {
    "domain": "your-cloudfront-domain.cloudfront.net"
  },
  "api": {
    "baseUrl": "https://your-api.com",
    "username": "your-username",
    "password": "your-password"
  }
}
```

### 3. INI Config File

```javascript
import { batchPictureUploadFromIni } from './iniInterface.js';

const result = await batchPictureUploadFromIni(
  './config.ini',
  '/path/to/poster.jpg',
  '/path/to/season/folder',
  { verbose: true }
);
```

**config.ini:**
```ini
[backend]
baseUrl=https://your-api.com
username=your-username
password=your-password

[s3]
accessKeyId=YOUR_ACCESS_KEY
secretAccessKey=YOUR_SECRET_KEY
region=us-east-1

[s3.pictures]
bucket=your-pictures-bucket
keyPrefix=pictures/

[cloudfront]
domain=your-cloudfront-domain.cloudfront.net
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pattern` | string | `'0_desc'` | Excel file pattern to match |
| `continueOnError` | boolean | `true` | Continue on association errors |
| `verbose` | boolean | `false` | Verbose logging |
| `dryRun` | boolean | `false` | Upload picture but don't associate |

## Process Flow

### Phase 1: Initial Upload
1. Validate picture file exists
2. Extract image metadata (width, height, format)
3. Detect format from dimensions
4. Find media description ID from parent folder Excel
5. Upload picture to S3 via CloudFront
6. Create picture record in backend API

### Phase 2: Batch Association
1. Scan all subfolders for Excel files (matching pattern)
2. Extract media description ID from each Excel
3. For each media description:
   - Associate picture ID to correct field (e.g., `image_1920x1080_id`)
   - Update backend via PATCH request
4. Report success/failure for each association

## Return Value

```javascript
{
  success: true,
  picturePath: '/path/to/poster.jpg',
  parentFolderPath: '/path/to/season/folder',
  results: {
    phase1: {
      picturePath: '...',
      format: { format: '1920x1080', displayFormat: '16:9 (1920x1080)', ... },
      mediaDescriptionId: 'season-123',
      uploadResult: { ... },
      metadata: { width: 1920, height: 1080, ... }
    },
    phase2: {
      successes: [
        { mediaDescriptionId: 'ep1-456', folderName: 'Episode 1', ... },
        { mediaDescriptionId: 'ep2-789', folderName: 'Episode 2', ... }
      ],
      failures: [],
      total: 2
    }
  },
  metadata: {
    format: { ... },
    pictureId: 'pic-123',
    associationsSuccess: 2,
    associationsFailure: 0,
    totalSubfolders: 2
  }
}
```

## Error Handling

- **Phase 1 Failure**: Entire operation fails (no picture uploaded)
- **Phase 2 Failure**: Partial success (picture uploaded but some associations failed)
- **Individual Association Failure**: Logged but continues to next (if `continueOnError: true`)

## Dependencies

- `picture-upload` - For initial picture upload
- `one-media-complete-upload/services/excelService` - For Excel ID extraction
- `excel-batch-editor/services/excelBatchService` - For subfolder scanning
- `server/utils/formatDetector` - For format detection from dimensions

## Example Output

```
🖼️  Batch Picture Upload Tool v1.0.0
========================================

📄 Loading configuration from: ./config.ini
✅ Configuration loaded successfully

🚀 Starting batch picture upload...

📤 Phase 1: Initial picture upload...
  Validating picture file...
  Extracting image metadata...
  Dimensions: 1920x1080
  Detecting format...
  Format detected: 16:9 (1920x1080) (1920x1080)
  Media description field: image_1920x1080_id
  Finding media description ID from parent folder...
  Media description ID: season-123
  Uploading picture to S3...
  Picture uploaded successfully
  S3 URL: https://cdn.example.com/pictures/pic-123.jpg
  Picture ID: pic-123
✅ Phase 1 completed successfully

🔗 Phase 2: Batch association to subfolders...
  Scanning subfolders for Excel files...
  Found 3 subfolder Excel files
  Extracting media description IDs...
  ✓ Episode 1: ep1-456
  ✓ Episode 2: ep2-789
  ✓ Episode 3: ep3-012
  Prepared 3 associations
  Associating picture to media descriptions...
  ✓ Associated to Episode 1 (1/3 - 33%)
  ✓ Associated to Episode 2 (2/3 - 67%)
  ✓ Associated to Episode 3 (3/3 - 100%)
✅ Phase 2 completed: 3/3 successful

============================================================
✅ BATCH PICTURE UPLOAD COMPLETED
============================================================

📤 Phase 1: Initial Upload
  ✓ Picture uploaded successfully
  Picture ID: pic-123
  Format: 16:9 (1920x1080)
  Field: image_1920x1080_id

🔗 Phase 2: Batch Association
  Total subfolders: 3
  Successful: 3
```
