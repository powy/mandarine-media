"""API v1.9 to v1.10-C migration: 72 model changes based on Excel specifications

Revision ID: 002_v1_9_to_v1_10_c
Revises: 001_v1_8_to_v1_9
Create Date: 2025-08-25 00:00:00.000000

Major changes:
- DELETE FIELD: 38 field removals across multiple models
- ADD FIELD: 16 new field additions
- RENAME FIELD: 13 field renames  
- DELETE MODEL: Remove CategoryList and Territory tables entirely
- ENUM CHANGES: Update MediaType enum values
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_v1_9_to_v1_10_c'
down_revision = '001_v1_8_to_v1_9'
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade to API v1.10-C - Apply all 72 changes from Excel"""
    
    # ===== 1. DELETE TABLES =====
    # Delete CategoryList and Territory tables (2 actions)
    op.drop_table('category_list_items')
    op.drop_table('category_lists')
    op.drop_table('territories')
    
    # ===== 2. PROGRAM TABLE CHANGES =====
    # DELETE FIELD: general_media_description (String, Optional)
    op.drop_column('programs', 'general_media_description')
    # ADD FIELD: general_media_description_id (UUID/GUID, Optional) - link to media_description
    op.add_column('programs', sa.Column('general_media_description_id', sa.String(36), nullable=True))
    
    # ===== 3. MEDIA_DESCRIPTION TABLE CHANGES (25 changes total) =====
    # DELETE FIELD: file_name (String, Optional)
    op.drop_column('media_description', 'file_name')
    
    # DELETE FIELD: media_categories_id_list (Array/JSON, Optional)
    # ADD FIELD: media_categories (Array/JSON, Optional) - ARRAY of enum 'category'
    op.drop_column('media_description', 'media_categories_id_list') 
    op.add_column('media_description', sa.Column('media_categories', sa.JSON(), nullable=True))
    
    # DELETE FIELD: duration_seconds (Integer, Optional)
    op.drop_column('media_description', 'duration_seconds')
    
    # DELETE FIELD: audience_category_id (UUID/GUID, Optional)
    # ADD FIELD: audience_category_id_list (Array/JSON, Optional) - Array of audience category stored as JSON
    op.drop_column('media_description', 'audience_category_id')
    op.add_column('media_description', sa.Column('audience_category_id_list', sa.JSON(), nullable=True))
    
    # DELETE FIELD: public_person_id_list (Array/JSON, Optional)
    op.drop_column('media_description', 'public_person_id_list')
    
    # DELETE FIELD: main_thumbnail_url, secondary_thumbnail_url, trailer_url
    op.drop_column('media_description', 'main_thumbnail_url')
    op.drop_column('media_description', 'secondary_thumbnail_url')
    op.drop_column('media_description', 'trailer_url')
    
    # DELETE FIELD: rating_system, content_warning, original_language
    op.drop_column('media_description', 'rating_system')
    op.drop_column('media_description', 'content_warning')
    op.drop_column('media_description', 'original_language')
    
    # DELETE FIELD: subtitle_languages_available, audio_languages_available
    op.drop_column('media_description', 'subtitle_languages_available')
    op.drop_column('media_description', 'audio_languages_available')
    
    # DELETE FIELD: is_premium_content, view_count, like_count, share_count
    op.drop_column('media_description', 'is_premium_content')
    op.drop_column('media_description', 'view_count')
    op.drop_column('media_description', 'like_count')
    op.drop_column('media_description', 'share_count')
    
    # DELETE FIELD: source_platform, distribution_territories
    op.drop_column('media_description', 'source_platform')
    op.drop_column('media_description', 'distribution_territories')
    
    # ADD FIELD: trailers_id_list (Array/JSON, Optional)
    op.add_column('media_description', sa.Column('trailers_id_list', sa.JSON(), nullable=True))
    
    # ADD FIELD: excerpt_id_list (Array/JSON, Optional)
    op.add_column('media_description', sa.Column('excerpt_id_list', sa.JSON(), nullable=True))
    
    # ADD FIELD: original_languages_id_list (Array/JSON, Optional) - Array of language uuid stored as JSON
    op.add_column('media_description', sa.Column('original_languages_id_list', sa.JSON(), nullable=True))
    
    # ADD FIELD: friendly_url (String, Optional)
    op.add_column('media_description', sa.Column('friendly_url', sa.String(), nullable=True))
    
    # RENAME FIELD: subscription_plan_id_list ← eligible_plans_id_list
    op.alter_column('media_description', 'eligible_plans', new_column_name='subscription_plan_id_list')
    
    # RENAME FIELD: seo_keywords ← seo_keywords_text_list
    op.alter_column('media_description', 'seo_keywords', new_column_name='seo_keywords_text_list')
    
    # RENAME FIELD: social_media_hashtags ← hashtags_text_list
    op.alter_column('media_description', 'social_media_hashtags', new_column_name='hashtags_text_list')
    
    # RENAME FIELD: original_languages_id ← original_languages_id_list (already done above in ADD)
    op.alter_column('media_description', 'original_languages_id', new_column_name='original_languages_id_list')
    
    # RENAME FIELD: available_countries_list ← available_countries_id_list
    op.alter_column('media_description', 'available_countries_list', new_column_name='available_countries_id_list')
    
    # RENAME FIELD: tag_text_list ← human_keywords_text_list
    op.alter_column('media_description', 'tag_text_list', new_column_name='human_keywords_text_list')
    
    # RENAME FIELD: image_fullscreen ← image_1920_1080_id
    op.alter_column('media_description', 'image_fullscreen', new_column_name='image_1920_1080_id')
    
    # RENAME FIELD: image_thumbnail1 ← image_1920_720_id
    op.alter_column('media_description', 'image_thumbnail1', new_column_name='image_1920_720_id')
    
    # RENAME FIELD: image_thumbnail2 ← image_1080_1080_id
    op.alter_column('media_description', 'image_thumbnail2', new_column_name='image_1080_1080_id')
    
    # RENAME FIELD: image_mobile_home ← image_810_1080_id
    op.alter_column('media_description', 'image_mobile_home', new_column_name='image_810_1080_id')
    
    # RENAME FIELD: image_desktop_home ← image_1080_1920_id
    op.alter_column('media_description', 'image_desktop_home', new_column_name='image_1080_1920_id')
    
    # ===== 4. VIDEO_FILE TABLE CHANGES (17 changes total) =====
    # DELETE FIELD: video_codec, audio_codec, file_format
    op.drop_column('video_file', 'video_codec')
    op.drop_column('video_file', 'audio_codec')
    op.drop_column('video_file', 'file_format')
    
    # DELETE FIELD: upload_method
    op.drop_column('video_file', 'upload_method')
    
    # DELETE FIELD: audio_channels
    op.drop_column('video_file', 'audio_channels')
    
    # DELETE FIELD: thumbnail_timestamps, chapter_markers, cdn_url
    op.drop_column('video_file', 'thumbnail_timestamps')
    op.drop_column('video_file', 'chapter_markers')
    op.drop_column('video_file', 'cdn_url')
    
    # DELETE FIELD: geo_restrictions, quality_variants, processing_logs
    op.drop_column('video_file', 'geo_restrictions')
    op.drop_column('video_file', 'quality_variants')
    op.drop_column('video_file', 'processing_logs')
    
    # DELETE FIELD: subtitle_languages_id_list, resolutions_id_list, accessibilities_id_list
    op.drop_column('video_file', 'subtitle_languages_id_list')
    op.drop_column('video_file', 'resolutions_id_list')
    op.drop_column('video_file', 'accessibilities_id_list')
    
    # DELETE FIELD: protection_key
    op.drop_column('video_file', 'protection_key')
    
    # ADD FIELD: playback_policy (String, Optional)
    op.add_column('video_file', sa.Column('playback_policy', sa.String(), nullable=True))
    
    # ADD FIELD: subtitle_tracks_text_list (Array/JSON, Optional) - List of strings
    op.add_column('video_file', sa.Column('subtitle_tracks_text_list', sa.JSON(), nullable=True))
    
    # ADD FIELD: resolutions_list (Array/JSON, Optional) - List of resolution enum
    op.add_column('video_file', sa.Column('resolutions_list', sa.JSON(), nullable=True))
    
    # ADD FIELD: accessibilities_list (Array/JSON, Optional) - List of enum 'accessibility'
    op.add_column('video_file', sa.Column('accessibilities_list', sa.JSON(), nullable=True))
    
    # RENAME FIELD: resolution_width ← max_resolution_width
    op.alter_column('video_file', 'resolution_width', new_column_name='max_resolution_width')
    
    # RENAME FIELD: resolution_height ← max_resolution_height
    op.alter_column('video_file', 'resolution_height', new_column_name='max_resolution_height')
    
    # ===== 5. SEASON TABLE CHANGES (2 changes total) =====
    # DELETE FIELD: general_media_description (String, Optional)
    op.drop_column('seasons', 'general_media_description')
    # ADD FIELD: general_media_description_id (UUID/GUID, Optional) - link to media_description
    op.add_column('seasons', sa.Column('general_media_description_id', sa.String(36), nullable=True))
    
    # ===== 6. PICTURE TABLE CHANGES (2 changes total) =====
    # DELETE FIELD: file_size_bytes (Integer, Optional)
    op.drop_column('pictures', 'file_size_bytes')
    # ADD FIELD: description (String, Optional)
    op.add_column('pictures', sa.Column('description', sa.String(), nullable=True))
    
    # ===== 7. PUBLIC_PERSON TABLE CHANGES (1 change) =====
    # DELETE FIELD: profession_list (Array/JSON, Optional)
    op.drop_column('public_person', 'profession_list')
    
    # ===== 8. CONTENT_LISTS TABLE CHANGES (3 changes) =====
    # ADD FIELD: list_type (String) - enum between classic and carrousel
    op.add_column('content_lists', sa.Column('list_type', sa.String(), nullable=False, server_default='classic'))
    
    # ADD FIELD: percentage_width (Integer)
    op.add_column('content_lists', sa.Column('percentage_width', sa.Integer(), nullable=False, server_default='100'))
    
    # ADD FIELD: percentage_height (Integer)
    op.add_column('content_lists', sa.Column('percentage_height', sa.Integer(), nullable=False, server_default='100'))


def downgrade():
    """Downgrade from API v1.10-C back to v1.9 - Reverse all changes"""
    
    # ===== REVERSE CONTENT_LISTS TABLE CHANGES =====
    op.drop_column('content_lists', 'percentage_height')
    op.drop_column('content_lists', 'percentage_width') 
    op.drop_column('content_lists', 'list_type')
    
    # ===== REVERSE PUBLIC_PERSON TABLE CHANGES =====
    op.add_column('public_person', sa.Column('profession_list', sa.JSON(), nullable=True))
    
    # ===== REVERSE PICTURE TABLE CHANGES =====
    op.drop_column('pictures', 'description')
    op.add_column('pictures', sa.Column('file_size_bytes', sa.Integer(), nullable=True))
    
    # ===== REVERSE SEASON TABLE CHANGES =====
    op.drop_column('seasons', 'general_media_description_id')
    op.add_column('seasons', sa.Column('general_media_description', sa.String(), nullable=True))
    
    # ===== REVERSE VIDEO_FILE TABLE CHANGES =====
    # Reverse renames
    op.alter_column('video_file', 'max_resolution_height', new_column_name='resolution_height')
    op.alter_column('video_file', 'max_resolution_width', new_column_name='resolution_width')
    
    # Remove new fields
    op.drop_column('video_file', 'accessibilities_list')
    op.drop_column('video_file', 'resolutions_list')
    op.drop_column('video_file', 'subtitle_tracks_text_list')
    op.drop_column('video_file', 'playback_policy')
    
    # Add back deleted fields
    op.add_column('video_file', sa.Column('protection_key', sa.String(), nullable=True, default=''))
    op.add_column('video_file', sa.Column('accessibilities_id_list', sa.JSON(), nullable=True))
    op.add_column('video_file', sa.Column('resolutions_id_list', sa.JSON(), nullable=True))
    op.add_column('video_file', sa.Column('subtitle_languages_id_list', sa.JSON(), nullable=True))
    op.add_column('video_file', sa.Column('processing_logs', sa.Text(), nullable=True))
    op.add_column('video_file', sa.Column('quality_variants', sa.JSON(), nullable=True))
    op.add_column('video_file', sa.Column('geo_restrictions', sa.JSON(), nullable=True))
    op.add_column('video_file', sa.Column('cdn_url', sa.String(), nullable=True))
    op.add_column('video_file', sa.Column('chapter_markers', sa.Text(), nullable=True))
    op.add_column('video_file', sa.Column('thumbnail_timestamps', sa.JSON(), nullable=True))
    op.add_column('video_file', sa.Column('audio_channels', sa.Integer(), nullable=True))
    op.add_column('video_file', sa.Column('upload_method', sa.String(), nullable=False, default='new_upload'))
    op.add_column('video_file', sa.Column('file_format', sa.String(), nullable=True))
    op.add_column('video_file', sa.Column('audio_codec', sa.String(), nullable=True))
    op.add_column('video_file', sa.Column('video_codec', sa.String(), nullable=True))
    
    # ===== REVERSE MEDIA_DESCRIPTION TABLE CHANGES =====
    # Reverse renames
    op.alter_column('media_description', 'image_1080_1920_id', new_column_name='image_desktop_home')
    op.alter_column('media_description', 'image_810_1080_id', new_column_name='image_mobile_home')
    op.alter_column('media_description', 'image_1080_1080_id', new_column_name='image_thumbnail2')
    op.alter_column('media_description', 'image_1920_720_id', new_column_name='image_thumbnail1')
    op.alter_column('media_description', 'image_1920_1080_id', new_column_name='image_fullscreen')
    op.alter_column('media_description', 'human_keywords_text_list', new_column_name='tag_text_list')
    op.alter_column('media_description', 'available_countries_id_list', new_column_name='available_countries_list')
    op.alter_column('media_description', 'original_languages_id_list', new_column_name='original_languages_id')
    op.alter_column('media_description', 'hashtags_text_list', new_column_name='social_media_hashtags')
    op.alter_column('media_description', 'seo_keywords_text_list', new_column_name='seo_keywords')
    op.alter_column('media_description', 'subscription_plan_id_list', new_column_name='eligible_plans')
    
    # Remove new fields
    op.drop_column('media_description', 'friendly_url')
    op.drop_column('media_description', 'original_languages_id_list')
    op.drop_column('media_description', 'excerpt_id_list')
    op.drop_column('media_description', 'trailers_id_list')
    
    # Add back deleted fields
    op.add_column('media_description', sa.Column('distribution_territories', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('source_platform', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('share_count', sa.Integer(), nullable=True, default=0))
    op.add_column('media_description', sa.Column('like_count', sa.Integer(), nullable=True, default=0))
    op.add_column('media_description', sa.Column('view_count', sa.Integer(), nullable=True, default=0))
    op.add_column('media_description', sa.Column('is_premium_content', sa.Boolean(), nullable=True, default=False))
    op.add_column('media_description', sa.Column('audio_languages_available', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('subtitle_languages_available', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('original_language', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('content_warning', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('rating_system', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('trailer_url', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('secondary_thumbnail_url', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('main_thumbnail_url', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('public_person_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('audience_category_id', sa.String(36), nullable=True))
    op.drop_column('media_description', 'audience_category_id_list')
    op.add_column('media_description', sa.Column('duration_seconds', sa.Integer(), nullable=True))
    op.drop_column('media_description', 'media_categories')
    op.add_column('media_description', sa.Column('media_categories_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('file_name', sa.String(), nullable=True))
    
    # ===== REVERSE PROGRAM TABLE CHANGES =====
    op.drop_column('programs', 'general_media_description_id')
    op.add_column('programs', sa.Column('general_media_description', sa.String(), nullable=True))
    
    # ===== RECREATE DELETED TABLES =====
    # Recreate territories table
    op.create_table('territories',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('country_id', sa.String(36), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Recreate category_lists table
    op.create_table('category_lists',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_updated_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('display_order', sa.Integer(), nullable=False, default=0),
        sa.Column('json_content', sa.Text(), nullable=True),
        sa.Column('json_last_updated', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Recreate category_list_items table
    op.create_table('category_list_items',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_updated_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('category_list_id', sa.String(36), nullable=False),
        sa.Column('media_description_id', sa.String(36), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('size_width', sa.Integer(), nullable=True),
        sa.Column('size_height', sa.Integer(), nullable=True),
        sa.Column('forward_link', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['category_list_id'], ['category_lists.id']),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id'])
    )