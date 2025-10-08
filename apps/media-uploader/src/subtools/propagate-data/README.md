# Propagate Season Data

A tool to propagate missing data from a season media description to all its episode media descriptions.

## Overview

When managing TV series content, it's common for episodes to share many attributes with their parent season (images, categories, themes, production year, etc.). This tool automatically copies missing fields from a season to all its episodes, ensuring consistency and reducing manual data entry.

## Features

- **Automatic Field Detection**: Only updates fields that are empty in episodes
- **Comprehensive Field Coverage**: Propagates text fields, arrays, relationships, and images
- **Safe Updates**: Uses PATCH requests to only update specified fields
- **Detailed Reporting**: Shows which fields were copied for each episode
- **Error Handling**: Continues processing even if individual episodes fail

## Fields Propagated

The tool propagates the following fields from season to episodes when they are empty:

### Text Fields
- `descriptive_summary_text` (summary)
- `synopsis_text` (synopsis)
- `production_year`
- `rights_holder`
- `copyright_owner_text`

### Array Fields
- `media_categories_list`
- `hashtags_text_list`

### Relationship IDs
- `director_ids` (directors)
- `producer_ids` (producers)
- `author_ids` (authors)
- `actor_ids` (actors)
- `origin_country_ids` (origin countries)
- `available_country_ids` (available countries)
- `original_language_ids` (original languages)
- `audience_category_ids` (audience categories)
- `media_theme_ids` (media themes)
- `eligible_plan_ids` (eligible plans)

### Images (Most Important)
- `image_1920x1080_id` (16:9 landscape)
- `image_1920_720_id` (wide banner)
- `image_1080x1080_id` (square)
- `image_810_1080_id` (4:3 portrait)
- `image_1080_1920_id` (9:16 portrait)

## Usage

### Command Line Interface

#### Basic Usage
```bash
# Propagate data from a season to all its episodes
media-uploader propagate-season-data \
  --season-id "abc123-def456-ghi789" \
  --config config.json
```

#### With Options
```bash
# Verbose output
media-uploader propagate-season-data \
  --season-id "abc123-def456-ghi789" \
  --config config.json \
  --verbose

# Dry run (preview without making changes)
media-uploader propagate-season-data \
  --season-id "abc123-def456-ghi789" \
  --config config.json \
  --dry-run \
  --verbose
```

#### Using Alias
```bash
# Short form
media-uploader propagate \
  --season-id "abc123" \
  --config config.json
```

### Programmatic Usage

#### Import and Use
```javascript
import { propagateSeasonData } from './subtools/propagate-data/wrapper.js';

const result = await propagateSeasonData({
  seasonId: 'abc123-def456-ghi789',
  config: './config.json',
  verbose: true,
  dryRun: false
});

console.log(`Updated ${result.updated} episodes`);
console.log(`Skipped ${result.skipped} episodes`);
```

#### Using Service Directly
```javascript
import { PropagationService } from './subtools/propagate-data/services/propagationService.js';

const config = {
  backend: {
    baseUrl: 'https://api.example.com',
    username: 'admin',
    password: 'secret'
  }
};

const service = new PropagationService(config);
const result = await service.propagateMissingFromSeasonToEpisodes('season-id-123');
```

### Server Integration

#### Process Excel Files
```javascript
import { processTreatmentFolder } from './subtools/propagate-data/serverIntegration.js';

// Process all Excel files in a treatment folder
// Automatically detects season media types and propagates data
const result = await processTreatmentFolder(
  '/path/to/treatment/folder',
  './config.json',
  { verbose: true }
);
```

#### Process Single Excel File
```javascript
import { processExcelFileForPropagation } from './subtools/propagate-data/serverIntegration.js';

const result = await processExcelFileForPropagation(
  '/path/to/0_desc_season.xlsx',
  './config.json',
  { verbose: true }
);
```

#### Batch Processing
```javascript
import { processBatchFolders } from './subtools/propagate-data/serverIntegration.js';

// Process multiple folders, each containing Excel files
const result = await processBatchFolders(
  '/path/to/batch/folder',
  './config.json',
  { verbose: true }
);
```

## Configuration

The tool requires a configuration JSON file with backend API credentials:

```json
{
  "backend": {
    "baseUrl": "https://api.example.com",
    "username": "your-username",
    "password": "your-password"
  }
}
```

## Output Examples

### Successful Propagation
```
🔄 Season Data Propagation Tool

Loading configuration from: config.json
✅ Configuration loaded

Season ID: abc123-def456-ghi789

🔄 Starting season data propagation...
✅ Found season: My Amazing Series - Season 1
✅ Found 10 episodes

Processing episode: Episode 1 - Pilot
  Updating with fields: summary, synopsis, image_1920x1080, image_1920x720, media_categories, directors
  ✅ Updated 6 field(s)

Processing episode: Episode 2 - The Journey Begins
  Updating with fields: summary, image_1920x1080, image_1920x720
  ✅ Updated 3 field(s)

...

📊 Propagation Summary:
  ✅ Updated: 10 episodes
  ⏭️  Skipped: 0 episodes

✅ Propagation completed successfully!

📊 Results:
   Updated: 10 episode(s)
   Skipped: 0 episode(s)
```

### With Skipped Episodes
```
📊 Propagation Summary:
  ✅ Updated: 8 episodes
  ⏭️  Skipped: 2 episodes

✅ Propagation completed successfully!
```

### With Errors
```
Processing episode: Episode 5 - The Error
  ❌ Error: Network timeout

📊 Propagation Summary:
  ✅ Updated: 9 episodes
  ⏭️  Skipped: 0 episodes
  ❌ Errors: 1 episodes

⚠️  Propagation completed with errors
```

## Return Value

The propagation functions return an object with the following structure:

```javascript
{
  success: true,          // false if any errors occurred
  updated: 8,            // number of episodes updated
  skipped: 2,            // number of episodes skipped (no empty fields)
  errors: [],            // array of error objects
  details: {             // detailed results
    updated: [
      {
        id: "episode-id",
        title: "Episode Title",
        fieldsCopied: ["summary", "image_1920x1080"],
        updateCount: 2
      }
    ],
    skipped: [
      {
        id: "episode-id",
        title: "Episode Title",
        reason: "No empty fields"
      }
    ],
    errors: []
  }
}
```

## Error Handling

The tool handles errors gracefully:

- **Authentication Errors**: Fails early if credentials are invalid
- **Season Not Found**: Returns error if season ID doesn't exist
- **Episode Update Errors**: Continues processing other episodes
- **Network Errors**: Retries are handled by axios

## Best Practices

1. **Always use --dry-run first** to preview changes
2. **Use --verbose** to see detailed field-by-field updates
3. **Check episode data** before propagation to understand what will change
4. **Backup data** before running on production systems
5. **Monitor logs** for errors during batch processing

## Integration Examples

### With One Media Complete Upload
```javascript
// After uploading a season, propagate its data to episodes
const uploadResult = await oneMediaCompleteUpload(options);

if (uploadResult.media_description_id && uploadResult.media_type === 'season') {
  await propagateSeasonData({
    seasonId: uploadResult.media_description_id,
    config: './config.json',
    verbose: true
  });
}
```

### With Server Processing
```javascript
// In your server's Excel processing pipeline
import { processExcelFileForPropagation } from './subtools/propagate-data/serverIntegration.js';

async function processUploadedExcel(excelPath) {
  // ... existing processing logic ...

  // Check if it's a season and propagate
  const result = await processExcelFileForPropagation(
    excelPath,
    './config.json',
    { verbose: true }
  );

  if (result.propagated) {
    console.log(`Season data propagated to ${result.updated} episodes`);
  }
}
```

## Troubleshooting

### "Authentication failed"
- Verify credentials in config.json
- Check backend URL is correct
- Ensure API is accessible

### "Season not found"
- Verify the season ID is correct
- Check the season exists in the backend
- Ensure you have permission to access it

### "No episodes found"
- Verify episodes exist for this season
- Check the season_id relationship is set on episodes
- Ensure episodes are not filtered out by permissions

### Some episodes not updated
- Check individual episode errors in the output
- Verify field data types match API expectations
- Review API logs for validation errors

## Dependencies

- `axios` - HTTP client for API requests
- `chalk` - Terminal colors and styling
- `exceljs` - Excel file parsing (for server integration)

## API Endpoints Used

- `POST /api/v1/auth/login` - Authentication
- `GET /api/v1/media-descriptions/{id}` - Get season data
- `GET /api/v1/media-descriptions?season_id={id}` - Get episodes
- `PATCH /api/v1/media-descriptions/{id}` - Update episode

## License

Part of the Kyool Media Uploader Tool.
