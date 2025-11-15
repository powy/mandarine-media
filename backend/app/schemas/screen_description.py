from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
import enum

from .media_showcase import MediaShowcaseJSON


class ScreenTypeEnum(str, enum.Enum):
    """Enum defining different types of screens in the application"""
    homepage = "homepage"
    category = "category"
    search = "search"
    profile = "profile"
    discover = "discover"


# ScreenDescription schemas
class ScreenDescriptionBase(BaseModel):
    title: str = Field(..., description="Display title for the screen", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Optional description of the screen", max_length=1000)
    screen_type: Optional[ScreenTypeEnum] = Field(None, description="Type of screen this represents")
    is_active: bool = Field(True, description="Whether the screen content is active")
    display_order: int = Field(0, description="Order in which screen appears", ge=0)
    in_top_menu: bool = Field(False, description="Whether the screen appears in the top menu")
    media_showcases: Optional[List[str]] = Field(default_factory=list, description="List of content list IDs (UUIDs as strings)")

    # v1.9 field
    slug: Optional[str] = Field(None, description="SEO-friendly URL slug (auto-generated from title if empty)")

    @field_validator('media_showcases')
    @classmethod
    def validate_media_showcases(cls, v):
        if v is None:
            return []
        # Validate that all items are valid UUID strings
        for item in v:
            try:
                UUID(item)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid UUID format: {item}")
        return v


class ScreenDescriptionCreate(ScreenDescriptionBase):
    pass


class ScreenDescriptionUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Display title for the screen", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Optional description of the screen", max_length=1000)
    screen_type: Optional[ScreenTypeEnum] = Field(None, description="Type of screen this represents")
    is_active: Optional[bool] = Field(None, description="Whether the screen content is active")
    display_order: Optional[int] = Field(None, description="Order in which screen appears", ge=0)
    in_top_menu: Optional[bool] = Field(None, description="Whether the screen appears in the top menu")
    media_showcases: Optional[List[str]] = Field(None, description="List of content list IDs (UUIDs as strings)")

    # v1.9 field
    slug: Optional[str] = Field(None, description="SEO-friendly URL slug (auto-generated from title if empty)")

    @field_validator('media_showcases')
    @classmethod
    def validate_media_showcases(cls, v):
        if v is None:
            return v
        # Validate that all items are valid UUID strings
        for item in v:
            try:
                UUID(item)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid UUID format: {item}")
        return v


class ScreenDescriptionInDB(ScreenDescriptionBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: datetime
    json_last_updated: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ScreenDescription(ScreenDescriptionInDB):
    pass


class ScreenDescriptionWithJSON(ScreenDescription):
    json_data: Optional[Dict[str, Any]] = Field(None, description="Cached JSON representation")


# Request/Response schemas for specific operations
class ScreenDescriptionReorderRequest(BaseModel):
    media_showcases: List[str] = Field(..., description="New ordered list of content list IDs")

    @field_validator('media_showcases')
    @classmethod
    def validate_media_showcases(cls, v):
        # Validate that all items are valid UUID strings
        for item in v:
            try:
                UUID(item)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid UUID format: {item}")
        return v


class ScreenDescriptionResponse(BaseModel):
    data: List[ScreenDescription]
    pagination: Dict[str, Any]


class ScreenDescriptionMediaShowcase(MediaShowcaseJSON):
    """Schema for media showcases within a screen description's JSON cache"""
    screen_display_order: int = Field(..., description="Display order of this showcase within the screen")


# Deprecated: Use ScreenDescriptionMediaShowcase instead
class ScreenDescriptionListData(BaseModel):
    """Schema for content lists within a screen description's JSON cache"""
    id: str
    title: str
    thumbnail_format: str
    display_order: int
    screen_display_order: int
    items: List[Dict[str, Any]]  # Content list items


class ScreenDescriptionJSONResponse(BaseModel):
    """Schema for cached JSON content"""
    id: str
    title: str
    description: Optional[str]
    screen_type: Optional[ScreenTypeEnum]
    is_active: bool
    display_order: int
    in_top_menu: bool
    last_updated: Optional[str]
    media_showcases: List[ScreenDescriptionMediaShowcase]


class ScreenDescriptionByTypeResponse(BaseModel):
    """Response schema for screens filtered by type"""
    screen_type: ScreenTypeEnum
    screens: List[ScreenDescription]
    count: int