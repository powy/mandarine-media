# KYOOL Media Platform API Documentation

## Overview

**Version:** 1.9  
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
| `slug` | String | SEO-friendly URL slug (auto-generated from title if empty) | `"sbs_running_man_episode_730_tvshow"` |
| `image_fullscreen` | UUID | Fullscreen image ID | `550e8400-e29b-41d4-a716-446655440003` |
| `image_thumbnail1` | UUID | Primary thumbnail image ID | `550e8400-e29b-41d4-a716-446655440004` |
| `image_thumbnail2` | UUID | Secondary thumbnail image ID | `550e8400-e29b-41d4-a716-446655440005` |
| `image_mobile_home` | UUID | Mobile homepage image ID | `550e8400-e29b-41d4-a716-446655440006` |
| `image_desktop_home` | UUID | Desktop homepage image ID | `550e8400-e29b-41d4-a716-446655440007` |
| `additional_images_id_list` | UUID[] | Additional image IDs | `["img1", "img2"]` |
| `tag_text_list` | String[] | Human-readable tags/keywords | `["drama", "kpop", "runningman", "korea", "k-food"]` |
| `translation_share` | Float | Translation cost percentage (Admin only) | `0.15` |
| `sacem_share` | Float | SACEM cost percentage (Admin only) | `0.05` |
| `other_share` | Float | Other cost percentage (Admin only) | `0.03` |
| `revenue_share` | Float | Revenue sharing percentage (Admin only) | `0.50` |
| `paid_token_cost` | Integer | Cost in tokens (Admin only) | `100` |
| `expected_filename` | String | Expected video file name for automatic linking | `"running_man_730.mp4"` |

**Note:** `slug` field is auto-generated from `episode_title` if not provided: lowercase, spaces replaced with underscores, special characters removed. If duplicate, a number suffix is added.

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
| `environment_key` | String | Environment identifier key | `"prod"` |
| `protection_key` | String | Content protection key | `"protected_content_123"` |
| `slug` | String | SEO-friendly URL slug (auto-generated from file_name if empty) | `"running_man_ep730"` |

**Note:** `slug` field is auto-generated from `file_name` if not provided: lowercase, spaces replaced with underscores, special characters removed. If duplicate, a number suffix is added.

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
| `latest_first` | Boolean | Order items by latest first (default: true) | `true` |

#### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `description` | Text | Content list description | `"Popular Korean dramas this week"` |
| `content_items` | UUID[] | Ordered list of content IDs (Programs, Seasons, Media) | `["prog1", "season2", "media3"]` |
| `content_types` | String[] | Corresponding content types for items | `["program", "season", "media_description"]` |
| `media_type` | Enum | Filter by media type | `video`, `webtoon`, `trailer`, `teaser`, `excerpt` |
| `media_categories_id_list` | UUID[] | Filter by media category IDs | `["cat1", "cat2"]` |
| `themes_and_genres_id_list` | UUID[] | Filter by theme/genre IDs | `["theme1", "theme2"]` |
| `slug` | String | SEO-friendly URL slug (unique, auto-generated from filters if empty) | `"trending_k_dramas"` |
| `json_content` | Text | Cached JSON representation | `'{"id": "...", "items": [...]}'` |
| `json_last_updated` | DateTime | JSON cache timestamp | `2024-01-15T14:30:00Z` |

**Note:** `slug` field is auto-generated from category/theme/media type names if filtering fields are provided and slug is empty. Format: lowercase, underscores, special characters removed. If duplicate, a number suffix is added.

---

### 19. Screen Description

Screen description represents a complete screen layout with a title and ordered list of content lists. This model organizes multiple content lists for comprehensive screen displays.

**Table:** `screen_descriptions`

#### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique screen description identifier | `550e8400-e29b-41d4-a716-446655440160` |
| `creation_date_utc` | DateTime | Screen description creation timestamp | `2024-01-15T10:30:00Z` |
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
| `slug` | String | SEO-friendly URL slug (unique, auto-generated from title if empty) | `"homepage"` |
| `json_content` | Text | Cached JSON representation | `'{"id": "...", "title": "...", "content_lists": [...]}'` |
| `json_last_updated` | DateTime | JSON cache timestamp | `2024-01-15T14:30:00Z` |

**Note:** `slug` field is auto-generated from `title` if not provided: lowercase, spaces replaced with underscores, special characters removed. If duplicate, a number suffix is added.

---

## API Endpoints

### Authentication

All API requests require authentication via Bearer token in the header:
```
Authorization: Bearer <jwt_token>
```

#### Login
```http
POST /auth/login
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

## ROLE-BASED ACCESS CONTROL

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
| **Screen Descriptions** | Read only | Full CRUD |
| **Users** | Own profile only (`/users/me`) | Full CRUD |
| **Reports** | No access | Full CRUD |
| **Upload Endpoints** | No access | Full access |

---

## API ENDPOINTS

### User Management Endpoints

#### Get Current User
```http
GET /users/me
```
**Access:** Simple Users (Own profile), Manager/Admin (Own profile)

#### List Users (Manager/Admin Only)
```http
GET /users
```
**Access:** Manager/Admin only

#### Create User (Manager/Admin Only)
```http
POST /users
```
**Access:** Manager/Admin only

#### Get User by ID (Manager/Admin Only)  
```http
GET /users/{user_id}
```
**Access:** Manager/Admin only

#### Update User (Manager/Admin Only)
```http
PUT /users/{user_id}
```
**Access:** Manager/Admin only

---

### Media Description Endpoints

#### Get All Media
```http
GET /media-descriptions
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Media by ID
```http
GET /media-descriptions/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Media Description (Manager/Admin Only)
```http
POST /media-descriptions
```
**Access:** Manager/Admin only

#### Update Media Description (Manager/Admin Only)
```http
PUT /media-descriptions/{id}
```
**Access:** Manager/Admin only

#### Delete Media Description (Manager/Admin Only)
```http
DELETE /media-descriptions/{id}
```
**Access:** Manager/Admin only

#### Bulk Create Media Descriptions (Manager/Admin Only)
```http
POST /media-descriptions/bulk
```
**Access:** Manager/Admin only

---

### Video File Endpoints

#### Get Video Files
```http
GET /video-files
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Video File by ID
```http
GET /video-files/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Video File (Manager/Admin Only)
```http
POST /video-files
```
**Access:** Manager/Admin only

#### Update Video File (Manager/Admin Only)
```http
PUT /video-files/{id}
```
**Access:** Manager/Admin only

#### Delete Video File (Manager/Admin Only)
```http
DELETE /video-files/{id}
```
**Access:** Manager/Admin only

#### Upload Video File (Manager/Admin Only)
```http
POST /video-files/upload
```
**Access:** Manager/Admin only

---

### Program Endpoints

#### Get All Programs
```http
GET /programs
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Program by ID
```http
GET /programs/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Program (Manager/Admin Only)
```http
POST /programs
```
**Access:** Manager/Admin only

#### Update Program (Manager/Admin Only)
```http
PUT /programs/{id}
```
**Access:** Manager/Admin only

#### Delete Program (Manager/Admin Only)
```http
DELETE /programs/{id}
```
**Access:** Manager/Admin only

---

### Season Endpoints

#### Get All Seasons
```http
GET /seasons
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Season by ID
```http
GET /seasons/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Season (Manager/Admin Only)
```http
POST /seasons
```
**Access:** Manager/Admin only

#### Update Season (Manager/Admin Only)
```http
PUT /seasons/{id}
```
**Access:** Manager/Admin only

#### Delete Season (Manager/Admin Only)
```http
DELETE /seasons/{id}
```
**Access:** Manager/Admin only

---

### Public Person Endpoints

#### Get All Public Persons
```http
GET /persons
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Person by ID
```http
GET /persons/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Person (Manager/Admin Only)
```http
POST /persons
```
**Access:** Manager/Admin only

#### Update Person (Manager/Admin Only)
```http
PUT /persons/{id}
```
**Access:** Manager/Admin only

#### Delete Person (Manager/Admin Only)
```http
DELETE /persons/{id}
```
**Access:** Manager/Admin only

---

### Language Endpoints

#### Get All Languages
```http
GET /languages
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Language by ID
```http
GET /languages/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Language (Manager/Admin Only)
```http
POST /languages
```
**Access:** Manager/Admin only

#### Update Language (Manager/Admin Only)
```http
PUT /languages/{id}
```
**Access:** Manager/Admin only

#### Delete Language (Manager/Admin Only)
```http
DELETE /languages/{id}
```
**Access:** Manager/Admin only

---

### Country Endpoints

#### Get All Countries
```http
GET /countries
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Country by ID
```http
GET /countries/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Country (Manager/Admin Only)
```http
POST /countries
```
**Access:** Manager/Admin only

#### Update Country (Manager/Admin Only)
```http
PUT /countries/{id}
```
**Access:** Manager/Admin only

#### Delete Country (Manager/Admin Only)
```http
DELETE /countries/{id}
```
**Access:** Manager/Admin only

---

### Territory Endpoints

#### Get All Territories
```http
GET /territories
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Territory by ID
```http
GET /territories/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Territory (Manager/Admin Only)
```http
POST /territories
```
**Access:** Manager/Admin only

#### Update Territory (Manager/Admin Only)
```http
PUT /territories/{id}
```
**Access:** Manager/Admin only

#### Delete Territory (Manager/Admin Only)
```http
DELETE /territories/{id}
```
**Access:** Manager/Admin only

---

### Picture Endpoints

#### Get All Pictures
```http
GET /pictures
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Picture by ID
```http
GET /pictures/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Picture (Manager/Admin Only)
```http
POST /pictures
```
**Access:** Manager/Admin only

#### Update Picture (Manager/Admin Only)
```http
PUT /pictures/{id}
```
**Access:** Manager/Admin only

#### Delete Picture (Manager/Admin Only)
```http
DELETE /pictures/{id}
```
**Access:** Manager/Admin only

#### Upload Picture (Manager/Admin Only)
```http
POST /pictures/upload
```
**Access:** Manager/Admin only

---

### Subscription Plan Endpoints

#### Get All Subscription Plans
```http
GET /subscription-plans
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Subscription Plan by ID
```http
GET /subscription-plans/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Subscription Plan (Manager/Admin Only)
```http
POST /subscription-plans
```
**Access:** Manager/Admin only

#### Update Subscription Plan (Manager/Admin Only)
```http
PUT /subscription-plans/{id}
```
**Access:** Manager/Admin only

#### Delete Subscription Plan (Manager/Admin Only)
```http
DELETE /subscription-plans/{id}
```
**Access:** Manager/Admin only

---

### Audience Category Endpoints

#### Get All Audience Categories
```http
GET /audience-categories
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Audience Category by ID
```http
GET /audience-categories/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Audience Category (Manager/Admin Only)
```http
POST /audience-categories
```
**Access:** Manager/Admin only

#### Update Audience Category (Manager/Admin Only)
```http
PUT /audience-categories/{id}
```
**Access:** Manager/Admin only

#### Delete Audience Category (Manager/Admin Only)
```http
DELETE /audience-categories/{id}
```
**Access:** Manager/Admin only

---

### Category Lists Endpoints

#### Get All Category Lists
```http
GET /category-lists
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Get Category List by ID
```http
GET /category-lists/{category_list_id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Category List (Manager/Admin Only)
```http
POST /category-lists
```
**Access:** Manager/Admin only

#### Update Category List (Manager/Admin Only)
```http
PUT /category-lists/{category_list_id}
```
**Access:** Manager/Admin only

#### Delete Category List (Manager/Admin Only)
```http
DELETE /category-lists/{category_list_id}
```
**Access:** Manager/Admin only

#### Get Cached JSON Content (Public)
```http
GET /category-lists/{category_list_name}/json
```
**Access:** Simple Users (Read), Manager/Admin (Read)

---

### Content Lists Endpoints

#### Get All Content Lists
```http
GET /content-lists
```
**Access:** Simple Users (Read), Manager/Admin (Read)
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)
- `is_active` (boolean): Filter by active status
- `thumbnail_format` (enum): Filter by thumbnail format

#### Get Content List by ID  
```http
GET /content-lists/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Content List (Manager/Admin Only)
```http
POST /content-lists
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
  "media_type": "video",
  "media_categories_id_list": ["cat1", "cat2"],
  "themes_and_genres_id_list": ["theme1", "theme2"],
  "slug": "trending_k_dramas",
  "latest_first": true,
  "is_active": true,
  "display_order": 1
}
```

#### Update Content List (Manager/Admin Only)
```http
PUT /content-lists/{id}
```
**Access:** Manager/Admin only

#### Delete Content List (Manager/Admin Only)
```http
DELETE /content-lists/{id}
```
**Access:** Manager/Admin only

#### Update Content List Order (Manager/Admin Only)
```http
PUT /content-lists/{id}/reorder
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
GET /content-lists/{id}/json
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
POST /content-lists/{id}/regenerate-json
```
**Access:** Manager/Admin only

---

### Screen Description Endpoints

#### Get All Screen Descriptions
```http
GET /screen-descriptions
```
**Access:** Simple Users (Read), Manager/Admin (Read)
**Query Parameters:**
- `skip` (integer): Skip number of records (default: 0)
- `limit` (integer): Limit number of records (default: 20, max: 100)
- `is_active` (boolean): Filter by active status
- `screen_type` (string): Filter by screen type

#### Get Screen Description by ID
```http
GET /screen-descriptions/{id}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

#### Create Screen Description (Manager/Admin Only)
```http
POST /screen-descriptions
```
**Access:** Manager/Admin only
**Request Body:**
```json
{
  "title": "Homepage",
  "description": "Main homepage content layout",
  "content_lists": ["list1", "list2", "list3"],
  "screen_type": "homepage",
  "slug": "homepage",
  "is_active": true,
  "display_order": 1
}
```

#### Update Screen Description (Manager/Admin Only)
```http
PUT /screen-descriptions/{id}
```
**Access:** Manager/Admin only

#### Delete Screen Description (Manager/Admin Only)
```http
DELETE /screen-descriptions/{id}
```
**Access:** Manager/Admin only

#### Update Screen Description Lists Order (Manager/Admin Only)
```http
PUT /screen-descriptions/{id}/reorder-lists
```
**Access:** Manager/Admin only
**Request Body:**
```json
{
  "content_lists": ["list3", "list1", "list2"]
}
```

#### Get Screen Description JSON Cache
```http
GET /screen-descriptions/{id}/json
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

#### Regenerate Screen Description JSON Cache (Manager/Admin Only)
```http
POST /screen-descriptions/{id}/regenerate-json
```
**Access:** Manager/Admin only

#### Get Screen Description by Type
```http
GET /screen-descriptions/by-type/{screen_type}
```
**Access:** Simple Users (Read), Manager/Admin (Read)

---

### Media Upload Endpoints

#### Upload Video File (Manager/Admin Only)
```http
POST /upload/video
```
**Access:** Manager/Admin only

#### Upload Webcomic Files (Manager/Admin Only)
```http
POST /upload/webcomic
```
**Access:** Manager/Admin only

#### Get Storage Backends (Manager/Admin Only)
```http
GET /upload/backends
```
**Access:** Manager/Admin only

#### Delete Uploaded File (Manager/Admin Only)
```http
DELETE /upload/file
```
**Access:** Manager/Admin only

---

### Description Reports Endpoints

#### Get Description Reports (Manager/Admin Only)
```http
GET /description-reports
```
**Access:** Manager/Admin only

#### Get Description Report by ID (Manager/Admin Only)
```http
GET /description-reports/{id}
```
**Access:** Manager/Admin only

---

### Video File Reports Endpoints

#### Get Video File Reports (Manager/Admin Only)
```http
GET /video-file-reports
```
**Access:** Manager/Admin only

#### Get Video File Report by ID (Manager/Admin Only)
```http
GET /video-file-reports/{report_id}
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

### Thumbnail Format
- `small_square` - Small square format (1080x1080)
- `medium_portrait` - Medium portrait format (810x1080)
- `large_landscape` - Large landscape format (1920x1080)
- `vertical_mobile` - Vertical mobile format (1080x1920)

### Content Types
- `program` - Program/Show content
- `season` - Season content
- `media_description` - Individual media item

### Screen Types
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
- **Content Lists & Screen Descriptions:** Application-level JSON caching with regeneration endpoints
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

## New Features in v1.9

### URL Path Normalization
- **Flat URL Structure:** All endpoints now use consistent flat paths (e.g., `/media-descriptions` instead of `/media/descriptions`)
- **Simplified Routing:** Removed nested path structures for better consistency with backend implementation

### Enhanced Media Description Model
- **Tag System:** Renamed `human_keywords_text_list` to `tag_text_list` for better clarity
- **Slug Field:** Renamed `friendly_url` to `slug` with automatic generation from title
- **Auto-Slug Generation:** Automatic slug creation from title (lowercase, underscores, unique)

### Enhanced Video File Model
- **Environment Key:** New `environment_key` field for environment identification
- **Protection Key:** New `protection_key` field for content protection
- **Slug Support:** New `slug` field with automatic generation from filename

### Enhanced Content List Model
- **Media Type Filter:** New optional `media_type` enum field for content filtering
- **Category Filtering:** New `media_categories_id_list` field for category-based filtering
- **Theme Filtering:** New `themes_and_genres_id_list` field for theme-based filtering
- **Sort Control:** New mandatory `latest_first` boolean field (default: true)
- **Slug Support:** New unique `slug` field with auto-generation from filters
- **Smart Slug Generation:** Automatic slug creation from category/theme/media type names

### Screen Content Renamed to Screen Description
- **Model Rename:** `screen_content` renamed to `screen_description` for consistency
- **Table Rename:** `screen_contents` table renamed to `screen_descriptions`
- **Slug Support:** New unique `slug` field with auto-generation from title
- **URL Updates:** All endpoints updated to use `/screen-descriptions`

### Automatic Slug Generation
- **Consistent Algorithm:** All slug fields use the same generation logic
- **Safe Characters:** Lowercase letters, numbers, and underscores only
- **Uniqueness Guarantee:** Automatic number suffix addition for duplicates
- **Multiple Sources:** Slugs generated from titles, filenames, or filter combinations

---

## Migration Notes

### From v1.8 to v1.9

#### Breaking Changes
- **URL Paths:** All endpoint URLs changed to flat structure
- **Model Names:** `screen_content` renamed to `screen_description`
- **Field Names:** `human_keywords_text_list` → `tag_text_list`, `friendly_url` → `slug`

#### New Required Dependencies
- Database migrations for new fields (`slug`, `environment_key`, `protection_key`, etc.)
- Slug generation utilities for automatic slug creation
- Update frontend applications to use new flat URL paths

#### New Fields
- **Media Description:** `slug` (replaces `friendly_url`), `tag_text_list` (replaces `human_keywords_text_list`)
- **Video File:** `environment_key`, `protection_key`, `slug`
- **Content List:** `media_type`, `media_categories_id_list`, `themes_and_genres_id_list`, `latest_first`, `slug`
- **Screen Description:** `slug` (new model name)

#### Updated Endpoints
- All endpoints now use flat path structure without nesting
- Screen content endpoints renamed to screen description endpoints

---

## Change Log

### Version 1.9 (Current)
- **Breaking:** Normalized all URL paths to flat structure (no nesting)
- **Breaking:** Renamed `screen_content` to `screen_description`
- **Breaking:** Renamed `human_keywords_text_list` to `tag_text_list`
- **Breaking:** Renamed `friendly_url` to `slug`
- **Added:** Automatic slug generation for Media Description, Video File, Content List, and Screen Description
- **Added:** Video File fields: `environment_key`, `protection_key`, `slug`
- **Added:** Content List fields: `media_type`, `media_categories_id_list`, `themes_and_genres_id_list`, `latest_first`, `slug`
- **Added:** Screen Description field: `slug`
- **Enhanced:** Content List with automatic filtering and smart slug generation
- **Enhanced:** All models with consistent slug generation algorithm

### Version 1.8 (Previous)
- **Removed:** Revert to 1.6 status - pagination change will not be used yet

### Version 1.7 (Previous)
- **Added:** Started to include different pagination for filtering in backoffice

### Version 1.6 (Previous)
- **Added:** Content Lists model for flexible content organization
- **Added:** Screen Contents model for complete screen layout management
- **Added:** Thumbnail Format enum for standardized image dimensions
- **Enhanced:** Role-based access control with stricter permissions
- **Enhanced:** JSON caching system for performance optimization
- **Updated:** All existing endpoints with consistent access control
- **Added:** Comprehensive CRUD endpoints for new models
- **Added:** Content reordering and cache regeneration capabilities

---

*API Specification v1.9*  
*For KYOOL Media Platform Backend Development*  
*Updated: 2025-08-20*