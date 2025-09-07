"""combined_schema_fixes_and_language_update

Revision ID: 2b9d87f1e448
Revises: 10be259e1617
Create Date: 2025-09-07 15:09:43.137918

"""
from alembic import op
import sqlalchemy as sa
from app.models.common import GUID, JSONArray


# revision identifiers, used by Alembic.
revision = '2b9d87f1e448'
down_revision = '10be259e1617'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### Combined changes from both previous migrations ###
    
    # Drop tables in correct order (junction tables first) - from schema fixes migration
    op.drop_table('media_description_themes')
    op.drop_table('themes')
    
    # Drop temporary table if it exists
    try:
        op.drop_table('_alembic_tmp_seasons')
    except:
        pass  # Table might not exist
    
    # Use batch mode for SQLite compatibility - seasons table changes
    with op.batch_alter_table('seasons', schema=None) as batch_op:
        batch_op.alter_column('program_id',
                   existing_type=sa.CHAR(length=32),
                   nullable=True)
    
    # Remove upload_method column from video_file table
    try:
        with op.batch_alter_table('video_file', schema=None) as batch_op:
            batch_op.drop_column('upload_method')
    except:
        pass  # Column might not exist
    
    # Increase language sigle max length from 2 to 20 - from language migration
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        with op.batch_alter_table('languages') as batch_op:
            batch_op.alter_column('sigle', type_=sa.String(20))
    else:
        op.alter_column('languages', 'sigle', type_=sa.String(20))
    
    # ### end combined commands ###


def downgrade() -> None:
    # ### Reverse all combined changes ###
    
    # Revert language sigle length from 20 back to 2
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        with op.batch_alter_table('languages') as batch_op:
            batch_op.alter_column('sigle', type_=sa.String(2))
    else:
        op.alter_column('languages', 'sigle', type_=sa.String(2))
    
    # Add back upload_method column to video_file table
    op.add_column('video_file', sa.Column('upload_method', sa.VARCHAR(), nullable=True))
    
    # Revert seasons table changes
    with op.batch_alter_table('seasons', schema=None) as batch_op:
        batch_op.alter_column('program_id',
                   existing_type=sa.CHAR(length=32),
                   nullable=False)
    
    # Recreate the temporary seasons table
    op.create_table('_alembic_tmp_seasons',
    sa.Column('id', sa.CHAR(length=32), nullable=False),
    sa.Column('creation_date_utc', sa.DATETIME(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('program_id', sa.CHAR(length=32), nullable=True),
    sa.Column('season_number', sa.INTEGER(), nullable=False),
    sa.Column('season_name', sa.VARCHAR(), nullable=True),
    sa.Column('general_media_description_id', sa.CHAR(length=32), nullable=True),
    sa.Column('episodes_id_list', sa.TEXT(), nullable=True),
    sa.ForeignKeyConstraint(['program_id'], ['programs.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('program_id', 'season_number', name=op.f('unique_program_season'))
    )
    
    # Recreate themes tables
    op.create_table('themes',
    sa.Column('id', sa.CHAR(length=32), nullable=False),
    sa.Column('creation_date_utc', sa.DATETIME(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('name', sa.VARCHAR(), nullable=False),
    sa.Column('description', sa.TEXT(), nullable=True),
    sa.Column('category', sa.VARCHAR(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    
    op.create_table('media_description_themes',
    sa.Column('media_description_id', sa.CHAR(length=32), nullable=False),
    sa.Column('theme_id', sa.CHAR(length=32), nullable=False),
    sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id'], ),
    sa.ForeignKeyConstraint(['theme_id'], ['themes.id'], ),
    sa.PrimaryKeyConstraint('media_description_id', 'theme_id')
    )
    
    # ### end reverse combined commands ###