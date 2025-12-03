"""add_large_and_small_image_url_to_pictures

Revision ID: 8a6a9845a4ab
Revises: 07ac2da53721
Create Date: 2025-11-16 06:11:54.510251

"""
from alembic import op
import sqlalchemy as sa
from app.models.common import GUID, JSONArray


# revision identifiers, used by Alembic.
revision = '8a6a9845a4ab'
down_revision = '07ac2da53721'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add large and small image URL variants to pictures table
    op.add_column('pictures', sa.Column('large_image_url', sa.String(), nullable=True))
    op.add_column('pictures', sa.Column('small_image_url', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove large and small image URL variants from pictures table
    op.drop_column('pictures', 'small_image_url')
    op.drop_column('pictures', 'large_image_url')