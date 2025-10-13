from pydantic import BaseModel, Field, validator, ConfigDict, field_validator
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime, date
from uuid import UUID
import enum

from app.schemas.media_description_person import PersonRoleSimple, PersonRoleCreate
from app.schemas.pagination import PaginatedResponse


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
    short_film = "short-film"
    musical = "musical"
    animation = "animation"
    documentary = "documentary"
    tvshow = "tvshow"
    web_drama = "web-drama"
    other = "other"


# Simple schemas for nested relationships
class PublicPersonSimple(BaseModel):
    id: UUID
    stage_name_roman: str

    model_config = ConfigDict(from_attributes=True)


class CountrySimple(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class LanguageSimple(BaseModel):
    id: UUID
    name: str
    sigle: str

    model_config = ConfigDict(from_attributes=True)


class AudienceCategorySimple(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class SubscriptionPlanSimple(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class VideoFileSimple(BaseModel):
    id: UUID
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    duration_seconds: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class MediaThemeSimple(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class PictureSimple(BaseModel):
    id: UUID
    image_url: str
    file_name: Optional[str] = None
    alt_text: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MediaDescriptionBase(BaseModel):
    file_number: int = Field(..., description="Human-readable unique ID (auto-generated, provided values are ignored)")
    episode_title: str = Field(..., description="Content title")
    media_type: MediaTypeEnum = Field(..., description="Content type")
    expected_filename: Optional[str] = None
    main_video_file_id: Optional[UUID] = None
    program_id: Optional[UUID] = None
    season_id: Optional[UUID] = None
    episode_number: Optional[int] = None
    media_categories_list: Optional[List[MediaCategoryEnum]] = None
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
    tags: Optional[List[str]] = Field(
        None, description="General purpose tags (distinct from hashtags)"
    )
    external_identifier_text: Optional[str] = Field(
        None, description="External system identifier"
    )
    rights_holder: Optional[str] = None

    # v1.10-C fields
    friendly_url: Optional[str] = None

    # v1.4 fields - Business fields (updated)
    copyright_owner_text: Optional[str] = Field(
        None, description="Copyright owner name/text"
    )

    # v1.4 fields - Metadata fields (v1.9 renamed)
    slug: Optional[str] = Field(
        None, description="SEO-friendly URL slug (auto-generated from title if empty)"
    )
    human_keywords_text_list: Optional[List[str]] = Field(
        None, description="Human-readable tags/keywords"
    )

    # v1.4 fields - Image fields
    image_1920_1080_id: Optional[UUID] = None
    image_1920_720_id: Optional[UUID] = None
    image_1080_1080_id: Optional[UUID] = None
    image_810_1080_id: Optional[UUID] = None
    image_1080_1920_id: Optional[UUID] = None

    # v1.4 test image fields - REMOVED (ghost columns)

    # v1.4 fields - Revenue fields (Admin only)
    translation_share: Optional[float] = None
    sacem_share: Optional[float] = None
    other_share: Optional[float] = None
    revenue_share: Optional[float] = None
    paid_token_cost: Optional[int] = None

    # Note: Removed v1.12 JSON fields - replaced with proper relationship handling in Create/Update schemas


class MediaDescriptionCreate(MediaDescriptionBase):
    # Additional fields for creating relationships
    actor_ids: Optional[List[str]] = Field(
        None, description="List of PublicPerson IDs for actors"
    )
    director_ids: Optional[List[str]] = Field(
        None, description="List of PublicPerson IDs for directors"
    )
    producer_ids: Optional[List[str]] = Field(
        None, description="List of PublicPerson IDs for producers"
    )
    author_ids: Optional[List[str]] = Field(
        None, description="List of PublicPerson IDs for authors"
    )
    origin_country_ids: Optional[List[str]] = Field(
        None, description="List of Country IDs for origin countries"
    )
    available_country_ids: Optional[List[str]] = Field(
        None, description="List of Country IDs for available countries"
    )
    original_language_ids: Optional[List[str]] = Field(
        None, description="List of Language IDs for original languages"
    )
    available_subtitle_language_ids: Optional[List[str]] = Field(
        None, description="List of Language IDs for available subtitle languages"
    )
    available_audio_language_ids: Optional[List[str]] = Field(
        None, description="List of Language IDs for available audio languages"
    )
    audience_category_ids: Optional[List[str]] = Field(
        None, description="List of AudienceCategory IDs"
    )
    eligible_plan_ids: Optional[List[str]] = Field(
        None, description="List of SubscriptionPlan IDs"
    )
    trailer_ids: Optional[List[str]] = Field(
        None, description="List of VideoFile IDs for trailers"
    )
    excerpt_ids: Optional[List[str]] = Field(
        None, description="List of VideoFile IDs for excerpts"
    )
    media_theme_ids: Optional[List[str]] = Field(
        None, description="List of MediaTheme IDs"
    )
    additional_image_ids: Optional[List[str]] = Field(
        None, description="List of Picture IDs for additional images"
    )

    # New unified people roles (optional alternative to individual role fields)
    people_roles: Optional[List['PersonRoleCreate']] = Field(
        None, description="List of person role assignments with positions"
    )


class MediaDescriptionUpdate(BaseModel):
    file_number: Optional[int] = None
    episode_title: Optional[str] = None
    media_type: Optional[MediaTypeEnum] = None
    expected_filename: Optional[str] = None
    main_video_file_id: Optional[UUID] = None
    program_id: Optional[UUID] = None
    season_id: Optional[UUID] = None
    episode_number: Optional[int] = None
    media_categories_list: Optional[List[MediaCategoryEnum]] = None
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
    tags: Optional[List[str]] = None
    external_identifier_text: Optional[str] = None
    rights_holder: Optional[str] = None
    friendly_url: Optional[str] = None
    copyright_owner_text: Optional[str] = None
    slug: Optional[str] = None
    human_keywords_text_list: Optional[List[str]] = None
    
    # Image fields for updates
    image_1920_1080_id: Optional[UUID] = None
    image_1920_720_id: Optional[UUID] = None
    image_1080_1080_id: Optional[UUID] = None
    image_810_1080_id: Optional[UUID] = None
    image_1080_1920_id: Optional[UUID] = None

    # Revenue fields for updates
    translation_share: Optional[float] = None
    sacem_share: Optional[float] = None
    other_share: Optional[float] = None
    revenue_share: Optional[float] = None
    paid_token_cost: Optional[int] = None

    # Relationship update fields
    actor_ids: Optional[List[str]] = None
    director_ids: Optional[List[str]] = None
    producer_ids: Optional[List[str]] = None
    author_ids: Optional[List[str]] = None
    origin_country_ids: Optional[List[str]] = None
    available_country_ids: Optional[List[str]] = None
    original_language_ids: Optional[List[str]] = None
    available_subtitle_language_ids: Optional[List[str]] = None
    available_audio_language_ids: Optional[List[str]] = None
    audience_category_ids: Optional[List[str]] = None
    eligible_plan_ids: Optional[List[str]] = None
    trailer_ids: Optional[List[str]] = None
    excerpt_ids: Optional[List[str]] = None
    media_theme_ids: Optional[List[str]] = None
    additional_image_ids: Optional[List[str]] = None

    # New unified people roles for updates
    people_roles: Optional[List['PersonRoleCreate']] = None


class MediaDescriptionInDBBase(MediaDescriptionBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MediaDescription(MediaDescriptionInDBBase):
    # Include the relationship data - keeping backward compatibility
    actors: Optional[List[PublicPersonSimple]] = []
    directors: Optional[List[PublicPersonSimple]] = []
    producers: Optional[List[PublicPersonSimple]] = []
    authors: Optional[List[PublicPersonSimple]] = []

    # New unified people roles structure
    people_roles: Optional[List['PersonRoleSimple']] = []
    origin_countries: Optional[List[CountrySimple]] = []
    available_countries: Optional[List[CountrySimple]] = []
    original_languages: Optional[List[LanguageSimple]] = []
    available_subtitle_languages: Optional[List[LanguageSimple]] = []
    available_audio_languages: Optional[List[LanguageSimple]] = []
    audience_categories: Optional[List[AudienceCategorySimple]] = []
    eligible_plans: Optional[List[SubscriptionPlanSimple]] = []
    trailers: Optional[List[VideoFileSimple]] = []
    excerpts: Optional[List[VideoFileSimple]] = []
    media_themes: Optional[List[MediaThemeSimple]] = []
    additional_images: Optional[List[PictureSimple]] = []


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
    season_id: Optional[UUID] = None
    episode_number: Optional[int] = None

    # Image fields - needed for episode/season list displays
    image_1920_1080_id: Optional[UUID] = None
    image_1920_720_id: Optional[UUID] = None
    image_1080_1080_id: Optional[UUID] = None
    image_810_1080_id: Optional[UUID] = None
    image_1080_1920_id: Optional[UUID] = None

    # Media categories - lightweight enum list for filtering
    media_categories_list: Optional[List[MediaCategoryEnum]] = None

    # Media themes - relationship objects for filtering
    media_themes: Optional[List[MediaThemeSimple]] = []

    model_config = ConfigDict(from_attributes=True)


class MediaDescriptionListResponse(PaginatedResponse[MediaDescriptionList]):
    pass


class MediaDescriptionCreateFromText(BaseModel):
    """Schema for creating media description from text fields instead of UUIDs"""

    # Required fields
    episode_title: str = Field(..., description="Content title")
    media_type: MediaTypeEnum = Field(..., description="Content type")

    # Optional file_number - will be auto-generated if not provided
    file_number: Optional[int] = Field(
        None, description="Human-readable unique ID (auto-generated if not provided)"
    )

    # Text fields that will be converted to UUIDs via get-or-create
    program_name: Optional[str] = Field(
        None, description="Program name (will be converted to program_id)"
    )
    season_name: Optional[str] = Field(
        None, description="Season name (will be converted to season_id)"
    )
    theme_names: Optional[List[str]] = Field(
        None, description="List of theme names (will be converted to theme IDs)"
    )

    # Image fields - lookup by file_name, don't create if missing
    image_1920_1080_filename: Optional[str] = Field(
        None, description="Image filename for 1920x1080 format"
    )
    image_1920_720_filename: Optional[str] = Field(
        None, description="Image filename for 1920x720 format"
    )
    image_1080_1080_filename: Optional[str] = Field(
        None, description="Image filename for 1080x1080 format"
    )
    image_810_1080_filename: Optional[str] = Field(
        None, description="Image filename for 810x1080 format"
    )
    image_1080_1920_filename: Optional[str] = Field(
        None, description="Image filename for 1080x1920 format"
    )

    # Person fields - lookup by stage_name_roman
    actor_names: Optional[List[str]] = Field(
        None, description="List of actor names (stage_name_roman)"
    )
    director_names: Optional[List[str]] = Field(
        None, description="List of director names (stage_name_roman)"
    )
    producer_names: Optional[List[str]] = Field(
        None, description="List of producer names (stage_name_roman)"
    )
    author_names: Optional[List[str]] = Field(
        None, description="List of author names (stage_name_roman)"
    )

    # Country fields - lookup by name
    origin_country_names: Optional[List[str]] = Field(
        None, description="List of origin country names"
    )
    available_country_names: Optional[List[str]] = Field(
        None, description="List of available country names"
    )

    # Language fields - lookup by name
    original_language_names: Optional[List[str]] = Field(
        None, description="List of original language names"
    )
    available_subtitle_language_names: Optional[List[str]] = Field(
        None, description="List of available subtitle language names"
    )
    available_audio_language_names: Optional[List[str]] = Field(
        None, description="List of available audio language names"
    )

    # Audience category fields - lookup by name
    audience_category_names: Optional[List[str]] = Field(
        None, description="List of audience category names"
    )

    # Eligible plan fields - lookup by name
    eligible_plan_names: Optional[List[str]] = Field(
        None, description="List of eligible plan names"
    )

    # All other fields remain the same as MediaDescriptionBase
    expected_filename: Optional[str] = None
    main_video_file_id: Optional[UUID] = None
    episode_number: Optional[int] = None
    media_categories_list: Optional[List[MediaCategoryEnum]] = None
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
    tags: Optional[List[str]] = Field(
        None, description="General purpose tags (distinct from hashtags)"
    )
    external_identifier_text: Optional[str] = Field(
        None, description="External system identifier"
    )
    rights_holder: Optional[str] = None
    friendly_url: Optional[str] = None
    copyright_owner_text: Optional[str] = Field(
        None, description="Copyright owner name/text"
    )
    slug: Optional[str] = Field(
        None, description="SEO-friendly URL slug (auto-generated from title if empty)"
    )
    human_keywords_text_list: Optional[List[str]] = Field(
        None, description="Human-readable tags/keywords"
    )
    translation_share: Optional[float] = None
    sacem_share: Optional[float] = None
    other_share: Optional[float] = None
    revenue_share: Optional[float] = None
    paid_token_cost: Optional[int] = None

    @field_validator('theme_names', 'actor_names', 'director_names', 'producer_names', 'author_names',
                     'origin_country_names', 'available_country_names', 'original_language_names', 'audience_category_names', 'eligible_plan_names', 'tags', mode='before')
    @classmethod
    def normalize_semicolon_separated_lists(cls, v):
        """
        Handle semicolon-separated strings in list fields.
        Converts strings like "item1 ; item2 ; item3" to ["item1", "item2", "item3"]
        """
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            from app.utils.text_normalization import split_semicolon_separated_list
            return split_semicolon_separated_list(v)
        return v
