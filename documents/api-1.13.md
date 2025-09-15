# KYOOL Media Platform API v1.13

**Complete API Reference Documentation**

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Media Descriptions API](#media-descriptions-api)
5. [Video Files & Media Upload API](#video-files--media-upload-api)
6. [Content Hierarchy API](#content-hierarchy-api)
7. [People & Metadata API](#people--metadata-api)
8. [Media Assets API](#media-assets-api)
9. [User Management API](#user-management-api)
10. [Reporting API](#reporting-api)
11. [Advanced Features](#advanced-features)
12. [Error Handling](#error-handling)
13. [Data Models](#data-models)

---

## Overview

The KYOOL Media Platform API is a RESTful API built with FastAPI that provides comprehensive content management for video content and web-comics. The API supports media descriptions, video file management, user authentication, content organization, and reporting capabilities.

### Base Information
- **API Version**: v1.13
- **Base URL**: `{server_url}/api/v1`
- **Content Type**: `application/json`
- **Authentication**: JWT Bearer Token
- **Framework**: FastAPI with automatic OpenAPI documentation
- **Database**: PostgreSQL with SQLAlchemy ORM

### Key Features
- Content management with hierarchical organization (Programs → Seasons → Episodes)
- Video file upload and processing
- Comprehensive metadata management
- User authentication and authorization
- Bulk operations and text-to-UUID conversion
- Advanced filtering, pagination, and search
- Reporting and analytics
- Multi-language and multi-country support
- SEO optimization features

### API Endpoints Overview
The API provides 19 main endpoint groups:
- **Authentication** (`/auth`) - User login and token management
- **Media Descriptions** (`/media-descriptions`) - Core content management
- **Video Files** (`/video-files`) - Video asset management
- **Media Uploads** (`/upload`) - File upload handling
- **Programs** (`/programs`) - Program management
- **Seasons** (`/seasons`) - Season management
- **Public Persons** (`/persons`) - People (actors, directors, etc.)
- **Countries** (`/countries`) - Geographic metadata
- **Languages** (`/languages`) - Language metadata
- **Pictures** (`/pictures`) - Image asset management
- **Media Themes** (`/media-themes`) - Content categorization
- **Audience Categories** (`/audience-categories`) - Target audience classification
- **Subscription Plans** (`/subscription-plans`) - Access control
- **Media Showcases** (`/media-showcases`) - Content promotion
- **Screen Descriptions** (`/screen-descriptions`) - Display metadata
- **Users** (`/users`) - User account management
- **Description Reports** (`/description-reports`) - Content processing reports
- **Video File Reports** (`/video-file-reports`) - Video processing reports

---

## Authentication

The API uses JWT (JSON Web Token) based authentication with Bearer token authorization.

### Login Endpoint

#### POST /auth/login
Authenticate a user and receive an access token.

**Request Body** (OAuth2PasswordRequestForm):
```json
{
  "username": "user@example.com",
  "password": "securepassword",
  "grant_type": "password"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Usage**:
Include the token in all subsequent requests:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authentication Levels
- **Public**: No authentication required
- **User**: Valid JWT token required
- **Admin**: Valid JWT token with admin privileges required
- **Optional**: Token optional, additional features available if authenticated

---

## Common Patterns

### Pagination
Many list endpoints support pagination with standardized parameters:

**Query Parameters**:
- `skip` (int, default: 0): Number of items to skip
- `limit` (int, default: 20, max: 100): Number of items to return

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "skip": 0,
    "limit": 20,
    "total": 150,
    "page": 1,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### Filtering
List endpoints often support filtering with query parameters:
- `media_type`: Filter by content type
- `status`: Filter by content status
- `is_featured`: Filter featured content
- `search`: Text search in relevant fields

### UUID References
All entities use UUID primary keys. Relationship fields expect UUID strings:
```json
{
  "program_id": "550e8400-e29b-41d4-a716-446655440000",
  "actor_ids": ["123e4567-e89b-12d3-a456-426614174000", "..."]
}
```

### Error Responses
Standardized error format:
```json
{
  "detail": "Error description"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `422`: Unprocessable Entity (Pydantic validation error)
- `500`: Internal Server Error

---

## Media Descriptions API

The Media Descriptions API (`/media-descriptions`) is the core content management system, handling all types of media content including videos, excerpts, trailers, webtoons, and programs.

### Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/media-descriptions` | Optional | List media descriptions with filtering |
| POST | `/media-descriptions` | Admin | Create new media description |
| POST | `/media-descriptions/bulk` | Admin | Create multiple media descriptions |
| GET | `/media-descriptions/{id}` | Optional | Get media description by ID |
| PUT | `/media-descriptions/{id}` | Admin | Update media description (full) |
| PATCH | `/media-descriptions/{id}` | Admin | Update media description (partial) |
| DELETE | `/media-descriptions/{id}` | Admin | Delete media description |
| GET | `/media-descriptions/featured/list` | Optional | Get featured media |
| GET | `/media-descriptions/trending/list` | Optional | Get trending media |
| GET | `/media-descriptions/by-video/{video_file_id}` | Optional | Get media by video file |
| POST | `/media-descriptions/from-text` | Admin | Create from text fields |

### Core Data Model

Media descriptions include comprehensive metadata:

**Required Fields**:
- `file_number` (int): Human-readable unique identifier
- `episode_title` (string): Content title
- `media_type` (enum): Content type (`video`, `excerpt`, `trailer`, `webtoon`, `season`, `program`)

**Content Organization**:
- `program_id` (UUID): Parent program
- `season_id` (UUID): Parent season
- `episode_number` (int): Episode sequence number

**Categorization**:
- `media_categories_list` (array): Content categories (`movie`, `drama`, `short-drama`, `musical`, `animation`, `documentary`, `tvshow`, `other`)
- `content_status` (enum): Publishing status (`draft`, `published`, `archived`, `scheduled`)
- `is_featured` (bool): Featured content flag

**Content Details**:
- `descriptive_summary_text` (text): Brief description
- `synopsis_text` (text): Detailed synopsis
- `production_year` (int): Year of production
- `original_broadcast_date_utc` (datetime): Original air date

**Media Assets**:
- `main_video_file_id` (UUID): Primary video file
- `image_1920_1080_id` (UUID): Landscape thumbnail (16:9)
- `image_1920_720_id` (UUID): Wide landscape thumbnail
- `image_1080_1080_id` (UUID): Square thumbnail (1:1)
- `image_810_1080_id` (UUID): Portrait thumbnail (3:4)
- `image_1080_1920_id` (UUID): Vertical thumbnail (9:16)

**SEO & Marketing**:
- `seo_title` (string): SEO page title
- `seo_description` (text): Meta description
- `seo_keywords_text_list` (array): SEO keywords
- `hashtags_text_list` (array): Social media hashtags
- `friendly_url` (string): Custom URL path
- `slug` (string): URL slug (auto-generated if empty)
- `human_keywords_text_list` (array): User-friendly tags

**Rights & Business**:
- `contract_start_date_utc` (datetime): Content availability start
- `contract_end_date_utc` (datetime): Content availability end
- `rights_holder` (string): Rights holder information
- `copyright_owner_text` (string): Copyright owner
- `revenue_share` (float): Revenue sharing percentage
- `translation_share` (float): Translation revenue share
- `sacem_share` (float): SACEM revenue share
- `other_share` (float): Other revenue shares
- `paid_token_cost` (int): Cost in paid tokens

### Relationship Management

Media descriptions support complex relationships through many-to-many associations:

**People Relationships**:
- `actor_ids` (array): Actor UUIDs
- `director_ids` (array): Director UUIDs
- `producer_ids` (array): Producer UUIDs
- `author_ids` (array): Author UUIDs
- `people_roles` (array): Unified people roles with positions

**Geographic & Language**:
- `origin_country_ids` (array): Countries of origin
- `available_country_ids` (array): Available in countries
- `original_language_ids` (array): Original languages
- `available_subtitle_language_ids` (array): Subtitle languages
- `available_audio_language_ids` (array): Audio track languages

**Content Classification**:
- `media_theme_ids` (array): Content themes
- `audience_category_ids` (array): Target audiences
- `eligible_plan_id_list` (array): Required subscription plans

**Additional Media**:
- `trailer_ids` (array): Trailer video files
- `excerpt_ids` (array): Excerpt video files
- `additional_image_ids` (array): Additional images

### Example Requests

#### Create Media Description
```http
POST /api/v1/media-descriptions
Authorization: Bearer {token}
Content-Type: application/json

{
  "file_number": 1001,
  "episode_title": "The Beginning",
  "media_type": "video",
  "program_id": "550e8400-e29b-41d4-a716-446655440000",
  "season_id": "660e8400-e29b-41d4-a716-446655440000",
  "episode_number": 1,
  "media_categories_list": ["drama"],
  "descriptive_summary_text": "The first episode of our exciting series",
  "production_year": 2024,
  "is_featured": false,
  "content_status": "published",
  "actor_ids": ["770e8400-e29b-41d4-a716-446655440000"],
  "director_ids": ["880e8400-e29b-41d4-a716-446655440000"]
}
```

#### List with Filtering
```http
GET /api/v1/media-descriptions?media_type=video&status=published&is_featured=true&skip=0&limit=20
Authorization: Bearer {token}
```

#### Bulk Create
```http
POST /api/v1/media-descriptions/bulk
Authorization: Bearer {token}
Content-Type: application/json

{
  "descriptions": [
    {
      "file_number": 1002,
      "episode_title": "Episode 2",
      "media_type": "video"
    },
    {
      "file_number": 1003,
      "episode_title": "Episode 3",
      "media_type": "video"
    }
  ]
}
```

**Bulk Response**:
```json
{
  "created_count": 2,
  "failed_count": 0,
  "batch_id": "batch-uuid-here",
  "reports": [
    {
      "batch_id": "batch-uuid-here",
      "description_id": "new-uuid-1",
      "file_number": 1002,
      "title": "Episode 2",
      "status": "success",
      "message": "Created successfully",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Text-to-UUID Conversion

The `/from-text` endpoint allows creating media descriptions using human-readable text fields instead of UUIDs:

```http
POST /api/v1/media-descriptions/from-text
Authorization: Bearer {token}
Content-Type: application/json

{
  "episode_title": "The Adventure Begins",
  "media_type": "video",
  "program_name": "Adventure Series",
  "season_name": "Season 1",
  "actor_names": ["John Actor", "Jane Actress"],
  "director_names": ["Famous Director"],
  "theme_names": ["Action", "Adventure"],
  "available_country_names": ["United States", "Canada"],
  "audience_category_names": ["General Audience"],
  "image_1920_1080_filename": "adventure_landscape.jpg"
}
```

The system automatically:
- Creates or finds existing entities by name
- Generates file numbers if not provided
- Handles multiple matches with error logging
- Validates image filenames against existing pictures

### Special Features

#### Featured Media
```http
GET /api/v1/media-descriptions/featured/list?skip=0&limit=10
```
Returns media marked with `is_featured: true`.

#### Trending Media
```http
GET /api/v1/media-descriptions/trending/list?skip=0&limit=10
```
Currently returns all media (trending algorithm can be implemented).

#### Media by Video File
```http
GET /api/v1/media-descriptions/by-video/{video_file_id}
```
Returns all media descriptions that use a specific video file as their main video.

---

## Video Files & Media Upload API

The Video Files API (`/video-files`) and Media Upload API (`/upload`) handle video asset management, file uploads, and media processing. These APIs work together to provide comprehensive video content management with support for multiple storage backends.

### Video Files Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/video-files` | Optional | List video files with pagination |
| POST | `/video-files` | Admin | Create video file record |
| GET | `/video-files/{id}` | Optional | Get video file by ID |
| PUT | `/video-files/{id}` | Admin | Update video file |
| DELETE | `/video-files/{id}` | Admin | Delete video file (creates orphan report) |
| POST | `/video-files/{id}/destroy` | Admin | Destroy actual video file |
| POST | `/video-files/upload` | Admin | Upload video file |
| POST | `/video-files/{file_id}/link/{media_id}` | Admin | Link video to media description |
| GET | `/video-files/unlinked/list` | Admin | Get unlinked video files |
| GET | `/video-files/by-media/{media_id}` | Optional | Get videos by media description |
| PUT | `/video-files/{id}/encoding-status` | Admin | Update encoding status |
| POST | `/video-files/create-metadata` | Admin | Create metadata only (2-step upload) |
| POST | `/video-files/create-with-existing-url` | Admin | Create with existing URL |
| POST | `/video-files/{file_id}/upload-file` | Admin | Upload file to existing metadata |
| POST | `/video-files/{file_id}/test` | Optional | Test video playback |
| POST | `/video-files/{id}/playback-token` | User | Generate playback token |
| POST | `/video-files/{id}/drm-token` | Admin | Generate DRM token |
| GET | `/video-files/{id}/token-info` | Admin | Get token information |
| POST | `/video-files/{id}/complete-from-mux` | Admin | Complete data from Mux |
| POST | `/video-files/{id}/audio_languages/{language_id}` | Admin | Add audio language |
| DELETE | `/video-files/{id}/audio_languages/{language_id}` | Admin | Remove audio language |
| PUT | `/video-files/{id}/audio_languages` | Admin | Update all audio languages |

### Video File Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `file_name` (string): Original filename
- `file_url` (string): Accessible file URL
- `file_size_bytes` (int): File size in bytes
- `duration_seconds` (int): Video duration

**Upload & Processing**:
- `upload_status` (enum): Upload status (`metadata_only`, `file_uploading`, `upload_completed`, `upload_failed`)
- `encoding_status` (enum): Encoding status (`pending`, `processing`, `completed`, `failed`)
- `upload_timestamp` (datetime): Upload completion time
- `encodage_date_utc` (datetime): Encoding completion time

**Technical Metadata**:
- `video_codec` (string): Video codec (H.264, H.265, etc.)
- `audio_codec` (string): Audio codec (AAC, MP3, etc.)
- `file_format` (string): Container format (MP4, WebM, etc.)
- `bitrate_kbps` (int): Video bitrate in kbps
- `max_resolution_width` (int): Maximum width
- `max_resolution_height` (int): Maximum height
- `frame_rate` (float): Frames per second
- `aspect_ratio` (string): Aspect ratio (16:9, 4:3, etc.)
- `audio_sample_rate` (int): Audio sample rate in Hz

**Mux Integration**:
- `mux_asset_id` (string): Mux asset identifier
- `mux_playback_id` (string): Mux playback identifier
- `drm_protection` (bool): DRM protection enabled
- `playback_policy` (string): Playback policy (`public`, `signed`)

**Localization**:
- `subtitle_tracks_text_list` (array): Available subtitle tracks
- `audio_languages` (relationship): Available audio languages

**Business**:
- `encoding_profile` (string): Encoding profile used
- `external_url` (string): External media URL
- `media_description_id` (UUID): Linked media description

### Media Upload Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload/video` | Admin | Upload video file |
| POST | `/upload/webcomic` | Admin | Upload webcomic images |
| GET | `/upload/backends` | Admin | Get available storage backends |
| DELETE | `/upload/file` | Admin | Delete uploaded file |

### Upload Workflows

#### Single Video Upload
```http
POST /api/v1/upload/video
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [video file]
media_description_id: "550e8400-e29b-41d4-a716-446655440000" (optional)
```

**Response**:
```json
{
  "success": true,
  "message": "Video file uploaded successfully",
  "video_file_id": "123e4567-e89b-12d3-a456-426614174000",
  "file_url": "https://cdn.example.com/videos/video.mp4",
  "backend": "mux",
  "encoding_status": "pending",
  "linked_to_media": true
}
```

#### Two-Step Upload Process
1. **Create Metadata First**:
```http
POST /api/v1/video-files/create-metadata
Authorization: Bearer {token}
Content-Type: application/json

{
  "file_name": "my_video.mp4",
  "external_url": null
}
```

**Response**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "upload_url": "/api/v1/video-files/123e4567-e89b-12d3-a456-426614174000/upload-file",
  "upload_status": "metadata_only",
  "message": "Video file metadata created successfully. Use upload_url to upload the actual file."
}
```

2. **Upload File to Metadata**:
```http
POST /api/v1/video-files/{file_id}/upload-file
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [video file]
```

#### Webcomic Upload
```http
POST /api/v1/upload/webcomic
Authorization: Bearer {token}
Content-Type: multipart/form-data

files: [image file 1, image file 2, ...]
media_description_id: "550e8400-e29b-41d4-a716-446655440000" (optional)
chapter_number: 1 (optional)
```

**Response**:
```json
{
  "success": true,
  "message": "Webcomic uploaded successfully with 5 pages",
  "files": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "file_url": "https://cdn.example.com/webcomics/page_001.jpg",
      "file_name": "page_001.jpg",
      "page_number": 1
    }
  ],
  "total_pages": 5,
  "backend": "s3",
  "linked_to_media": true,
  "chapter_number": 1
}
```

### Storage Backend Management

#### Get Available Backends
```http
GET /api/v1/upload/backends
Authorization: Bearer {token}
```

**Response**:
```json
{
  "available_backends": ["mux", "s3", "local"],
  "backend_details": {
    "mux": {
      "type": "video_streaming",
      "features": ["encoding", "drm", "analytics"],
      "max_file_size": 5368709120
    },
    "s3": {
      "type": "object_storage",
      "features": ["cdn", "versioning"],
      "max_file_size": 1073741824
    }
  },
  "media_type_routing": {
    "video": "mux",
    "webtoon": "s3",
    "image": "s3"
  }
}
```

### Video Processing & Playback

#### Update Encoding Status
```http
PUT /api/v1/video-files/{id}/encoding-status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "completed",
  "logs": "Encoding completed successfully"
}
```

#### Test Video Playback
```http
POST /api/v1/video-files/{id}/test
```

**Response**:
```json
{
  "success": true,
  "playback_url": "https://stream.mux.com/{playback_id}.m3u8",
  "error_message": null,
  "mux_playback_id": "playback_id_here"
}
```

#### Generate Playback Token (DRM/Signed URLs)
```http
POST /api/v1/video-files/{id}/playback-token?expiration_minutes=60
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playback_url": "https://stream.mux.com/{playback_id}.m3u8?token=...",
  "playback_id": "playback_id_here",
  "expires_in_minutes": 60,
  "expires_at": 1642678800
}
```

#### Generate DRM Token
```http
POST /api/v1/video-files/{id}/drm-token?expiration_minutes=60&drm_key_id=key123
Authorization: Bearer {token}
```

### Mux Integration

#### Complete Video Data from Mux
```http
POST /api/v1/video-files/{id}/complete-from-mux
Authorization: Bearer {token}
```

This endpoint fetches complete video information from Mux using the `mux_asset_id` and updates the video file record with:
- Duration, resolution, frame rate
- Encoding status and profile
- Playback ID and policies
- DRM protection status
- Available subtitle tracks

#### Create with Existing URL
For external videos or pre-uploaded content:
```http
POST /api/v1/video-files/create-with-existing-url
Authorization: Bearer {token}
Content-Type: application/json

{
  "file_name": "external_video.mp4",
  "external_url": "https://external-cdn.com/video.mp4"
}
```

### Audio Language Management

#### Add Audio Language
```http
POST /api/v1/video-files/{id}/audio_languages/{language_id}
Authorization: Bearer {token}
```

#### Update All Audio Languages
```http
PUT /api/v1/video-files/{id}/audio_languages
Authorization: Bearer {token}
Content-Type: application/json

["language_id_1", "language_id_2", "language_id_3"]
```

### Video File Lifecycle

1. **Upload** → Video file created with `upload_status: "file_uploading"`
2. **Processing** → `encoding_status: "processing"`
3. **Completion** → `encoding_status: "completed"`, metadata populated
4. **Linking** → Associated with media descriptions
5. **Deletion** → Soft delete with orphan report or hard destroy

### Error Handling

Common error scenarios:
- **Upload failures**: File too large, unsupported format, storage backend issues
- **Encoding failures**: Corrupt file, unsupported codec
- **DRM errors**: Invalid playback policy, missing keys
- **Mux errors**: Asset not found, API limitations
- **Linking errors**: Media description not found, already linked

---

## Content Hierarchy API

The Content Hierarchy API manages the organizational structure of content through Programs and Seasons. This provides a hierarchical content organization system: Programs → Seasons → Episodes (Media Descriptions).

### Programs API (`/programs`)

Programs represent the top-level content organization, such as TV series, movie franchises, or content collections.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/programs` | Optional | List programs with pagination |
| POST | `/programs` | Admin | Create new program |
| GET | `/programs/{id}` | Optional | Get program by ID |
| PUT | `/programs/{id}` | Admin | Update program |
| DELETE | `/programs/{id}` | Admin | Delete program |

#### Program Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `creation_date_utc` (datetime): Creation timestamp
- `program_name` (string): Program title (unique)
- `general_media_description_id` (UUID, optional): Associated general media description

**Relationships**:
- `media_descriptions`: Media descriptions linked to this program
- `seasons`: Seasons belonging to this program

#### Program Examples

##### Create Program
```http
POST /api/v1/programs
Authorization: Bearer {token}
Content-Type: application/json

{
  "program_name": "Adventure Series",
  "general_media_description_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "creation_date_utc": "2024-01-15T10:30:00Z",
  "program_name": "Adventure Series",
  "general_media_description_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

##### List Programs
```http
GET /api/v1/programs?skip=0&limit=20
```

##### Update Program
```http
PUT /api/v1/programs/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "program_name": "Adventure Series - Updated",
  "general_media_description_id": null
}
```

### Seasons API (`/seasons`)

Seasons provide an intermediate organizational level between Programs and individual Episodes (Media Descriptions).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/seasons` | Optional | List seasons with pagination and filtering |
| POST | `/seasons` | Admin | Create new season |
| GET | `/seasons/{id}` | Optional | Get season by ID |
| PUT | `/seasons/{id}` | Admin | Update season |
| DELETE | `/seasons/{id}` | Admin | Delete season |

#### Season Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `creation_date_utc` (datetime): Creation timestamp
- `season_name` (string): Season title
- `season_number` (int): Season number within program
- `program_id` (UUID, optional): Parent program reference

**Relationships**:
- `program`: Parent program
- `media_descriptions`: Media descriptions (episodes) in this season
- `episodes`: Episodes via many-to-many relationship

#### Season Examples

##### Create Season
```http
POST /api/v1/seasons
Authorization: Bearer {token}
Content-Type: application/json

{
  "season_name": "Season 1",
  "season_number": 1,
  "program_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response**:
```json
{
  "id": "456e7890-f12b-34c5-d678-901234567890",
  "creation_date_utc": "2024-01-15T10:35:00Z",
  "season_name": "Season 1",
  "season_number": 1,
  "program_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

##### List Seasons with Program Filter
```http
GET /api/v1/seasons?program_id=123e4567-e89b-12d3-a456-426614174000&skip=0&limit=20
```

##### Update Season
```http
PUT /api/v1/seasons/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "season_name": "Season One",
  "season_number": 1
}
```

### Content Hierarchy Relationships

The content hierarchy follows this structure:

```
Program (Adventure Series)
├── Season 1
│   ├── Episode 1 (Media Description)
│   ├── Episode 2 (Media Description)
│   └── Episode 3 (Media Description)
├── Season 2
│   ├── Episode 1 (Media Description)
│   └── Episode 2 (Media Description)
└── Specials (Season 0)
    └── Behind the Scenes (Media Description)
```

#### Linking Content

1. **Create Program**: Top-level content container
2. **Create Seasons**: Organizational subdivisions within program
3. **Create Media Descriptions**: Individual episodes/content pieces linked to program and season
4. **Associate Content**: Use `program_id` and `season_id` in media descriptions

#### Example Complete Workflow

```bash
# 1. Create Program
POST /api/v1/programs
{
  "program_name": "Mystery Detective Series"
}

# 2. Create Season
POST /api/v1/seasons
{
  "season_name": "Season 1",
  "season_number": 1,
  "program_id": "{program_id_from_step_1}"
}

# 3. Create Episode (Media Description)
POST /api/v1/media-descriptions
{
  "file_number": 1001,
  "episode_title": "The Case Begins",
  "media_type": "video",
  "program_id": "{program_id_from_step_1}",
  "season_id": "{season_id_from_step_2}",
  "episode_number": 1
}
```

### Business Rules

#### Programs
- **Unique Names**: Program names must be unique across the system
- **Cascade Deletion**: Deleting a program doesn't automatically delete associated seasons/episodes
- **General Media Description**: Optional link to a media description that represents the program as a whole

#### Seasons
- **Program Association**: Seasons can optionally belong to a program
- **Unique Season Numbers**: Season numbers must be unique within a program
- **Flexible Numbering**: Supports special seasons (Season 0 for specials, etc.)
- **Independent Seasons**: Seasons can exist without a parent program

#### Validation Rules
- Program names cannot be duplicated
- Season numbers cannot be duplicated within the same program
- Program and season references are validated on creation/update
- Proper UUID format validation for all ID fields

### Error Scenarios

#### Programs
- `409 Conflict`: Program name already exists
- `404 Not Found`: Referenced general_media_description_id doesn't exist
- `422 Unprocessable Entity`: Invalid UUID format

#### Seasons
- `409 Conflict`: Season number already exists for the program
- `404 Not Found`: Referenced program_id doesn't exist
- `422 Unprocessable Entity`: Invalid program_id format

---

## People & Metadata API

The People & Metadata API manages the supporting data structures that enrich content descriptions, including people (actors, directors, etc.), geographic data, languages, and content categorization.

### Public Persons API (`/persons`)

Manages people involved in content production and performance (actors, directors, producers, authors).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/persons` | Optional | List public persons with search and filtering |
| POST | `/persons` | Admin | Create new public person |
| GET | `/persons/{id}` | Optional | Get public person by ID |
| PUT | `/persons/{id}` | Admin | Update public person |
| DELETE | `/persons/{id}` | Admin | Delete public person |

#### Public Person Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `stage_name_roman` (string): Stage name in Latin characters (unique)
- `stage_name_local` (string, optional): Stage name in local characters
- `real_name_roman` (string, optional): Real name in Latin characters
- `real_name_local` (string, optional): Real name in local characters
- `biography_text` (text, optional): Biography description
- `birth_date` (date, optional): Date of birth
- `country_of_origin_id` (UUID, optional): Country of origin
- `profile_image_id` (UUID, optional): Profile image

**Relationships**:
- `country_of_origin`: Country reference
- `profile_image`: Picture reference
- `media_roles`: Associated media descriptions through roles

#### Public Person Examples

```http
POST /api/v1/persons
Authorization: Bearer {token}
Content-Type: application/json

{
  "stage_name_roman": "John Actor",
  "real_name_roman": "John Smith",
  "biography_text": "Renowned actor with 20 years of experience",
  "birth_date": "1985-03-15",
  "country_of_origin_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Countries API (`/countries`)

Manages geographic metadata for content origin, availability, and person origins.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/countries` | Public | List countries with pagination and search |
| POST | `/countries` | Admin | Create new country |
| GET | `/countries/{id}` | Public | Get country by ID |
| PUT | `/countries/{id}` | Admin | Update country |
| DELETE | `/countries/{id}` | Admin | Delete country |

#### Country Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `name` (string): Country name (unique)
- `sigle` (string): Country code/abbreviation (ISO code)

**Usage**:
- Content origin and availability
- Person nationality
- Geographic content filtering

### Languages API (`/languages`)

Manages language metadata for audio, subtitles, and original languages.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/languages` | Public | List languages with pagination and search |
| POST | `/languages` | Admin | Create new language |
| GET | `/languages/{id}` | Public | Get language by ID |
| PUT | `/languages/{id}` | Admin | Update language |
| DELETE | `/languages/{id}` | Admin | Delete language |

#### Language Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `name` (string): Language name (unique)
- `sigle` (string): Language code (ISO code)

**Usage**:
- Original content languages
- Available audio tracks
- Subtitle languages
- Localization metadata

### Media Themes API (`/media-themes`)

Manages content themes and genres for categorization.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/media-themes` | Public | List themes with pagination and search |
| POST | `/media-themes` | Admin | Create new theme |
| GET | `/media-themes/{id}` | Public | Get theme by ID |
| PUT | `/media-themes/{id}` | Admin | Update theme |
| DELETE | `/media-themes/{id}` | Admin | Delete theme |

#### Media Theme Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `name` (string): Theme name (unique)
- `description` (text, optional): Theme description

**Common Themes**: Action, Adventure, Comedy, Drama, Horror, Romance, Sci-Fi, Documentary, etc.

### Audience Categories API (`/audience-categories`)

Manages target audience classifications for content rating and filtering.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/audience-categories` | Public | List categories with pagination |
| POST | `/audience-categories` | Admin | Create new category |
| GET | `/audience-categories/{id}` | Public | Get category by ID |
| PUT | `/audience-categories/{id}` | Admin | Update category |
| DELETE | `/audience-categories/{id}` | Admin | Delete category |

#### Audience Category Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `name` (string): Category name (unique)
- `description` (text, optional): Category description
- `age_minimum` (int, optional): Minimum age requirement

**Common Categories**: General Audience, Teen, Mature, Adult, Kids, Family-Friendly

### Subscription Plans API (`/subscription-plans`)

Manages subscription tiers and access control for content.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/subscription-plans` | Public | List subscription plans |
| POST | `/subscription-plans` | Admin | Create new plan |
| GET | `/subscription-plans/{id}` | Public | Get plan by ID |
| PUT | `/subscription-plans/{id}` | Admin | Update plan |
| DELETE | `/subscription-plans/{id}` | Admin | Delete plan |

#### Subscription Plan Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `name` (string): Plan name (unique)
- `description` (text, optional): Plan description
- `price_monthly` (decimal, optional): Monthly price
- `price_yearly` (decimal, optional): Yearly price
- `features` (array, optional): Plan features list
- `is_active` (bool): Plan availability status

**Common Plans**: Free, Basic, Premium, VIP, Trial

### Media Showcases API (`/media-showcases`)

Manages curated content collections and promotional displays.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/media-showcases` | Optional | List showcases with filtering |
| POST | `/media-showcases` | Admin | Create new showcase |
| GET | `/media-showcases/{id}` | Optional | Get showcase by ID |
| PUT | `/media-showcases/{id}` | Admin | Update showcase |
| DELETE | `/media-showcases/{id}` | Admin | Delete showcase |

#### Media Showcase Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `title` (string): Showcase title
- `description` (text, optional): Showcase description
- `showcase_type` (enum): Type (`featured`, `trending`, `new_releases`, `recommended`, `genre_collection`)
- `is_active` (bool): Display status
- `display_order` (int, optional): Sort order
- `start_date` (datetime, optional): Display start time
- `end_date` (datetime, optional): Display end time

**Relationships**:
- `media_descriptions`: Associated content items
- `banner_image`: Showcase banner/hero image

### Screen Descriptions API (`/screen-descriptions`)

Manages display metadata and layout information for different screen contexts.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/screen-descriptions` | Optional | List screen descriptions |
| POST | `/screen-descriptions` | Admin | Create new screen description |
| GET | `/screen-descriptions/{id}` | Optional | Get screen description by ID |
| PUT | `/screen-descriptions/{id}` | Admin | Update screen description |
| DELETE | `/screen-descriptions/{id}` | Admin | Delete screen description |

#### Screen Description Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `screen_type` (string): Screen context (`mobile`, `tablet`, `desktop`, `tv`)
- `layout_config` (JSON): Layout configuration data
- `display_metadata` (JSON): Display-specific metadata

### Common Patterns for Metadata APIs

#### Search and Filtering
Most metadata endpoints support search functionality:

```http
GET /api/v1/persons?search=john&skip=0&limit=20
GET /api/v1/countries?search=united&skip=0&limit=20
GET /api/v1/languages?search=english&skip=0&limit=20
```

#### Standard CRUD Operations
All metadata entities follow the same pattern:

```http
# List with pagination
GET /api/v1/{endpoint}?skip=0&limit=20

# Create (Admin only)
POST /api/v1/{endpoint}
Authorization: Bearer {admin_token}

# Get by ID
GET /api/v1/{endpoint}/{id}

# Update (Admin only)
PUT /api/v1/{endpoint}/{id}
Authorization: Bearer {admin_token}

# Delete (Admin only)
DELETE /api/v1/{endpoint}/{id}
Authorization: Bearer {admin_token}
```

#### Unique Constraints
Most metadata entities enforce unique constraints:
- **Public Persons**: `stage_name_roman` must be unique
- **Countries**: `name` must be unique
- **Languages**: `name` must be unique
- **Media Themes**: `name` must be unique
- **Audience Categories**: `name` must be unique
- **Subscription Plans**: `name` must be unique

#### Error Handling
Common error responses:
- `409 Conflict`: Unique constraint violation (duplicate name)
- `404 Not Found`: Referenced foreign key doesn't exist
- `422 Unprocessable Entity`: Validation errors
- `400 Bad Request`: Invalid request format

### Integration with Media Descriptions

These metadata entities are primarily used to enrich Media Descriptions through relationships:

```http
POST /api/v1/media-descriptions
{
  "episode_title": "Adventure Begins",
  "media_type": "video",
  "actor_ids": ["person-uuid-1", "person-uuid-2"],
  "director_ids": ["person-uuid-3"],
  "available_country_ids": ["country-uuid-1", "country-uuid-2"],
  "original_language_ids": ["language-uuid-1"],
  "media_theme_ids": ["theme-uuid-1", "theme-uuid-2"],
  "audience_category_ids": ["audience-uuid-1"],
  "eligible_plan_id_list": ["plan-uuid-1", "plan-uuid-2"]
}
```

This creates a rich, interconnected content metadata system that supports advanced filtering, search, and content discovery.

---

## Media Assets API

### Pictures API (`/pictures`)

The Pictures API manages image assets used throughout the platform for thumbnails, banners, profile images, and other visual content.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/pictures` | Optional | List pictures with pagination |
| POST | `/pictures` | Admin | Create new picture record |
| GET | `/pictures/{id}` | Optional | Get picture by ID |
| PUT | `/pictures/{id}` | Admin | Update picture |
| DELETE | `/pictures/{id}` | Admin | Delete picture |

#### Picture Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `image_url` (string): Accessible image URL (unique)
- `file_name` (string, optional): Original filename
- `alt_text` (string, optional): Alternative text for accessibility
- `width` (int, optional): Image width in pixels
- `height` (int, optional): Image height in pixels
- `file_size_bytes` (int, optional): File size
- `content_type` (string, optional): MIME type (image/jpeg, image/png, etc.)

**Usage in Media Descriptions**:
- `image_1920_1080_id`: Landscape thumbnail (16:9)
- `image_1920_720_id`: Wide landscape thumbnail
- `image_1080_1080_id`: Square thumbnail (1:1)
- `image_810_1080_id`: Portrait thumbnail (3:4)
- `image_1080_1920_id`: Vertical thumbnail (9:16)
- `additional_image_ids`: Additional gallery images

**Usage in Other Entities**:
- Public person profile images
- Media showcase banners
- Program/season artwork

#### Picture Examples

##### Create Picture
```http
POST /api/v1/pictures
Authorization: Bearer {token}
Content-Type: application/json

{
  "image_url": "https://cdn.example.com/images/poster_1920x1080.jpg",
  "file_name": "adventure_series_poster.jpg",
  "alt_text": "Adventure Series promotional poster",
  "width": 1920,
  "height": 1080,
  "content_type": "image/jpeg"
}
```

**Response**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "image_url": "https://cdn.example.com/images/poster_1920x1080.jpg",
  "file_name": "adventure_series_poster.jpg",
  "alt_text": "Adventure Series promotional poster",
  "width": 1920,
  "height": 1080,
  "content_type": "image/jpeg"
}
```

##### List Pictures
```http
GET /api/v1/pictures?skip=0&limit=20
```

#### Business Rules
- **Unique URLs**: Image URLs must be unique across the system
- **URL Validation**: Image URLs should be accessible and valid
- **Format Support**: Supports standard web image formats (JPEG, PNG, WebP, SVG)
- **Size Recommendations**: Different aspect ratios for different use cases

#### Common Image Dimensions
- **Landscape (16:9)**: 1920x1080 for main thumbnails
- **Wide Landscape**: 1920x720 for hero banners
- **Square (1:1)**: 1080x1080 for social media
- **Portrait (3:4)**: 810x1080 for mobile displays
- **Vertical (9:16)**: 1080x1920 for stories/mobile

#### Error Scenarios
- `409 Conflict`: Image URL already exists
- `404 Not Found`: Picture not found for update/delete
- `400 Bad Request`: Invalid URL format

---

## User Management API

### Users API (`/users`)

The Users API manages user accounts, authentication, and subscription plan assignments.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | Admin | List users with pagination |
| POST | `/users` | Admin | Create new user account |
| GET | `/users/me` | User | Get current user profile |
| GET | `/users/{user_id}` | Admin | Get user by ID |
| PUT | `/users/{user_id}` | Admin | Update user |
| POST | `/users/{user_id}/subscription_plans/{plan_id}` | Admin | Add subscription plan to user |
| DELETE | `/users/{user_id}/subscription_plans/{plan_id}` | Admin | Remove subscription plan from user |
| PUT | `/users/{user_id}/subscription_plans` | Admin | Update all user subscription plans |

#### User Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `email` (string): Email address (unique, used for login)
- `full_name` (string, optional): Display name
- `is_active` (bool): Account active status
- `is_admin` (bool): Admin privileges flag
- `created_at` (datetime): Account creation time
- `last_login` (datetime, optional): Last login timestamp

**Password Management**:
- Passwords are hashed and never returned in API responses
- Password updates require current password verification (not shown in basic CRUD)

**Relationships**:
- `subscription_plans`: Associated subscription plans for access control

#### User Examples

##### List Users (Admin Only)
```http
GET /api/v1/users?skip=0&limit=20
Authorization: Bearer {admin_token}
```

**Response**:
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "full_name": "John User",
      "is_active": true,
      "is_admin": false,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

##### Get Current User Profile
```http
GET /api/v1/users/me
Authorization: Bearer {token}
```

##### Create User (Admin Only)
```http
POST /api/v1/users
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securepassword",
  "full_name": "New User",
  "is_active": true,
  "is_admin": false
}
```

##### Update User (Admin Only)
```http
PUT /api/v1/users/{user_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "full_name": "Updated Name",
  "is_active": true
}
```

#### Subscription Plan Management

##### Add Subscription Plan
```http
POST /api/v1/users/{user_id}/subscription_plans/{plan_id}
Authorization: Bearer {admin_token}
```

##### Remove Subscription Plan
```http
DELETE /api/v1/users/{user_id}/subscription_plans/{plan_id}
Authorization: Bearer {admin_token}
```

##### Update All Subscription Plans
```http
PUT /api/v1/users/{user_id}/subscription_plans
Authorization: Bearer {admin_token}
Content-Type: application/json

["plan_id_1", "plan_id_2", "plan_id_3"]
```

#### Business Rules
- **Unique Email**: Email addresses must be unique across the system
- **Admin Privileges**: Only admin users can manage other users
- **Active Status**: Inactive users cannot authenticate or access content
- **Subscription Access**: User's subscription plans determine content access

#### Security Features
- JWT token-based authentication
- Password hashing with secure algorithms
- Role-based access control (User vs Admin)
- Active status checking for all operations

---

## Reporting API

### Description Reports API (`/description-reports`)

Tracks the processing status and results of media description creation and bulk operations.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/description-reports` | Admin | List description reports with filtering |
| GET | `/description-reports/{id}` | Admin | Get specific report |
| GET | `/description-reports/batch/{batch_id}` | Admin | Get reports by batch ID |

#### Description Report Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `description_id` (UUID): Associated media description ID
- `title` (string): Content title
- `batch_id` (UUID, optional): Batch operation identifier
- `success_associated_file` (bool): File association success status
- `created_at` (datetime): Report creation timestamp
- `status` (string): Operation status (`success`, `failed`, `partial`)
- `message` (text, optional): Status message or error details

**Usage**: Generated automatically during bulk media description operations to track success/failure rates and identify issues.

### Video File Reports API (`/video-file-reports`)

Tracks video file processing, encoding status, and operational reports.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/video-file-reports` | Admin | List video file reports with filtering |
| GET | `/video-file-reports/{id}` | Admin | Get specific report |
| POST | `/video-file-reports` | Admin | Create manual report |

#### Video File Report Data Model

**Core Fields**:
- `id` (UUID): Unique identifier
- `video_file_id` (UUID): Associated video file ID
- `media_description_id` (UUID, optional): Associated media description
- `report_type` (enum): Report type (`encoding`, `upload`, `processing`, `error`, `orphan`, `destruction`)
- `status` (enum): Processing status (`pending`, `in_progress`, `completed`, `failed`)
- `message` (text, optional): Report message or error details
- `created_at` (datetime): Report creation timestamp
- `completed_at` (datetime, optional): Completion timestamp

**Usage**: Automatically generated for video processing operations, upload tracking, and administrative actions.

#### Report Types
- **encoding**: Video encoding/transcoding reports
- **upload**: File upload status reports
- **processing**: General processing status
- **error**: Error condition reports
- **orphan**: Reports for deleted video file references
- **destruction**: File deletion/cleanup reports

#### Reporting Examples

##### List Description Reports with Filtering
```http
GET /api/v1/description-reports?batch_id={batch_id}&status=success&skip=0&limit=20
Authorization: Bearer {admin_token}
```

##### Get Batch Report Summary
```http
GET /api/v1/description-reports/batch/{batch_id}
Authorization: Bearer {admin_token}
```

##### List Video File Reports
```http
GET /api/v1/video-file-reports?report_type=encoding&status=failed&skip=0&limit=20
Authorization: Bearer {admin_token}
```

#### Report Analytics
Reports enable administrators to:
- Monitor bulk operation success rates
- Track encoding/processing failures
- Identify problematic content or files
- Generate operational dashboards
- Debug system issues
- Audit content processing workflows

---

## Advanced Features

### Bulk Operations

The API supports several bulk operations for efficient content management:

#### Bulk Media Description Creation
```http
POST /api/v1/media-descriptions/bulk
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "descriptions": [
    {
      "file_number": 1001,
      "episode_title": "Episode 1",
      "media_type": "video"
    },
    {
      "file_number": 1002,
      "episode_title": "Episode 2",
      "media_type": "video"
    }
  ]
}
```

**Features**:
- Creates multiple media descriptions in a single request
- Returns detailed report for each item
- Generates batch ID for tracking
- Handles partial failures gracefully
- Creates description reports automatically

### Text-to-UUID Conversion

The `/from-text` endpoint provides intelligent text-to-UUID conversion:

```http
POST /api/v1/media-descriptions/from-text
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "episode_title": "Adventure Episode",
  "media_type": "video",
  "program_name": "Adventure Series",
  "actor_names": ["John Actor", "Jane Actress"],
  "theme_names": ["Action", "Adventure"]
}
```

**Features**:
- Creates entities if they don't exist
- Finds existing entities by name
- Handles multiple matches with logging
- Auto-generates file numbers
- Validates image filenames

### Two-Step Upload Process

For large files or complex workflows:

1. **Create Metadata**: `POST /video-files/create-metadata`
2. **Upload File**: `POST /video-files/{id}/upload-file`

**Benefits**:
- Better error handling
- Progress tracking
- Resumable uploads (with backend support)
- Metadata validation before upload

### Search and Filtering

Most endpoints support advanced filtering:

```http
# Media descriptions with multiple filters
GET /api/v1/media-descriptions?media_type=video&status=published&is_featured=true

# Public persons with search
GET /api/v1/persons?search=john&skip=0&limit=20

# Countries with search
GET /api/v1/countries?search=united&skip=0&limit=20
```

### Pagination

Standardized pagination across all list endpoints:

```http
GET /api/v1/{endpoint}?skip=0&limit=20
```

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "skip": 0,
    "limit": 20,
    "total": 150,
    "page": 1,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### Relationship Management

#### Many-to-Many Relationships
```http
# Update all relationships at once
PUT /api/v1/media-descriptions/{id}
{
  "actor_ids": ["uuid1", "uuid2"],
  "director_ids": ["uuid3"],
  "theme_ids": ["uuid4", "uuid5"]
}
```

#### Individual Relationship Management
```http
# Add single relationship
POST /api/v1/users/{user_id}/subscription_plans/{plan_id}

# Remove single relationship
DELETE /api/v1/users/{user_id}/subscription_plans/{plan_id}

# Replace all relationships
PUT /api/v1/users/{user_id}/subscription_plans
["plan_id_1", "plan_id_2"]
```

### Mux Video Integration

Advanced video processing with Mux:

#### Complete Asset Information
```http
POST /api/v1/video-files/{id}/complete-from-mux
```

**Populates**:
- Duration, resolution, frame rate
- Encoding status and profiles
- Playback IDs and policies
- DRM protection status
- Available subtitle tracks

#### Secure Playback
```http
# Generate playback token
POST /api/v1/video-files/{id}/playback-token?expiration_minutes=60

# Generate DRM token
POST /api/v1/video-files/{id}/drm-token?expiration_minutes=60&drm_key_id=key123
```

### Content Discovery

#### Featured Content
```http
GET /api/v1/media-descriptions/featured/list
```

#### Content by Relationships
```http
# Media by video file
GET /api/v1/media-descriptions/by-video/{video_file_id}

# Videos by media description
GET /api/v1/video-files/by-media/{media_id}

# Seasons by program
GET /api/v1/seasons?program_id={program_id}
```

#### Showcase Management
```http
# Create curated showcase
POST /api/v1/media-showcases
{
  "title": "Action Movies",
  "showcase_type": "genre_collection",
  "is_active": true
}
```

### File Management

#### Multiple Storage Backends
```http
# Get available backends
GET /api/v1/upload/backends

# Upload to specific backend (configured automatically)
POST /api/v1/upload/video
POST /api/v1/upload/webcomic
```

#### Webcomic Support
```http
POST /api/v1/upload/webcomic
Content-Type: multipart/form-data

files: [page1.jpg, page2.jpg, ...]
chapter_number: 1
```

**Features**:
- Multi-page upload
- Automatic page ordering
- Chapter organization
- Metadata preservation

---

## Error Handling

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 200 | OK | Successful GET, PUT, PATCH operations |
| 201 | Created | Successful POST operations |
| 400 | Bad Request | Invalid request format, missing required fields |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions (e.g., user trying admin operation) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Unique constraint violation (duplicate names, IDs) |
| 422 | Unprocessable Entity | Validation errors (Pydantic validation) |
| 500 | Internal Server Error | Server-side errors, database issues |

### Error Response Format

All errors return a standardized format:

```json
{
  "detail": "Error description message"
}
```

### Common Error Scenarios

#### Authentication Errors
```json
// Missing token
{
  "detail": "Not authenticated"
}

// Invalid token
{
  "detail": "Could not validate credentials"
}

// Insufficient permissions
{
  "detail": "Not enough permissions"
}
```

#### Validation Errors
```json
// Pydantic validation error
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}

// UUID format error
{
  "detail": "Invalid UUID format"
}
```

#### Business Logic Errors
```json
// Duplicate resource
{
  "detail": "Program with name 'Adventure Series' already exists"
}

// Missing dependency
{
  "detail": "MediaDescription with ID 'uuid-here' not found"
}

// File not found
{
  "detail": "Video file not found"
}
```

#### Upload Errors
```json
// File too large
{
  "detail": "Upload failed: File size exceeds maximum allowed size"
}

// Unsupported format
{
  "detail": "Upload failed: Unsupported file format"
}

// Storage backend error
{
  "detail": "Upload failed: Storage backend unavailable"
}
```

#### Video Processing Errors
```json
// Encoding failure
{
  "detail": "Video encoding failed: Unsupported codec"
}

// Mux integration error
{
  "detail": "Failed to retrieve asset information: Asset not found in Mux"
}

// DRM token error
{
  "detail": "Video file does not have a MUX playback ID"
}
```

---

## Data Models

### Core Entities

#### Media Description
The central content entity with comprehensive metadata:

```json
{
  "id": "uuid",
  "file_number": 1001,
  "episode_title": "Episode Title",
  "media_type": "video|excerpt|trailer|webtoon|season|program",
  "content_status": "draft|published|archived|scheduled",
  "creation_date_utc": "2024-01-15T10:30:00Z",
  "last_updated_utc": "2024-01-15T11:00:00Z"
}
```

#### Video File
Video asset with technical metadata:

```json
{
  "id": "uuid",
  "file_name": "video.mp4",
  "file_url": "https://cdn.example.com/video.mp4",
  "duration_seconds": 3600,
  "upload_status": "upload_completed",
  "encoding_status": "completed",
  "mux_playback_id": "playback_id"
}
```

#### Program & Season
Content hierarchy:

```json
{
  "program": {
    "id": "uuid",
    "program_name": "Adventure Series",
    "creation_date_utc": "2024-01-15T10:30:00Z"
  },
  "season": {
    "id": "uuid",
    "season_name": "Season 1",
    "season_number": 1,
    "program_id": "uuid"
  }
}
```

### Metadata Entities

#### Public Person
```json
{
  "id": "uuid",
  "stage_name_roman": "John Actor",
  "real_name_roman": "John Smith",
  "birth_date": "1985-03-15",
  "country_of_origin_id": "uuid"
}
```

#### Geographic & Language
```json
{
  "country": {
    "id": "uuid",
    "name": "United States",
    "sigle": "US"
  },
  "language": {
    "id": "uuid",
    "name": "English",
    "sigle": "en"
  }
}
```

### Relationship Patterns

#### Many-to-Many via Arrays
```json
{
  "actor_ids": ["uuid1", "uuid2"],
  "director_ids": ["uuid3"],
  "available_country_ids": ["uuid4", "uuid5"]
}
```

#### Foreign Key References
```json
{
  "program_id": "uuid",
  "season_id": "uuid",
  "main_video_file_id": "uuid"
}
```

#### Nested Objects (Read Responses)
```json
{
  "actors": [
    {
      "id": "uuid",
      "stage_name_roman": "John Actor"
    }
  ],
  "program": {
    "id": "uuid",
    "program_name": "Adventure Series"
  }
}
```

### Enumerated Values

#### Media Types
- `video`: Standard video content
- `excerpt`: Short clips or previews
- `trailer`: Promotional trailers
- `webtoon`: Web comic/manga content
- `season`: Season-level content
- `program`: Program-level content

#### Content Status
- `draft`: Work in progress
- `published`: Live/available content
- `archived`: Hidden/deprecated content
- `scheduled`: Future publication

#### Upload Status
- `metadata_only`: Metadata created, file not uploaded
- `file_uploading`: Upload in progress
- `upload_completed`: Upload successful
- `upload_failed`: Upload unsuccessful

#### Encoding Status
- `pending`: Awaiting processing
- `processing`: Currently encoding
- `completed`: Ready for playback
- `failed`: Processing unsuccessful

This comprehensive data model ensures consistency across all API operations and provides clear contracts for client applications.

---

## Summary

The KYOOL Media Platform API v1.13 provides a complete content management system with:

- **19 endpoint groups** covering all aspects of media content management
- **Hierarchical content organization** (Programs → Seasons → Episodes)
- **Advanced video processing** with Mux integration and DRM support
- **Comprehensive metadata system** for people, locations, languages, and themes
- **Flexible file upload** with multiple storage backends
- **Bulk operations** and text-to-UUID conversion for efficiency
- **Robust authentication** and role-based access control
- **Detailed reporting** and operational monitoring

The API follows REST principles with consistent patterns for CRUD operations, standardized pagination, comprehensive error handling, and extensive relationship management capabilities.

---
