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


# Simple schemas for nested relationships
class PublicPersonSimple(BaseModel):
    id: UUID
    stage_name_roman: str

    class Config:
        from_attributes = True


class CountrySimple(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class LanguageSimple(BaseModel):
    id: UUID
    name: str
    sigle: str

    class Config:
        from_attributes = True


class AudienceCategorySimple(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class ThemeSimple(BaseModel):
    id: UUID
    name: str
    category: Optional[str] = None

    class Config:
        from_attributes = True


class SubscriptionPlanSimple(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class VideoFileSimple(BaseModel):
    id: UUID
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    duration_seconds: Optional[int] = None

    class Config:
        from_attributes = True


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
    descriptive_summary_text: Optional[str] = None
    synopsis_text: Optional[str] = None
    contract_start_date_utc: Optional[datetime] = None
    contract_end_date_utc: Optional[datetime] = None
    production_year: Optional[int] = None
    original_broadcast_date_utc: Optional[datetime] = None
    is_featured: Optional[bool] = False
    content_status: Optional[ContentStatusEnum] = ContentStatusEnum.draft
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords_text_list: Optional[List[str]] = None
    hashtags_text_list: Optional[List[str]] = None
    external_identifier_text: Optional[str] = Field(None, description="External system identifier")
    rights_holder: Optional[str] = None
    
    # v1.10-C fields
    friendly_url: Optional[str] = None
    
    # v1.4 fields - Business fields (updated)
    copyright_owner_text: Optional[str] = Field(None, description="Copyright owner name/text")
    
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
    
    # v1.4 test image fields - REMOVED (ghost columns)
    
    # v1.4 fields - Revenue fields (Admin only)
    translation_share: Optional[float] = None
    sacem_share: Optional[float] = None
    other_share: Optional[float] = None
    revenue_share: Optional[float] = None
    paid_token_cost: Optional[int] = None


class MediaDescriptionCreate(MediaDescriptionBase):
    # Additional fields for creating relationships
    actor_ids: Optional[List[str]] = Field(None, description="List of PublicPerson IDs for actors")
    director_ids: Optional[List[str]] = Field(None, description="List of PublicPerson IDs for directors") 
    producer_ids: Optional[List[str]] = Field(None, description="List of PublicPerson IDs for producers")
    author_ids: Optional[List[str]] = Field(None, description="List of PublicPerson IDs for authors")
    origin_country_ids: Optional[List[str]] = Field(None, description="List of Country IDs for origin countries")
    available_country_ids: Optional[List[str]] = Field(None, description="List of Country IDs for available countries")
    original_language_ids: Optional[List[str]] = Field(None, description="List of Language IDs for original languages")
    # Removed: audience_category_ids (handled by relationships now)
    theme_ids: Optional[List[str]] = Field(None, description="List of Theme IDs")
    eligible_plan_id_list: Optional[List[str]] = Field(None, description="List of SubscriptionPlan IDs")
    trailer_ids: Optional[List[str]] = Field(None, description="List of VideoFile IDs for trailers")
    excerpt_ids: Optional[List[str]] = Field(None, description="List of VideoFile IDs for excerpts")


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
    descriptive_summary_text: Optional[str] = None
    synopsis_text: Optional[str] = None
    contract_start_date_utc: Optional[datetime] = None
    contract_end_date_utc: Optional[datetime] = None
    production_year: Optional[int] = None
    original_broadcast_date_utc: Optional[datetime] = None
    is_featured: Optional[bool] = None
    content_status: Optional[ContentStatusEnum] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords_text_list: Optional[List[str]] = None
    hashtags_text_list: Optional[List[str]] = None
    external_identifier_text: Optional[str] = None
    rights_holder: Optional[str] = None
    friendly_url: Optional[str] = None
    copyright_owner_text: Optional[str] = None
    slug: Optional[str] = None
    human_keywords_text_list: Optional[List[str]] = None
    
    # Relationship update fields
    actor_ids: Optional[List[str]] = None
    director_ids: Optional[List[str]] = None
    producer_ids: Optional[List[str]] = None
    author_ids: Optional[List[str]] = None
    origin_country_ids: Optional[List[str]] = None
    available_country_ids: Optional[List[str]] = None
    original_language_ids: Optional[List[str]] = None
    # Removed: audience_category_ids (handled by relationships now)
    theme_ids: Optional[List[str]] = None
    eligible_plan_id_list: Optional[List[str]] = None
    trailer_ids: Optional[List[str]] = None
    excerpt_ids: Optional[List[str]] = None


class MediaDescriptionInDBBase(MediaDescriptionBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: Optional[datetime] = None

    class Config:
        from_attributes = True


class MediaDescription(MediaDescriptionInDBBase):
    # Include the relationship data
    actors: Optional[List[PublicPersonSimple]] = []
    directors: Optional[List[PublicPersonSimple]] = []
    producers: Optional[List[PublicPersonSimple]] = []
    authors: Optional[List[PublicPersonSimple]] = []
    origin_countries: Optional[List[CountrySimple]] = []
    available_countries: Optional[List[CountrySimple]] = []
    original_languages: Optional[List[LanguageSimple]] = []
    audience_categories: Optional[List[AudienceCategorySimple]] = []
    themes: Optional[List[ThemeSimple]] = []
    eligible_plan_id_list: Optional[List[SubscriptionPlanSimple]] = []
    trailers: Optional[List[VideoFileSimple]] = []
    excerpts: Optional[List[VideoFileSimple]] = []


class MediaDescriptionInDB(MediaDescriptionInDBBase):
    pass


class MediaDescriptionList(BaseModel):
    id: UUID
    file_number: Optional[int] = None
    episode_title: Optional[str] = None
    media_type: Optional[MediaTypeEnum] = None
    content_status: Optional[ContentStatusEnum] = None
    creation_date_utc: Optional[datetime] = None
    is_featured: Optional[bool] = False

    class Config:
        from_attributes = True