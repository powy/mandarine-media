"""Fix User subscription_plans field inconsistency - change to JSONArray

Revision ID: 113e974e2c21
Revises: a76d54ab6d6a
Create Date: 2025-09-01 16:31:09.232804

"""
from alembic import op
import sqlalchemy as sa
from app.models.common import GUID, JSONArray


# revision identifiers, used by Alembic.
revision = '113e974e2c21'
down_revision = 'a76d54ab6d6a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if we're using SQLite
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Get existing columns
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    with op.batch_alter_table('users', schema=None) as batch_op:
        # Only drop constraint for non-SQLite databases
        if bind.dialect.name != 'sqlite':
            try:
                batch_op.drop_constraint('fk_users_subscription_plan', type_='foreignkey')
            except:
                pass
        
        # Only drop column if it exists
        if 'subscription_plans_id' in columns:
            batch_op.drop_column('subscription_plans_id')
            
        # Only add new column if it doesn't exist
        if 'subscription_plans_id_list' not in columns:
            batch_op.add_column(sa.Column('subscription_plans_id_list', JSONArray(), nullable=True))


def downgrade() -> None:
    # Revert to the previous incorrect implementation
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('subscription_plans_id_list')
        # Add back the incorrect field
        batch_op.add_column(sa.Column('subscription_plans_id', GUID(), nullable=True))
        batch_op.create_foreign_key('fk_users_subscription_plan', 'subscription_plan', ['subscription_plans_id'], ['id'])