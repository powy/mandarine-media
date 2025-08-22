"""API v1.8 to v1.9 migration: Field renames, new fields, and table rename

Revision ID: 001_v1_8_to_v1_9
Revises: 
Create Date: 2025-08-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_v1_8_to_v1_9'
down_revision = 'fac6d36c6107'  # Chain from your current migration
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade to API v1.9 - Apply all changes"""
    
    # ===== 1. RENAME TABLE: screen_contents -> screen_descriptions =====
    op.rename_table('screen_contents', 'screen_descriptions')
    
    # ===== 2. MEDIA_DESCRIPTION TABLE CHANGES =====
    # Rename fields
    op.alter_column('media_description', 'human_keywords_text_list', new_column_name='tag_text_list')
    op.alter_column('media_description', 'friendly_url', new_column_name='slug')
    
    # ===== 3. VIDEO_FILE TABLE CHANGES =====
    # Add new fields
    op.add_column('video_file', sa.Column('environment_key', sa.String(), nullable=True, default=''))
    op.add_column('video_file', sa.Column('protection_key', sa.String(), nullable=True, default=''))
    op.add_column('video_file', sa.Column('slug', sa.String(), nullable=True))
    
    # Add unique constraint for slug
    op.create_unique_constraint('uq_video_file_slug', 'video_file', ['slug'])
    
    # ===== 4. CONTENT_LISTS TABLE CHANGES =====
    # Add new fields
    op.add_column('content_lists', sa.Column('media_type', sa.String(), nullable=True))
    op.add_column('content_lists', sa.Column('media_categories_id_list', sa.JSON(), nullable=True))
    op.add_column('content_lists', sa.Column('themes_and_genres_id_list', sa.JSON(), nullable=True))
    
    # Add latest_first as nullable first, then set default values and make NOT NULL
    op.add_column('content_lists', sa.Column('latest_first', sa.Boolean(), nullable=True))
    
    # Set default value for existing records
    op.execute("UPDATE content_lists SET latest_first = true WHERE latest_first IS NULL")
    
    # Now make the column NOT NULL
    op.alter_column('content_lists', 'latest_first', nullable=False)
    
    op.add_column('content_lists', sa.Column('slug', sa.String(), nullable=True))
    
    # Add unique constraint for slug
    op.create_unique_constraint('uq_content_lists_slug', 'content_lists', ['slug'])
    
    # ===== 5. SCREEN_DESCRIPTIONS TABLE CHANGES =====
    # Add new slug field to the renamed table
    op.add_column('screen_descriptions', sa.Column('slug', sa.String(), nullable=True))
    
    # Add unique constraint for slug
    op.create_unique_constraint('uq_screen_descriptions_slug', 'screen_descriptions', ['slug'])
    
    # ===== 6. UPDATE UNIQUE CONSTRAINTS FOR SLUGS =====
    # Ensure slug uniqueness for media_description (rename existing constraint if exists)
    try:
        op.create_unique_constraint('uq_media_description_slug', 'media_description', ['slug'])
    except:
        # Constraint might already exist, ignore
        pass


def downgrade():
    """Downgrade from API v1.9 back to v1.8 - Reverse all changes"""
    
    # ===== 1. REMOVE UNIQUE CONSTRAINTS =====
    try:
        op.drop_constraint('uq_video_file_slug', 'video_file', type_='unique')
    except:
        pass
    try:
        op.drop_constraint('uq_content_lists_slug', 'content_lists', type_='unique')
    except:
        pass
    try:
        op.drop_constraint('uq_screen_descriptions_slug', 'screen_descriptions', type_='unique')
    except:
        pass
    
    # ===== 2. SCREEN_DESCRIPTIONS TABLE CHANGES =====
    # Remove slug field
    op.drop_column('screen_descriptions', 'slug')
    
    # ===== 3. CONTENT_LISTS TABLE CHANGES =====
    # Remove new fields (reverse order of creation)
    op.drop_column('content_lists', 'slug')
    op.drop_column('content_lists', 'latest_first')
    op.drop_column('content_lists', 'themes_and_genres_id_list')
    op.drop_column('content_lists', 'media_categories_id_list')
    op.drop_column('content_lists', 'media_type')
    
    # ===== 4. VIDEO_FILE TABLE CHANGES =====
    # Remove new fields
    op.drop_column('video_file', 'slug')
    op.drop_column('video_file', 'protection_key')
    op.drop_column('video_file', 'environment_key')
    
    # ===== 5. MEDIA_DESCRIPTION TABLE CHANGES =====
    # Rename fields back
    op.alter_column('media_description', 'slug', new_column_name='friendly_url')
    op.alter_column('media_description', 'tag_text_list', new_column_name='human_keywords_text_list')
    
    # ===== 6. RENAME TABLE BACK: screen_descriptions -> screen_contents =====
    op.rename_table('screen_descriptions', 'screen_contents')