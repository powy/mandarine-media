"""Initial database schema - API v1.8 baseline

Revision ID: fac6d36c6107
Revises: 
Create Date: 2024-01-01 00:00:00.000000

This is the initial migration that creates all base tables for API v1.8.
All subsequent migrations build on this foundation.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'fac6d36c6107'
down_revision = None  # This is the first migration
branch_labels = None
depends_on = None


def upgrade():
    """Create all initial tables for API v1.8"""
    
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('is_superuser', sa.Boolean(), default=False, nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )
    
    # Create programs table
    op.create_table('programs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('program_name', sa.String(), nullable=False),
        sa.Column('general_media_description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('program_name')
    )
    
    # Create seasons table
    op.create_table('seasons',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('program_id', sa.String(36), nullable=False),
        sa.Column('season_number', sa.Integer(), nullable=False),
        sa.Column('season_name', sa.String(), nullable=True),
        sa.Column('general_media_description', sa.String(), nullable=True),
        sa.Column('episodes_id_list', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['program_id'], ['programs.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('program_id', 'season_number', name='unique_program_season')
    )
    
    # Create pictures table
    op.create_table('pictures',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('photo_url', sa.String(), nullable=False),
        sa.Column('file_name', sa.String(), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('alt_text', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create languages table
    op.create_table('languages',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('language_code', sa.String(10), nullable=False),
        sa.Column('language_name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('language_code')
    )
    
    # Create countries table
    op.create_table('countries',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('country_code', sa.String(10), nullable=False),
        sa.Column('country_name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('country_code')
    )
    
    # Create territories table
    op.create_table('territories',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('country_id', sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(['country_id'], ['countries.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create public_person table
    op.create_table('public_person',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('stage_name_roman', sa.String(), nullable=False),
        sa.Column('first_name_hangul', sa.String(), nullable=True),
        sa.Column('last_name_hangul', sa.String(), nullable=True),
        sa.Column('first_name_roman', sa.String(), nullable=True),
        sa.Column('last_name_roman', sa.String(), nullable=True),
        sa.Column('stage_name_hangul', sa.String(), nullable=True),
        sa.Column('profession_list', sa.JSON(), nullable=True),
        sa.Column('face_image_id', sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(['face_image_id'], ['pictures.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create subscription_plans table
    op.create_table('subscription_plans',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('plan_name', sa.String(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, default='USD'),
        sa.Column('duration_days', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('plan_name')
    )
    
    # Create audience_categories table
    op.create_table('audience_categories',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('category_code', sa.String(10), nullable=False),
        sa.Column('category_name', sa.String(), nullable=False),
        sa.Column('min_age', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category_code')
    )
    
    # Create media_description table (v1.8 structure)
    op.create_table('media_description',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('file_number', sa.Integer(), nullable=False),
        sa.Column('episode_title', sa.String(), nullable=False),
        sa.Column('media_type', sa.String(), nullable=False),
        sa.Column('file_name', sa.String(), nullable=True),
        sa.Column('expected_filename', sa.String(), nullable=True),
        sa.Column('program_id', sa.String(36), nullable=True),
        sa.Column('season_id', sa.String(36), nullable=True),
        sa.Column('episode_number', sa.Integer(), nullable=True),
        sa.Column('media_categories_id_list', sa.JSON(), nullable=True),
        sa.Column('themes_and_genres_id_list', sa.JSON(), nullable=True),
        sa.Column('descriptive_summary_text', sa.Text(), nullable=True),
        sa.Column('synopsis_text', sa.Text(), nullable=True),
        sa.Column('contract_start_date_utc', sa.DateTime(timezone=True), nullable=True),
        sa.Column('contract_end_date_utc', sa.DateTime(timezone=True), nullable=True),
        sa.Column('production_year', sa.Integer(), nullable=True),
        sa.Column('original_broadcast_date_utc', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('audience_category_id', sa.String(36), nullable=True),
        sa.Column('subscription_plan_id_list', sa.JSON(), nullable=True),
        sa.Column('public_person_id_list', sa.JSON(), nullable=True),
        sa.Column('main_thumbnail_url', sa.String(), nullable=True),
        sa.Column('secondary_thumbnail_url', sa.String(), nullable=True),
        sa.Column('trailer_url', sa.String(), nullable=True),
        sa.Column('rating_system', sa.String(), nullable=True),
        sa.Column('content_warning', sa.String(), nullable=True),
        sa.Column('original_language', sa.String(), nullable=True),
        sa.Column('subtitle_languages_available', sa.JSON(), nullable=True),
        sa.Column('audio_languages_available', sa.JSON(), nullable=True),
        sa.Column('is_premium_content', sa.Boolean(), default=False, nullable=True),
        sa.Column('is_featured', sa.Boolean(), default=False, nullable=True),
        sa.Column('view_count', sa.Integer(), default=0, nullable=True),
        sa.Column('like_count', sa.Integer(), default=0, nullable=True),
        sa.Column('share_count', sa.Integer(), default=0, nullable=True),
        sa.Column('last_updated_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('content_status', sa.String(), default='draft', nullable=True),
        sa.Column('seo_title', sa.String(), nullable=True),
        sa.Column('seo_description', sa.Text(), nullable=True),
        sa.Column('seo_keywords', sa.JSON(), nullable=True),
        sa.Column('social_media_hashtags', sa.JSON(), nullable=True),
        sa.Column('external_id', sa.String(), nullable=True),
        sa.Column('source_platform', sa.String(), nullable=True),
        sa.Column('rights_holder', sa.String(), nullable=True),
        sa.Column('distribution_territories', sa.JSON(), nullable=True),
        sa.Column('actors_id_list', sa.JSON(), nullable=True),
        sa.Column('directors_id_list', sa.JSON(), nullable=True),
        sa.Column('productor_id_list', sa.JSON(), nullable=True),
        sa.Column('authors_id_list', sa.JSON(), nullable=True),
        sa.Column('origin_country_id_list', sa.JSON(), nullable=True),
        sa.Column('original_languages_id', sa.JSON(), nullable=True),
        sa.Column('available_countries_list', sa.JSON(), nullable=True),
        sa.Column('copyright_owner_id', sa.String(), nullable=True),
        sa.Column('eligible_plans', sa.JSON(), nullable=True),
        sa.Column('audience_categories_id_list', sa.JSON(), nullable=True),
        sa.Column('friendly_url', sa.String(), nullable=True, unique=True),
        sa.Column('human_keywords_text_list', sa.JSON(), nullable=True),
        sa.Column('image_fullscreen', sa.String(36), nullable=True),
        sa.Column('image_thumbnail1', sa.String(36), nullable=True),
        sa.Column('image_thumbnail2', sa.String(36), nullable=True),
        sa.Column('image_mobile_home', sa.String(36), nullable=True),
        sa.Column('image_desktop_home', sa.String(36), nullable=True),
        sa.Column('additional_images_id_list', sa.JSON(), nullable=True),
        sa.Column('translation_share', sa.Float(), nullable=True),
        sa.Column('sacem_share', sa.Float(), nullable=True),
        sa.Column('other_share', sa.Float(), nullable=True),
        sa.Column('revenue_share', sa.Float(), nullable=True),
        sa.Column('paid_token_cost', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['program_id'], ['programs.id']),
        sa.ForeignKeyConstraint(['season_id'], ['seasons.id']),
        sa.ForeignKeyConstraint(['image_fullscreen'], ['pictures.id']),
        sa.ForeignKeyConstraint(['image_thumbnail1'], ['pictures.id']),
        sa.ForeignKeyConstraint(['image_thumbnail2'], ['pictures.id']),
        sa.ForeignKeyConstraint(['image_mobile_home'], ['pictures.id']),
        sa.ForeignKeyConstraint(['image_desktop_home'], ['pictures.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('file_number')
    )
    
    # Create video_file table
    op.create_table('video_file',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('file_url', sa.String(), nullable=True),
        sa.Column('file_name', sa.String(), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('encoding_status', sa.String(), nullable=False, default='pending'),
        sa.Column('video_codec', sa.String(), nullable=True),
        sa.Column('audio_codec', sa.String(), nullable=True),
        sa.Column('file_format', sa.String(), nullable=True),
        sa.Column('upload_method', sa.String(), nullable=False, default='new_upload'),
        sa.Column('upload_status', sa.String(), nullable=False, default='metadata_only'),
        sa.Column('upload_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('external_url', sa.String(), nullable=True),
        sa.Column('media_description_id', sa.String(36), nullable=True),
        sa.Column('encodage_date_utc', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('resolution_width', sa.Integer(), nullable=True),
        sa.Column('resolution_height', sa.Integer(), nullable=True),
        sa.Column('bitrate_kbps', sa.Integer(), nullable=True),
        sa.Column('frame_rate', sa.Float(), nullable=True),
        sa.Column('aspect_ratio', sa.String(), nullable=True),
        sa.Column('audio_sample_rate', sa.Integer(), nullable=True),
        sa.Column('audio_channels', sa.Integer(), nullable=True),
        sa.Column('subtitle_tracks', sa.JSON(), nullable=True),
        sa.Column('thumbnail_timestamps', sa.JSON(), nullable=True),
        sa.Column('chapter_markers', sa.Text(), nullable=True),
        sa.Column('encoding_profile', sa.String(), nullable=True),
        sa.Column('cdn_url', sa.String(), nullable=True),
        sa.Column('mux_asset_id', sa.String(), nullable=True),
        sa.Column('mux_playback_id', sa.String(), nullable=True),
        sa.Column('drm_protection', sa.Boolean(), default=False, nullable=True),
        sa.Column('geo_restrictions', sa.JSON(), nullable=True),
        sa.Column('quality_variants', sa.JSON(), nullable=True),
        sa.Column('processing_logs', sa.Text(), nullable=True),
        sa.Column('subtitle_languages_id_list', sa.JSON(), nullable=True),
        sa.Column('audio_languages_id_list', sa.JSON(), nullable=True),
        sa.Column('resolutions_id_list', sa.JSON(), nullable=True),
        sa.Column('accessibilities_id_list', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create category_lists table
    op.create_table('category_lists',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_updated_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
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
    
    # Create category_list_items table
    op.create_table('category_list_items',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_updated_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('category_list_id', sa.String(36), nullable=False),
        sa.Column('media_description_id', sa.String(36), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('size_width', sa.Integer(), nullable=True),
        sa.Column('size_height', sa.Integer(), nullable=True),
        sa.Column('forward_link', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['category_list_id'], ['category_lists.id']),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create content_lists table
    op.create_table('content_lists',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_updated_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('thumbnail_format', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('display_order', sa.Integer(), nullable=False, default=0),
        sa.Column('content_items', sa.JSON(), nullable=True),
        sa.Column('content_types', sa.JSON(), nullable=True),
        sa.Column('json_content', sa.Text(), nullable=True),
        sa.Column('json_last_updated', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create screen_contents table (renamed to screen_descriptions in v1.9)
    op.create_table('screen_contents',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('screen_type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('subtitle', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('button_text', sa.String(), nullable=True),
        sa.Column('button_action', sa.String(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create description_reports table
    op.create_table('description_reports',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('file_name', sa.String(), nullable=False),
        sa.Column('total_count', sa.Integer(), nullable=False),
        sa.Column('successful_count', sa.Integer(), nullable=False),
        sa.Column('failed_count', sa.Integer(), nullable=False),
        sa.Column('processing_time_seconds', sa.Float(), nullable=True),
        sa.Column('error_details', sa.JSON(), nullable=True),
        sa.Column('created_items', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create video_file_reports table
    op.create_table('video_file_reports',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('media_description_id', sa.String(36), nullable=True),
        sa.Column('video_file_id', sa.String(36), nullable=True),
        sa.Column('report_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['video_file_id'], ['video_file.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    """Drop all tables - complete rollback of initial schema"""
    op.drop_table('video_file_reports')
    op.drop_table('description_reports')
    op.drop_table('screen_contents')
    op.drop_table('content_lists')
    op.drop_table('category_list_items')
    op.drop_table('category_lists')
    op.drop_table('video_file')
    op.drop_table('media_description')
    op.drop_table('audience_categories')
    op.drop_table('subscription_plans')
    op.drop_table('public_person')
    op.drop_table('territories')
    op.drop_table('countries')
    op.drop_table('languages')
    op.drop_table('pictures')
    op.drop_table('seasons')
    op.drop_table('programs')
    op.drop_table('users')