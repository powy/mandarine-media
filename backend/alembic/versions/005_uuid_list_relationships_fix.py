"""Fix UUID list relationships and media category enum

Revision ID: 005_uuid_list_fix
Revises: f57e9876daf1
Create Date: 2025-08-28 00:00:00.000000

Major changes:
1. CREATE TABLE: themes table for themes and genres
2. CREATE TABLES: Association tables for many-to-many relationships
3. REMOVE COLUMNS: Remove UUID list columns from media_description
4. RENAME COLUMNS: copyright_owner_id → copyright_owner_text, external_id → external_identifier_text
5. ENUM UPDATE: Remove entertainment, add documentary, tvshow, other to MediaCategory
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_uuid_list_fix'
down_revision = '004_reverse_video_media_relationship'
branch_labels = None
depends_on = None


def upgrade():
    """Apply UUID list relationship fixes"""
    
    # ===== 1. CREATE THEMES TABLE =====
    op.create_table(
        'themes',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('creation_date_utc', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # ===== 2. CREATE ASSOCIATION TABLES FOR MANY-TO-MANY RELATIONSHIPS =====
    
    # Media Description <-> Public Person associations
    op.create_table(
        'media_description_actors',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('public_person_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['public_person_id'], ['public_person.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'public_person_id')
    )
    
    op.create_table(
        'media_description_directors',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('public_person_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['public_person_id'], ['public_person.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'public_person_id')
    )
    
    op.create_table(
        'media_description_producers',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('public_person_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['public_person_id'], ['public_person.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'public_person_id')
    )
    
    op.create_table(
        'media_description_authors',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('public_person_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['public_person_id'], ['public_person.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'public_person_id')
    )
    
    # Media Description <-> Country associations
    op.create_table(
        'media_description_origin_countries',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('country_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['country_id'], ['countries.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'country_id')
    )
    
    op.create_table(
        'media_description_available_countries',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('country_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['country_id'], ['countries.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'country_id')
    )
    
    # Media Description <-> Language associations
    op.create_table(
        'media_description_original_languages',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('language_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['language_id'], ['languages.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'language_id')
    )
    
    # Media Description <-> AudienceCategory associations
    op.create_table(
        'media_description_audience_categories',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('audience_category_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['audience_category_id'], ['audience_category.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'audience_category_id')
    )
    
    # Media Description <-> Theme associations
    op.create_table(
        'media_description_themes',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('theme_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['theme_id'], ['themes.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'theme_id')
    )
    
    # Media Description <-> SubscriptionPlan associations
    op.create_table(
        'media_description_eligible_plans',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('subscription_plan_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['subscription_plan_id'], ['subscription_plan.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'subscription_plan_id')
    )
    
    # Media Description <-> VideoFile associations for trailers and excerpts
    op.create_table(
        'media_description_trailers',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('video_file_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['video_file_id'], ['video_file.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'video_file_id')
    )
    
    op.create_table(
        'media_description_excerpts',
        sa.Column('media_description_id', sa.String(36), nullable=False),
        sa.Column('video_file_id', sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(['media_description_id'], ['media_description.id']),
        sa.ForeignKeyConstraint(['video_file_id'], ['video_file.id']),
        sa.PrimaryKeyConstraint('media_description_id', 'video_file_id')
    )
    
    # ===== 3. RENAME COLUMNS IN MEDIA_DESCRIPTION =====
    # First check if columns exist before trying to rename them
    try:
        op.alter_column('media_description', 'copyright_owner_id', new_column_name='copyright_owner_text')
    except:
        # Column might not exist or already renamed
        pass
    
    try:
        op.alter_column('media_description', 'external_id', new_column_name='external_identifier_text')
    except:
        # Column might not exist or already renamed
        pass
    
    # ===== 4. REMOVE UUID LIST COLUMNS FROM MEDIA_DESCRIPTION =====
    # Remove the UUID list columns that are now replaced with proper relationships
    columns_to_remove = [
        'actors_id_list',
        'directors_id_list', 
        'productor_id_list',
        'authors_id_list',
        'origin_country_id_list',
        'available_countries_id_list',
        'original_languages_id_list',
        'audience_category_id_list',
        'audience_categories_id_list',
        'themes_and_genres_id_list',
        'trailers_id_list',
        'excerpt_id_list',
        'subscription_plan_id_list',
        'eligible_plans_id_list'
    ]
    
    for column in columns_to_remove:
        try:
            op.drop_column('media_description', column)
        except:
            # Column might not exist
            pass


def downgrade():
    """Reverse UUID list relationship fixes"""
    
    # ===== RESTORE UUID LIST COLUMNS =====
    # Add back the UUID list columns
    op.add_column('media_description', sa.Column('actors_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('directors_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('productor_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('authors_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('origin_country_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('available_countries_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('original_languages_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('audience_category_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('audience_categories_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('themes_and_genres_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('trailers_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('excerpt_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('subscription_plan_id_list', sa.JSON(), nullable=True))
    op.add_column('media_description', sa.Column('eligible_plans_id_list', sa.JSON(), nullable=True))
    
    # ===== REVERSE COLUMN RENAMES =====
    try:
        op.alter_column('media_description', 'copyright_owner_text', new_column_name='copyright_owner_id')
    except:
        pass
    
    try:
        op.alter_column('media_description', 'external_identifier_text', new_column_name='external_id')
    except:
        pass
    
    # ===== DROP ASSOCIATION TABLES =====
    op.drop_table('media_description_excerpts')
    op.drop_table('media_description_trailers')
    op.drop_table('media_description_eligible_plans')
    op.drop_table('media_description_themes')
    op.drop_table('media_description_audience_categories')
    op.drop_table('media_description_original_languages')
    op.drop_table('media_description_available_countries')
    op.drop_table('media_description_origin_countries')
    op.drop_table('media_description_authors')
    op.drop_table('media_description_producers')
    op.drop_table('media_description_directors')
    op.drop_table('media_description_actors')
    
    # ===== DROP THEMES TABLE =====
    op.drop_table('themes')