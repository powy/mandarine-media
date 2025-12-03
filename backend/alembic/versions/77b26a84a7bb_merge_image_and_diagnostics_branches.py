"""merge_image_and_diagnostics_branches

Revision ID: 77b26a84a7bb
Revises: 8a6a9845a4ab, 2025120101
Create Date: 2025-12-03 01:23:52.285772

"""
from alembic import op
import sqlalchemy as sa
from app.models.common import GUID, JSONArray


# revision identifiers, used by Alembic.
revision = '77b26a84a7bb'
down_revision = ('8a6a9845a4ab', '2025120101')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass