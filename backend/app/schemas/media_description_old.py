from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
import enum


class MediaTypeEnum(str, enum.Enum):
    excerpt = "excerpt"
    trailer = "trailer"
    video = "video"
    webtoon = "webtoon"
    season = "season"
    program = "program"


class ContentStatusEnum(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"
    scheduled = "scheduled"


class MediaCategoryEnum(str, enum.Enum):
    movie = "movie"
    drama = "drama"
    short_drama = "short-drama"
    musical = "musical"
    animation = "animation"
    documentary = "documentary"
    tvshow = "tvshow"
    other = "other"


class MediaDescriptionBase(BaseModel):
    file_number: int = Field(..., description="Human-readable unique ID")
    episode_title: str = Field(..., description="Content title")
    media_type: MediaTypeEnum = Field(..., description="Content type")
    expected_filename: Optional[str] = None
    main_video_file_id: Optional[UUID] = None
    program_id: Optional[UUID] = None
    season_id: Optional[UUID] = None
    episode_number: Optional[int] = None
    media_categories: Optional[List[MediaCategoryEnum]] = None
    themes_and_genres_id_list: Optional[List[str]] = None
    descriptive_summary_text: Optional[str] = None
    synopsis_text: Optional[str] = None
    contract_start_date_utc: Optional[datetime] = None
    contract_end_date_utc: Optional[datetime] = None
    production_year: Optional[int] = None
    original_broadcast_date_utc: Optional[datetime] = None
    audience_category_id_list: Optional[List[str]] = Field(None, description="Array of audience category stored as JSON")
    eligible_plans_id_list: Optional[List[str]] = None
    is_featured: Optional[bool] = False
    content_status: Optional[ContentStatusEnum] = ContentStatusEnum.draft
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords_text_list: Optional[List[str]] = None
    hashtags_text_list: Optional[List[str]] = None
    external_id: Optional[str] = None
    rights_holder: Optional[str] = None
    
    # NEW v1.10-C fields
    trailers_id_list: Optional[List[str]] = None
    excerpt_id_list: Optional[List[str]] = None
    original_languages_id_list: Optional[List[str]] = Field(None, description="Array of language uuid stored as JSON")
    friendly_url: Optional[str] = None
    
    # v1.4 fields - Person role fields
    actors_id_list: Optional[List[str]] = None
    directors_id_list: Optional[List[str]] = None
    productor_id_list: Optional[List[str]] = None
    authors_id_list: Optional[List[str]] = None
    
    # v1.4 fields - Location and language fields (after rename)
    origin_country_id_list: Optional[List[str]] = None
    original_languages_id: Optional[List[str]] = None  # Renamed from original_languages_id_list
    available_countries_list: Optional[List[str]] = None  # Renamed from available_countries_id_list
    
    # v1.4 fields - Business fields
    copyright_owner_id: Optional[str] = None
    eligible_plans: Optional[List[str]] = None  # Renamed from subscription_plan_id_list
    audience_categories_id_list: Optional[List[str]] = None
    
    # v1.4 fields - Metadata fields (v1.9 renamed)
    slug: Optional[str] = Field(None, description="SEO-friendly URL slug (auto-generated from title if empty)")
    human_keywords_text_list: Optional[List[str]] = Field(None, description="Human-readable tags/keywords")
    
    # v1.4 fields - Image fields
    image_1920_1080_id: Optional[UUID] = None
    image_1920_720_id: Optional[UUID] = None
    image_1080_1080_id: Optional[UUID] = None
    image_810_1080_id: Optional[UUID] = None
    image_1080_1920_id: Optional[UUID] = None
    additional_images_id_list: Optional[List[str]] = Field(None, description="Array of picture id stored as JSON")
    
    # v1.4 test image fields
    image_fullscreen: Optional[str] = None
    image_thumbnail1: Optional[str] = None
    image_thumbnail2: Optional[str] = None
    image_mobile_home: Optional[str] = None
    image_desktop_home: Optional[str] = None
    
    # v1.4 fields - Revenue fields (Admin only)
    translation_share: Optional[float] = None
    sacem_share: Optional[float] = None
    other_share: Optional[float] = None
    revenue_share: Optional[float] = None
    paid_token_cost: Optional[int] = None
    
    # v1.10-C engagement fields
    view_count: Optional[int] = Field(default=0, description="Number of views")
    like_count: Optional[int] = Field(default=0, description="Number of likes")
    share_count: Optional[int] = Field(default=0, description="Number of shares")
    is_premium_content: Optional[bool] = Field(default=False, description="Whether content requires premium subscription")
    
    # v1.10-C additional fields from migration
    audio_languages_available: Optional[List[str]] = None
    subtitle_languages_available: Optional[List[str]] = None
    distribution_territories: Optional[List[str]] = None
    source_platform: Optional[str] = None
    original_language: Optional[str] = None
    content_warning: Optional[str] = None
    rating_system: Optional[str] = None
    trailer_url: Optional[str] = None
    secondary_thumbnail_url: Optional[str] = None
    main_thumbnail_url: Optional[str] = None
    public_person_id_list: Optional[List[str]] = None
    audience_category_id: Optional[str] = None
    media_categories_id_list: Optional[List[str]] = None


class MediaDescriptionCreate(MediaDescriptionBase):
    pass


class MediaDescriptionUpdate(BaseModel):
    file_number: Optional[int] = None
    episode_title: Optional[str] = None
    media_type: Optional[MediaTypeEnum] = None
    expected_filename: Optional[str] = None
    main_video_file_id: Optional[UUID] = None
    program_id: Optional[UUID] = None
    season_id: Optional[UUID] = None
    episode_number: Optional[int] = None
    media_categories: Optional[List[MediaCategoryEnum]] = None
    themes_and_genres_id_list: Optional[List[str]] = None
    descriptive_summary_text: Optional[str] = None
    synopsis_text: Optional[str] = None
    contract_start_date_utc: Optional[datetime] = None
    contract_end_date_utc: Optional[datetime] = None
    production_year: Optional[int] = None
    original_broadcast_date_utc: Optional[datetime] = None
    audience_category_id_list: Optional[List[str]] = None
    eligible_plans_id_list: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    content_status: Optional[ContentStatusEnum] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords_text_list: Optional[List[str]] = None
    hashtags_text_list: Optional[List[str]] = None
    external_id: Optional[str] = None
    rights_holder: Optional[str] = None
    
    # NEW v1.10-C fields
    trailers_id_list: Optional[List[str]] = None
    excerpt_id_list: Optional[List[str]] = None
    original_languages_id_list: Optional[List[str]] = Field(None, description="Array of language uuid stored as JSON")
    friendly_url: Optional[str] = None
    
    # v1.4 fields - Person role fields
    actors_id_list: Optional[List[str]] = None
    directors_id_list: Optional[List[str]] = None
    productor_id_list: Optional[List[str]] = None
    authors_id_list: Optional[List[str]] = None
    
    # v1.4 fields - Location and language fields (after rename)
    origin_country_id_list: Optional[List[str]] = None
    original_languages_id: Optional[List[str]] = None  # Renamed from original_languages_id_list
    available_countries_list: Optional[List[str]] = None  # Renamed from available_countries_id_list
    
    # v1.4 fields - Business fields
    copyright_owner_id: Optional[str] = None
    eligible_plans: Optional[List[str]] = None  # Renamed from subscription_plan_id_list
    audience_categories_id_list: Optional[List[str]] = None
    
    # v1.4 fields - Metadata fields (v1.9 renamed)
    slug: Optional[str] = Field(None, description="SEO-friendly URL slug (auto-generated from title if empty)")
    human_keywords_text_list: Optional[List[str]] = Field(None, description="Human-readable tags/keywords")
    
    # v1.4 fields - Image fields
    image_1920_1080_id: Optional[UUID] = None
    image_1920_720_id: Optional[UUID] = None
    image_1080_1080_id: Optional[UUID] = None
    image_810_1080_id: Optional[UUID] = None
    image_1080_1920_id: Optional[UUID] = None
    additional_images_id_list: Optional[List[str]] = Field(None, description="Array of picture id stored as JSON")
    
    # v1.4 test image fields
    image_fullscreen: Optional[str] = None
    image_thumbnail1: Optional[str] = None
    image_thumbnail2: Optional[str] = None
    image_mobile_home: Optional[str] = None
    image_desktop_home: Optional[str] = None
    
    # v1.4 fields - Revenue fields (Admin only)
    translation_share: Optional[float] = None
    sacem_share: Optional[float] = None
    other_share: Optional[float] = None
    revenue_share: Optional[float] = None
    paid_token_cost: Optional[int] = None
    
    # v1.10-C engagement fields
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    share_count: Optional[int] = None
    is_premium_content: Optional[bool] = None
    
    # v1.10-C additional fields from migration
    audio_languages_available: Optional[List[str]] = None
    subtitle_languages_available: Optional[List[str]] = None
    distribution_territories: Optional[List[str]] = None
    source_platform: Optional[str] = None
    original_language: Optional[str] = None
    content_warning: Optional[str] = None
    rating_system: Optional[str] = None
    trailer_url: Optional[str] = None
    secondary_thumbnail_url: Optional[str] = None
    main_thumbnail_url: Optional[str] = None
    public_person_id_list: Optional[List[str]] = None
    audience_category_id: Optional[str] = None
    media_categories_id_list: Optional[List[str]] = None


class MediaDescriptionInDB(MediaDescriptionBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: Optional[datetime] = None

    class Config:
        from_attributes = True


class MediaDescription(MediaDescriptionInDB):
    pass


class MediaDescriptionList(BaseModel):
    data: List[MediaDescription]
    pagination: dict