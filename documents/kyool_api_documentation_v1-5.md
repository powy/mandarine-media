# KYOOL Media Platform API Documentation

## Overview

**Version:** 1.4 
**Base URL:** `https://api.kyool.com/v1`  
**Authentication:** Bearer Token (JWT)  
**Content-Type:** `application/json`

This API provides comprehensive media management functionality for the KYOOL platform, supporting video content, web comics, user management, content organization, and subscription services.


## Data Models

### 1. User

User authentication and management.

**Table:** `users`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique identifier | `550e8400-e29b-41d4-a716-446655440000` |
| `creation_date_utc` | DateTime | Creation timestamp (UTC) | `2024-01-15T10:30:00Z` |
| `email` | String | User email (unique) | `"admin@kyool.com"` |
| `hashed_password` | String | Hashed password | `"$2b$12$..."` |
| `full_name` | String | Full name | `"John Doe"` |
| `is_active` | Boolean | Account active status | `true` |
| `is_admin` | Boolean | Admin privileges | `false` |

---

### 2. Media Description

Core content metadata for all media items (videos, web comics, etc.).

**Table:** `media_description`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique identifier | `550e8400-e29b-41d4-a716-446655440000` |
| `creation_date_utc` | DateTime | Creation timestamp (UTC) | `2024-01-15T10:30:00Z` |
| `file_number` | Integer | Human-readable unique ID (auto-generated if not filled) | `1246` |
| `episode_title` | String | Content title | `"Running Man - EP 730"` |
| `media_type` | Enum | Content type | `trailer`, `teaser`, `video`, `webtoon`, `excerpt` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `file_name` | String | Original file name (based on uploaded file) | `"SBS_runningman_730"` |
| `program_id` | UUID | Parent program reference | `550e8400-e29b-41d4-a716-446655440001` |
| `season_id` | UUID | Season reference | `550e8400-e29b-41d4-a716-446655440002` |
| `episode_number` | Integer | Episode number | `730` |
| `media_categories_id_list` | UUID[] | Category IDs (tvshow, drama, movie, documentary, musical) | `["cat1", "cat2"]` |
| `themes_and_genres_id_list` | UUID[] | Theme IDs (romance, thriller, fantasy, comedy, melodrama, dark) | `["romance", "thriller"]` |
| `descriptive_summary_text` | String | Short description (French only) | `"Le thermomètre monte, mais le fun aussi !"` |
| `synopsis_text` | String | Full synopsis (French only) | `"Le thermomètre monte, mais le fun aussi ! Kyuhyun et Dahyun rejoignent..."` |
| `contract_start_date_utc` | DateTime | Content availability start date | `2024-01-12T00:00:00Z` |
| `contract_end_date_utc` | DateTime | Content availability end date | `2026-01-12T00:00:00Z` |
| `production_year` | Integer | Year of production | `2024` |
| `actors_id_list` | UUID[] | Actor IDs (Public Person tagged as "actor") | `["person1", "person2"]` |
| `directors_id_list` | UUID[] | Director IDs (Public Person tagged as "director") | `["person3", "person4"]` |
| `productor_id_list` | UUID[] | Producer IDs (Public Person tagged as "producer") | `["person5", "person6"]` |
| `authors_id_list` | UUID[] | Author/Screenwriter IDs (includes screenwriters, authors, writers, illustrators) | `["person7", "person8"]` |
| `origin_country_id_list` | UUID[] | Country of origin IDs (multiple countries for co-productions) | `["country1", "country2"]` |
| `original_languages_id` | UUID[] | Original language IDs (multiple languages for multilingual content) | `["lang1", "lang2"]` |
| `copyright_owner_id` | String | Copyright owner (sbs, mbc, jtbc, cj) | `"sbs"` |
| `available_countries_list` | UUID[] | Available territory IDs (france, belgium, morocco, luxembourg, etc.) | `["territory1", "territory2"]` |
| `eligible_plans` | UUID[] | Eligible subscription plan IDs (chincha, daebak, aigoo, free, token-based) | `["plan1", "plan2"]` |
| `audience_categories_id_list` | UUID[] | Target audience category IDs (+12, +15, +18, all, kids, teens, adults) | `["aud1", "aud2"]` |
| `friendly_url` | String | SEO-friendly URL slug | `"sbs-running-man-episode-730-tvshow"` |
| `image_fullscreen` | UUID | Fullscreen image ID | `550e8400-e29b-41d4-a716-446655440003` |
| `image_thumbnail1` | UUID | Primary thumbnail image ID | `550e8400-e29b-41d4-a716-446655440004` |
| `image_thumbnail2` | UUID | Secondary thumbnail image ID | `550e8400-e29b-41d4-a716-446655440005` |
| `image_mobile_home` | UUID | Mobile homepage image ID | `550e8400-e29b-41d4-a716-446655440006` |
| `image_desktop_home` | UUID | Desktop homepage image ID | `550e8400-e29b-41d4-a716-446655440007` |
| `additional_images_id_list` | UUID[] | Additional image IDs | `["img1", "img2"]` |
| `human_keywords_text_list` | String[] | Human-readable keywords | `["drama", "kpop", "runningman", "korea", "k-food"]` |
| `translation_share` | Float | Translation cost percentage (Admin only) | `0.15` |
| `sacem_share` | Float | SACEM cost percentage (Admin only) | `0.05` |
| `other_share` | Float | Other cost percentage (Admin only) | `0.03` |
| `revenue_share` | Float | Revenue sharing percentage (Admin only) | `0.50` |
| `paid_token_cost` | Integer | Cost in tokens (Admin only) | `100` |
| `expected_filename` | String | Expected video file name for automatic linking | `"running_man_730.mp4"` |

---

### 3. Video File

Technical file information for video content.

**Table:** `video_file`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique file identifier | `550e8400-e29b-41d4-a716-446655440010` |
| `creation_date_utc` | DateTime | File creation timestamp | `2024-01-15T10:30:00Z` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `media_description_id` | UUID | Link to media description | `550e8400-e29b-41d4-a716-446655440000` |
| `encodage_date_utc` | DateTime | Encoding completion date | `2024-01-15T12:00:00Z` |
| `duration_seconds` | Integer | Video duration (filled only when file is processed) | `3600` |
| `subtitle_languages_id_list` | UUID[] | Available subtitle language IDs | `["fr", "en", "ko"]` |
| `audio_languages_id_list` | UUID[] | Available audio language IDs | `["ko", "fr"]` |
| `resolutions_id_list` | UUID[] | Available resolution IDs (360, 720, 1080, 2160) | `["res1", "res2"]` |
| `accessibilities_id_list` | UUID[] | Accessibility feature IDs (audiodescription, FALC, deaf/hard of hearing) | `["acc1", "acc2"]` |
| `file_url` | String | File storage URL | `"https://s3.aws.com/bucket/video.mp4"` |
| `file_name` | String | Original filename | `"running_man_ep730.mp4"` |
| `encoding_status` | Enum | Processing status | `pending`, `processing`, `completed`, `failed` |
| `upload_method` | Enum | Upload method used | `new_upload`, `existing_url` |
| `upload_status` | Enum | Upload completion status | `metadata_only`, `file_uploading`, `upload_completed`, `upload_failed` |
| `file_size_bytes` | Integer | File size in bytes | `2147483648` |
| `video_codec` | String | Video codec used | `"H.264"` |
| `audio_codec` | String | Audio codec used | `"AAC"` |
| `file_format` | String | Container format | `"MP4"` |
| `upload_timestamp` | DateTime | When file upload was initiated | `2024-01-15T11:00:00Z` |
| `external_url` | String | External media URL for existing files | `"https://example.com/video.mp4"` |
| `resolution_width` | Integer | Video width in pixels | `1920` |
| `resolution_height` | Integer | Video height in pixels | `1080` |
| `bitrate_kbps` | Integer | Video bitrate | `5000` |
| `frame_rate` | Float | Frames per second | `29.97` |
| `aspect_ratio` | String | Video aspect ratio | `"16:9"` |
| `audio_sample_rate` | Integer | Audio sample rate | `48000` |
| `audio_channels` | Integer | Number of audio channels | `2` |
| `subtitle_tracks` | String[] | Available subtitle tracks | `["fr", "en"]` |
| `thumbnail_timestamps` | Integer[] | Thumbnail generation times | `[30, 300, 600]` |
| `chapter_markers` | String | Chapter information | `"0:00 Intro, 5:30 Game 1..."` |
| `encoding_profile` | String | Encoding profile used | `"1080p_standard"` |
| `cdn_url` | String | CDN distribution URL | `"https://cdn.kyool.com/video/ep730.mp4"` |
| `mux_asset_id` | String | Mux platform asset ID | `"mux_asset_abc123"` |
| `mux_playback_id` | String | Mux playback identifier | `"mux_playback_def456"` |
| `drm_protection` | Boolean | DRM protection enabled | `true` |
| `geo_restrictions` | String[] | Geographic restrictions | `["FR", "BE"]` |
| `quality_variants` | String[] | Available quality levels | `["480p", "720p", "1080p"]` |
| `processing_logs` | Text | Processing log information | `"Encoding started at..."` |

### 4. Program

Program/Show information for content hierarchy.

**Table:** `program`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique program identifier | `550e8400-e29b-41d4-a716-446655440030` |
| `creation_date_utc` | DateTime | Program creation timestamp | `2024-01-15T10:30:00Z` |
| `program_name` | String | Program name | `"Running Man"` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `general_media_description` | UUID | Template media description for common data and default revenue sharing | `550e8400-e29b-41d4-a716-446655440031` |

---

### 5. Season

Season information for content hierarchy.

**Table:** `season`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique season identifier | `550e8400-e29b-41d4-a716-446655440040` |
| `creation_date_utc` | DateTime | Season creation timestamp | `2024-01-15T10:30:00Z` |
| `program_id` | UUID | Parent program ID | `550e8400-e29b-41d4-a716-446655440030` |
| `season_number` | Integer | Season number (unique per show) | `1` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `general_media_description` | UUID | Template media description for common data and default revenue sharing | `550e8400-e29b-41d4-a716-446655440041` |
| `season_name` | String | Season name (auto-generated to "{show} season {nb}") | `"Running Man Season 1"` |
| `episodes_id_list` | UUID[] | Episode IDs in this season | `["ep1", "ep2", "ep3"]` |

---

### 6. Public Person

Cast, crew, and celebrity information. Can be a moral person (company/organization).

**Table:** `public_person`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique person identifier | `550e8400-e29b-41d4-a716-446655440020` |
| `creation_date_utc` | DateTime | Record creation timestamp | `2024-01-15T10:30:00Z` |
| `stage_name_roman` | String | Romanized stage name | `"Yu Jae Seok"` |
**Note:** At least one of the four name fields must be filled. On save, missing names are auto-filled when possible.

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `profession_list` | Enum[] | List of professions (author, actors, producers, etc.) | `["actor", "host"]` |
| `face_image_id` | UUID | Face image ID | `550e8400-e29b-41d4-a716-446655440021` |
| `first_name_hangul` | String | Korean first name | `"재석"` |
| `last_name_hangul` | String | Korean last name | `"유"` |
| `first_name_roman` | String | Romanized first name | `"Jae Seok"` |
| `last_name_roman` | String | Romanized last name | `"Yu"` |
| `stage_name_hangul` | String | Korean stage name | `"유재석"` |


---

### 7. Language

Language definitions for content metadata.

**Table:** `language`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique language identifier | `550e8400-e29b-41d4-a716-446655440050` |
| `creation_date_utc` | DateTime | Language creation timestamp | `2024-01-15T10:30:00Z` |
| `name` | String | Language name | `"Korean"` |
| `sigle` | String | Language code | `"ko"` |

**Note:** Consider if name should be in original script (e.g., Russian in Cyrillic).

---

### 8. Country

Country definitions for content origins.

**Table:** `country`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique country identifier | `550e8400-e29b-41d4-a716-446655440060` |
| `creation_date_utc` | DateTime | Country creation timestamp | `2024-01-15T10:30:00Z` |
| `name` | String | Country name | `"South Korea"` |

---

### 9. Territory

Territory definitions for distribution rights. Distinct from countries for diffusion rights management.

**Table:** `territory`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique territory identifier | `550e8400-e29b-41d4-a716-446655440070` |
| `creation_date_utc` | DateTime | Territory creation timestamp | `2024-01-15T10:30:00Z` |
| `name` | String | Territory name | `"France"` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `country` | UUID | Associated country ID | `550e8400-e29b-41d4-a716-446655440060` |

---

### 10. Picture

Picture/Image management for various media assets.

**Table:** `picture`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique picture identifier | `550e8400-e29b-41d4-a716-446655440080` |
| `creation_date_utc` | DateTime | Picture creation timestamp | `2024-01-15T10:30:00Z` |
| `photo_url` | String | Picture URL | `"https://cdn.kyool.com/images/photo.jpg"` |

**Note:** Consider differentiating face pictures from other types.

---

### 11. Subscription Plan

User subscription tier definitions.

**Table:** `subscription_plan`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique plan identifier | `550e8400-e29b-41d4-a716-446655440090` |
| `creation_date_utc` | DateTime | Plan creation timestamp | `2024-01-15T10:30:00Z` |
| `name` | String | Plan name | `"Premium"` |

---

### 12. Audience Category

Content audience classification.

**Table:** `audience_category`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique category identifier | `550e8400-e29b-41d4-a716-446655440100` |
| `creation_date_utc` | DateTime | Category creation timestamp | `2024-01-15T10:30:00Z` |
| `name` | String | Category name | `"Family Friendly"` |

**Note:** Consider if more granular restrictions are needed for younger audiences.

---

### 13. Category List

Content organization and homepage layout management.

**Table:** `category_lists`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique identifier | `550e8400-e29b-41d4-a716-446655440110` |
| `creation_date_utc` | DateTime | Creation timestamp | `2024-01-15T10:30:00Z` |
| `last_updated_utc` | DateTime | Last update timestamp | `2024-01-15T14:30:00Z` |
| `name` | String | Category list name (unique) | `"home"` |
| `title` | String | Display title | `"Welcome Page"` |
| `is_active` | Boolean | Active status | `true` |
| `display_order` | Integer | Display order | `1` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `description` | Text | Category description | `"Homepage featured content"` |
| `json_content` | Text | Cached JSON representation | `'{"id": "...", "items": [...]}'` |
| `json_last_updated` | DateTime | JSON cache timestamp | `2024-01-15T14:30:00Z` |

---

### 14. Category List Item

Individual items within category lists.

**Table:** `category_list_items`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique identifier | `550e8400-e29b-41d4-a716-446655440120` |
| `creation_date_utc` | DateTime | Creation timestamp | `2024-01-15T10:30:00Z` |
| `last_updated_utc` | DateTime | Last update timestamp | `2024-01-15T14:30:00Z` |
| `category_list_id` | UUID | Parent category list | `550e8400-e29b-41d4-a716-446655440110` |
| `title` | String | Item title | `"Featured Episode"` |
| `display_order` | Integer | Display order | `1` |
| `is_active` | Boolean | Active status | `true` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `media_description_id` | UUID | Link to media description | `550e8400-e29b-41d4-a716-446655440000` |
| `size_width` | Integer | Width in pixels | `300` |
| `size_height` | Integer | Height in pixels | `200` |
| `forward_link` | String | Navigation URL | `"/watch/episode-730"` |

---

### 15. Description Report

Reports for media description operations.

**Table:** `description_reports`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique report identifier | `550e8400-e29b-41d4-a716-446655440130` |
| `description_id` | UUID | Related media description | `550e8400-e29b-41d4-a716-446655440000` |
| `title` | String | Description title | `"Running Man - EP 730"` |
| `success_associated_file` | Boolean | File association success | `true` |
| `timestamp` | DateTime | Report generation time | `2024-01-15T10:30:00Z` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `batch_id` | UUID | Bulk operation identifier | `550e8400-e29b-41d4-a716-446655440131` |

---

### 16. Video File Report

Reports for video file operations and monitoring.

**Table:** `video_file_reports`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique report identifier | `550e8400-e29b-41d4-a716-446655440140` |
| `event` | String | Event type | `"possible_orphan"` |
| `timestamp` | DateTime | Event timestamp | `2024-01-15T10:30:00Z` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `video_file_id` | UUID | Related video file | `550e8400-e29b-41d4-a716-446655440010` |
| `video_file_name` | String | Video file name | `"running_man_ep730.mp4"` |
| `video_file_url` | String | Video file URL | `"https://s3.aws.com/bucket/video.mp4"` |
| `upload_method` | String | Upload method used | `"new_upload"` |
| `file_size` | String | File size | `"2.1 GB"` |
| `duration` | String | Video duration | `"60:00"` |
| `media_description_id` | UUID | Related media description | `550e8400-e29b-41d4-a716-446655440000` |
| `media_description_title` | String | Media description title | `"Running Man - EP 730"` |
| `additional_info` | Text | Additional information | `"File appears to be orphaned"` |

---

## API Endpoints

### Authentication

All API requests require authentication via Bearer token in the header:
```
Authorization: Bearer <jwt_token>
```

#### Login
```http
POST /api/v1/auth/login
```
**Request Body:**
```json
{
  "email": "admin@kyool.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

---

### User Management Endpoints

#### Get Current User
```http
GET /api/v1/users/me
```
**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@kyool.com",
  "full_name": "Admin User",
  "is_active": true,
  "is_admin": true,
  "creation_date_utc": "2024-01-15T10:30:00Z"
}
```

#### List Users (Admin Only)
```http
GET /api/v1/users/
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)

#### Create User (Admin Only)
```http
POST /api/v1/users/
```
**Request Body:**
```json
{
  "email": "newuser@kyool.com",
  "password": "password123",
  "full_name": "New User",
  "is_admin": false
}
```

#### Get User by ID (Admin Only)
```http
GET /api/v1/users/{user_id}
```

#### Update User (Admin Only)
```http
PUT /api/v1/users/{user_id}
```
**Request Body:**
```json
{
  "full_name": "Updated Name",
  "is_active": false
}
```

---

### Media Description Endpoints

#### Get All Media
```http
GET /api/v1/media/descriptions
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)
- `media_type` (enum): Filter by type (`video`, `webtoon`, `trailer`, `teaser`, `excerpt`)
- `program_id` (UUID): Filter by program
- `season_id` (UUID): Filter by season
- `category_id` (UUID): Filter by category
- `is_featured` (boolean): Filter by featured status
- `is_premium` (boolean): Filter by premium status

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "creation_date_utc": "2024-01-15T10:30:00Z",
      "file_number": 1246,
      "episode_title": "Running Man - EP 730",
      "media_type": "video",
      "program_id": "550e8400-e29b-41d4-a716-446655440030",
      "season_id": "550e8400-e29b-41d4-a716-446655440040",
      "synopsis_text": "Le thermomètre monte, mais le fun aussi !...",
      "image_thumbnail1": "550e8400-e29b-41d4-a716-446655440004"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

#### Get Media by ID
```http
GET /api/v1/media/descriptions/{id}
```

#### Create Media Description (Admin Only)
```http
POST /api/v1/media/descriptions
```
**Request Body:**
```json
{
  "file_number": 1247,
  "episode_title": "Running Man - EP 731",
  "media_type": "video",
  "program_id": "550e8400-e29b-41d4-a716-446655440030",
  "season_id": "550e8400-e29b-41d4-a716-446655440040",
  "episode_number": 731,
  "synopsis_text": "New episode description...",
  "production_year": 2024,
  "actors_id_list": ["550e8400-e29b-41d4-a716-446655440020"],
  "origin_country_id_list": ["550e8400-e29b-41d4-a716-446655440060"],
  "original_languages_id": ["550e8400-e29b-41d4-a716-446655440050"]
}
```

#### Update Media Description (Admin Only)
```http
PUT /api/v1/media/descriptions/{id}
```

#### Delete Media Description (Admin Only)
```http
DELETE /api/v1/media/descriptions/{id}
```

#### Bulk Create Media Descriptions (Admin Only)
```http
POST /api/v1/media/descriptions/bulk
```

**Request Body:**
```json
{
  "descriptions": [
    {
      "file_number": 1001,
      "episode_title": "Episode 1",
      "media_type": "video",
      "program_id": "550e8400-e29b-41d4-a716-446655440030",
      "descriptive_summary_text": "First episode description"
    },
    {
      "file_number": 1002,
      "episode_title": "Episode 2",
      "media_type": "video",
      "program_id": "550e8400-e29b-41d4-a716-446655440030",
      "descriptive_summary_text": "Second episode description"
    }
  ]
}
```

**Response:**
```json
{
  "created_count": 2,
  "failed_count": 0,
  "batch_id": "550e8400-e29b-41d4-a716-446655440020",
  "reports": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440021",
      "description_id": "550e8400-e29b-41d4-a716-446655440022",
      "title": "Episode 1",
      "success_associated_file": false,
      "timestamp": "2024-01-15T10:30:00Z",
      "batch_id": "550e8400-e29b-41d4-a716-446655440020"
    }
  ]
}
```

#### Get Featured Media
```http
GET /api/v1/media/descriptions/featured/list
```

#### Get Trending Media
```http
GET /api/v1/media/descriptions/trending/list
```

#### Like Media Description
```http
POST /api/v1/media/descriptions/{id}/like
```

#### Share Media Description
```http
POST /api/v1/media/descriptions/{id}/share
```

---

### Video File Endpoints

#### Get Video Files
```http
GET /api/v1/video/files
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)
- `media_description_id` (UUID): Filter by media description

#### Get Video File by ID
```http
GET /api/v1/video/files/{id}
```

#### Create Video File (Admin Only)
```http
POST /api/v1/video/files
```
**Request Body:**
```json
{
  "media_description_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_seconds": 3600,
  "subtitle_languages_id_list": ["550e8400-e29b-41d4-a716-446655440050", "550e8400-e29b-41d4-a716-446655440051"],
  "audio_languages_id_list": ["550e8400-e29b-41d4-a716-446655440050"],
  "resolutions_id_list": ["res720", "res1080"],
  "accessibilities_id_list": ["acc1"]
}
```

#### Update Video File (Admin Only)
```http
PUT /api/v1/video/files/{id}
```

#### Delete Video File (Admin Only)
```http
DELETE /api/v1/video/files/{id}
```

#### Destroy Video File (Admin Only)
```http
POST /api/v1/video/files/{id}/destroy
```

#### Upload Video File (Admin Only)
```http
POST /api/v1/video/files/upload
```
**Request:** Multipart form data with video file

#### Create Video File Metadata (Admin Only)
```http
POST /api/v1/video/files/create-metadata
```
**Request:**
```json
{
  "file_name": "video.mp4",
  "upload_method": "new_upload",
  "media_description_id": "550e8400-e29b-41d4-a716-446655440000"
}
```
**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "upload_url": "/api/v1/video/files/550e8400-e29b-41d4-a716-446655440010/upload-file",
  "upload_status": "metadata_only",
  "message": "Video file metadata created successfully. Use upload_url to upload the actual file."
}
```

#### Create Video File with Existing URL (Admin Only)
```http
POST /api/v1/video/files/create-with-existing-url
```
**Request:**
```json
{
  "file_name": "existing_video.mp4",
  "external_url": "https://example.com/video.mp4",
  "media_description_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Upload File to Existing Metadata (Admin Only)
```http
POST /api/v1/video/files/{file_id}/upload-file
```
**Request:** Multipart form data with video file
**Description:** Second step of two-step upload process

#### Test Video File Playback
```http
POST /api/v1/video/files/{file_id}/test
```
**Response:**
```json
{
  "success": true,
  "playback_url": "https://stream.mux.com/playback_id.m3u8",
  "error_message": null,
  "mux_playback_id": "playback_id"
}
```

#### Link Video to Media Description (Admin Only)
```http
POST /api/v1/video/files/{file_id}/link/{media_id}
```

#### Get Unlinked Video Files (Admin Only)
```http
GET /api/v1/video/files/unlinked/list
```

#### Get Video Files by Media Description (Admin Only)
```http
GET /api/v1/video/files/by-media/{media_id}
```

#### Update Encoding Status (Admin Only)
```http
PUT /api/v1/video/files/{id}/encoding-status
```
**Request Body:**
```json
{
  "encoding_status": "completed"
}
```

---

### Program Endpoints

#### Get All Programs
```http
GET /api/v1/programs
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)

#### Get Program by ID
```http
GET /api/v1/programs/{id}
```

#### Create Program (Admin Only)
```http
POST /api/v1/programs
```
**Request Body:**
```json
{
  "program_name": "Running Man",
  "general_media_description": "550e8400-e29b-41d4-a716-446655440031"
}
```

#### Update Program (Admin Only)
```http
PUT /api/v1/programs/{id}
```

#### Delete Program (Admin Only)
```http
DELETE /api/v1/programs/{id}
```

---

### Season Endpoints

#### Get All Seasons
```http
GET /api/v1/seasons
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)
- `program_id` (UUID): Filter by program

#### Get Season by ID
```http
GET /api/v1/seasons/{id}
```

#### Create Season (Admin Only)
```http
POST /api/v1/seasons
```
**Request Body:**
```json
{
  "program_id": "550e8400-e29b-41d4-a716-446655440030",
  "season_number": 1,
  "season_name": "Running Man Season 1",
  "general_media_description": "550e8400-e29b-41d4-a716-446655440041"
}
```

#### Update Season (Admin Only)
```http
PUT /api/v1/seasons/{id}
```

#### Delete Season (Admin Only)
```http
DELETE /api/v1/seasons/{id}
```

#### Get Seasons by Program (Admin Only)
```http
GET /api/v1/seasons/by-program/{program_id}
```

---

### Public Person Endpoints

#### Get All Public Persons
```http
GET /api/v1/persons
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)
- `profession` (string): Filter by profession

#### Get Person by ID
```http
GET /api/v1/persons/{id}
```

#### Create Person (Admin Only)
```http
POST /api/v1/persons
```
**Request Body:**
```json
{
  "first_name_hangul": "재석",
  "last_name_hangul": "유",
  "first_name_roman": "Jae Seok",
  "last_name_roman": "Yu",
  "profession_list": ["actor", "host"],
  "face_image_id": "550e8400-e29b-41d4-a716-446655440021"
}
```

#### Update Person (Admin Only)
```http
PUT /api/v1/persons/{id}
```

#### Delete Person (Admin Only)
```http
DELETE /api/v1/persons/{id}
```

#### Search Persons by Name
```http
GET /api/v1/persons/search/by-name
```
**Query Parameters:**
- `name` (string): Search term for name (searches both Korean and Roman names)

#### Get Persons by Profession
```http
GET /api/v1/persons/profession/{profession}
```

---

### Language Endpoints

#### Get All Languages
```http
GET /api/v1/languages
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)

#### Get Language by ID
```http
GET /api/v1/languages/{id}
```

#### Create Language (Admin Only)
```http
POST /api/v1/languages
```
**Request Body:**
```json
{
  "name": "Korean",
  "sigle": "ko"
}
```

#### Update Language (Admin Only)
```http
PUT /api/v1/languages/{id}
```

#### Delete Language (Admin Only)
```http
DELETE /api/v1/languages/{id}
```

---

### Country Endpoints

#### Get All Countries
```http
GET /api/v1/countries
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)

#### Get Country by ID
```http
GET /api/v1/countries/{id}
```

#### Create Country (Admin Only)
```http
POST /api/v1/countries
```
**Request Body:**
```json
{
  "name": "South Korea"
}
```

#### Update Country (Admin Only)
```http
PUT /api/v1/countries/{id}
```

#### Delete Country (Admin Only)
```http
DELETE /api/v1/countries/{id}
```

---

### Territory Endpoints

#### Get All Territories
```http
GET /api/v1/territories
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)

#### Get Territory by ID
```http
GET /api/v1/territories/{id}
```

#### Create Territory (Admin Only)
```http
POST /api/v1/territories
```
**Request Body:**
```json
{
  "name": "France",
  "country": "550e8400-e29b-41d4-a716-446655440060"
}
```

#### Update Territory (Admin Only)
```http
PUT /api/v1/territories/{id}
```

#### Delete Territory (Admin Only)
```http
DELETE /api/v1/territories/{id}
```

---

### Picture Endpoints

#### Get All Pictures
```http
GET /api/v1/pictures
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)

#### Get Picture by ID
```http
GET /api/v1/pictures/{id}
```

#### Create Picture (Admin Only)
```http
POST /api/v1/pictures
```
**Request Body:**
```json
{
  "photo_url": "https://cdn.kyool.com/images/photo.jpg"
}
```

#### Update Picture (Admin Only)
```http
PUT /api/v1/pictures/{id}
```

#### Delete Picture (Admin Only)
```http
DELETE /api/v1/pictures/{id}
```

#### Upload Picture (Admin Only)
```http
POST /api/v1/pictures/upload
```
**Request:** Multipart form data with image file

---

### Subscription Plan Endpoints

#### Get All Subscription Plans
```http
GET /api/v1/subscription-plans
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)

#### Get Subscription Plan by ID
```http
GET /api/v1/subscription-plans/{id}
```

#### Create Subscription Plan (Admin Only)
```http
POST /api/v1/subscription-plans
```
**Request Body:**
```json
{
  "name": "Premium"
}
```

#### Update Subscription Plan (Admin Only)
```http
PUT /api/v1/subscription-plans/{id}
```

#### Delete Subscription Plan (Admin Only)
```http
DELETE /api/v1/subscription-plans/{id}
```

---

### Audience Category Endpoints

#### Get All Audience Categories
```http
GET /api/v1/audience-categories
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)

#### Get Audience Category by ID
```http
GET /api/v1/audience-categories/{id}
```

#### Create Audience Category (Admin Only)
```http
POST /api/v1/audience-categories
```
**Request Body:**
```json
{
  "name": "Family Friendly"
}
```

#### Update Audience Category (Admin Only)
```http
PUT /api/v1/audience-categories/{id}
```

#### Delete Audience Category (Admin Only)
```http
DELETE /api/v1/audience-categories/{id}
```

---

### Category Lists Endpoints

#### Get All Category Lists
```http
GET /api/v1/category/lists
```
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)

#### Get Category List by ID
```http
GET /api/v1/category/lists/{category_list_id}
```

#### Create Category List (Admin Only)
```http
POST /api/v1/category/lists
```
**Request Body:**
```json
{
  "name": "home",
  "title": "Homepage",
  "description": "Featured content for homepage",
  "display_order": 1,
  "is_active": true
}
```

#### Update Category List (Admin Only)
```http
PUT /api/v1/category/lists/{category_list_id}
```

#### Delete Category List (Admin Only)
```http
DELETE /api/v1/category/lists/{category_list_id}
```

#### Get Category List Items
```http
GET /api/v1/category/lists/{category_list_id}/items
```

#### Create Category List Item (Admin Only)
```http
POST /api/v1/category/lists/{category_list_id}/items
```
**Request Body:**
```json
{
  "title": "Featured Episode",
  "media_description_id": "550e8400-e29b-41d4-a716-446655440000",
  "display_order": 1,
  "size_width": 300,
  "size_height": 200,
  "forward_link": "/watch/episode-730",
  "is_active": true
}
```

#### Update Category List Item (Admin Only)
```http
PUT /api/v1/category/lists/{category_list_id}/items/{item_id}
```

#### Delete Category List Item (Admin Only)
```http
DELETE /api/v1/category/lists/{category_list_id}/items/{item_id}
```

#### Update Item Order (Admin Only)
```http
PUT /api/v1/category/lists/{category_list_id}/items/order
```
**Request Body:**
```json
{
  "items": [
    {"id": "item1", "display_order": 1},
    {"id": "item2", "display_order": 2}
  ]
}
```

#### Get Cached JSON Content (Public)
```http
GET /api/v1/category/lists/{category_list_name}/json
```
**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440110",
  "name": "home",
  "title": "Homepage",
  "description": "Featured content for homepage",
  "is_active": true,
  "display_order": 1,
  "last_updated": "2024-01-15T14:30:00Z",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440120",
      "title": "Featured Episode",
      "display_order": 1,
      "size_width": 300,
      "size_height": 200,
      "media_description_id": "550e8400-e29b-41d4-a716-446655440000",
      "thumbnail_url": "https://cdn.kyool.com/images/thumb.jpg",
      "forward_link": "/watch/episode-730",
      "media_title": "Running Man - EP 730",
      "media_type": "video"
    }
  ]
}
```

#### Regenerate JSON Cache (Admin Only)
```http
POST /api/v1/category/lists/{category_list_id}/regenerate-json
```

#### Regenerate All JSON Caches (Admin Only)
```http
POST /api/v1/category/lists/regenerate-all-json
```

#### Initialize Default Categories (Admin Only)
```http
POST /api/v1/category/lists/initialize-defaults
```

---

### Media Upload Endpoints

#### Upload Video File (Admin Only)
```http
POST /api/v1/upload/video
```
**Request:** Multipart form data with video file
**Form Parameters:**
- `file` (file): Video file to upload
- `storage_backend` (string): Storage backend to use (`local`, `s3`, `mux`)

#### Upload Webcomic Files (Admin Only)
```http
POST /api/v1/upload/webcomic
```
**Request:** Multipart form data with image files
**Form Parameters:**
- `files` (file[]): Image files to upload
- `storage_backend` (string): Storage backend to use

#### Get Storage Backends (Admin Only)
```http
GET /api/v1/upload/backends
```
**Response:**
```json
{
  "backends": [
    {
      "name": "local",
      "display_name": "Local Storage",
      "available": true
    },
    {
      "name": "s3",
      "display_name": "Amazon S3",
      "available": true
    },
    {
      "name": "mux",
      "display_name": "Mux Video",
      "available": true
    }
  ]
}
```

#### Delete Uploaded File (Admin Only)
```http
DELETE /api/v1/upload/file
```
**Query Parameters:**
- `file_path` (string): Path to file to delete
- `storage_backend` (string): Storage backend

---

### Description Reports Endpoints

#### Get Description Reports (Admin Only)
```http
GET /api/v1/description/reports
```

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Number of records to return (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440130",
      "description_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Episode 1",
      "success_associated_file": false,
      "timestamp": "2024-01-15T10:30:00Z",
      "batch_id": "550e8400-e29b-41d4-a716-446655440131"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

#### Get Description Report by ID (Admin Only)
```http
GET /api/v1/description/reports/{id}
```

#### Get Reports by Batch ID (Admin Only)
```http
GET /api/v1/description/reports/batch/{batch_id}
```

#### Get Reports by Description ID (Admin Only)
```http
GET /api/v1/description/reports/description/{description_id}
```

---

### Video File Reports Endpoints

#### Get Video File Reports (Admin Only)
```http
GET /api/v1/video/file/reports
```

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Number of records to return (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440140",
      "video_file_id": "550e8400-e29b-41d4-a716-446655440010",
      "video_file_name": "running_man_ep730.mp4",
      "event": "possible_orphan",
      "timestamp": "2024-01-15T10:30:00Z",
      "additional_info": "File appears to be orphaned"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

#### Get Video File Report by ID (Admin Only)
```http
GET /api/v1/video/file/reports/{report_id}
```

#### Get Reports by Video File ID (Admin Only)
```http
GET /api/v1/video/file/reports/video-file/{video_file_id}
```

---

### Cached Content Lists

These endpoints serve pre-generated JSON files for optimal performance:

#### Get Content by Category
```http
GET /cache/categories/{category_slug}.json
```

#### Get Trending Content
```http
GET /cache/trending/daily.json
GET /cache/trending/weekly.json
```

#### Get Featured Content
```http
GET /cache/featured/homepage.json
```

#### Get Recommendations (User-specific)
```http
GET /cache/recommendations/{user_id}.json
```

---

## Data Types Reference

| Type | Description | Example |
|------|-------------|---------|
| `UUID` | RFC 4122 UUID string | `"550e8400-e29b-41d4-a716-446655440000"` |
| `DateTime` | ISO 8601 UTC timestamp | `"2024-01-15T10:30:00Z"` |
| `Date` | ISO 8601 date | `"2024-01-15"` |
| `String` | UTF-8 text string | `"Running Man"` |
| `Text` | Long-form UTF-8 text | `"Long description..."` |
| `Integer` | Whole number | `1246` |
| `Float` | Decimal number | `29.97` |
| `Boolean` | True/false value | `true` |
| `Enum` | Fixed set of values | `"video"` |
| `String[]` | Array of strings | `["fr", "en", "ko"]` |
| `UUID[]` | Array of UUIDs | `["id1", "id2"]` |
| `Enum[]` | Array of enum values | `["actor", "host"]` |

---

## Error Responses

All endpoints return structured error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid media type provided",
    "details": {
      "field": "media_type",
      "allowed_values": ["video", "webtoon", "trailer", "teaser", "excerpt"]
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_abc123"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Enum Values Reference

### Media Types
- `video` - Standard video content
- `webtoon` - Web comic/manga
- `trailer` - Movie/show trailer
- `teaser` - Short promotional content
- `excerpt` - Content clip/highlight

### Content Status
- `draft` - Content being created
- `published` - Live content
- `archived` - Removed from public view
- `scheduled` - Scheduled for future publication

### Encoding Status
- `pending` - File uploaded, awaiting processing
- `processing` - Currently being encoded
- `completed` - Processing finished successfully
- `failed` - Processing failed

### Upload Method
- `new_upload` - File uploaded through API
- `existing_url` - File referenced by external URL

### Upload Status
- `metadata_only` - Only metadata created
- `file_uploading` - File upload in progress
- `upload_completed` - File upload completed
- `upload_failed` - File upload failed

### Gender
- `male` - Male
- `female` - Female
- `other` - Other/non-binary

### Profession Types
- `actor` - Actor/Actress
- `director` - Director
- `producer` - Producer
- `author` - Author/Writer
- `screenwriter` - Screenwriter
- `illustrator` - Illustrator
- `host` - TV Host
- `comedian` - Comedian
- `singer` - Singer
- `dancer` - Dancer

### Report Events
- `possible_orphan` - Video file may be orphaned
- `file_delete` - Video file deleted
- `encoding_failed` - Video encoding failed
- `mux_error` - Mux processing error

---

## Rate Limiting

The API implements rate limiting to ensure fair usage:

| Endpoint Type | Rate Limit | Window |
|---------------|------------|---------|
| Authentication | 10 requests | 1 minute |
| Read Operations | 1000 requests | 1 hour |
| Write Operations (Admin) | 100 requests | 1 hour |
| File Upload | 10 requests | 1 hour |
| Cached Content | 10000 requests | 1 hour |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642253400
```

---

## Security

### Authentication
- JWT tokens with 24-hour expiration
- Refresh tokens for seamless re-authentication
- Role-based access control (Admin, Content Manager, User)

### Data Protection
- All data encrypted in transit (TLS 1.3)
- Database encryption at rest
- PII data anonymization in logs

### Content Protection
- DRM protection for premium content
- Geographic restrictions support
- Signed URLs for secure file access
- Watermarking for video content
- Internal file URLs not exposed to frontend

---

## Performance Considerations

### Caching Strategy
- **Static Content Lists:** Pre-generated JSON files served via CDN
- **Media Metadata:** Application-level caching (duration TBD)
- **File URLs:** Signed URLs with appropriate expiration
- **Internal File Access:** Temporary streaming URLs with DRM protection

### Pagination
- Default page size: 20 items
- Maximum page size: 100 items
- Cursor-based pagination for large datasets (future enhancement)

### File Handling
- **Upload Limits:** No size limit (supports large video files up to 100GB if required)
- **Supported Formats:** MP4, AVI, MOV, MKV for video; JPEG, PNG for images
- **Processing Time:** Variable depending on file size and complexity
- **Storage:** S3 and Mux integration with multiple resolution encoding

---

## New Features in v1.3

### Enhanced Content Hierarchy
- **Program Model:** New program/show management system
- **Season Model:** Season-based content organization
- **Hierarchical Relationships:** Program → Season → Episode structure

### Internationalization Support
- **Language Model:** Comprehensive language management
- **Country Model:** Country of origin tracking
- **Territory Model:** Distribution rights management
- **Multi-language Support:** Original language and subtitle/audio track management

### Enhanced Media Metadata
- **Expanded Person Roles:** Separate actor, director, producer, and author lists
- **Korean Name Requirements:** Mandatory Korean names for public persons
- **Image Management:** Structured image handling with Picture model
- **Revenue Sharing:** Admin-only financial tracking fields

### Improved Video Processing
- **Language Support:** Subtitle and audio language tracking
- **Resolution Management:** Multiple resolution support
- **Accessibility Features:** Accessibility option tracking
- **Internal File Security:** Secure internal file URL management

### Content Management Enhancements
- **Flexible Categories:** Enhanced category and theme support
- **Geographic Distribution:** Territory-based availability
- **Subscription Integration:** Enhanced subscription plan management
- **SEO Optimization:** Friendly URL support

---

## Future Considerations

### Planned Features (Phase 2+)
- Advanced analytics and monitoring
- Enhanced webhook functionality
- Extended performance optimization
- Additional content protection features
- Real-time notifications
- Advanced search capabilities
- Multi-language UI support
- Advanced revenue sharing automation

### Monitoring & Analytics
- Performance metrics tracking
- Business intelligence integration
- User behavior analytics
- Content consumption patterns
- Geographic usage analytics

---

## Migration Notes


### From v1.3 to v1.4
- Delete most deprecated - we are making breaking changes because the api was not in prod yet
- move some deprectaed to optional

### From v1.1 to v1.3

#### Breaking Changes
- **Public Person:** Korean names now required (first_name_hangul, last_name_hangul, first_name_roman, last_name_roman)
- **Media Description:** Several fields moved to specific ID lists (actors_id_list, directors_id_list, etc.)
- **Video File:** Language fields now use ID references instead of string arrays

#### New Required Fields
- All Korean name fields in Public Person are now mandatory
- Media Description file_number and episode_title remain required
- Video File creation_date_utc remains required

#### Deprecated Fields
- Legacy fields marked as deprecated are maintained for backward compatibility
- Consider migrating to new field structure in future updates
- thumbnail_url fields replaced with image ID references

#### New Models
- Program, Season, Language, Country, Territory, and Picture models added
- Existing integrations may need updates to leverage new hierarchical structure

---

## Change Log

### Version 1.3 (Current)
- **Added:** Program and Season models for content hierarchy
- **Added:** Language, Country, and Territory models for internationalization
- **Added:** Picture model for image management
- **Enhanced:** Media Description with expanded metadata fields
- **Enhanced:** Video File with language and resolution support
- **Enhanced:** Public Person with mandatory Korean names
- **Enhanced:** Subscription Plan and Audience Category models
- **Updated:** Field requirements based on current implementation
- **Added:** Revenue sharing and financial tracking fields (Admin only)
- **Added:** Internal file URL security features
- **Improved:** Content organization and categorization

### Version 1.1 (Previous)
- **Added:** User management system with authentication
- **Added:** Category lists for content organization
- **Added:** Comprehensive reporting system
- **Added:** Advanced upload system with dual methods
- **Added:** Video file monitoring and orphan tracking
- **Enhanced:** Video processing with Mux integration
- **Enhanced:** API documentation with all missing endpoints

### Version 1.0 (Original)
- Basic media description management
- Video file upload functionality
- Public person management
- Basic subscription and audience category support

---

*API Specification v1.3*  
*For KYOOL Media Platform Backend Development*  
*Updated: 2025-07-16*
