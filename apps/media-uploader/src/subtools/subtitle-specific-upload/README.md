# Subtitle-Specific Upload

Uploads a single subtitle file for a specific media description. Automatically detects language from filename and looks up media description ID from Excel.

## Use Case

Upload subtitles for movies or TV episodes:

```
Movie/
├── 0_desc_Movie.xlsx       # Excel with media description ID
├── movie.mp4               # Video file (already uploaded to Mux)
├── movie_en.srt            # English subtitles
├── movie_fr.srt            # French subtitles
└── movie_ko.srt            # Korean subtitles
```

Upload each subtitle file → Associates to the media description's Mux asset.

## Features

- **Automatic Language Detection**: Detects language from filename patterns (`_en`, `.fr`, `_ko`, etc.)
- **Automatic Media ID Lookup**: Finds media description ID from folder Excel file
- **Mux Integration**: Adds subtitle track to Mux asset
- **S3 Storage**: Uploads subtitle to S3 for reliable delivery
- **Backend Sync**: Updates backend with subtitle information
- **Multiple Formats**: Supports SRT, VTT, SUB, SSA, ASS

## Supported Subtitle Formats

| Format | Extension | Content Type |
|--------|-----------|--------------|
| SubRip | `.srt` | `text/plain` |
| WebVTT | `.vtt` | `text/vtt` |
| MicroDVD | `.sub` | `text/plain` |
| SubStation Alpha | `.ssa` | `text/plain` |
| Advanced SubStation Alpha | `.ass` | `text/plain` |

## Language Detection Patterns

The tool automatically detects language from filename:

| Pattern | Example | Detected Language |
|---------|---------|-------------------|
| `_en` | `movie_en.srt` | `en` (English) |
| `.fr` | `movie.fr.srt` | `fr` (French) |
| `_ko` | `episode_ko.srt` | `ko` (Korean) |
| `_en-US` | `movie_en-US.srt` | `en-US` (English, US) |
| `_eng` | `movie_eng.srt` | `en` (converted from ISO 639-2) |
| `_fra` | `movie_fra.srt` | `fr` (converted from ISO 639-2) |

Supports 50+ languages with automatic ISO 639-2 to 639-1 conversion.

## Usage

### 1. JavaScript Function (Direct)

```javascript
import { subtitleSpecificUploadCore } from './core.js';

const result = await subtitleSpecificUploadCore({
  subtitlePath: '/path/to/movie_en.srt',
  folderPath: '/path/to/movie/folder',  // For Excel lookup
  // language: 'en',  // Optional - auto-detected from filename
  mux: {
    tokenId: 'YOUR_MUX_TOKEN_ID',
    tokenSecret: 'YOUR_MUX_TOKEN_SECRET'
  },
  s3: {
    accessKeyId: 'YOUR_ACCESS_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY',
    region: 'us-east-1',
    bucket: 'your-subtitles-bucket',
    keyPrefix: 'subtitles/'
  },
  backend: {
    baseUrl: 'https://your-api.com',
    username: 'your-username',
    password: 'your-password'
  },
  verbose: true
});
```

### 2. JSON Config File

```javascript
import { uploadSubtitleSpecific } from './wrapper.js';

const result = await uploadSubtitleSpecific({
  config: './config.json',
  verbose: true
});
```

**config.json:**
```json
{
  "subtitlePath": "/path/to/movie_en.srt",
  "folderPath": "/path/to/movie/folder",
  "mux": {
    "tokenId": "YOUR_MUX_TOKEN_ID",
    "tokenSecret": "YOUR_MUX_TOKEN_SECRET"
  },
  "s3": {
    "accessKeyId": "YOUR_ACCESS_KEY",
    "secretAccessKey": "YOUR_SECRET_KEY",
    "region": "us-east-1",
    "bucket": "your-subtitles-bucket",
    "keyPrefix": "subtitles/"
  },
  "backend": {
    "baseUrl": "https://your-api.com",
    "username": "your-username",
    "password": "your-password"
  }
}
```

### 3. INI Config File

```javascript
import { uploadSubtitleSpecificFromIni } from './iniInterface.js';

// Auto-detect language
const result = await uploadSubtitleSpecificFromIni(
  './config.ini',
  '/path/to/movie_en.srt',
  '/path/to/movie/folder',
  null,  // auto-detect language
  { verbose: true }
);

// Explicit language
const result = await uploadSubtitleSpecificFromIni(
  './config.ini',
  '/path/to/subtitle.srt',
  '/path/to/movie/folder',
  'fr',  // French
  { verbose: true, closedCaptions: true }
);
```

**config.ini:**
```ini
[backend]
baseUrl=https://your-api.com
username=your-username
password=your-password

[mux]
tokenId=YOUR_MUX_TOKEN_ID
tokenSecret=YOUR_MUX_TOKEN_SECRET

[s3]
accessKeyId=YOUR_ACCESS_KEY
secretAccessKey=YOUR_SECRET_KEY
region=us-east-1

[s3.subtitles]
bucket=your-subtitles-bucket
keyPrefix=subtitles/
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoDetectLanguage` | boolean | `true` | Auto-detect language from filename |
| `autoLookupMediaId` | boolean | `true` | Auto-lookup media ID from Excel |
| `closedCaptions` | boolean | `false` | Mark as closed captions (CC) |
| `name` | string | Auto | Custom subtitle track name |
| `retry` | number | `3` | Number of retry attempts |
| `verbose` | boolean | `false` | Verbose logging |
| `dryRun` | boolean | `false` | Validate without uploading |

## Process Flow

### Step 1: Validation
- Validate subtitle file exists
- Validate subtitle format (SRT, VTT, etc.)

### Step 2: Language Detection
- Auto-detect language from filename (if not provided)
- Validate BCP 47 language code format
- Convert ISO 639-2 to ISO 639-1 if needed

### Step 3: Media Description ID
- Look up media description ID from Excel file in folder
- Or use provided mediaDescriptionId

### Step 4: Get Mux Asset ID
- Authenticate with backend API
- Fetch media description to get Mux asset ID

### Step 5: Upload to S3
- Upload subtitle file to S3
- Organize by media ID and language: `subtitles/{mediaId}/{lang}/{file}`
- Get public S3 URL

### Step 6: Add Mux Track
- Add subtitle track to Mux asset using S3 URL
- Configure as subtitles or closed captions
- Set language code and track name

### Step 7: Update Backend
- Update backend with subtitle information
- Store S3 URL, Mux track ID, language, etc.

## Return Value

```javascript
{
  success: true,
  subtitlePath: '/path/to/movie_en.srt',
  language: 'en',
  languageDisplayName: 'English',
  mediaDescriptionId: 'movie-123',
  assetId: 'mux-asset-456',
  s3: {
    success: true,
    s3Url: 'https://bucket.s3.region.amazonaws.com/subtitles/movie-123/en/en_abc123.srt',
    s3Key: 'subtitles/movie-123/en/en_abc123.srt',
    bucket: 'your-subtitles-bucket',
    region: 'us-east-1',
    contentType: 'text/plain',
    fileName: 'en_abc123.srt',
    language: 'en',
    mediaDescriptionId: 'movie-123'
  },
  mux: {
    success: true,
    trackId: 'track-789',
    assetId: 'mux-asset-456',
    language: 'en'
  },
  backend: {
    success: true,
    mediaDescriptionId: 'movie-123'
  }
}
```

## Error Handling

- **File Not Found**: Throws error if subtitle file doesn't exist
- **Invalid Format**: Throws error if subtitle format not supported
- **Language Detection Failed**: Requires explicit language parameter
- **Media ID Not Found**: Throws error if Excel has no media description ID
- **Mux Asset Not Found**: Throws error if media has no Mux asset
- **S3 Upload Failed**: Retries with exponential backoff
- **Mux Track Failed**: Retries with exponential backoff
- **Backend Update Failed**: Attempts fallback endpoint

## Example Output

```
📝 Subtitle-Specific Upload Tool v1.0.0
==========================================

📄 Loading configuration from: ./config.ini
✅ Configuration loaded successfully

🚀 Starting subtitle upload...

🔍 Step 1: Validating subtitle file...
✓ Subtitle file exists: movie_en.srt
  Format: .srt

🌐 Step 2: Determining language...
✓ Language detected from filename: en (English)
✓ Using language: en (English)

🆔 Step 3: Getting media description ID...
  Looking up media ID from Excel in: /path/to/movie/folder
✓ Media description ID found in Excel: movie-123
✓ Using media description ID: movie-123

📹 Step 4: Getting Mux asset ID...
✓ Mux asset ID: mux-asset-456

☁️  Step 5: Uploading subtitle to S3...
  Uploading subtitle to S3...
  S3 Key: subtitles/movie-123/en/en_abc123.srt
  S3 URL: https://bucket.s3.region.amazonaws.com/subtitles/movie-123/en/en_abc123.srt
✓ Subtitle uploaded to S3

🎬 Step 6: Adding subtitle track to Mux asset...
  Adding subtitle track to Mux asset mux-asset-456...
  Subtitle track created: track-789
✓ Subtitle track added to Mux: track-789

💾 Step 7: Updating backend with subtitle info...
✓ Backend updated successfully

============================================================
✅ SUBTITLE UPLOAD COMPLETED
============================================================

📋 Upload Details:
  Subtitle File: /path/to/movie_en.srt
  Language: English (en)
  Media Description ID: movie-123
  Mux Asset ID: mux-asset-456

☁️  S3 Upload:
  ✓ S3 URL: https://bucket.s3.region.amazonaws.com/subtitles/movie-123/en/en_abc123.srt
  S3 Key: subtitles/movie-123/en/en_abc123.srt

🎬 Mux Integration:
  ✓ Track ID: track-789
  Asset ID: mux-asset-456

💾 Backend Update:
  ✓ Backend updated successfully
```

## Dependencies

- `@mux/mux-node` - Mux API client
- `@aws-sdk/client-s3` - AWS S3 client
- `axios` - HTTP client for backend API
- `one-media-complete-upload/services/excelService` - For Excel ID extraction

## Common Use Cases

### Upload Multiple Subtitles for Same Media
```javascript
const languages = ['en', 'fr', 'ko', 'es'];
const results = [];

for (const lang of languages) {
  const result = await uploadSubtitleSpecificFromIni(
    './config.ini',
    `/path/to/movie_${lang}.srt`,
    '/path/to/movie/folder',
    null,  // auto-detect
    { verbose: false }
  );
  results.push(result);
}

console.log(`Uploaded ${results.length} subtitle tracks`);
```

### Upload with Custom Track Name
```javascript
const result = await uploadSubtitleSpecificFromIni(
  './config.ini',
  '/path/to/subtitle.srt',
  '/path/to/folder',
  'en',
  { name: 'English (SDH)', closedCaptions: true }
);
```

### Batch Upload for TV Series
```javascript
import fs from 'fs-extra';
import path from 'path';

const seasonFolder = '/path/to/season1';
const episodes = await fs.readdir(seasonFolder);

for (const episode of episodes) {
  const episodePath = path.join(seasonFolder, episode);
  const subtitles = (await fs.readdir(episodePath))
    .filter(f => f.endsWith('.srt'));

  for (const subtitle of subtitles) {
    await uploadSubtitleSpecificFromIni(
      './config.ini',
      path.join(episodePath, subtitle),
      episodePath,
      null,
      { verbose: false }
    );
  }
}
```
