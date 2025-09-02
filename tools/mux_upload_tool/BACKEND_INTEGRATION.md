# Backend Integration Enhancement

This document describes the enhanced backend integration features added to the Mux Upload Tool.

## Overview

The tool now provides seamless integration with your backend API to:
- Create video_file records with mux_asset_id from the start of the upload process
- Automatically populate remaining video file data using Mux API when the asset is ready
- Extract comprehensive video metadata before upload (aspect ratio, audio sample rate, etc.)
- Provide graceful fallback if backend completion fails

## New Features

### 1. Enhanced Video File Record Creation

**Before**: Video file records were created with basic metadata
**Now**: Records are created with mux_asset_id and comprehensive technical metadata

```javascript
// Enhanced metadata extraction now includes:
{
  aspect_ratio: "1.778",           // Calculated from video dimensions
  audio_sample_rate: 48000,       // Extracted from audio streams
  video_codec: "h264",             // Video codec information
  audio_codec: "aac",              // Audio codec information
  bitrate_kbps: 2500,              // Converted from bps to kbps
  // ... existing fields
}
```

### 2. Mux Completion API Integration

**New Step in Upload Process**: After Mux asset becomes "ready", the tool calls the backend's `/complete-from-mux` endpoint to populate remaining fields from Mux API.

```javascript
// Step 11: Complete video file data from Mux API
const completedVideoFile = await backendService.completeVideoFileFromMux(videoRecord.id);
```

**Graceful Degradation**: If completion endpoint fails, falls back to manual update without failing the upload.

### 3. Configuration Changes

#### Backend Configuration (Required for new features)
```json
{
  "backend": {
    "server_address": "http://localhost:8000",
    "user": "admin@example.com", 
    "password": "your_password_here"
  }
}
```

#### Optional Feature Controls
```json
{
  "features": {
    "backend_integration": {
      "enabled": true,
      "create_with_mux_asset_id": true,
      "complete_from_mux_api": true,
      "enhanced_metadata_extraction": true,
      "auto_complete_on_ready": true
    }
  }
}
```

## Updated Upload Flow

The enhanced upload process follows these steps:

1. **Check video file exists**
2. **Test backend connection** 
3. **Extract enhanced video metadata** (now includes aspect_ratio, audio_sample_rate)
4. **Get languages from backend**
5. **Validate video file for Mux**
6. **Create Mux direct upload** (get upload_id and future asset_id)
7. **Create backend video_file record with mux_asset_id** ⭐ **NEW**
8. **Upload file to Mux**
9. **Monitor upload status**
10. **Wait for asset to be ready**
11. **Complete video file from Mux API** ⭐ **NEW**
12. **Add subtitles**
13. **Setup webhook**
14. **Save to database** (legacy)

## Backend API Requirements

### Enhanced video_files/create-metadata Endpoint
Must accept these additional fields:
- `mux_asset_id` - Mux asset ID from upload creation
- `aspect_ratio` - Video aspect ratio
- `audio_sample_rate` - Audio sample rate in Hz
- `video_codec` - Video codec name
- `audio_codec` - Audio codec name

### New video_files/{id}/complete-from-mux Endpoint
- **Method**: POST
- **Purpose**: Populate remaining video file data from Mux API
- **Response**: Complete video_file object with all Mux data populated
- **Error Handling**: Should not fail the upload if this endpoint fails

## Backward Compatibility

- All existing configurations continue to work without changes
- New features are opt-in via configuration
- Graceful degradation if backend integration fails
- Legacy database integration remains functional

## Error Handling

- **Backend connection failures**: Logged as errors, upload stops
- **Completion endpoint failures**: Logged as warnings, upload continues with fallback
- **Metadata extraction failures**: Uses available data, continues upload

## Example Usage

```bash
# With backend integration
node src/index.js -c examples/backend-integrated.json

# Traditional usage (still works)
node src/index.js -c examples/simple-upload.json
```

## Troubleshooting

### Backend Connection Issues
- Verify server_address is correct and accessible
- Check user/password credentials
- Ensure backend API is running

### Completion Endpoint Issues
- Check backend logs for completion endpoint errors
- Verify video file has valid mux_asset_id
- Tool will continue successfully even if completion fails

### Metadata Extraction Issues
- Ensure FFprobe is installed and accessible
- Check video file is not corrupted
- Review logs for specific metadata extraction errors