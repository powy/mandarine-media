from sqlalchemy import Column, ForeignKey, Table, Integer, String, DateTime, Index, UniqueConstraint
from sqlalchemy.sql import func
from app.db.database import Base
from app.models.common import GUID

# Association tables for many-to-many relationships in MediaDescription

# Note: Media Description <-> Public Person associations now handled by MediaDescriptionPerson model
# The old 4 separate association tables (actors, directors, producers, authors) have been
# replaced by a unified media_description_people table with role and position support

# Media Description <-> Country associations
media_description_origin_countries = Table(
    'media_description_origin_countries',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('country_id', GUID(), ForeignKey('countries.id'), primary_key=True)
)

media_description_available_countries = Table(
    'media_description_available_countries',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('country_id', GUID(), ForeignKey('countries.id'), primary_key=True)
)

# Media Description <-> Language associations
media_description_original_languages = Table(
    'media_description_original_languages',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('language_id', GUID(), ForeignKey('languages.id'), primary_key=True)
)

media_description_available_subtitle_languages = Table(
    'media_description_available_subtitle_languages',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('language_id', GUID(), ForeignKey('languages.id'), primary_key=True)
)

media_description_available_audio_languages = Table(
    'media_description_available_audio_languages',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('language_id', GUID(), ForeignKey('languages.id'), primary_key=True)
)

# Media Description <-> AudienceCategory associations
media_description_audience_categories = Table(
    'media_description_audience_categories',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('audience_category_id', GUID(), ForeignKey('audience_category.id'), primary_key=True)
)


# Media Description <-> SubscriptionPlan associations
media_description_eligible_plans = Table(
    'media_description_eligible_plans',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('subscription_plan_id', GUID(), ForeignKey('subscription_plan.id'), primary_key=True)
)

# Media Description <-> VideoFile associations for trailers and excerpts
media_description_trailers = Table(
    'media_description_trailers',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('video_file_id', GUID(), ForeignKey('video_file.id'), primary_key=True)
)

media_description_excerpts = Table(
    'media_description_excerpts',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('video_file_id', GUID(), ForeignKey('video_file.id'), primary_key=True)
)

# Media Description <-> MediaTheme associations
media_description_media_themes = Table(
    'media_description_media_themes',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('media_theme_id', GUID(), ForeignKey('media_themes.id'), primary_key=True)
)

# Media Description <-> Picture associations (for additional_images)
media_description_additional_images = Table(
    'media_description_additional_images',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('picture_id', GUID(), ForeignKey('pictures.id'), primary_key=True)
)

# Season <-> MediaDescription associations (for episodes)
season_episodes = Table(
    'season_episodes',
    Base.metadata,
    Column('season_id', GUID(), ForeignKey('seasons.id'), primary_key=True),
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('episode_order', Integer, nullable=True)  # For ordering episodes within a season
)

# MediaShowcase <-> MediaDescription association with ordering
media_showcase_media_descriptions = Table(
    'media_showcase_media_descriptions',
    Base.metadata,
    Column('media_showcase_id', GUID(), ForeignKey('media_showcases.id'), primary_key=True),
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('priority_in_showcase', Integer, nullable=False, default=0),
    Column('added_date_utc', DateTime(timezone=True), server_default=func.now()),
    Index('idx_showcase_item_priority', 'media_showcase_id', 'priority_in_showcase'),
    UniqueConstraint('media_showcase_id', 'priority_in_showcase', name='unique_showcase_item_priority')
)

# MediaShowcase <-> MediaTheme association
media_showcase_media_themes = Table(
    'media_showcase_media_themes',
    Base.metadata,
    Column('media_showcase_id', GUID(), ForeignKey('media_showcases.id'), primary_key=True),
    Column('media_theme_id', GUID(), ForeignKey('media_themes.id'), primary_key=True)
)

# VideoFile <-> Language association (for audio languages)
video_file_audio_languages = Table(
    'video_file_audio_languages',
    Base.metadata,
    Column('video_file_id', GUID(), ForeignKey('video_file.id'), primary_key=True),
    Column('language_id', GUID(), ForeignKey('languages.id'), primary_key=True)
)

# User <-> SubscriptionPlan association
user_subscription_plans = Table(
    'user_subscription_plans',
    Base.metadata,
    Column('user_id', GUID(), ForeignKey('users.id'), primary_key=True),
    Column('subscription_plan_id', GUID(), ForeignKey('subscription_plan.id'), primary_key=True)
)