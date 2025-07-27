from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
import enum


class ThumbnailFormatEnum(str, enum.Enum):
    """Enum defining standardized thumbnail formats for consistent image sizing"""
    small_square = "small_square"          # 1080x1080 - User avatars, compact lists
    medium_portrait = "medium_portrait"    # 810x1080 - Content cards, mobile displays
    large_landscape = "large_landscape"    # 1920x1080 - Homepage banners, desktop displays
    vertical_mobile = "vertical_mobile"    # 1080x1920 - Mobile app screens, stories


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
    content_items: Optional[List[str]] = Field(default_factory=list, description="List of content IDs (UUIDs as strings)")
    content_types: Optional[List[ContentTypeEnum]] = Field(default_factory=list, description="List of content types corresponding to content_items")

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
    content_items: Optional[List[str]] = Field(None, description="List of content IDs (UUIDs as strings)")
    content_types: Optional[List[ContentTypeEnum]] = Field(None, description="List of content types corresponding to content_items")

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