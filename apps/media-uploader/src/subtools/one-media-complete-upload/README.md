# One Media Complete Upload

A comprehensive media upload workflow tool that handles video, image, and subtitle uploads with Excel-based file management.

## Overview

This subtool provides a complete media upload workflow that:

1. Scans a folder for media files (videos, images, subtitles)
2. Creates or uses an Excel file (`0_desc_*.xlsx`) for file management and metadata
3. Processes uploads to Mux (videos), S3 (images), and handles subtitles
4. Updates backend records through API calls

## Usage

```bash
# Basic usage
uploader-tool complete-upload --config config.json --folder /path/to/media

# With verbose output
uploader-tool complete-upload --config config.json --folder /path/to/media --verbose

# Dry run (validate only)
uploader-tool complete-upload --config config.json --folder /path/to/media --dry-run
```

## Configuration

The tool requires a JSON configuration file with the following structure:

```json
{
  "backend": {
    "baseUrl": "http://localhost:8000",
    "username": "admin@kyool.com",
    "password": "admin123"
  },
  "mux": {
    "tokenId": "YOUR_MUX_TOKEN_ID",
    "tokenSecret": "YOUR_MUX_TOKEN_SECRET"
  },
  "s3": {
    "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
    "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY",
    "region": "eu-west-3",
    "pictures": {
      "bucket": "example-media",
      "keyPrefix": "pictures/"
    },
    "subtitles": {
      "bucket": "example-media-subtitles",
      "keyPrefix": "subtitles/"
    }
  },
  "settings": {
    "videoQuality": "plus",
    "playbackPolicy": ["public"],
    "maxResolutionTier": "1080p",
    "mp4Support": "standard"
  }
}
```

## Workflow

### First Run (Excel Creation Phase)

1. The tool scans the specified folder for media files (for reference)
2. If no `0_desc*.xlsx` file exists, it creates `0_desc_FOLDERNAME_auto.xlsx` from template (falls back to legacy `0_list*.xlsx` files for backward compatibility)
3. The Excel template preserves its original structure (predefined rows and columns)
4. Tool stops and prompts user to fill the Excel file with actual filenames

### Second Run (Upload Phase)

1. Tool finds existing Excel file
2. Reads metadata from the "Description" sheet  
3. Reads file mappings from the "Files" sheet (user must fill in actual filenames)
4. Uploads files according to configuration and Excel mappings
5. Updates Excel file with upload results

## Excel File Structure

### Files Sheet
The Files sheet uses a predefined structure with the following columns:
- **Files**: Content type (Video, Trailer 1, Trailer 2, etc.)
- **File name**: Actual filename to upload
- **Poster**: Poster/thumbnail image filename
- **Fr subtitle**: French subtitle filename
- **En subtitle**: English subtitle filename  
- **Ko Subtitle**: Korean subtitle filename

Example rows:
| Files | File name | Poster | Fr subtitle | En subtitle | Ko Subtitle |
|-------|-----------|--------|-------------|-------------|-------------|
| Video | my_video.mp4 | poster.jpg | sub_fr.srt | sub_en.srt | sub_ko.srt |
| Trailer 1 | trailer1.mp4 | | trailer1_fr.srt | trailer1_en.srt | |

### Description Sheet
The Description sheet contains metadata with inverted structure (description in column A, key in column B):

**Settings Section:**
- **policy**: Security policy (public, drm, signed)

**Presentation Section:**
- **program_name**: Program title
- **season_name**: Season title
- **episode_title**: Episode/video title
- **episode_number**: Episode number
- **media_categories**: Categories (movie, drama, short-drama, short-film, web-drama, musical, animation, documentary, tvshow, other)
- **media_themes**: Themes
- **descriptive_summary_text**: Short description
- **synopsis_text**: Full synopsis
- **slug**: URL slug for direct link

**Language Section:**
- **original_languages_list**: Original languages (semicolon-separated, e.g., "Français ; Anglais")
- **available_subtitle_languages_list**: Available subtitle languages (semicolon-separated, e.g., "Français ; Anglais ; Coréen")
- **available_audio_languages_list**: Available audio languages (semicolon-separated, e.g., "Français ; Anglais")

Note: Column A contains the French descriptions, Column B contains the technical keys used for processing.

## Supported File Types

### Videos
- .mp4, .mov, .avi, .mkv, .webm, .m4v, .mpg, .mpeg

### Images
- .jpg, .jpeg, .png, .gif, .bmp, .webp, .svg, .tiff

### Subtitles
- .srt, .vtt, .ass, .ssa, .sub, .sbv

## Current Status

**Phase 1 (Completed):**
- ✅ Folder scanning and file detection
- ✅ Excel template creation and management (using real template structure)
- ✅ Configuration validation with separate S3 buckets for pictures and subtitles
- ✅ Logging system
- ✅ CLI integration

**Phase 2 (To be implemented):**
- ⏳ Actual file uploads to Mux and S3
- ⏳ Backend API integration
- ⏳ Progress tracking and status updates
- ⏳ Error handling and retry logic

## Logging

Logs are written to `../logs/one-media-complete-upload.log` by default. Configure logging in the configuration file:

```json
{
  "logging": {
    "enabled": true,
    "level": "info",
    "file": "../logs/one-media-complete-upload.log",
    "console": true
  }
}
```

## Error Handling

The tool includes comprehensive error handling for:
- Invalid configuration files
- Missing folders or files
- Excel file format issues
- Network connectivity problems
- API authentication failures

All errors are logged and displayed with helpful messages to guide troubleshooting.