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


class ContentTypeEnum(str, enum.Enum):
    """Enum defining content types that can be included in content lists"""
    program = "program"
    season = "season"
    media_description = "media_description"


# ContentList schemas
class ContentListBase(BaseModel):
    title: str = Field(..., description="Display title for the content list", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Optional description of the content list", max_length=1000)
    thumbnail_format: ThumbnailFormatEnum = Field(..., description="Thumbnail format for all items in this list")
    is_active: bool = Field(True, description="Whether the content list is active")
    display_order: int = Field(0, description="Order in which content list appears", ge=0)
    list_type: str = Field(..., description="List type: classic or carrousel")
    percentage_width: int = Field(..., description="Percentage width", ge=0, le=100)
    percentage_height: int = Field(..., description="Percentage height", ge=0, le=100)
    content_items: Optional[List[str]] = Field(default_factory=list, description="List of content IDs (UUIDs as strings)")
    content_types: Optional[List[ContentTypeEnum]] = Field(default_factory=list, description="List of content types corresponding to content_items")
    
    # v1.9 fields - Content filtering and organization
    media_type: Optional[str] = Field(None, description="Filter content by media type")
    # v1.12 changes: replaced media_categories_id_list with media_categories_list (enum values)
    media_categories_list: Optional[List[str]] = Field(None, description="Filter by category enum values")
    # v1.12 changes: replaced themes_and_genres_id_list with media_themes_id_list
    media_themes_id_list: Optional[List[str]] = Field(None, description="Filter by MediaTheme IDs")
    latest_first: bool = Field(True, description="Order items by latest first")
    slug: Optional[str] = Field(None, description="URL slug (auto-generated from title if empty)")

    @field_validator('content_items')
    @classmethod
    def validate_content_items(cls, v):
        if v is None:
            return []
        # Validate that all items are valid UUID strings
        for item in v:
            try:
                UUID(item)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid UUID format: {item}")
        return v

    @field_validator('content_types')
    @classmethod
    def validate_content_types(cls, v):
        if v is None:
            return []
        return v

    def model_post_init(self, __context):
        """Validate that content_items and content_types have the same length"""
        if self.content_items and self.content_types:
            if len(self.content_items) != len(self.content_types):
                raise ValueError("content_items and content_types must have the same length")


class ContentListCreate(ContentListBase):
    pass


class ContentListUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Display title for the content list", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Optional description of the content list", max_length=1000)
    thumbnail_format: Optional[ThumbnailFormatEnum] = Field(None, description="Thumbnail format for all items in this list")
    is_active: Optional[bool] = Field(None, description="Whether the content list is active")
    display_order: Optional[int] = Field(None, description="Order in which content list appears", ge=0)
    list_type: Optional[str] = Field(None, description="List type: classic or carrousel")
    percentage_width: Optional[int] = Field(None, description="Percentage width", ge=0, le=100)
    percentage_height: Optional[int] = Field(None, description="Percentage height", ge=0, le=100)
    content_items: Optional[List[str]] = Field(None, description="List of content IDs (UUIDs as strings)")
    content_types: Optional[List[ContentTypeEnum]] = Field(None, description="List of content types corresponding to content_items")
    
    # v1.9 fields - Content filtering and organization
    media_type: Optional[str] = Field(None, description="Filter content by media type")
    # v1.12 changes: replaced media_categories_id_list with media_categories_list (enum values)
    media_categories_list: Optional[List[str]] = Field(None, description="Filter by category enum values")
    # v1.12 changes: replaced themes_and_genres_id_list with media_themes_id_list
    media_themes_id_list: Optional[List[str]] = Field(None, description="Filter by MediaTheme IDs")
    latest_first: Optional[bool] = Field(None, description="Order items by latest first")
    slug: Optional[str] = Field(None, description="URL slug (auto-generated from title if empty)")

    @field_validator('content_items')
    @classmethod
    def validate_content_items(cls, v):
        if v is None:
            return v
        # Validate that all items are valid UUID strings
        for item in v:
            try:
                UUID(item)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid UUID format: {item}")
        return v

    def model_post_init(self, __context):
        """Validate that content_items and content_types have the same length"""
        if self.content_items is not None and self.content_types is not None:
            if len(self.content_items) != len(self.content_types):
                raise ValueError("content_items and content_types must have the same length")


class ContentListInDB(ContentListBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: datetime
    json_last_updated: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ContentList(ContentListInDB):
    pass


class ContentListWithJSON(ContentList):
    json_data: Optional[Dict[str, Any]] = Field(None, description="Cached JSON representation")


# Request/Response schemas for specific operations
class ContentListReorderRequest(BaseModel):
    content_items: List[str] = Field(..., description="New ordered list of content IDs")
    content_types: List[ContentTypeEnum] = Field(..., description="New ordered list of content types")

    @field_validator('content_items')
    @classmethod
    def validate_content_items(cls, v):
        # Validate that all items are valid UUID strings
        for item in v:
            try:
                UUID(item)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid UUID format: {item}")
        return v

    def model_post_init(self, __context):
        """Validate that content_items and content_types have the same length"""
        if len(self.content_items) != len(self.content_types):
            raise ValueError("content_items and content_types must have the same length")


class ContentListResponse(BaseModel):
    data: List[ContentList]
    pagination: Dict[str, Any]


class ContentListItemData(BaseModel):
    """Schema for individual items within a content list's JSON cache"""
    content_id: str
    content_type: ContentTypeEnum
    title: str
    thumbnail_url: Optional[str] = None
    display_order: int


class ContentListJSONResponse(BaseModel):
    """Schema for cached JSON content"""
    id: str
    title: str
    description: Optional[str]
    thumbnail_format: ThumbnailFormatEnum
    is_active: bool
    display_order: int
    last_updated: Optional[str]
    items: List[ContentListItemData]