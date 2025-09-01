"""Cleanup ghost fields and fix naming inconsistencies

Revision ID: 003_cleanup_ghost_fields
Revises: 002_api_v1_9_to_v1_10_c_migration
Create Date: 2025-08-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_cleanup_ghost_fields'
down_revision = '002_api_v1_9_to_v1_10_c_migration'
branch_labels = None
depends_on = None


def upgrade():
    # Remove engagement fields from media_description
    op.drop_column('media_description', 'view_count')
    op.drop_column('media_description', 'like_count')
    op.drop_column('media_description', 'share_count')
    
    # Remove unused v1.10-C fields from media_description
    op.drop_column('media_description', 'audio_languages_available')
    op.drop_column('media_description', 'subtitle_languages_available')
    op.drop_column('media_description', 'distribution_territories')
    op.drop_column('media_description', 'source_platform')
    op.drop_column('media_description', 'content_warning')
    op.drop_column('media_description', 'rating_system')
    
    # Rename photo_url to image_url in pictures table
    op.alter_column('pictures', 'photo_url',
                    new_column_name='image_url',
                    existing_type=sa.String(),
                    existing_nullable=False)


def downgrade():
    # Revert picture field name
    op.alter_column('pictures', 'image_url',
                    new_column_name='photo_url',
                    existing_type=sa.String(),
                    existing_nullable=False)
    
    # Re-add v1.10-C fields
    op.add_column('media_description', sa.Column('rating_system', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('content_warning', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('source_platform', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('distribution_territories', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('media_description', sa.Column('subtitle_languages_available', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('media_description', sa.Column('audio_languages_available', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    
    # Re-add engagement fields
    op.add_column('media_description', sa.Column('share_count', sa.Integer(), nullable=True, default=0))
    op.add_column('media_description', sa.Column('like_count', sa.Integer(), nullable=True, default=0))
    op.add_column('media_description', sa.Column('view_count', sa.Integer(), nullable=True, default=0))