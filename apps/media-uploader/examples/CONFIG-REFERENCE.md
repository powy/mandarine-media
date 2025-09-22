# Enhanced Mux Upload Configuration Reference

## Configuration Schema Overview

The enhanced Mux upload tool supports both legacy configurations and new enhanced options with full backward compatibility.

## Required Sections

### `auth` (Required)
Mux API authentication credentials.

```json
{
  "auth": {
    "mux_token_id": "string (required)",
    "mux_token_secret": "string (required)"
  }
}
```

### `backend` (Required)
Your backend server configuration for storing upload metadata.

```json
{
  "backend": {
    "server_address": "string (required, URI)",
    "user": "string (required)",
    "password": "string (required)"
  }
}
```

### `video` (Required)
Video file information.

```json
{
  "video": {
    "filepath": "string (required)",
    "title": "string (optional)",
    "description": "string (optional)"
  }
}
```

## Enhanced Upload Options (`options`)

### Legacy Options (Backward Compatible)
```json
{
  "options": {
    "timeout": 3600000,              // Total upload timeout in ms (min: 60000)
    "retry_attempts": 3,             // Number of retry attempts (1-10)
    "retry_delay": 5000,             // Retry delay in ms (1000-30000)
    "chunk_size": 31457280,          // Legacy chunk size in bytes (1MB-100MB)
    "concurrent_uploads": 1          // Concurrent uploads (1-5)
  }
}
```

### Enhanced Upload Options (New)
```json
{
  "options": {
    "upload_method": "auto",         // "auto", "upchunk", or "custom"
    "chunk_size_mb": 5,              // Chunk size in MB (1-50)
    "memory_threshold_mb": 100,      // Memory threshold for method selection (50-1000)
    "enable_resume": true,           // Enable upload resume capability
    "max_chunk_retries": 5,          // Per-chunk retry attempts (1-10)
    "retry_delay_base": 1000,        // Base retry delay in ms (100-10000)
    "chunk_timeout": 120000,         // Per-chunk timeout in ms (30000-600000)
    "dynamic_chunk_size": false,     // Enable dynamic chunk sizing
    "validate_before_upload": true,  // Validate before starting upload
    "network_quality_monitoring": false, // Monitor network quality
    "adaptive_retry_delay": true     // Use adaptive retry delays
  }
}
```

## Upload Method Details

### `auto` (Recommended)
- Automatically selects the best upload method based on file size
- Uses memory threshold to decide between `upchunk` and `custom`
- Files ≤ memory threshold → `upchunk`
- Files > memory threshold → `custom`

### `upchunk`
- Uses Mux's official @mux/upchunk library
- Good for smaller files (typically < 100MB)
- Handles chunking automatically
- May encounter memory issues with very large files

### `custom`
- Memory-efficient streaming approach
- Ideal for large files (> 100MB)
- Advanced retry logic with exponential backoff
- Resume capability with state persistence
- Optimal for production environments

## Optional Sections

### `settings` (Video Settings)
```json
{
  "settings": {
    "playback_policy": ["public", "signed", "drm"],
    "video_quality": "basic|plus",
    "max_resolution_tier": "720p|1080p|1440p|2160p",
    "normalize_audio": false,
    "master_access": "none|temporary|full",
    "mp4_support": "none|capped-1080p|audio-only|standard",
    "cors_origin": "*",
    "environment_text": "production",
    "passthrough": "custom-identifier"
  }
}
```

### `metadata` (Custom Metadata)
```json
{
  "metadata": {
    "project": "string",
    "environment": "string",
    "tags": ["array", "of", "strings"],
    "version": "string or number",
    "priority": 1,
    "custom_field": "any value"
  }
}
```

### `subtitles` (Subtitle Tracks)
```json
{
  "subtitles": [
    {
      "url": "https://example.com/subtitles.vtt",
      "language_code": "en",
      "name": "English",
      "text_type": "subtitles|captions",
      "closed_captions": false,
      "passthrough": "optional-identifier"
    }
  ]
}
```

### `drm` (Digital Rights Management)
```json
{
  "drm": {
    "enabled": true,
    "configuration_id": "your-drm-config-id",
    "license_url": "https://license-server.com/license",
    "certificate_url": "https://certs.com/certificate.pem"
  }
}
```

### `static_renditions` (Static Video Files)
```json
{
  "static_renditions": {
    "files": [
      {
        "name": "mobile-version",
        "ext": "mp4|webm",
        "resolution_tier": "720p|1080p|1440p|2160p",
        "passthrough": "optional-identifier"
      }
    ]
  }
}
```

### `watermark` (Video Watermark)
```json
{
  "watermark": {
    "url": "https://example.com/watermark.png",
    "overlay_settings": {
      "vertical_align": "top|middle|bottom",
      "vertical_margin": "10%",
      "horizontal_align": "left|center|right",
      "horizontal_margin": "10%",
      "width": "15%",
      "opacity": "80%"
    }
  }
}
```

### `database` (Metadata Storage)
```json
{
  "database": {
    "type": "postgresql|mysql|sqlite",
    "connection": {
      "host": "db.example.com",
      "port": 5432,
      "database": "mux_uploads",
      "user": "uploader",
      "password": "secure-password",
      "filename": "/path/to/sqlite.db"  // SQLite only
    },
    "table": "mux_assets",
    "save_playback_ids": true,
    "save_tracks": true,
    "save_metadata": true
  }
}
```

### `webhook` (Event Notifications)
```json
{
  "webhook": {
    "enabled": true,
    "url": "https://your-app.com/webhooks/mux",
    "events": [
      "video.asset.ready",
      "video.asset.errored",
      "video.asset.created",
      "video.asset.updated",
      "video.asset.deleted",
      "video.upload.asset_created",
      "video.upload.errored",
      "video.upload.cancelled"
    ]
  }
}
```

### `logging` (Log Configuration)
```json
{
  "logging": {
    "enabled": true,
    "level": "error|warn|info|debug",
    "console": true,
    "format": "json|simple",
    "file": "/path/to/logfile.log"
  }
}
```

## Performance Recommendations

### Small Files (< 50MB)
```json
{
  "options": {
    "upload_method": "upchunk",
    "chunk_size_mb": 2,
    "memory_threshold_mb": 50,
    "max_chunk_retries": 3,
    "chunk_timeout": 60000
  }
}
```

### Medium Files (50MB - 500MB)
```json
{
  "options": {
    "upload_method": "auto",
    "chunk_size_mb": 10,
    "memory_threshold_mb": 200,
    "max_chunk_retries": 5,
    "chunk_timeout": 180000,
    "enable_resume": true
  }
}
```

### Large Files (> 500MB)
```json
{
  "options": {
    "upload_method": "custom",
    "chunk_size_mb": 20,
    "memory_threshold_mb": 500,
    "max_chunk_retries": 10,
    "chunk_timeout": 300000,
    "enable_resume": true,
    "adaptive_retry_delay": true
  }
}
```

### Production Environment
```json
{
  "options": {
    "upload_method": "auto",
    "chunk_size_mb": 25,
    "memory_threshold_mb": 1000,
    "max_chunk_retries": 15,
    "chunk_timeout": 600000,
    "enable_resume": true,
    "dynamic_chunk_size": true,
    "adaptive_retry_delay": true,
    "network_quality_monitoring": true,
    "validate_before_upload": true
  }
}
```

## Migration from Legacy Configuration

The enhanced system is fully backward compatible. You can:

1. **Keep existing configs unchanged** - They will work with sensible defaults
2. **Gradually add enhanced options** - Mix legacy and new options
3. **Override with CLI options** - Use command-line flags to test new settings
4. **Use environment variables** - Override sensitive values securely

Legacy `chunk_size` (bytes) is automatically converted alongside new `chunk_size_mb` (megabytes) for compatibility.