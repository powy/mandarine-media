"""Hotfix: Add missing columns for backoffice functionality

Revision ID: 003_hotfix
Revises: d52f6ae9b311
Create Date: 2025-08-26 20:00:00.000000

Adds missing columns that are causing 500 errors in backoffice.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_hotfix'
down_revision = 'd52f6ae9b311'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing columns to fix backoffice operations"""
    
    # Add missing columns to media_description table
    # These columns are referenced by the model but don't exist in the database
    try:
        op.add_column('media_description', 
                     sa.Column('available_countries_id_list', sa.JSON(), nullable=True))
    except:
        pass  # Column might already exist
    
    try:
        op.add_column('media_description', 
                     sa.Column('available_countries_list', sa.JSON(), nullable=True))
    except:
        pass  # Column might already exist
        
    try:
        op.add_column('media_description', 
                     sa.Column('subscription_plan_id_list', sa.JSON(), nullable=True))
    except:
        pass  # Column might already exist


def downgrade():
    """Remove the hotfix columns"""
    try:
        op.drop_column('media_description', 'available_countries_id_list')
    except:
        pass
    
    try:
        op.drop_column('media_description', 'available_countries_list')
    except:
        pass
        
    try:
        op.drop_column('media_description', 'subscription_plan_id_list')
    except:
        pass