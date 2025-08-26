# Media Analyzer Tool

A comprehensive Node.js tool for analyzing and associating media files (videos, subtitles, images) with support for various directory structures and formats.

## Features

- **Multi-format Support**: Videos (MP4, MKV, AVI, etc.), Subtitles (SRT, VTT, ASS, etc.), Images (JPG, PNG, WebP, etc.)
- **Flexible Directory Structure**: Single directory or separate folders for different media types
- **Smart Association**: Intelligent matching of subtitles and images to videos
- **Episode Detection**: Automatic detection of TV series episodes with season/episode numbering
- **Language Detection**: Automatic language identification from subtitle filenames
- **Movie/Trailer Classification**: Distinguishes between movies, trailers, and clips
- **Metadata Reading**: Optional video metadata extraction using FFmpeg
- **Multiple Output Formats**: JSON analysis results with optional upload format

## Project Structure

```
media-analyzer/
├── src/
│   ├── index.js                 # Main MediaAnalyzer class
│   ├── config.js                # Configuration settings
│   ├── cli.js                   # CLI interface
│   ├── models/
│   │   ├── MediaFile.js         # Base media file class
│   │   ├── VideoFile.js         # Video file with metadata
│   │   ├── SubtitleFile.js      # Subtitle file with language info
│   │   ├── ImageFile.js         # Image file with type detection
│   │   └── MediaAssociation.js  # Association between media files
│   ├── analyzers/
│   │   ├── FileScanner.js       # Directory and file scanning
│   │   ├── NameParser.js        # Filename parsing and pattern matching
│   │   ├── MetadataReader.js    # Video metadata extraction
│   │   ├── StructureDetector.js # Directory structure detection
│   │   └── MovieTrailerAnalyzer.js # Movie/trailer classification
│   ├── associators/
│   │   ├── FileAssociator.js    # File association logic
│   │   └── GlobalImageIdentifier.js # Global image detection
│   ├── formatters/
│   │   └── OutputFormatter.js   # Result formatting
│   └── utils/
│       └── logger.js            # Centralized logging
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Usage

### CLI Usage

**Single Directory Mode (Legacy):**
```bash
# Analyze a single directory containing all media files
media-analyzer /path/to/media

# With options
media-analyzer /path/to/media --verbose --output results.json
```

**Multi-Directory Mode:**
```bash
# Separate directories for different media types
media-analyzer -v /path/to/videos -s /path/to/subtitles -i /path/to/images

# Only videos and subtitles
media-analyzer -v /path/to/videos -s /path/to/subtitles

# With additional options
media-analyzer -v /videos -s /subtitles -i /images --verbose --min-score 70
```

**CLI Options:**
- `-v, --video-path <path>`: Path to video files directory
- `-s, --subtitle-path <path>`: Path to subtitle files directory  
- `-i, --image-path <path>`: Path to image files directory
- `-o, --output <file>`: Output JSON file (default: auto-generated)
- `--verbose`: Enable verbose logging
- `--min-score <score>`: Minimum matching score (default: 60)
- `--no-metadata`: Skip video metadata reading (faster)
- `--export-for-upload`: Generate upload-optimized format

### Programmatic Usage

```javascript
const MediaAnalyzer = require('./src/index');
const Config = require('./src/config');

// Create analyzer with custom config
const config = new Config();
config.MIN_MATCH_SCORE = 70;
const analyzer = new MediaAnalyzer(config);

// Single directory analysis
const result = await analyzer.analyze('/path/to/media');

// Multi-directory analysis
const result = await analyzer.analyze({
    videoPath: '/path/to/videos',
    subtitlePath: '/path/to/subtitles',
    imagePath: '/path/to/images'
});

// With options
const result = await analyzer.analyze('/path/to/media', {
    readMetadata: true
});

// Save results
const outputFile = await analyzer.analyzeAndSave(
    '/path/to/media', 
    'results.json',
    { readMetadata: true }
);
```

## Configuration

The `Config` class allows customization of:

- **File Extensions**: Supported video, subtitle, and image formats
- **Episode Patterns**: Regex patterns for detecting episodes
- **Language Codes**: Supported language identification
- **Trailer/Clip Patterns**: Patterns for detecting trailers and clips
- **Matching Thresholds**: Scoring thresholds for file association
- **Duration Limits**: Classification thresholds for movies vs trailers

## Output Format

The tool generates detailed JSON analysis with:

```json
{
  "analysis_date": "2024-01-15T10:30:00.000Z",
  "root_path": "/path/to/media",
  "media_type": "series",
  "structure_type": "by_season",
  "global_images": [...],
  "media_items": [
    {
      "episode_number": 1,
      "season_number": 1,
      "title": "Episode Title",
      "video": {
        "filepath": "/path/to/S01E01.mkv",
        "duration": 2700,
        "resolution": [1920, 1080],
        "video_type": "episode"
      },
      "subtitles": [
        {
          "filepath": "/path/to/S01E01.en.srt",
          "language_code": "en",
          "language_name": "English"
        }
      ],
      "images": [...]
    }
  ],
  "statistics": {
    "total_videos": 10,
    "total_subtitles": 20,
    "matched_subtitles": 18,
    "languages_found": ["en", "fr", "es"]
  }
}
```

## Dependencies

- **commander**: CLI argument parsing
- **glob-promise**: File pattern matching
- **string-similarity**: Filename similarity comparison
- **fluent-ffmpeg**: Video metadata extraction
- **winston**: Logging
- **ffmpeg-static** (dev): Embedded FFmpeg binaries
- **ffprobe-static** (dev): Embedded FFprobe binaries

## Testing

Test with the provided test data:

```bash
npm test
# or
npm run dev /path/to/test/directory --verbose
```

## License

MIT