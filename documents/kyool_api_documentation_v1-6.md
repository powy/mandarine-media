# KYOOL Media Platform API Documentation

## Overview

**Version:** 1.6  
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

## NEW MODELS (v1.6)

### 17. Thumbnail Format

Enum of different thumbnail format specifications for consistent image sizing across the platform.

**Enum Type:** `ThumbnailFormatEnum`

#### Available Values
| Value | Description | Dimensions | Usage |
|-------|-------------|------------|--------|
| `small_square` | Small square format | 1080x1080 | User avatars, compact lists |
| `medium_portrait` | Medium portrait format | 810x1080 | Content cards, mobile displays |
| `large_landscape` | Large landscape format | 1920x1080 | Homepage banners, desktop displays |
| `vertical_mobile` | Vertical mobile format | 1080x1920 | Mobile app screens, stories |

---

### 18. Content List

Content lists are ordered collections that mix Programs, Seasons, and Media items. They provide flexible content organization with consistent thumbnail formatting.

**Table:** `content_lists`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique content list identifier | `550e8400-e29b-41d4-a716-446655440150` |
| `creation_date_utc` | DateTime | Content list creation timestamp | `2024-01-15T10:30:00Z` |
| `last_updated_utc` | DateTime | Last update timestamp | `2024-01-15T14:30:00Z` |
| `title` | String | Content list title | `"Trending K-Dramas"` |
| `thumbnail_format` | ThumbnailFormatEnum | Thumbnail format for all items | `medium_portrait` |
| `is_active` | Boolean | Active status | `true` |
| `display_order` | Integer | Display order within parent | `1` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `description` | Text | Content list description | `"Popular Korean dramas this week"` |
| `content_items` | UUID[] | Ordered list of content IDs (Programs, Seasons, Media) | `["prog1", "season2", "media3"]` |
| `content_types` | String[] | Corresponding content types for items | `["program", "season", "media_description"]` |
| `json_content` | Text | Cached JSON representation | `'{"id": "...", "items": [...]}'` |
| `json_last_updated` | DateTime | JSON cache timestamp | `2024-01-15T14:30:00Z` |

---

### 19. Screen Content

Screen content represents a complete screen layout with a title and ordered list of content lists. This model organizes multiple content lists for comprehensive screen displays.

**Table:** `screen_contents`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique screen content identifier | `550e8400-e29b-41d4-a716-446655440160` |
| `creation_date_utc` | DateTime | Screen content creation timestamp | `2024-01-15T10:30:00Z` |
| `last_updated_utc` | DateTime | Last update timestamp | `2024-01-15T14:30:00Z` |
| `title` | String | Screen title | `"Homepage"` |
| `is_active` | Boolean | Active status | `true` |
| `display_order` | Integer | Screen display order | `1` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `description` | Text | Screen description | `"Main homepage content layout"` |
| `content_lists` | UUID[] | Ordered list of content list IDs | `["list1", "list2", "list3"]` |
| `screen_type` | String | Type of screen (homepage, category, search, etc.) | `"homepage"` |
| `json_content` | Text | Cached JSON representation | `'{"id": "...", "title": "...", "content_lists": [...]}'` |
| `json_last_updated` | DateTime | JSON cache timestamp | `2024-01-15T14:30:00Z` |

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

## UPDATED ROLE-BASED ACCESS CONTROL

### Access Control Rules

For all CRUD operations in the API:

#### Manager/Admin Users
- **Can perform all CRUD operations** on all resources
- Full access to create, read, update, and delete operations
- Access to admin-only fields (revenue sharing, financial data)
- Access to user management endpoints

#### Simple Users  
- **Can only perform READ operations** on most resources
- **Cannot access user table** (except their own profile via `/users/me`)
- **Can still authenticate** and access auth endpoints
- No access to admin-only fields
- No access to create, update, or delete operations

#### Specific Endpoint Access Patterns

| Resource | Simple User Access | Manager/Admin Access |
|----------|-------------------|---------------------|
| **Media Descriptions** | Read only | Full CRUD |
| **Video Files** | Read only | Full CRUD |
| **Programs** | Read only | Full CRUD |
| **Seasons** | Read only | Full CRUD |
| **Public Persons** | Read only | Full CRUD |
| **Languages** | Read only | Full CRUD |
| **Countries** | Read only | Full CRUD |
| **Territories** | Read only | Full CRUD |
| **Pictures** | Read only | Full CRUD |
| **Subscription Plans** | Read only | Full CRUD |
| **Audience Categories** | Read only | Full CRUD |
| **Category Lists** | Read only | Full CRUD |
| **Content Lists** | Read only | Full CRUD |
| **Screen Contents** | Read only | Full CRUD |
| **Users** | Own profile only (`/users/me`) | Full CRUD |
| **Reports** | No access | Full CRUD |
| **Upload Endpoints** | No access | Full access |

---

## NEW API ENDPOINTS (v1.6)

### Content Lists Endpoints

#### Get All Content Lists
```http
GET /api/v1/content/lists
```
**Access:** Simple Users (Read), Manager/Admin (Read)
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)
- `is_active` (boolean): Filter by active status
- `thumbnail_format` (enum): Filter by thumbnail format

#### Get Content List by ID  
```http
GET /api/v1/content/lists/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Content List (Manager/Admin Only)
```http
POST /api/v1/content/lists
```
**Access:** Manager/Admin only
**Request Body:**
```json
{
  "title": "Trending K-Dramas",
  "thumbnail_format": "medium_portrait",
  "description": "Popular Korean dramas this week",
  "content_items": ["prog1", "season2", "media3"],
  "content_types": ["program", "season", "media_description"],
  "is_active": true,
  "display_order": 1
}
```

#### Update Content List (Manager/Admin Only)
```http
PUT /api/v1/content/lists/{id}
```
**Access:** Manager/Admin only

#### Delete Content List (Manager/Admin Only)
```http
DELETE /api/v1/content/lists/{id}
```
**Access:** Manager/Admin only

#### Update Content List Order (Manager/Admin Only)
```http
PUT /api/v1/content/lists/{id}/reorder
```
**Access:** Manager/Admin only
**Request Body:**
```json
{
  "content_items": ["media3", "prog1", "season2"],
  "content_types": ["media_description", "program", "season"]
}
```

#### Get Content List JSON Cache
```http
GET /api/v1/content/lists/{id}/json
```
**Access:** Simple Users (Read), Manager/Admin (Read)
**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440150",
  "title": "Trending K-Dramas",
  "thumbnail_format": "medium_portrait",
  "description": "Popular Korean dramas this week",
  "last_updated": "2024-01-15T14:30:00Z",
  "items": [
    {
      "content_id": "550e8400-e29b-41d4-a716-446655440030",
      "content_type": "program",
      "title": "Running Man",
      "thumbnail_url": "https://cdn.kyool.com/images/thumb.jpg",
      "display_order": 1
    }
  ]
}
```

#### Regenerate Content List JSON Cache (Manager/Admin Only)
```http
POST /api/v1/content/lists/{id}/regenerate-json
```
**Access:** Manager/Admin only

---

### Screen Contents Endpoints

#### Get All Screen Contents
```http
GET /api/v1/screen/contents
```
**Access:** Simple Users (Read), Manager/Admin (Read)
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)
- `is_active` (boolean): Filter by active status
- `screen_type` (string): Filter by screen type

#### Get Screen Content by ID
```http
GET /api/v1/screen/contents/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Screen Content (Manager/Admin Only)
```http
POST /api/v1/screen/contents
```
**Access:** Manager/Admin only
**Request Body:**
```json
{
  "title": "Homepage",
  "description": "Main homepage content layout",
  "content_lists": ["list1", "list2", "list3"],
  "screen_type": "homepage",
  "is_active": true,
  "display_order": 1
}
```

#### Update Screen Content (Manager/Admin Only)
```http
PUT /api/v1/screen/contents/{id}
```
**Access:** Manager/Admin only

#### Delete Screen Content (Manager/Admin Only)
```http
DELETE /api/v1/screen/contents/{id}
```
**Access:** Manager/Admin only

#### Update Screen Content Lists Order (Manager/Admin Only)
```http
PUT /api/v1/screen/contents/{id}/reorder-lists
```
**Access:** Manager/Admin only
**Request Body:**
```json
{
  "content_lists": ["list3", "list1", "list2"]
}
```

#### Get Screen Content JSON Cache
```http
GET /api/v1/screen/contents/{id}/json
```
**Access:** Simple Users (Read), Manager/Admin (Read)
**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440160",
  "title": "Homepage",
  "description": "Main homepage content layout",
  "screen_type": "homepage",
  "last_updated": "2024-01-15T14:30:00Z",
  "content_lists": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440150",
      "title": "Trending K-Dramas",
      "thumbnail_format": "medium_portrait",
      "display_order": 1,
      "items": [...]
    }
  ]
}
```

#### Regenerate Screen Content JSON Cache (Manager/Admin Only)
```http
POST /api/v1/screen/contents/{id}/regenerate-json
```
**Access:** Manager/Admin only

#### Get Screen Content by Type
```http
GET /api/v1/screen/contents/by-type/{screen_type}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

---

## EXISTING ENDPOINTS WITH UPDATED ACCESS CONTROL

All existing endpoints from v1.5 now follow the updated role-based access control:

### User Management Endpoints

#### Get Current User
```http
GET /api/v1/users/me
```
**Access:** Simple Users (Own profile), Manager/Admin (Own profile)

#### List Users (Manager/Admin Only)
```http
GET /api/v1/users/
```
**Access:** Manager/Admin only

#### Create User (Manager/Admin Only)
```http
POST /api/v1/users/
```
**Access:** Manager/Admin only

#### Get User by ID (Manager/Admin Only)  
```http
GET /api/v1/users/{user_id}
```
**Access:** Manager/Admin only

#### Update User (Manager/Admin Only)
```http
PUT /api/v1/users/{user_id}
```
**Access:** Manager/Admin only

---

### Media Description Endpoints

#### Get All Media
```http
GET /api/v1/media/descriptions
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Media by ID
```http
GET /api/v1/media/descriptions/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Media Description (Manager/Admin Only)
```http
POST /api/v1/media/descriptions
```
**Access:** Manager/Admin only

#### Update Media Description (Manager/Admin Only)
```http
PUT /api/v1/media/descriptions/{id}
```
**Access:** Manager/Admin only

#### Delete Media Description (Manager/Admin Only)
```http
DELETE /api/v1/media/descriptions/{id}
```
**Access:** Manager/Admin only

#### Bulk Create Media Descriptions (Manager/Admin Only)
```http
POST /api/v1/media/descriptions/bulk
```
**Access:** Manager/Admin only

---

### Video File Endpoints

#### Get Video Files
```http
GET /api/v1/video/files
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Video File by ID
```http
GET /api/v1/video/files/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Video File (Manager/Admin Only)
```http
POST /api/v1/video/files
```
**Access:** Manager/Admin only

#### Update Video File (Manager/Admin Only)
```http
PUT /api/v1/video/files/{id}
```
**Access:** Manager/Admin only

#### Delete Video File (Manager/Admin Only)
```http
DELETE /api/v1/video/files/{id}
```
**Access:** Manager/Admin only

#### Upload Video File (Manager/Admin Only)
```http
POST /api/v1/video/files/upload
```
**Access:** Manager/Admin only

---

### Program Endpoints

#### Get All Programs
```http
GET /api/v1/programs
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Program by ID
```http
GET /api/v1/programs/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Program (Manager/Admin Only)
```http
POST /api/v1/programs
```
**Access:** Manager/Admin only

#### Update Program (Manager/Admin Only)
```http
PUT /api/v1/programs/{id}
```
**Access:** Manager/Admin only

#### Delete Program (Manager/Admin Only)
```http
DELETE /api/v1/programs/{id}
```
**Access:** Manager/Admin only

---

### Season Endpoints

#### Get All Seasons
```http
GET /api/v1/seasons
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Season by ID
```http
GET /api/v1/seasons/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Season (Manager/Admin Only)
```http
POST /api/v1/seasons
```
**Access:** Manager/Admin only

#### Update Season (Manager/Admin Only)
```http
PUT /api/v1/seasons/{id}
```
**Access:** Manager/Admin only

#### Delete Season (Manager/Admin Only)
```http
DELETE /api/v1/seasons/{id}
```
**Access:** Manager/Admin only

---

### Public Person Endpoints

#### Get All Public Persons
```http
GET /api/v1/persons
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Person by ID
```http
GET /api/v1/persons/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Person (Manager/Admin Only)
```http
POST /api/v1/persons
```
**Access:** Manager/Admin only

#### Update Person (Manager/Admin Only)
```http
PUT /api/v1/persons/{id}
```
**Access:** Manager/Admin only

#### Delete Person (Manager/Admin Only)
```http
DELETE /api/v1/persons/{id}
```
**Access:** Manager/Admin only

---

### Language Endpoints

#### Get All Languages
```http
GET /api/v1/languages
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Language by ID
```http
GET /api/v1/languages/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Language (Manager/Admin Only)
```http
POST /api/v1/languages
```
**Access:** Manager/Admin only

#### Update Language (Manager/Admin Only)
```http
PUT /api/v1/languages/{id}
```
**Access:** Manager/Admin only

#### Delete Language (Manager/Admin Only)
```http
DELETE /api/v1/languages/{id}
```
**Access:** Manager/Admin only

---

### Country Endpoints

#### Get All Countries
```http
GET /api/v1/countries
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Country by ID
```http
GET /api/v1/countries/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Country (Manager/Admin Only)
```http
POST /api/v1/countries
```
**Access:** Manager/Admin only

#### Update Country (Manager/Admin Only)
```http
PUT /api/v1/countries/{id}
```
**Access:** Manager/Admin only

#### Delete Country (Manager/Admin Only)
```http
DELETE /api/v1/countries/{id}
```
**Access:** Manager/Admin only

---

### Territory Endpoints

#### Get All Territories
```http
GET /api/v1/territories
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Territory by ID
```http
GET /api/v1/territories/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Territory (Manager/Admin Only)
```http
POST /api/v1/territories
```
**Access:** Manager/Admin only

#### Update Territory (Manager/Admin Only)
```http
PUT /api/v1/territories/{id}
```
**Access:** Manager/Admin only

#### Delete Territory (Manager/Admin Only)
```http
DELETE /api/v1/territories/{id}
```
**Access:** Manager/Admin only

---

### Picture Endpoints

#### Get All Pictures
```http
GET /api/v1/pictures
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Picture by ID
```http
GET /api/v1/pictures/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Picture (Manager/Admin Only)
```http
POST /api/v1/pictures
```
**Access:** Manager/Admin only

#### Update Picture (Manager/Admin Only)
```http
PUT /api/v1/pictures/{id}
```
**Access:** Manager/Admin only

#### Delete Picture (Manager/Admin Only)
```http
DELETE /api/v1/pictures/{id}
```
**Access:** Manager/Admin only

#### Upload Picture (Manager/Admin Only)
```http
POST /api/v1/pictures/upload
```
**Access:** Manager/Admin only

---

### Subscription Plan Endpoints

#### Get All Subscription Plans
```http
GET /api/v1/subscription-plans
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Subscription Plan by ID
```http
GET /api/v1/subscription-plans/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Subscription Plan (Manager/Admin Only)
```http
POST /api/v1/subscription-plans
```
**Access:** Manager/Admin only

#### Update Subscription Plan (Manager/Admin Only)
```http
PUT /api/v1/subscription-plans/{id}
```
**Access:** Manager/Admin only

#### Delete Subscription Plan (Manager/Admin Only)
```http
DELETE /api/v1/subscription-plans/{id}
```
**Access:** Manager/Admin only

---

### Audience Category Endpoints

#### Get All Audience Categories
```http
GET /api/v1/audience-categories
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Audience Category by ID
```http
GET /api/v1/audience-categories/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Audience Category (Manager/Admin Only)
```http
POST /api/v1/audience-categories
```
**Access:** Manager/Admin only

#### Update Audience Category (Manager/Admin Only)
```http
PUT /api/v1/audience-categories/{id}
```
**Access:** Manager/Admin only

#### Delete Audience Category (Manager/Admin Only)
```http
DELETE /api/v1/audience-categories/{id}
```
**Access:** Manager/Admin only

---

### Category Lists Endpoints

#### Get All Category Lists
```http
GET /api/v1/category/lists
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Category List by ID
```http
GET /api/v1/category/lists/{category_list_id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Category List (Manager/Admin Only)
```http
POST /api/v1/category/lists
```
**Access:** Manager/Admin only

#### Update Category List (Manager/Admin Only)
```http
PUT /api/v1/category/lists/{category_list_id}
```
**Access:** Manager/Admin only

#### Delete Category List (Manager/Admin Only)
```http
DELETE /api/v1/category/lists/{category_list_id}
```
**Access:** Manager/Admin only

#### Get Cached JSON Content (Public)
```http
GET /api/v1/category/lists/{category_list_name}/json
```
**Access:** Simple Users (Read), Manager/Admin (Read)

---

### Media Upload Endpoints

#### Upload Video File (Manager/Admin Only)
```http
POST /api/v1/upload/video
```
**Access:** Manager/Admin only

#### Upload Webcomic Files (Manager/Admin Only)
```http
POST /api/v1/upload/webcomic
```
**Access:** Manager/Admin only

#### Get Storage Backends (Manager/Admin Only)
```http
GET /api/v1/upload/backends
```
**Access:** Manager/Admin only

#### Delete Uploaded File (Manager/Admin Only)
```http
DELETE /api/v1/upload/file
```
**Access:** Manager/Admin only

---

### Description Reports Endpoints

#### Get Description Reports (Manager/Admin Only)
```http
GET /api/v1/description/reports
```
**Access:** Manager/Admin only

#### Get Description Report by ID (Manager/Admin Only)
```http
GET /api/v1/description/reports/{id}
```
**Access:** Manager/Admin only

---

### Video File Reports Endpoints

#### Get Video File Reports (Manager/Admin Only)
```http
GET /api/v1/video/file/reports
```
**Access:** Manager/Admin only

#### Get Video File Report by ID (Manager/Admin Only)
```http
GET /api/v1/video/file/reports/{report_id}
```
**Access:** Manager/Admin only

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
| `ThumbnailFormatEnum` | Thumbnail format enum | `"medium_portrait"` |

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

### Thumbnail Format (NEW)
- `small_square` - Small square format (1080x1080)
- `medium_portrait` - Medium portrait format (810x1080)
- `large_landscape` - Large landscape format (1920x1080)
- `vertical_mobile` - Vertical mobile format (1080x1920)

### Content Types (NEW)
- `program` - Program/Show content
- `season` - Season content
- `media_description` - Individual media item

### Screen Types (NEW)
- `homepage` - Homepage screen
- `category` - Category browsing screen
- `search` - Search results screen
- `profile` - User profile screen
- `discover` - Content discovery screen

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
| Write Operations (Manager/Admin) | 100 requests | 1 hour |
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
- Role-based access control (Manager/Admin, Simple User)

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
- **Content Lists & Screen Contents:** Application-level JSON caching with regeneration endpoints
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

## New Features in v1.6

### Enhanced Content Organization
- **Thumbnail Format Enum:** Standardized thumbnail dimensions across the platform
- **Content Lists:** Flexible content organization mixing Programs, Seasons, and Media items
- **Screen Contents:** Complete screen layout management with ordered content lists
- **JSON Caching:** Performance optimization for content lists and screen layouts

### Improved Role-Based Access Control
- **Stricter Access Control:** Clear separation between Manager/Admin and Simple User permissions
- **Comprehensive CRUD Protection:** All create, update, and delete operations restricted to Manager/Admin
- **User Table Protection:** Simple users cannot access user data (except own profile)
- **Consistent Permission Model:** Unified access control across all existing and new endpoints

### Content Management Enhancements
- **Flexible Content Mixing:** Content lists can contain any combination of Programs, Seasons, and Media
- **Hierarchical Screen Organization:** Screen contents organize multiple content lists
- **Performance Optimization:** JSON caching with regeneration capabilities
- **Display Order Management:** Flexible ordering for both content items and screen layouts

---

## Migration Notes

### From v1.5 to v1.6

#### Breaking Changes
- **Access Control:** Simple users now have read-only access to most endpoints
- **User Endpoints:** Simple users can only access their own profile via `/users/me`
- **Admin Operations:** All create/update/delete operations now require Manager/Admin privileges

#### New Required Dependencies
- New models require database migrations for `content_lists` and `screen_contents` tables
- `ThumbnailFormatEnum` must be implemented in backend validation
- JSON caching infrastructure needs to be implemented for new models

#### New Models
- **Content Lists:** New table with flexible content organization
- **Screen Contents:** New table for complete screen layout management
- **Thumbnail Format:** New enum for standardized image dimensions

#### Updated Access Control
- All existing endpoints now enforce stricter role-based access control
- Manager/Admin access required for all write operations
- Simple user access limited to read operations only

---

## Change Log

### Version 1.6 (Current)
- **Added:** Content Lists model for flexible content organization
- **Added:** Screen Contents model for complete screen layout management
- **Added:** Thumbnail Format enum for standardized image dimensions
- **Enhanced:** Role-based access control with stricter permissions
- **Enhanced:** JSON caching system for performance optimization
- **Updated:** All existing endpoints with consistent access control
- **Added:** Comprehensive CRUD endpoints for new models
- **Added:** Content reordering and cache regeneration capabilities

### Version 1.5 (Previous)
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

---

*API Specification v1.6*  
*For KYOOL Media Platform Backend Development*  
*Updated: 2025-07-25*