"""add diagnostics field to media description

Revision ID: 2025120101
Revises: 2025120100
Create Date: 2025-12-01 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025120101'
down_revision = '2025120100'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add diagnostics column to media_description table
    op.add_column('media_description',
        sa.Column('diagnostics', sa.String(), nullable=False, server_default='pending')
    )


def downgrade() -> None:
    # Remove diagnostics column from media_description table
    op.drop_column('media_description', 'diagnostics')
