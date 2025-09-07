"""increase_language_sigle_max_length_to_20

Revision ID: 5cab4fa08a43
Revises: 10be259e1617
Create Date: 2025-09-02 18:46:30.889329

"""
from alembic import op
import sqlalchemy as sa
from app.models.common import GUID, JSONArray


# revision identifiers, used by Alembic.
revision = '5cab4fa08a43'
down_revision = '10be259e1617'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### Increase language sigle max length from 2 to 20 ###
    # Note: SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
    # For PostgreSQL/MySQL, you would use: op.alter_column('languages', 'sigle', type_=sa.String(20))
    
    # Check if we're using SQLite
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
        # This is handled automatically by SQLAlchemy for SQLite
        with op.batch_alter_table('languages') as batch_op:
            batch_op.alter_column('sigle', type_=sa.String(20))
    else:
        # For PostgreSQL, MySQL, etc.
        op.alter_column('languages', 'sigle', type_=sa.String(20))


def downgrade() -> None:
    # ### Revert language sigle max length from 20 back to 2 ###
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        with op.batch_alter_table('languages') as batch_op:
            batch_op.alter_column('sigle', type_=sa.String(2))
    else:
        op.alter_column('languages', 'sigle', type_=sa.String(2))