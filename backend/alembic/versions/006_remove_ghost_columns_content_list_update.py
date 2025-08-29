"""Remove ghost columns and update content list JSON format

Revision ID: 006_remove_ghost_columns_content_list_update
Revises: f57e9876daf1
Create Date: 2025-08-28 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006_remove_ghost_columns_content_list_update'
down_revision = 'd80c53b7f847'
branch_labels = None
depends_on = None


def upgrade():
    """Remove ghost columns from media_description table"""
    
    # Remove ghost columns that are no longer needed
    # These columns were identified as legacy/redundant fields
    
    # Remove legacy test image fields (5 columns)
    op.drop_column('media_description', 'image_fullscreen')
    op.drop_column('media_description', 'image_thumbnail1')
    op.drop_column('media_description', 'image_thumbnail2')
    op.drop_column('media_description', 'image_mobile_home')
    op.drop_column('media_description', 'image_desktop_home')
    
    # Remove redundant thumbnail URL fields (2 columns)
    # These are replaced by format-specific image selection logic
    op.drop_column('media_description', 'main_thumbnail_url')
    op.drop_column('media_description', 'secondary_thumbnail_url')
    
    # Remove redundant relationship fields (2 columns)
    # These are now handled by proper many-to-many relationships
    op.drop_column('media_description', 'trailer_url')
    op.drop_column('media_description', 'audience_category_id')
    
    # Remove legacy ID list field (1 column)
    # This has been replaced by enum-based media_categories field
    op.drop_column('media_description', 'media_categories_id_list')


def downgrade():
    """Re-add ghost columns if needed for rollback"""
    
    # Note: This rollback will create empty columns as the data would be lost
    # Ensure proper backup before running this migration
    
    # Re-add legacy ID list field
    op.add_column('media_description', sa.Column('media_categories_id_list', sa.JSON(), nullable=True))
    
    # Re-add redundant relationship fields
    op.add_column('media_description', sa.Column('audience_category_id', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('trailer_url', sa.String(), nullable=True))
    
    # Re-add redundant thumbnail URL fields
    op.add_column('media_description', sa.Column('secondary_thumbnail_url', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('main_thumbnail_url', sa.String(), nullable=True))
    
    # Re-add legacy test image fields
    op.add_column('media_description', sa.Column('image_desktop_home', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('image_mobile_home', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('image_thumbnail2', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('image_thumbnail1', sa.String(), nullable=True))
    op.add_column('media_description', sa.Column('image_fullscreen', sa.String(), nullable=True))