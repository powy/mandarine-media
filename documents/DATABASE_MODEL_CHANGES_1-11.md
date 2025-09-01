# Database Model Changes - September 2025

## Overview
This document details all changes made to the database models as part of the schema update. These changes include the creation of new entities, modifications to existing entities, and updates to relationships between tables.

## 1. New Entity: MediaTheme

### Location
- **File**: `app/models/media_theme.py` (NEW FILE)
- **Table Name**: `media_themes`

### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID/GUID | Primary Key, Auto-generated | Unique identifier for the media theme |
| `creation_date_utc` | DateTime (timezone-aware) | NOT NULL, Server Default: Current Timestamp | Timestamp when the theme was created |
| `name` | Text | NOT NULL | Name of the media theme |

### Purpose
This new entity allows for better categorization and organization of media content by themes, separate from the existing Theme entity. It provides a more granular way to tag and filter media content.

### Relationships
- Many-to-many relationship with `MediaDescription` through `media_description_media_themes` association table
- Many-to-many relationship with `ContentList` through `content_list_media_themes` association table

---

## 2. Modified Entity: MediaDescription

### Location
- **File**: `app/models/media_description.py`
- **Table Name**: `media_description`

### Changes

#### Renamed Fields
| Old Field Name | New Field Name | Type | Description |
|----------------|----------------|------|-------------|
| `media_categories` | `media_categories_list` | JSONArray | Renamed for consistency and clarity |

#### Added Fields
| Field Name | Type | Nullable | Description |
|------------|------|----------|-------------|
| `media_themes_id_list` | JSONArray | Yes | List of MediaTheme IDs associated with this media |
| `trailer_id_list` | JSONArray | Yes | List of VideoFile IDs for trailers |
| `extract_id_list` | JSONArray | Yes | List of VideoFile IDs for extracts/clips |

### Impact
- Provides more flexible categorization with the new MediaTheme references
- Allows direct association of multiple trailers and extracts without going through association tables
- The rename of `media_categories` to `media_categories_list` improves naming consistency

---

## 3. Modified Entity: Season

### Location
- **File**: `app/models/season.py`
- **Table Name**: `seasons`

### Changes

#### Modified Fields
| Field Name | Old Constraint | New Constraint | Description |
|------------|----------------|----------------|-------------|
| `program_id` | NOT NULL | NULLABLE | Made optional to allow seasons without program association |

### Impact
- Seasons can now exist independently without being tied to a specific program
- Provides more flexibility in content organization
- Maintains backward compatibility as existing seasons with program_id remain valid

---

## 4. Modified Entity: ContentList

### Location
- **File**: `app/models/content_list.py`
- **Table Name**: `content_lists`

### Changes

#### Removed Fields
| Field Name | Type | Description |
|------------|------|-------------|
| `media_categories_id_list` | JSONArray | Replaced with enum-based field |
| `themes_and_genres_id_list` | JSONArray | Replaced with media_themes_id_list |

#### Added Fields
| Field Name | Type | Nullable | Description |
|------------|------|----------|-------------|
| `media_categories_list` | JSONArray | Yes | Array of MediaCategoryEnum values (not IDs) |
| `media_themes_id_list` | JSONArray | Yes | List of MediaTheme IDs for filtering |

### Impact
- Content lists now use enum values directly for categories instead of ID references
- Cleaner separation between categories (enums) and themes (entity references)
- Improved type safety with enum-based categories

---

## 5. Modified Entity: VideoFile

### Location
- **File**: `app/models/video_file.py`
- **Table Name**: `video_file`

### Changes

#### Removed Fields
| Field Name | Type | Description |
|------------|------|-------------|
| `upload_method` | String | No longer needed for upload tracking |

### Impact
- Simplifies the video file model by removing redundant upload tracking
- Upload status is still tracked via the `upload_status` field
- Reduces complexity in upload handling logic

---

## 6. Modified Entity: User

### Location
- **File**: `app/models/user.py`
- **Table Name**: `users`

### Changes

#### Added Fields
| Field Name | Type | Nullable | Foreign Key | Description |
|------------|------|----------|-------------|-------------|
| `subscription_plans_id` | UUID/GUID | Yes | `subscription_plan.id` | Links user to their subscription plan |

### Impact
- Users can now be directly associated with a subscription plan
- Enables subscription-based access control and features
- Optional field maintains backward compatibility

---

## 7. New Association Tables

### Location
- **File**: `app/models/associations.py`

### New Tables

#### media_description_media_themes
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `media_description_id` | UUID/GUID | Primary Key, Foreign Key | References media_description.id |
| `media_theme_id` | UUID/GUID | Primary Key, Foreign Key | References media_themes.id |

**Purpose**: Links media descriptions with multiple media themes (many-to-many)

#### content_list_media_themes
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `content_list_id` | UUID/GUID | Primary Key, Foreign Key | References content_lists.id |
| `media_theme_id` | UUID/GUID | Primary Key, Foreign Key | References media_themes.id |

**Purpose**: Links content lists with multiple media themes for filtering (many-to-many)

---

## 8. Migration Details

### Migration File
- **Location**: `alembic/versions/a76d54ab6d6a_add_mediatheme_entity_and_update_model_.py`
- **Revision ID**: `a76d54ab6d6a`
- **Previous Revision**: `44489c7915e3`

### Migration Operations

#### Upgrade Operations
1. Create `media_themes` table
2. Create `content_list_media_themes` association table
3. Create `media_description_media_themes` association table
4. Add new columns to `content_lists`:
   - `media_categories_list`
   - `media_themes_id_list`
5. Remove old columns from `content_lists`:
   - `media_categories_id_list`
   - `themes_and_genres_id_list`
6. Add new columns to `media_description`:
   - `media_categories_list`
   - `media_themes_id_list`
   - `trailer_id_list`
   - `extract_id_list`
7. Remove old column from `media_description`:
   - `media_categories`
8. Alter `seasons.program_id` to be nullable
9. Add `subscription_plans_id` to `users` with foreign key constraint
10. Remove `upload_method` from `video_file`

#### Special Considerations
- Uses SQLite batch operations for ALTER TABLE operations due to SQLite limitations
- Foreign key constraints are created within batch operations for compatibility
- All operations are reversible through the downgrade function

---

## 9. Import Updates

### Location
- **File**: `app/models/__init__.py`

### Changes
Added import for the new MediaTheme model:
```python
from .media_theme import MediaTheme
```

---

## 10. Testing & Validation

### Validation Steps Performed
1. ✅ Created and applied Alembic migration successfully
2. ✅ Verified new MediaTheme entity can be created, queried, and deleted
3. ✅ Confirmed all model imports work correctly
4. ✅ Database schema matches model definitions

### Backward Compatibility
- All changes maintain backward compatibility where possible
- Nullable fields ensure existing data remains valid
- Renamed fields may require updates to queries and API endpoints

---

## 11. Required Backend Updates

### Areas Requiring Code Updates
1. **API Endpoints**
   - Update endpoints that reference `media_categories` to use `media_categories_list`
   - Add new endpoints for MediaTheme CRUD operations
   - Update ContentList endpoints to handle new field structure

2. **CRUD Operations**
   - Create new CRUD module for MediaTheme entity
   - Update existing CRUD modules for modified entities
   - Handle the new optional `program_id` in Season operations

3. **Schemas/Pydantic Models**
   - Update request/response schemas to match new field names
   - Add schemas for MediaTheme entity
   - Update validation rules for optional fields

4. **Business Logic**
   - Update any logic that depends on `upload_method` field
   - Implement subscription plan checks for users
   - Update content filtering logic to use new theme structure

---

## 12. Summary of Breaking Changes

### Fields That Require Code Updates
1. `MediaDescription.media_categories` → `MediaDescription.media_categories_list`
2. `ContentList.media_categories_id_list` → `ContentList.media_categories_list` (type change)
3. `ContentList.themes_and_genres_id_list` → `ContentList.media_themes_id_list`
4. `VideoFile.upload_method` (removed)

### New Required Implementations
1. MediaTheme CRUD operations
2. MediaTheme API endpoints
3. User subscription plan handling

---

## Notes for Developers

1. **Database Migration**: The migration has been successfully applied. The database is at revision `a76d54ab6d6a`.

2. **Testing**: Before deploying to production, ensure all API endpoints and business logic are updated to handle the new schema.

3. **Data Migration**: If there's existing data in the old fields, a separate data migration script may be needed to transfer:
   - `media_categories` data to `media_categories_list`
   - Category IDs to enum values in ContentList

4. **Performance**: The new JSONArray fields for storing lists of IDs may impact query performance. Consider adding indexes if needed.

5. **Validation**: Implement proper validation for the new JSONArray fields to ensure data integrity.

---

*Document generated: September 1, 2025*
*Last migration applied: a76d54ab6d6a*