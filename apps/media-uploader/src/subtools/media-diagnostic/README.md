# Media Diagnostic Tool

Verify MediaDescription diagnostics via the backend API. This tool provides 5 core functions to check if MediaDescriptions are ready for production, identify issues, and batch process diagnostics across your media library.

## Features

- **Single MediaDescription Verification**: Check individual media descriptions
- **Season Verification**: Verify entire seasons including general description and all episodes
- **Batch Processing**: Process all non-ready media descriptions automatically
- **INI Config Support**: Use INI files for credential management
- **Programmatic API**: Use as a library in your Node.js applications
- **CLI Interface**: Command-line tool with rich output formatting

## Installation

This tool is part of the media-uploader package. No additional installation required.

## Usage

### 1. Verify Single MediaDescription (Direct Credentials)

Verify a single MediaDescription by providing credentials directly:

```bash
media-uploader diagnostic verify \
  --url https://api.example.com \
  --username admin \
  --password secret \
  --id "550e8400-e29b-41d4-a716-446655440000"
```

**Options:**
- `--url <url>` - Backend base URL (required)
- `--username <username>` - Username (required)
- `--password <password>` - Password (required)
- `--id <uuid>` - MediaDescription UUID (required)
- `--verbose` - Enable verbose logging
- `--timeout <ms>` - Request timeout in milliseconds (default: 30000)

**Example Output:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "diagnostics": "ready",
  "is_ready": true,
  "errors": []
}
```

### 2. Verify Single MediaDescription (INI Config)

Use an INI configuration file for credentials:

```bash
media-uploader diagnostic verify-ini \
  --config /path/to/config.ini \
  --id "550e8400-e29b-41d4-a716-446655440000"
```

**INI File Format:**
```ini
[backend]
baseUrl=https://api.example.com
username=admin
password=secret123

[general]
verbose=true
```

**Options:**
- `-c, --config <path>` - INI config file path (required)
- `--id <uuid>` - MediaDescription UUID (required)
- `--verbose` - Override verbose setting from INI
- `--timeout <ms>` - Request timeout in milliseconds

### 3. Verify Season (Direct Credentials)

Verify an entire season including the general MediaDescription and all episodes:

```bash
media-uploader diagnostic verify-season \
  --url https://api.example.com \
  --username admin \
  --password secret \
  --season-id "660e8400-e29b-41d4-a716-446655440001" \
  --verbose
```

**Options:**
- `--url <url>` - Backend base URL (required)
- `--username <username>` - Username (required)
- `--password <password>` - Password (required)
- `--season-id <uuid>` - Season UUID (required)
- `--verbose` - Enable verbose logging
- `--no-continue-on-error` - Stop on first error (default: continue on error)
- `--timeout <ms>` - Request timeout in milliseconds (default: 30000)

**Example Output:**
```
📊 Summary:
  Season ID: 660e8400-e29b-41d4-a716-446655440001
  General MediaDescription: ✅ Ready
  Total Episodes: 10
  Ready Episodes: 7
  Episodes with Errors: 3

⚠️  Season has errors
```

### 4. Verify Season (INI Config)

Verify a season using INI configuration:

```bash
media-uploader diagnostic verify-season-ini \
  --config /path/to/config.ini \
  --season-id "660e8400-e29b-41d4-a716-446655440001"
```

**Options:**
- `-c, --config <path>` - INI config file path (required)
- `--season-id <uuid>` - Season UUID (required)
- `--verbose` - Override verbose setting from INI
- `--no-continue-on-error` - Stop on first error
- `--timeout <ms>` - Request timeout in milliseconds

### 5. Batch Verify Non-Ready MediaDescriptions

Process all MediaDescriptions that are not ready:

```bash
media-uploader diagnostic verify-batch \
  --url https://api.example.com \
  --username admin \
  --password secret \
  --verbose \
  --limit 500
```

**How it works:**
1. Fetches all MediaDescriptions from the backend
2. **List A**: Filters those with `diagnostics !== "ready"`
3. **List B**: Filters those with `diagnostics !== "ready" AND diagnostics !== "pending"`
4. Calls verify endpoint sequentially for each in List A
5. Calls verify endpoint sequentially for each in List B
6. Returns aggregated results

**Options:**
- `--url <url>` - Backend base URL (required)
- `--username <username>` - Username (required)
- `--password <password>` - Password (required)
- `--verbose` - Enable verbose logging
- `--no-continue-on-error` - Stop on first error (default: continue on error)
- `--limit <number>` - Max items to process (default: 1000)
- `--timeout <ms>` - Request timeout in milliseconds (default: 30000)

**Example Output:**
```
📊 Summary:
  Total Non-Ready: 15
  Total Non-Ready-Pending: 5
  Now Ready: 8
  Still Errors: 7

⚠️  Some MediaDescriptions still have errors
```

### 6. Batch Verify (INI Config) - Bonus

```bash
media-uploader diagnostic verify-batch-ini \
  --config /path/to/config.ini \
  --limit 100
```

## Programmatic Usage

### ES Modules

```javascript
import { MediaDiagnostic } from './subtools/media-diagnostic/index.js';

// Create instance with default config
const diagnostic = new MediaDiagnostic({
  baseUrl: 'https://api.example.com',
  username: 'admin',
  password: 'secret',
  verbose: true
});

// Verify single MediaDescription
const result = await diagnostic.verifyMediaDescription('uuid-here');
console.log(result);

// Verify season
const seasonResult = await diagnostic.verifySeason('season-uuid');
console.log(seasonResult.summary);

// Batch verify
const batchResult = await diagnostic.verifyBatch({ limit: 100 });
console.log(batchResult.summary);
```

### Using Core Functions Directly

```javascript
import {
  verifyMediaDescriptionDirect,
  verifySeasonDirect,
  verifyBatchNonReady
} from './subtools/media-diagnostic/core.js';

// Function 1: Verify single MediaDescription
const result = await verifyMediaDescriptionDirect({
  baseUrl: 'https://api.example.com',
  username: 'admin',
  password: 'secret',
  mediaDescriptionId: 'uuid-here',
  verbose: true
});

// Function 3: Verify season
const seasonResult = await verifySeasonDirect({
  baseUrl: 'https://api.example.com',
  username: 'admin',
  password: 'secret',
  seasonId: 'season-uuid',
  verbose: true,
  continueOnError: true
});

// Function 5: Batch verify
const batchResult = await verifyBatchNonReady({
  baseUrl: 'https://api.example.com',
  username: 'admin',
  password: 'secret',
  verbose: true,
  limit: 1000
});
```

### Using INI Interface Functions

```javascript
import {
  verifyMediaDescriptionFromIni,
  verifySeasonFromIni,
  verifyBatchNonReadyFromIni
} from './subtools/media-diagnostic/iniInterface.js';

// Function 2: Verify from INI
const result = await verifyMediaDescriptionFromIni(
  '/path/to/config.ini',
  'media-description-uuid',
  { verbose: true }
);

// Function 4: Verify season from INI
const seasonResult = await verifySeasonFromIni(
  '/path/to/config.ini',
  'season-uuid',
  { continueOnError: true }
);

// Batch verify from INI
const batchResult = await verifyBatchNonReadyFromIni(
  '/path/to/config.ini',
  { limit: 100 }
);
```

## Response Formats

### Single MediaDescription Verification

```typescript
{
  id: string;              // MediaDescription UUID
  diagnostics: string;     // "ready" or comma-separated errors
  is_ready: boolean;       // true if diagnostics === "ready"
  errors: string[];        // Array of error messages
}
```

### Season Verification

```typescript
{
  seasonId: string;
  generalResult: {
    id: string;
    diagnostics: string;
    is_ready: boolean;
    errors: string[];
  } | null;
  episodeResults: Array<{
    id: string;
    episode_title: string;
    episode_number: number;
    diagnostics: string;
    is_ready: boolean;
    errors: string[];
  }>;
  summary: {
    totalEpisodes: number;
    readyEpisodes: number;
    errorEpisodes: number;
    generalReady: boolean | null;
  };
}
```

### Batch Verification

```typescript
{
  nonReadyResults: Array<{
    id: string;
    episode_title: string;
    diagnostics: string;
    is_ready: boolean;
    errors: string[];
  }>;
  nonReadyPendingResults: Array<{
    id: string;
    episode_title: string;
    diagnostics: string;
    is_ready: boolean;
    errors: string[];
  }>;
  summary: {
    totalNonReady: number;
    totalNonReadyPending: number;
    nowReady: number;
    stillErrors: number;
  };
}
```

## Error Handling

The tool handles various error scenarios:

- **Authentication Errors**: Invalid credentials or expired tokens
- **404 Not Found**: MediaDescription or Season doesn't exist
- **Network Errors**: Connection issues, timeouts
- **API Errors**: Backend validation failures

### Continue on Error

By default, the tool continues processing even if individual items fail (useful for batch operations). Set `--no-continue-on-error` to stop on the first error.

### Verbose Mode

Enable `--verbose` to see detailed logging:

```
[2025-12-02 10:30:15] INFO: Authenticating with backend...
[2025-12-02 10:30:16] INFO: Successfully authenticated
[2025-12-02 10:30:16] INFO: Verifying MediaDescription 550e8400...
[2025-12-02 10:30:17] INFO: Diagnostics: ready
```

## Backend API Integration

This tool interacts with the following backend endpoints:

### POST /api/v1/media-descriptions/{id}/verify

Runs diagnostics on a MediaDescription and returns validation results.

**Authentication**: Bearer token (admin only)

**Response**:
```json
{
  "id": "uuid",
  "diagnostics": "ready",
  "is_ready": true,
  "errors": []
}
```

### GET /api/v1/seasons/{id}

Fetches season details including `general_media_description_id`.

### GET /api/v1/media-descriptions

Fetches MediaDescriptions with optional filtering by `season_id`.

**Pagination**: Supports `skip` and `limit` parameters (max 100 per page).

## Architecture

```
media-diagnostic/
├── core.js              # Pure functions (verifyMediaDescriptionDirect, verifySeasonDirect, verifyBatchNonReady)
├── iniInterface.js      # INI wrapper functions
├── cli.js               # CLI interface
├── index.js             # Class wrapper and exports
├── wrapper.js           # Main CLI integration
├── utils/
│   └── httpClient.js    # HTTP client for backend API
└── README.md            # This file
```

### Design Principles

- **Pure Functions**: Core logic in `core.js` with no side effects
- **Separation of Concerns**: INI parsing, HTTP calls, CLI separated
- **Sequential Processing**: All diagnostic calls are sequential (no parallel processing)
- **Client-Side Filtering**: Batch operations filter MediaDescriptions client-side
- **Reusability**: Same core functions used by CLI, class wrapper, and direct imports

## Examples

### Check all episodes of a season

```bash
media-uploader diagnostic verify-season-ini \
  --config config.ini \
  --season-id "abc-123" \
  --verbose
```

### Fix all pending diagnostics

```bash
# First, run batch verify to process all non-ready items
media-uploader diagnostic verify-batch-ini \
  --config config.ini \
  --verbose

# Then check results
# Items that are now "ready" have been fixed
# Items with errors need manual intervention
```

### Verify before deployment

```bash
# Check if a specific MediaDescription is production-ready
media-uploader diagnostic verify-ini \
  --config config.ini \
  --id "media-uuid"

# Exit code 0 = ready, exit code 1 = has errors
```

## Troubleshooting

### Authentication Failed

```
❌ Error: Backend authentication failed: Invalid credentials
```

**Solution**: Check your username and password in the INI file or command-line options.

### MediaDescription Not Found

```
❌ Error: Media description not found: 550e8400-...
```

**Solution**: Verify the UUID is correct and the MediaDescription exists in the database.

### Token Expired During Batch Processing

The tool automatically re-authenticates if it receives a 401 error during long batch operations.

### Too Many MediaDescriptions

If you have thousands of MediaDescriptions, use the `--limit` option:

```bash
media-uploader diagnostic verify-batch \
  --config config.ini \
  --limit 500
```

## License

Part of the kyool-media project.
