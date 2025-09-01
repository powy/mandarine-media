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
    # Remove the incorrectly created subscription_plans_id field and FK constraint
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_subscription_plan', type_='foreignkey')
        batch_op.drop_column('subscription_plans_id')
        # Add the correct field as JSONArray
        batch_op.add_column(sa.Column('subscription_plans_id_list', JSONArray(), nullable=True))


def downgrade() -> None:
    # Revert to the previous incorrect implementation
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('subscription_plans_id_list')
        # Add back the incorrect field
        batch_op.add_column(sa.Column('subscription_plans_id', GUID(), nullable=True))
        batch_op.create_foreign_key('fk_users_subscription_plan', 'subscription_plan', ['subscription_plans_id'], ['id'])