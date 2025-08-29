"""Reverse VideoFile-MediaDescription relationship

Revision ID: 004_reverse_video_media_relationship
Revises: 003_hotfix
Create Date: 2025-08-28 00:00:00.000000

Major changes:
- REVERSE RELATIONSHIP: VideoFile.media_description_id -> MediaDescription.main_video_file_id
- ADD FIELD: main_video_file_id to media_description table (FK to video_file.id)
- DATA MIGRATION: Copy existing relationships in reverse direction
- DROP FIELD: media_description_id from video_file table
- UPDATE CONSTRAINTS: Update foreign key relationships
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_reverse_video_media_relationship'
down_revision = '003_hotfix'
branch_labels = None
depends_on = None


def upgrade():
    """Reverse the VideoFile-MediaDescription relationship"""
    
    # Step 1: Add the new column to media_description table
    with op.batch_alter_table('media_description') as batch_op:
        batch_op.add_column(sa.Column('main_video_file_id', sa.String(36), nullable=True))
        batch_op.create_foreign_key(
            'fk_media_description_main_video_file_id',
            'video_file',
            ['main_video_file_id'], ['id']
        )
    
    # Step 2: Migrate existing data
    # For each video_file record that has a media_description_id,
    # update the corresponding media_description record to point back to the video_file
    op.execute("""
        UPDATE media_description 
        SET main_video_file_id = video_file.id
        FROM video_file 
        WHERE media_description.id = video_file.media_description_id
        AND video_file.media_description_id IS NOT NULL
    """)
    
    # Step 3: Drop the old column from video_file table using batch mode
    with op.batch_alter_table('video_file') as batch_op:
        batch_op.drop_column('media_description_id')
    

def downgrade():
    """Revert the relationship back to original structure"""
    
    # Step 1: Add back the media_description_id column to video_file using batch mode
    with op.batch_alter_table('video_file') as batch_op:
        batch_op.add_column(sa.Column('media_description_id', sa.String(36), nullable=True))
        batch_op.create_foreign_key(
            'video_file_media_description_id_fkey',
            'media_description',
            ['media_description_id'], ['id']
        )
    
    # Step 2: Migrate data back to original structure
    op.execute("""
        UPDATE video_file 
        SET media_description_id = media_description.id
        FROM media_description 
        WHERE video_file.id = media_description.main_video_file_id
        AND media_description.main_video_file_id IS NOT NULL
    """)
    
    # Step 3: Drop the new column from media_description using batch mode
    with op.batch_alter_table('media_description') as batch_op:
        batch_op.drop_column('main_video_file_id')