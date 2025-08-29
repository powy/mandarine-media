from sqlalchemy import Column, ForeignKey, Table
from app.db.database import Base
from app.models.common import GUID

# Association tables for many-to-many relationships in MediaDescription

# Media Description <-> Public Person associations (for actors, directors, producers, authors)
media_description_actors = Table(
    'media_description_actors',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('public_person_id', GUID(), ForeignKey('public_person.id'), primary_key=True)
)

media_description_directors = Table(
    'media_description_directors',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('public_person_id', GUID(), ForeignKey('public_person.id'), primary_key=True)
)

media_description_producers = Table(
    'media_description_producers',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('public_person_id', GUID(), ForeignKey('public_person.id'), primary_key=True)
)

media_description_authors = Table(
    'media_description_authors',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('public_person_id', GUID(), ForeignKey('public_person.id'), primary_key=True)
)

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

# Media Description <-> AudienceCategory associations
media_description_audience_categories = Table(
    'media_description_audience_categories',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('audience_category_id', GUID(), ForeignKey('audience_category.id'), primary_key=True)
)

# Media Description <-> Theme associations
media_description_themes = Table(
    'media_description_themes',
    Base.metadata,
    Column('media_description_id', GUID(), ForeignKey('media_description.id'), primary_key=True),
    Column('theme_id', GUID(), ForeignKey('themes.id'), primary_key=True)
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