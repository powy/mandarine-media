from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray
import enum


class MediaTypeEnum(enum.Enum):
    excerpt = "excerpt"
    trailer = "trailer"
    video = "video"
    webtoon = "webtoon"


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
    entertainment = "entertainment"
    animation = "animation"


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
    program_id = Column(GUID(), ForeignKey("programs.id"), nullable=True)
    season_id = Column(GUID(), ForeignKey("seasons.id"), nullable=True)
    episode_number = Column(Integer, nullable=True)
    media_categories = Column(JSONArray(), nullable=True)  # ARRAY of enum 'category'
    themes_and_genres_id_list = Column(JSONArray(), nullable=True)
    descriptive_summary_text = Column(Text, nullable=True)
    synopsis_text = Column(Text, nullable=True)
    contract_start_date_utc = Column(DateTime(timezone=True), nullable=True)
    contract_end_date_utc = Column(DateTime(timezone=True), nullable=True)
    production_year = Column(Integer, nullable=True)
    original_broadcast_date_utc = Column(DateTime(timezone=True), nullable=True)
    audience_category_id_list = Column(JSONArray(), nullable=True)  # Array of audience category stored as JSON
    eligible_plans_id_list = Column(JSONArray(), nullable=True)
    is_featured = Column(Boolean, default=False, nullable=True)
    last_updated_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    content_status = Column(String, default="draft", nullable=True)  # Will use enum validation in schemas
    seo_title = Column(String, nullable=True)
    seo_description = Column(Text, nullable=True)
    seo_keywords_text_list = Column(JSONArray(), nullable=True)
    hashtags_text_list = Column(JSONArray(), nullable=True)
    external_id = Column(String, nullable=True)
    rights_holder = Column(String, nullable=True)
    
    # NEW v1.10-C fields
    trailers_id_list = Column(JSONArray(), nullable=True)
    excerpt_id_list = Column(JSONArray(), nullable=True)
    original_languages_id_list = Column(JSONArray(), nullable=True)  # Array of language uuid stored as JSON
    friendly_url = Column(String, nullable=True)
    
    # NEW v1.4 fields - Person role fields
    actors_id_list = Column(JSONArray(), nullable=True)
    directors_id_list = Column(JSONArray(), nullable=True)
    productor_id_list = Column(JSONArray(), nullable=True)
    authors_id_list = Column(JSONArray(), nullable=True)
    
    # NEW v1.4 fields - Location and language fields
    origin_country_id_list = Column(JSONArray(), nullable=True)
    original_languages_id_list = Column(JSONArray(), nullable=True)
    available_countries_id_list = Column(JSONArray(), nullable=True)
    
    # NEW v1.4 fields - Business fields
    copyright_owner_id = Column(String, nullable=True)
    subscription_plan_id_list = Column(JSONArray(), nullable=True)
    audience_categories_id_list = Column(JSONArray(), nullable=True)
    
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
    
    # NEW v1.4 fields - Revenue fields (Admin only)
    translation_share = Column(Float, nullable=True)
    sacem_share = Column(Float, nullable=True)
    other_share = Column(Float, nullable=True)
    revenue_share = Column(Float, nullable=True)
    paid_token_cost = Column(Integer, nullable=True)
    
    # Relationships
    program = relationship("Program", back_populates="media_descriptions")
    season = relationship("Season", back_populates="media_descriptions")
    video_file_reports = relationship("VideoFileReport", back_populates="media_description")