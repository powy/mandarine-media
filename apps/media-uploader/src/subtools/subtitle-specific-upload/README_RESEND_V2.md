# Resend Subtitles V2

A complete rewrite of the subtitle resending functionality that follows the proper data flow chain through the backend.

## Why V2?

The original `resendSubtitles` function had fundamental flaws:
- ❌ Did NOT use Excel Files sheet to find video file associations
- ❌ Made fragile assumptions about backend field names (`main_video_file_id`)
- ❌ Didn't follow the proper chain: Excel → Media Description → Video File → Mux Asset ID

**V2 fixes all of these issues** by following the correct flow:

## Data Flow

```
1. Read Excel file (0_desc_*.xlsx)
   ↓
2. Get media description ID from Excel
   ↓
3. Authenticate with backend
   ↓
4. Fetch media description from backend (/api/v1/media-descriptions/{id})
   ↓
5. Extract video file ID from media description (main_video_file_id)
   ↓
6. Fetch video file from backend (/api/v1/video-files/{id})
   ↓
7. Extract Mux asset ID from video file (mux_asset_id)
   ↓
8. Upload subtitle to S3
   ↓
9. Add subtitle track to Mux asset
```

## Architecture

### Core Functions

1. **`resendSubtitles2Core.js`** - Single subtitle upload
   - Takes explicit parameters (no Excel reading)
   - Pure function that uploads one subtitle file
   - Follows the complete backend chain

2. **`resendSubtitles2.js`** - Batch wrapper for one folder
   - Reads Excel file from folder
   - Processes all subtitle associations
   - Calls core function for each subtitle

3. **`resendSubtitles2IniInterface.js`** - INI wrapper for one folder
   - Takes only INI path + folder path
   - Parses INI configuration
   - Calls batch function

4. **`batchResendSubtitles2.js`** - Multi-folder processing
   - Processes all subfolders in a parent folder
   - Continues even if individual folders fail

5. **`batchResendSubtitles2IniInterface.js`** - INI wrapper for multiple folders
   - Takes INI path + parent folder path
   - Calls batch function for all subfolders

## Usage

### Option 1: Single Folder (Simple)

```javascript
import { resendSubtitles2FromIni } from './resendSubtitles2IniInterface.js';

const result = await resendSubtitles2FromIni(
  './config.ini',
  '/path/to/folder',  // Contains Excel + subtitle files
  {
    verbose: true,
    dryRun: false
  }
);
```

### Option 2: Multiple Folders (Batch)

```javascript
import { batchResendSubtitles2FromIni } from './batchResendSubtitles2IniInterface.js';

const result = await batchResendSubtitles2FromIni(
  './config.ini',
  '/path/to/parent/folder',  // Contains multiple subfolders
  {
    verbose: true,
    dryRun: false
  }
);
```

### Option 3: Core Function (Advanced)

```javascript
import { resendSubtitleSingle } from './resendSubtitles2Core.js';

const result = await resendSubtitleSingle({
  subtitlePath: '/path/to/subtitle.srt',
  language: 'fr',
  mediaDescriptionId: '12345',
  mux: {
    tokenId: 'xxx',
    tokenSecret: 'yyy'
  },
  s3: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
    region: 'us-east-1',
    bucket: 'my-bucket',
    keyPrefix: 'subtitles/'
  },
  backend: {
    baseUrl: 'https://api.example.com',
    username: 'user',
    password: 'pass'
  },
  options: {
    closedCaptions: true,
    name: 'French Subtitles'
  },
  verbose: true
});
```

## Task Runner Integration

The functions are integrated into the task-runner for use with the service interface:

### Single Folder

```javascript
// Function name: resendSubtitles2
// Parameters:
{
  config: './config.ini',      // INI file path
  folder: '/path/to/folder',   // Folder with Excel + subtitles
  dryRun: false                // Optional
}
```

### Batch (Multiple Folders)

```javascript
// Function name: resendSubtitles2Batch
// Parameters:
{
  config: './config.ini',          // INI file path
  parentFolder: '/path/to/parent', // Parent folder with subfolders
  dryRun: false                    // Optional
}
```

## Expected Folder Structure

### Single Folder
```
/my-folder/
  ├── 0_desc_my_video.xlsx    # Excel file with media description
  ├── video.mp4               # Main video file
  ├── video_fr.srt           # French subtitle
  ├── video_en.srt           # English subtitle
  └── video_ko.srt           # Korean subtitle
```

### Batch (Multiple Folders)
```
/parent-folder/
  ├── episode-01/
  │   ├── 0_desc_ep01.xlsx
  │   ├── ep01.mp4
  │   ├── ep01_fr.srt
  │   └── ep01_en.srt
  ├── episode-02/
  │   ├── 0_desc_ep02.xlsx
  │   ├── ep02.mp4
  │   ├── ep02_fr.srt
  │   └── ep02_en.srt
  └── episode-03/
      ├── 0_desc_ep03.xlsx
      ├── ep03.mp4
      └── ep03_fr.srt
```

## Excel File Format

The Excel file must have:

1. **Description sheet** with:
   - `id` field containing the media description ID

2. **Files sheet** with subtitle columns:
   - `frSubtitle` - French subtitle filename
   - `enSubtitle` - English subtitle filename
   - `koSubtitle` - Korean subtitle filename
   - `krSubtitle` - Korean subtitle filename (legacy)

Example Files sheet:
| type | fileName | frSubtitle | enSubtitle | koSubtitle |
|------|----------|-----------|-----------|-----------|
| video main | ep01.mp4 | ep01_fr.srt | ep01_en.srt | ep01_ko.srt |

## Configuration (INI File)

```ini
[mux]
tokenId = YOUR_MUX_TOKEN_ID
tokenSecret = YOUR_MUX_TOKEN_SECRET

[s3]
accessKeyId = YOUR_AWS_ACCESS_KEY
secretAccessKey = YOUR_AWS_SECRET_KEY
region = us-east-1

[s3.subtitles]
bucket = your-subtitle-bucket
keyPrefix = subtitles/

[backend]
baseUrl = https://your-api.example.com
username = your_username
password = your_password
```

## Return Value

```javascript
{
  success: true,
  folder: '/path/to/folder',
  mediaDescriptionId: '12345',
  totalSubtitles: 3,
  successful: 3,
  failed: 0,
  skipped: 0,
  results: [
    {
      fileName: 'ep01_fr.srt',
      language: 'fr',
      success: true,
      mux: {
        trackId: 'abc123',
        assetId: 'xyz789'
      },
      s3: {
        s3Url: 'https://...',
        s3Key: 'subtitles/...'
      }
    },
    // ... more results
  ]
}
```

## Error Handling

- **Continues processing on errors**: If one subtitle fails, others are still processed
- **Detailed error messages**: Each failed subtitle includes the error message
- **File not found handling**: Skips missing subtitle files without stopping
- **Graceful degradation**: Backend update failure doesn't fail the whole operation

## Dry Run Mode

Test the flow without actually uploading:

```javascript
const result = await resendSubtitles2FromIni(
  './config.ini',
  '/path/to/folder',
  { dryRun: true, verbose: true }
);
```

This will:
- ✓ Validate configuration
- ✓ Read Excel file
- ✓ Find subtitle files
- ✗ NOT upload to S3
- ✗ NOT create Mux tracks

## Differences from V1

| Feature | V1 (resendSubtitles) | V2 (resendSubtitles2) |
|---------|---------------------|---------------------|
| Backend chain | ❌ Broken/incomplete | ✅ Complete |
| Excel usage | ✅ Reads ID | ✅ Reads ID + Files |
| Video file lookup | ❌ Assumes field names | ✅ Proper backend query |
| Mux asset ID | ❌ Fragile | ✅ Robust |
| Core function | ❌ Missing | ✅ Included |
| Task runner | ❌ Not integrated | ✅ Integrated |
| Batch support | ❌ No | ✅ Yes |

## Testing

1. **Test with dry run first:**
   ```bash
   # Single folder
   resendSubtitles2(config, folder, { dryRun: true, verbose: true })

   # Batch
   batchResendSubtitles2(config, parentFolder, { dryRun: true, verbose: true })
   ```

2. **Test with one folder:**
   ```bash
   resendSubtitles2FromIni('./config.ini', '/path/to/test/folder', { verbose: true })
   ```

3. **Then try batch processing:**
   ```bash
   batchResendSubtitles2FromIni('./config.ini', '/path/to/parent', { verbose: true })
   ```

## Troubleshooting

### "No video file ID found in media description"
- The media description doesn't have a `main_video_file_id`, `video_file_id`, or `file_id` field
- Check that the media description was properly created with a video upload

### "No Mux asset ID found in video file"
- The video file record doesn't have a `mux_asset_id` or `asset_id` field
- Ensure the video was uploaded to Mux successfully

### "No Excel file found"
- Make sure the Excel file starts with `0_desc` and ends with `.xlsx`
- Check folder path is correct

### Subtitle not being uploaded
- Verify the subtitle file exists in the folder
- Check the filename matches exactly what's in the Excel Files sheet
- Ensure the file format is supported (.srt, .vtt, .sub, .ssa, .ass)

## Files Created

```
subtitle-specific-upload/
  ├── resendSubtitles2Core.js              # Core single upload
  ├── resendSubtitles2.js                  # Batch for one folder
  ├── resendSubtitles2IniInterface.js      # INI wrapper (single)
  ├── batchResendSubtitles2.js             # Multi-folder processing
  ├── batchResendSubtitles2IniInterface.js # INI wrapper (batch)
  └── README_RESEND_V2.md                  # This file
```

## Integration Points

- ✅ Task runner (`service-server/task-runner.js`)
- ✅ Uses existing `ExcelService`
- ✅ Uses existing `S3Service`
- ✅ Uses existing `MuxService`
- ✅ Follows same patterns as `propagate-data` and `one-media-complete-upload`
