from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
import enum


class MediaTypeEnum(str, enum.Enum):
    video = "video"
    webtoon = "webtoon"
    trailer = "trailer"
    teaser = "teaser"
    excerpt = "excerpt"


class ContentStatusEnum(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"
    scheduled = "scheduled"


class MediaDescriptionBase(BaseModel):
    file_number: int = Field(..., description="Human-readable unique ID")
    episode_title: str = Field(..., description="Content title")
    media_type: MediaTypeEnum = Field(..., description="Content type")
    file_name: Optional[str] = None
    expected_filename: Optional[str] = None
    program_id: Optional[UUID] = None
    season_id: Optional[UUID] = None
    episode_number: Optional[int] = None
    media_categories_id_list: Optional[List[str]] = None
    themes_and_genres_id_list: Optional[List[str]] = None
    descriptive_summary_text: Optional[str] = None
    synopsis_text: Optional[str] = None
    contract_start_date_utc: Optional[datetime] = None
    contract_end_date_utc: Optional[datetime] = None
    production_year: Optional[int] = None
    original_broadcast_date_utc: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    audience_category_id: Optional[UUID] = None
    subscription_plan_id_list: Optional[List[str]] = None
    public_person_id_list: Optional[List[str]] = None
    main_thumbnail_url: Optional[str] = None
    secondary_thumbnail_url: Optional[str] = None
    trailer_url: Optional[str] = None
    rating_system: Optional[str] = None
    content_warning: Optional[str] = None
    original_language: Optional[str] = None
    subtitle_languages_available: Optional[List[str]] = None
    audio_languages_available: Optional[List[str]] = None
    is_premium_content: Optional[bool] = False
    is_featured: Optional[bool] = False
    view_count: Optional[int] = 0
    like_count: Optional[int] = 0
    share_count: Optional[int] = 0
    content_status: Optional[ContentStatusEnum] = ContentStatusEnum.draft
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[List[str]] = None
    social_media_hashtags: Optional[List[str]] = None
    external_id: Optional[str] = None
    source_platform: Optional[str] = None
    rights_holder: Optional[str] = None
    distribution_territories: Optional[List[str]] = None


class MediaDescriptionCreate(MediaDescriptionBase):
    pass


class MediaDescriptionUpdate(BaseModel):
    file_number: Optional[int] = None
    episode_title: Optional[str] = None
    media_type: Optional[MediaTypeEnum] = None
    file_name: Optional[str] = None
    expected_filename: Optional[str] = None
    program_id: Optional[UUID] = None
    season_id: Optional[UUID] = None
    episode_number: Optional[int] = None
    media_categories_id_list: Optional[List[str]] = None
    themes_and_genres_id_list: Optional[List[str]] = None
    descriptive_summary_text: Optional[str] = None
    synopsis_text: Optional[str] = None
    contract_start_date_utc: Optional[datetime] = None
    contract_end_date_utc: Optional[datetime] = None
    production_year: Optional[int] = None
    original_broadcast_date_utc: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    audience_category_id: Optional[UUID] = None
    subscription_plan_id_list: Optional[List[str]] = None
    public_person_id_list: Optional[List[str]] = None
    main_thumbnail_url: Optional[str] = None
    secondary_thumbnail_url: Optional[str] = None
    trailer_url: Optional[str] = None
    rating_system: Optional[str] = None
    content_warning: Optional[str] = None
    original_language: Optional[str] = None
    subtitle_languages_available: Optional[List[str]] = None
    audio_languages_available: Optional[List[str]] = None
    is_premium_content: Optional[bool] = None
    is_featured: Optional[bool] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    share_count: Optional[int] = None
    content_status: Optional[ContentStatusEnum] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[List[str]] = None
    social_media_hashtags: Optional[List[str]] = None
    external_id: Optional[str] = None
    source_platform: Optional[str] = None
    rights_holder: Optional[str] = None
    distribution_territories: Optional[List[str]] = None


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