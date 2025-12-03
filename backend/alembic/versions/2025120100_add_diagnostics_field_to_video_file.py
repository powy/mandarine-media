"""add diagnostics field to video file

Revision ID: 2025120100
Revises: 07ac2da53721
Create Date: 2025-12-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025120100'
down_revision = '07ac2da53721'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add diagnostics column to video_file table
    op.add_column('video_file',
        sa.Column('diagnostics', sa.String(), nullable=False, server_default='pending')
    )


def downgrade() -> None:
    # Remove diagnostics column from video_file table
    op.drop_column('video_file', 'diagnostics')
