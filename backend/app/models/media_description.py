from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray
from app.models.associations import (
    media_description_actors, media_description_directors, media_description_producers,
    media_description_authors, media_description_origin_countries, media_description_available_countries,
    media_description_original_languages, media_description_audience_categories, media_description_themes,
    media_description_eligible_plans, media_description_trailers, media_description_excerpts
)
import enum


class MediaTypeEnum(enum.Enum):
    excerpt = "excerpt"
    trailer = "trailer"
    video = "video"
    webtoon = "webtoon"
    season = "season"
    program = "program"


class ContentStatusEnum(enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"
    scheduled = "scheduled"


class MediaCategoryEnum(enum.Enum):
    movie = "movie"
    drama = "drama"
    short_drama = "short-drama"
    musical = "musical"
    animation = "animation"
    documentary = "documentary"
    tvshow = "tvshow"
    other = "other"


class MediaDescription(Base):
    __tablename__ = "media_description"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    file_number = Column(Integer, unique=True, nullable=False, index=True)
    episode_title = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # Will use enum validation in schemas
    
    # Optional Fields
    expected_filename = Column(String, nullable=True)
    main_video_file_id = Column(GUID(), ForeignKey("video_file.id"), nullable=True)
    program_id = Column(GUID(), ForeignKey("programs.id"), nullable=True)
    season_id = Column(GUID(), ForeignKey("seasons.id"), nullable=True)
    episode_number = Column(Integer, nullable=True)
    media_categories = Column(JSONArray(), nullable=True)  # ARRAY of enum 'category'
    # Removed: themes_and_genres_id_list - replaced with proper relationship
    descriptive_summary_text = Column(Text, nullable=True)
    synopsis_text = Column(Text, nullable=True)
    contract_start_date_utc = Column(DateTime(timezone=True), nullable=True)
    contract_end_date_utc = Column(DateTime(timezone=True), nullable=True)
    production_year = Column(Integer, nullable=True)
    original_broadcast_date_utc = Column(DateTime(timezone=True), nullable=True)
    # Removed: audience_category_id_list - replaced with proper relationship
    is_featured = Column(Boolean, default=False, nullable=True)
    last_updated_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    content_status = Column(String, default="draft", nullable=True)  # Will use enum validation in schemas
    seo_title = Column(String, nullable=True)
    seo_description = Column(Text, nullable=True)
    seo_keywords_text_list = Column(JSONArray(), nullable=True)
    hashtags_text_list = Column(JSONArray(), nullable=True)
    external_identifier_text = Column(String, nullable=True)  # Renamed from external_id
    rights_holder = Column(String, nullable=True)
    
    # Removed: Video file UUID list fields - replaced with proper relationships
    # trailers_id_list, excerpt_id_list, original_languages_id_list
    friendly_url = Column(String, nullable=True)
    
    # Removed: Person role UUID list fields - replaced with proper relationships
    # actors_id_list, directors_id_list, productor_id_list, authors_id_list
    
    # Removed: Location and language UUID list fields - replaced with proper relationships
    # origin_country_id_list, original_languages_id_list, available_countries_id_list
    
    # NEW v1.4 fields - Business fields (renamed and cleaned up)
    copyright_owner_text = Column(String, nullable=True)  # Renamed from copyright_owner_id
    # Removed: subscription_plan_id_list - not needed
    # Removed: audience_categories_id_list - replaced with proper relationship
    
    # NEW v1.4 fields - Metadata fields (v1.9 renamed)
    slug = Column(String, nullable=True, unique=True)  # Renamed from friendly_url in v1.9
    human_keywords_text_list = Column(JSONArray(), nullable=True)
    
    # NEW v1.4 fields - Image fields
    image_1920_1080_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_1920_720_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_1080_1080_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_810_1080_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_1080_1920_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    additional_images_id_list = Column(JSONArray(), nullable=True)  # Array of picture id stored as JSON
    
    # v1.4 test image fields - REMOVED (ghost columns)
    
    # NEW v1.4 fields - Revenue fields (Admin only)
    translation_share = Column(Float, nullable=True)
    sacem_share = Column(Float, nullable=True)
    other_share = Column(Float, nullable=True)
    revenue_share = Column(Float, nullable=True)
    paid_token_cost = Column(Integer, nullable=True)
    
    # v1.10-C engagement fields
    view_count = Column(Integer, nullable=True, default=0)
    like_count = Column(Integer, nullable=True, default=0)
    share_count = Column(Integer, nullable=True, default=0)
    is_premium_content = Column(Boolean, nullable=True, default=False)
    
    # v1.10-C additional fields from migration
    audio_languages_available = Column(JSONArray(), nullable=True)
    subtitle_languages_available = Column(JSONArray(), nullable=True)
    distribution_territories = Column(JSONArray(), nullable=True)
    source_platform = Column(String, nullable=True)
    original_language = Column(String, nullable=True)
    content_warning = Column(String, nullable=True)
    rating_system = Column(String, nullable=True)
    # Removed ghost columns: trailer_url, secondary_thumbnail_url, main_thumbnail_url
    public_person_id_list = Column(JSONArray(), nullable=True)
    # Removed ghost columns: audience_category_id, media_categories_id_list
    
    # Relationships
    main_video_file = relationship("VideoFile", backref="media_descriptions")
    program = relationship("Program", back_populates="media_descriptions")
    season = relationship("Season", back_populates="media_descriptions")
    video_file_reports = relationship("VideoFileReport", back_populates="media_description")
    
    # Many-to-many relationships
    actors = relationship("PublicPerson", secondary=media_description_actors, back_populates="acted_in")
    directors = relationship("PublicPerson", secondary=media_description_directors, back_populates="directed")
    producers = relationship("PublicPerson", secondary=media_description_producers, back_populates="produced")
    authors = relationship("PublicPerson", secondary=media_description_authors, back_populates="authored")
    
    origin_countries = relationship("Country", secondary=media_description_origin_countries, back_populates="origin_media")
    available_countries = relationship("Country", secondary=media_description_available_countries, back_populates="available_media")
    
    original_languages = relationship("Language", secondary=media_description_original_languages, back_populates="original_language_media")
    
    audience_categories = relationship("AudienceCategory", secondary=media_description_audience_categories, back_populates="media")
    
    themes = relationship("Theme", secondary=media_description_themes, back_populates="media")
    
    eligible_plan_id_list = relationship("SubscriptionPlan", secondary=media_description_eligible_plans, back_populates="eligible_media")
    
    trailers = relationship("VideoFile", secondary=media_description_trailers, back_populates="trailer_for")
    excerpts = relationship("VideoFile", secondary=media_description_excerpts, back_populates="excerpt_for")