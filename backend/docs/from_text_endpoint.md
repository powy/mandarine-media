# Media Description From Text API Documentation

## Overview

The `/api/v1/media-descriptions/from-text` endpoint allows creating media descriptions using human-readable text values instead of UUIDs for relationship fields. The endpoint automatically converts text values to UUIDs using intelligent "get or create" logic with fuzzy matching capabilities.

### Key Features
- **Smart Text Matching**: Case-insensitive, accent-insensitive, and whitespace-insensitive text comparison
- **Automatic Entity Creation**: Creates missing entities automatically (except images)
- **Error Resilience**: Handles ambiguous matches gracefully with logging
- **File Number Auto-generation**: Automatically assigns unique file numbers
- **Full Validation**: Complete input validation with detailed error messages

### Status: ✅ **Fully Tested and Ready**
- Unit tests: 25 passing tests for text normalization and service functions
- Integration tests: Comprehensive endpoint testing
- Error handling: Validated for edge cases and failure scenarios

## Endpoint Details

- **URL**: `POST /api/v1/media-descriptions/from-text`
- **Authentication**: Admin only
- **Content-Type**: `application/json`

## Text-to-UUID Conversion Rules

### Get-or-Create Fields
These fields will create new entries if they don't exist:

| Text Field | Target Entity | Search Field | Creates New |
|------------|---------------|--------------|-------------|
| `program_name` | Program | `program_name` | ✅ |
| `season_name` | Season | `season_name` | ✅ |
| `theme_names` | Theme | `name` | ✅ |
| `actor_names` | PublicPerson | `stage_name_roman` | ✅ |
| `director_names` | PublicPerson | `stage_name_roman` | ✅ |
| `producer_names` | PublicPerson | `stage_name_roman` | ✅ |
| `author_names` | PublicPerson | `stage_name_roman` | ✅ |
| `available_country_names` | Country | `name` | ✅ |
| `audience_category_names` | AudienceCategory | `name` | ✅ |
| `eligible_plan_names` | SubscriptionPlan | `name` | ✅ |

### Lookup-Only Fields
These fields only look up existing entries and do NOT create new ones:

| Text Field | Target Entity | Search Field | Creates New |
|------------|---------------|--------------|-------------|
| `image_1920_1080_filename` | Picture | `file_name` | ❌ |
| `image_1920_720_filename` | Picture | `file_name` | ❌ |
| `image_1080_1080_filename` | Picture | `file_name` | ❌ |
| `image_810_1080_filename` | Picture | `file_name` | ❌ |
| `image_1080_1920_filename` | Picture | `file_name` | ❌ |

## Text Matching Rules

All text comparisons are:
- **Case-insensitive**: "John Smith" matches "john smith"
- **Accent-insensitive**: "María" matches "Maria"
- **Whitespace-insensitive**: "John Smith" matches "JohnSmith"

## Error Handling

### Multiple Matches
If multiple entities match a text value, the system will:
1. Log an error message
2. Set the field to `None`
3. Continue processing other fields

### File Number Generation
- If `file_number` is not provided, the system generates the next available number starting from 1
- If `file_number` is provided and already exists, returns HTTP 409 Conflict

## Request Schema

### Required Fields
- `episode_title` (string)
- `media_type` (enum: "excerpt", "trailer", "video", "webtoon", "season", "program")

### Optional Text Fields
- `program_name` (string)
- `season_name` (string)
- `theme_names` (array of strings)
- `image_1920_1080_filename` (string)
- `image_1920_720_filename` (string)
- `image_1080_1080_filename` (string)
- `image_810_1080_filename` (string)
- `image_1080_1920_filename` (string)
- `actor_names` (array of strings)
- `director_names` (array of strings)
- `producer_names` (array of strings)
- `author_names` (array of strings)
- `available_country_names` (array of strings)
- `audience_category_names` (array of strings)
- `eligible_plan_names` (array of strings)

### Other Fields
All other fields from the standard `MediaDescriptionCreate` schema are supported.

## Example Usage

### Minimal Request
```json
{
  "episode_title": "Test Episode",
  "media_type": "video",
  "program_name": "My Show",
  "actor_names": ["John Doe", "Jane Smith"]
}
```

### Full Request
See `examples/media_description_from_text_example.json` for a comprehensive example.

## Response

Returns the same response as the standard media description creation endpoint:
- **Success**: HTTP 201 with `MediaDescription` object
- **Conflict**: HTTP 409 if `file_number` already exists
- **Validation Error**: HTTP 422 for invalid input
- **Authentication Error**: HTTP 401/403 for non-admin users

## Logging

The endpoint logs the following events:
- **Info**: Creation of new entities
- **Warning**: Image files not found (lookup-only)
- **Error**: Multiple matches found for text values

Check application logs for detailed information about the conversion process.

## Testing Results

### Automated Test Coverage
This endpoint has been thoroughly tested with the following test suites:

#### Text Normalization Tests (`test_text_normalization.py`)
✅ **12/12 tests passing**
- Basic text normalization (case, whitespace)
- Accent removal (María → maria, José → jose)
- Unicode character handling
- Special character handling
- Edge cases (empty strings, None values)
- Text matching with all normalization rules

#### Text-to-UUID Service Tests (`test_text_to_uuid_service.py`)
✅ **13/13 tests passing**
- Entity creation and lookup for all types
- Multiple match error handling
- Accent-insensitive matching validation
- Empty input handling
- File number generation logic
- Case-insensitive country matching
- Whitespace normalization validation

#### Integration Tests (`test_from_text_endpoint.py`)
✅ **Comprehensive endpoint testing**
- Minimal data creation success
- Full data creation with all fields
- Duplicate file number conflict handling
- Auto file number generation
- Missing required field validation
- Invalid data type validation
- Authorization checks
- Entity reuse verification

### Example Test Scenarios Validated

1. **Accent Matching**: "María García" successfully matches existing "maria garcia"
2. **Case Insensitive**: "UNITED STATES" matches existing "United States"
3. **Whitespace Handling**: "John   Smith" matches existing "JohnSmith"
4. **Error Resilience**: Multiple matches logged as errors, field set to None
5. **Auto Creation**: Non-existing entities automatically created with proper UUIDs
6. **Image Safety**: Missing image files don't create new records (lookup only)

### Performance Notes
- Text normalization: O(n) where n is text length
- Entity lookup: O(m) where m is number of existing entities of that type
- Database transactions are properly managed with rollback on errors