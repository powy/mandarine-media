from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray
import enum


class MediaTypeEnum(enum.Enum):
    video = "video"
    webtoon = "webtoon"
    trailer = "trailer"
    teaser = "teaser"
    excerpt = "excerpt"


class ContentStatusEnum(enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"
    scheduled = "scheduled"


class MediaDescription(Base):
    __tablename__ = "media_description"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    file_number = Column(Integer, unique=True, nullable=False, index=True)
    episode_title = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # Will use enum validation in schemas
    
    # Optional Fields
    file_name = Column(String, nullable=True)
    expected_filename = Column(String, nullable=True)
    program_id = Column(GUID(), ForeignKey("programs.id"), nullable=True)
    season_id = Column(GUID(), ForeignKey("seasons.id"), nullable=True)
    episode_number = Column(Integer, nullable=True)
    media_categories_id_list = Column(JSONArray(), nullable=True)
    themes_and_genres_id_list = Column(JSONArray(), nullable=True)
    descriptive_summary_text = Column(Text, nullable=True)
    synopsis_text = Column(Text, nullable=True)
    contract_start_date_utc = Column(DateTime(timezone=True), nullable=True)
    contract_end_date_utc = Column(DateTime(timezone=True), nullable=True)
    production_year = Column(Integer, nullable=True)
    original_broadcast_date_utc = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    audience_category_id = Column(GUID(), nullable=True)
    subscription_plan_id_list = Column(JSONArray(), nullable=True)
    public_person_id_list = Column(JSONArray(), nullable=True)
    main_thumbnail_url = Column(String, nullable=True)
    secondary_thumbnail_url = Column(String, nullable=True)
    trailer_url = Column(String, nullable=True)
    rating_system = Column(String, nullable=True)
    content_warning = Column(String, nullable=True)
    original_language = Column(String, nullable=True)
    subtitle_languages_available = Column(JSONArray(), nullable=True)
    audio_languages_available = Column(JSONArray(), nullable=True)
    is_premium_content = Column(Boolean, default=False, nullable=True)
    is_featured = Column(Boolean, default=False, nullable=True)
    view_count = Column(Integer, default=0, nullable=True)
    like_count = Column(Integer, default=0, nullable=True)
    share_count = Column(Integer, default=0, nullable=True)
    last_updated_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    content_status = Column(String, default="draft", nullable=True)  # Will use enum validation in schemas
    seo_title = Column(String, nullable=True)
    seo_description = Column(Text, nullable=True)
    seo_keywords = Column(JSONArray(), nullable=True)
    social_media_hashtags = Column(JSONArray(), nullable=True)
    external_id = Column(String, nullable=True)
    source_platform = Column(String, nullable=True)
    rights_holder = Column(String, nullable=True)
    distribution_territories = Column(JSONArray(), nullable=True)
    
    # NEW v1.4 fields - Person role fields
    actors_id_list = Column(JSONArray(), nullable=True)
    directors_id_list = Column(JSONArray(), nullable=True)
    productor_id_list = Column(JSONArray(), nullable=True)
    authors_id_list = Column(JSONArray(), nullable=True)
    
    # NEW v1.4 fields - Location and language fields
    origin_country_id_list = Column(JSONArray(), nullable=True)
    original_languages_id = Column(JSONArray(), nullable=True)
    available_countries_list = Column(JSONArray(), nullable=True)
    
    # NEW v1.4 fields - Business fields
    copyright_owner_id = Column(String, nullable=True)
    eligible_plans = Column(JSONArray(), nullable=True)
    audience_categories_id_list = Column(JSONArray(), nullable=True)
    
    # NEW v1.4 fields - Metadata fields (v1.9 renamed)
    slug = Column(String, nullable=True, unique=True)  # Renamed from friendly_url in v1.9
    tag_text_list = Column(JSONArray(), nullable=True)  # Renamed from human_keywords_text_list in v1.9
    
    # NEW v1.4 fields - Image fields
    image_fullscreen = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_thumbnail1 = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_thumbnail2 = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_mobile_home = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_desktop_home = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    additional_images_id_list = Column(JSONArray(), nullable=True)
    
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