# Uploader Tool

A unified command-line interface that consolidates multiple media upload tools into a single, easy-to-use utility.

## Overview

This tool combines the functionality of four specialized tools:

1. **Media Analyzer** - Analyzes and associates video, subtitle, and image files
2. **Mux Upload Tool** - Uploads videos to Mux using Direct Upload technology  
3. **Mux Subtitle Upload Tool** - Uploads subtitles to existing Mux assets via S3
4. **Picture Upload Tool** - Uploads pictures to S3 and creates API records

## Installation

```bash
cd kyool-media/tools/uploader_tool
npm install
```

## Usage

### Basic Usage

```bash
# Show help and available commands
node src/index.js --help

# Get help for a specific command
node src/index.js analyze --help
node src/index.js mux-upload --help
```

### Media Analysis

Analyze and associate video, subtitle, and image files:

```bash
# Analyze a single folder (legacy mode)
node src/index.js analyze /path/to/media --output results.json

# Analyze separate folders (new mode)
node src/index.js analyze \
  --video-path /path/to/videos \
  --subtitle-path /path/to/subtitles \
  --image-path /path/to/images \
  --output analysis.json

# Verbose analysis with custom settings
node src/index.js analyze /path/to/media \
  --verbose \
  --min-score 70 \
  --export-for-upload
```

### Video Upload to Mux

Upload videos to Mux using configuration files:

```bash
# Basic upload
node src/index.js mux-upload --config video-config.json

# Upload with custom settings
node src/index.js upload-video \
  --config video-config.json \
  --timeout 7200 \
  --retry 5 \
  --verbose

# Dry run (validate without uploading)
node src/index.js mux-upload --config video-config.json --dry-run
```

### Subtitle Upload to Mux

Upload subtitles to existing Mux assets:

```bash
# Basic subtitle upload
node src/index.js upload-subtitles --config subtitle-config.json

# Upload with cleanup settings
node src/index.js mux-subtitle-upload \
  --config subtitle-config.json \
  --cleanup-delay 180 \
  --verbose
```

### Picture Upload

Upload pictures to S3 and create API records:

```bash
# Basic picture upload
node src/index.js upload-picture --config picture-config.json

# Verbose upload with dry run
node src/index.js picture-upload \
  --config picture-config.json \
  --verbose \
  --dry-run
```

## Commands

### `analyze` (alias: `media-analyzer`)

Analyzes and associates media files.

**Arguments:**
- `[path]` - Path to folder to analyze (legacy mode)

**Options:**
- `-v, --video-path <path>` - Path to video folder
- `-s, --subtitle-path <path>` - Path to subtitle folder  
- `-i, --image-path <path>` - Path to image folder
- `-o, --output <file>` - Output JSON file
- `--verbose` - Verbose mode for more details
- `--min-score <score>` - Minimum association score (default: 60)
- `--no-metadata` - Skip video metadata reading (faster)
- `--export-for-upload` - Export format optimized for upload

### `mux-upload` (alias: `upload-video`)

Uploads videos to Mux.

**Options:**
- `-c, --config <path>` - Configuration JSON file path (required)
- `-d, --debug` - Enable debug logging
- `-t, --timeout <seconds>` - Upload timeout in seconds (default: 3600)
- `-r, --retry <count>` - Number of retry attempts (default: 3)
- `--dry-run` - Validate configuration without uploading
- `--progress` - Show upload progress bar (default: true)
- `--no-progress` - Disable upload progress bar
- `-v, --verbose` - Verbose output
- `-q, --quiet` - Quiet mode (errors only)

### `mux-subtitle-upload` (alias: `upload-subtitles`)

Uploads subtitles to existing Mux assets via S3.

**Options:**
- `-c, --config <path>` - Configuration JSON file path (required)
- `-d, --debug` - Enable debug logging
- `-r, --retry <count>` - Number of retry attempts (default: 3)
- `--dry-run` - Validate configuration without uploading
- `-v, --verbose` - Verbose output
- `-q, --quiet` - Quiet mode (errors only)
- `--no-cleanup` - Skip S3 file cleanup after upload
- `--cleanup-delay <minutes>` - S3 cleanup delay in minutes (default: 120)

### `picture-upload` (alias: `upload-picture`)

Uploads pictures to S3 and creates API records.

**Options:**
- `-c, --config <path>` - Configuration JSON file path (required)
- `-v, --verbose` - Verbose output
- `--dry-run` - Validate configuration and check file without uploading

## Architecture

The tool uses a modular architecture:

```
src/
├── index.js                    # Main CLI dispatcher
├── subtools/
│   ├── media-analyzer/         # Media analysis functionality
│   ├── mux-upload/            # Mux video upload functionality  
│   ├── mux-subtitle-upload/   # Mux subtitle upload functionality
│   └── picture-upload/        # Picture upload functionality
```

Each subtool maintains its original functionality while being accessible through the unified interface.

## Dependencies

All required dependencies are consolidated in the main `package.json`. The tool uses:

- **Commander.js** for CLI interface
- **Chalk** for colored output  
- **Mux SDK** for video operations
- **AWS SDK** for S3 operations
- **FFmpeg** for media analysis
- And many other specialized libraries

## Comparison with Original Tools

| Feature | Original Tools | Consolidated Tool |
|---------|----------------|-------------------|
| Functionality | ✅ Same | ✅ Same |
| Command-line Interface | ✅ Individual CLIs | ✅ Unified CLI with subcommands |
| Dependencies | ❌ Duplicated across tools | ✅ Shared dependencies |
| Maintenance | ❌ Multiple package.json files | ✅ Single package.json |
| Usage | ❌ Remember 4 different tools | ✅ Single tool with help system |

## Future Enhancements

The consolidated structure makes it easy to:

- Chain operations between tools
- Share configuration across tools  
- Add new upload tools seamlessly
- Implement cross-tool analytics and reporting