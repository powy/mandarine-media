from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
import enum


class ThumbnailFormatEnum(str, enum.Enum):
    """Enum defining standardized thumbnail formats using dimension-based naming"""
    format_1920x1080 = "1920x1080"  # Large landscape - Homepage banners, desktop displays
    format_1920x720 = "1920x720"    # Wide landscape - Cinema format
    format_1080x1080 = "1080x1080"  # Square - User avatars, compact lists
    format_810x1080 = "810x1080"    # Portrait - Content cards, mobile displays
    format_1080x1920 = "1080x1920"  # Vertical mobile - Mobile app screens, stories


class ListTypeEnum(str, enum.Enum):
    """Enum defining list display types"""
    classic = "classic"
    carousel = "carousel"


# MediaShowcase schemas
class MediaShowcaseBase(BaseModel):
    title: str = Field(..., description="Display title for the media showcase", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Optional description of the media showcase", max_length=1000)
    thumbnail_format: ThumbnailFormatEnum = Field(..., description="Thumbnail format for all items in this showcase")
    is_active: bool = Field(True, description="Whether the media showcase is active")
    priority_in_screen: int = Field(0, description="Priority order on screen", ge=0)
    list_type: ListTypeEnum = Field(..., description="List type: classic or carousel")
    percentage_width: int = Field(..., description="Percentage width", ge=0, le=100)
    percentage_height: int = Field(..., description="Percentage height", ge=0, le=100)

    # Content filtering and organization
    media_type: Optional[str] = Field(None, description="Filter content by media type")
    media_categories_list: Optional[List[str]] = Field(None, description="Filter by category enum values")
    latest_first: bool = Field(True, description="Order items by latest first")
    slug: Optional[str] = Field(None, description="URL slug (auto-generated from title if empty)")


class MediaShowcaseCreate(MediaShowcaseBase):
    media_description_ids: Optional[List[UUID]] = Field(default=[], description="Initial ordered list of media descriptions")
    media_theme_ids: Optional[List[UUID]] = Field(default=[], description="Associated media themes")


class MediaShowcaseUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Display title for the media showcase", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Optional description of the media showcase", max_length=1000)
    thumbnail_format: Optional[ThumbnailFormatEnum] = Field(None, description="Thumbnail format for all items in this showcase")
    is_active: Optional[bool] = Field(None, description="Whether the media showcase is active")
    priority_in_screen: Optional[int] = Field(None, description="Priority order on screen", ge=0)
    list_type: Optional[ListTypeEnum] = Field(None, description="List type: classic or carousel")
    percentage_width: Optional[int] = Field(None, description="Percentage width", ge=0, le=100)
    percentage_height: Optional[int] = Field(None, description="Percentage height", ge=0, le=100)

    # Content filtering and organization
    media_type: Optional[str] = Field(None, description="Filter content by media type")
    media_categories_list: Optional[List[str]] = Field(None, description="Filter by category enum values")
    latest_first: Optional[bool] = Field(None, description="Order items by latest first")
    slug: Optional[str] = Field(None, description="URL slug")

    # Relationships
    media_description_ids: Optional[List[UUID]] = Field(None, description="Media descriptions to associate with showcase")
    media_theme_ids: Optional[List[UUID]] = Field(None, description="Media themes to associate with showcase")


class MediaShowcaseItemsUpdate(BaseModel):
    """Schema for replacing all items in a showcase"""
    media_description_ids: List[UUID] = Field(..., description="Complete ordered list to replace current items")


class MediaShowcaseAddItems(BaseModel):
    """Schema for adding items to a showcase"""
    media_description_ids: List[UUID] = Field(..., min_items=1, description="Media descriptions to add")
    position: Optional[int] = Field(None, ge=0, description="Insert position (append if None)")


class MediaShowcaseRemoveItems(BaseModel):
    """Schema for removing items from a showcase"""
    media_description_ids: List[UUID] = Field(..., min_items=1, description="Media descriptions to remove")


class MediaShowcaseReorderItem(BaseModel):
    """Schema for reordering a single item within a showcase"""
    media_description_id: UUID
    new_priority: int = Field(..., ge=0, description="New priority in showcase")


class MediaShowcaseItemJSON(BaseModel):
    """Individual item in the showcase JSON cache"""
    id: str
    title: str
    media_type: str
    friendly_url: Optional[str]
    slug: Optional[str]
    media_categories_list: Optional[List[str]]
    descriptive_summary_text: Optional[str]
    is_featured: bool
    thumbnail_url: Optional[str]
    program_id: Optional[str]
    season_id: Optional[str]
    episode_number: Optional[int]
    display_order: int


class MediaShowcaseJSON(BaseModel):
    """Complete JSON representation of a MediaShowcase"""
    id: str
    title: str
    description: Optional[str]
    thumbnail_format: str
    width_percentage: int
    height_percentage: int
    is_active: bool
    priority_in_screen: int  # Showcase's priority on screen
    list_type: str
    last_updated: Optional[str]
    items: List[MediaShowcaseItemJSON]


class MediaShowcaseInDB(MediaShowcaseBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: datetime
    json_last_updated: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MediaShowcase(MediaShowcaseInDB):
    pass


# Simple schemas for relationship data
class MediaDescriptionSimple(BaseModel):
    id: UUID
    episode_title: str
    media_type: str
    friendly_url: Optional[str] = None
    slug: Optional[str] = None

    model_config = {"from_attributes": True}

class MediaThemeSimple(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}

class MediaShowcaseWithItems(MediaShowcaseInDB):
    """MediaShowcase with full item details"""
    items: List[MediaShowcaseItemJSON] = []
    media_descriptions: List[MediaDescriptionSimple] = []
    media_themes: List[MediaThemeSimple] = []

    model_config = {"from_attributes": True}


# Request/Response schemas for API operations
class MediaShowcaseResponse(BaseModel):
    """Response schema for multiple showcases"""
    data: List[MediaShowcase]
    pagination: Dict[str, Any]


class MediaShowcaseJSONResponse(BaseModel):
    """Response schema for JSON cache endpoint"""
    showcase: MediaShowcaseJSON


class MediaShowcaseItemOperationResponse(BaseModel):
    """Response schema for item operations (add/remove/reorder)"""
    message: str
    showcase_id: str
    items_affected: int
    new_item_count: int


class MediaShowcaseAutoGenerationResponse(BaseModel):
    """Schema for auto-generation endpoint response"""
    message: str
    created_count: int
    updated_count: int
    skipped_count: int
    error_count: int
    errors: List[str]


class MediaShowcaseBulkRefreshResponse(BaseModel):
    """Schema for bulk JSON cache refresh response"""
    message: str
    success_count: int
    error_count: int
    total_count: int
    errors: List[str]