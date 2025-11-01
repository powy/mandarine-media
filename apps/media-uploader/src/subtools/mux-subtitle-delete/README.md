# Mux Subtitle Delete Tool

A subtool for deleting subtitle tracks from Mux assets by language code.

## Features

- **4-layer architecture** for flexible usage
- Delete subtitles by language code (e.g., 'en', 'fr', 'es')
- Multiple input methods (Mux asset ID, video file ID, media description ID, INI config)
- Dry-run mode for safe testing
- Detailed logging and error handling
- CLI interface with Commander.js

## Architecture

The tool follows a 4-layer wrapper architecture:

```
Layer 1: deleteFromAssetId
   ↓ (wraps)
Layer 2: deleteFromVideoFileId
   ↓ (wraps)
Layer 3: deleteFromMediaDescriptionId
   ↓ (wraps)
Layer 4: deleteWithIniConfig
```

### Layer 1: Delete from Mux Asset ID

Direct deletion from a Mux asset using asset ID and Mux credentials.

**Parameters:**
- `muxAssetId` - Mux asset ID
- `language` - Language code (e.g., 'en', 'fr', 'es')
- `muxTokenId` - Mux API token ID
- `muxTokenSecret` - Mux API token secret
- `dryRun` (optional) - Simulate deletion without actually deleting

**Example:**
```javascript
import { deleteFromAssetId } from './core/deleteFromAssetId.js';

const result = await deleteFromAssetId({
  muxAssetId: 'abc123xyz',
  language: 'en',
  muxTokenId: 'your-token-id',
  muxTokenSecret: 'your-token-secret',
  dryRun: true
});
```

### Layer 2: Delete from Video File ID

Fetches video file entity from backend to get Mux asset ID, then calls Layer 1.

**Parameters:**
- `videoFileId` - Video file UUID from backend
- `language` - Language code
- `backendUrl` - Backend base URL
- `backendUsername` - Backend username
- `backendPassword` - Backend password
- `muxTokenId` - Mux API token ID
- `muxTokenSecret` - Mux API token secret
- `dryRun` (optional)

**Example:**
```javascript
import { deleteFromVideoFileId } from './core/deleteFromVideoFileId.js';

const result = await deleteFromVideoFileId({
  videoFileId: 'uuid-video-file-id',
  language: 'fr',
  backendUrl: 'https://api.example.com',
  backendUsername: 'admin',
  backendPassword: 'secret',
  muxTokenId: 'your-token-id',
  muxTokenSecret: 'your-token-secret'
});
```

### Layer 3: Delete from Media Description ID

Fetches media description entity to get video file ID, then calls Layer 2.

**Parameters:**
- `mediaDescriptionId` - Media description UUID from backend
- `language` - Language code
- `backendUrl` - Backend base URL
- `backendUsername` - Backend username
- `backendPassword` - Backend password
- `muxTokenId` - Mux API token ID
- `muxTokenSecret` - Mux API token secret
- `dryRun` (optional)

**Example:**
```javascript
import { deleteFromMediaDescriptionId } from './core/deleteFromMediaDescriptionId.js';

const result = await deleteFromMediaDescriptionId({
  mediaDescriptionId: 'uuid-media-description-id',
  language: 'es',
  backendUrl: 'https://api.example.com',
  backendUsername: 'admin',
  backendPassword: 'secret',
  muxTokenId: 'your-token-id',
  muxTokenSecret: 'your-token-secret'
});
```

### Layer 4: Delete with INI Configuration

Reads INI file for all configuration, then calls Layer 3.

**Parameters:**
- `mediaDescriptionId` - Media description UUID
- `language` - Language code
- `iniFilePath` - Path to INI configuration file
- `dryRun` (optional)

**INI File Format:**
```ini
[backend]
baseUrl=https://api.example.com
username=admin
password=secret

[mux]
tokenId=your-token-id
tokenSecret=your-token-secret
```

**Example:**
```javascript
import { deleteWithIniConfig } from './core/deleteWithIniConfig.js';

const result = await deleteWithIniConfig({
  mediaDescriptionId: 'uuid-media-description-id',
  language: 'en',
  iniFilePath: '/path/to/config.ini'
});
```

## CLI Usage

### Command: from-asset

Delete subtitle from Mux asset ID.

```bash
node index.js from-asset \
  --asset-id abc123xyz \
  --language en \
  --mux-token-id your-token-id \
  --mux-token-secret your-token-secret \
  --dry-run
```

### Command: from-video-file

Delete subtitle from video file ID.

```bash
node index.js from-video-file \
  --video-file-id uuid-video-file-id \
  --language fr \
  --backend-url https://api.example.com \
  --backend-username admin \
  --backend-password secret \
  --mux-token-id your-token-id \
  --mux-token-secret your-token-secret
```

### Command: from-media-description

Delete subtitle from media description ID.

```bash
node index.js from-media-description \
  --media-description-id uuid-media-description-id \
  --language es \
  --backend-url https://api.example.com \
  --backend-username admin \
  --backend-password secret \
  --mux-token-id your-token-id \
  --mux-token-secret your-token-secret
```

### Command: from-ini

Delete subtitle using INI configuration file.

```bash
node index.js from-ini \
  --ini /path/to/config.ini \
  --media-description-id uuid-media-description-id \
  --language en \
  --dry-run
```

## CLI Options

- `-a, --asset-id <assetId>` - Mux asset ID
- `-v, --video-file-id <videoFileId>` - Video file UUID
- `-m, --media-description-id <mediaDescriptionId>` - Media description UUID
- `-l, --language <code>` - Language code (e.g., en, fr, es)
- `-i, --ini <path>` - Path to INI configuration file
- `--backend-url <url>` - Backend base URL
- `--backend-username <username>` - Backend username
- `--backend-password <password>` - Backend password
- `--mux-token-id <tokenId>` - Mux API token ID
- `--mux-token-secret <tokenSecret>` - Mux API token secret
- `--dry-run` - Simulate deletion without actually deleting
- `-h, --help` - Display help

## Response Format

All functions return a result object with the following structure:

```javascript
{
  success: true,           // Overall success status
  assetId: 'abc123xyz',    // Mux asset ID
  language: 'en',          // Language code
  tracksDeleted: 2,        // Number of tracks deleted
  tracks: [                // Array of deleted tracks
    {
      trackId: 'track-id-1',
      name: 'English',
      languageCode: 'en',
      result: { ... }
    }
  ],
  errors: [],              // Array of errors (if any)
  dryRun: false,           // Whether this was a dry run
  videoFileId: '...',      // (Layer 2+) Video file ID
  mediaDescriptionId: '...', // (Layer 3+) Media description ID
  iniFilePath: '...'       // (Layer 4) INI file path
}
```

## Error Handling

The tool provides detailed error messages for common issues:

- Missing required parameters
- Authentication failures
- Asset not found
- Video file not found
- Media description not found
- Invalid INI configuration
- Network errors
- Mux API errors

## Dependencies

- `@mux/mux-node` - Mux API client
- `axios` - HTTP client for backend API calls
- `chalk` - Terminal styling
- `commander` - CLI framework
- `ora` - Spinner for CLI
- `fs-extra` - File system utilities

## Files Structure

```
mux-subtitle-delete/
├── index.js                           # Main entry point
├── README.md                          # This file
├── cli/
│   └── index.js                       # CLI interface
├── core/
│   ├── deleteFromAssetId.js           # Layer 1
│   ├── deleteFromVideoFileId.js       # Layer 2
│   ├── deleteFromMediaDescriptionId.js # Layer 3
│   └── deleteWithIniConfig.js         # Layer 4
└── services/
    └── muxSubtitleDeleter.js          # Core deletion service
```

## Integration with Media Uploader

This tool can be integrated into the main media-uploader CLI or used as a standalone subtool.

## Language Code Format

Language codes should follow ISO 639-1 format (2-letter codes):
- `en` - English
- `fr` - French
- `es` - Spanish
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ja` - Japanese
- `zh` - Chinese
- etc.

The tool normalizes language codes to lowercase for matching.

## Dry Run Mode

Use `--dry-run` flag to test the deletion process without actually deleting tracks:

```bash
node index.js from-asset \
  --asset-id abc123xyz \
  --language en \
  --mux-token-id your-token-id \
  --mux-token-secret your-token-secret \
  --dry-run
```

This will:
- Authenticate with backend (if applicable)
- Fetch entities (if applicable)
- List matching subtitle tracks
- Show what would be deleted
- **NOT** actually delete tracks

## Examples

### Example 1: Delete English subtitles from a Mux asset

```bash
node index.js from-asset \
  --asset-id Xh02mDGnR7r7h01uaJ02P9Q2SFKjPkRMxH3QP01YiY00d00 \
  --language en \
  --mux-token-id abc123 \
  --mux-token-secret xyz789
```

### Example 2: Delete French subtitles using media description ID

```bash
node index.js from-media-description \
  --media-description-id 550e8400-e29b-41d4-a716-446655440000 \
  --language fr \
  --backend-url https://api.kyool.com \
  --backend-username admin \
  --backend-password secret123 \
  --mux-token-id abc123 \
  --mux-token-secret xyz789
```

### Example 3: Delete Spanish subtitles using INI config

```bash
node index.js from-ini \
  --ini ./config/production.ini \
  --media-description-id 550e8400-e29b-41d4-a716-446655440000 \
  --language es
```

## Programmatic Usage

You can also import and use the functions programmatically:

```javascript
import {
  deleteFromAssetId,
  deleteFromVideoFileId,
  deleteFromMediaDescriptionId,
  deleteWithIniConfig,
  MuxSubtitleDeleter
} from './index.js';

// Use any layer directly
const result = await deleteFromAssetId({
  muxAssetId: 'abc123',
  language: 'en',
  muxTokenId: 'token',
  muxTokenSecret: 'secret'
});

console.log(`Deleted ${result.tracksDeleted} track(s)`);

// Or use the service directly for advanced control
const deleter = new MuxSubtitleDeleter({
  tokenId: 'token',
  tokenSecret: 'secret',
  dryRun: true
});

const tracks = await deleter.listSubtitleTracks('abc123');
const result = await deleter.deleteSubtitlesByLanguage('abc123', 'en');
```

## Support

For issues or questions, contact the KYOOL Media Platform team.
