from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
import enum

from .content_list import ContentListJSONResponse


class ScreenTypeEnum(str, enum.Enum):
    """Enum defining different types of screens in the application"""
    homepage = "homepage"
    category = "category"
    search = "search"
    profile = "profile"
    discover = "discover"


# ScreenContent schemas
class ScreenContentBase(BaseModel):
    title: str = Field(..., description="Display title for the screen", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Optional description of the screen", max_length=1000)
    screen_type: Optional[ScreenTypeEnum] = Field(None, description="Type of screen this represents")
    is_active: bool = Field(True, description="Whether the screen content is active")
    display_order: int = Field(0, description="Order in which screen appears", ge=0)
    content_lists: Optional[List[str]] = Field(default_factory=list, description="List of content list IDs (UUIDs as strings)")

    @field_validator('content_lists')
    @classmethod
    def validate_content_lists(cls, v):
        if v is None:
            return []
        # Validate that all items are valid UUID strings
        for item in v:
            try:
                UUID(item)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid UUID format: {item}")
        return v


class ScreenContentCreate(ScreenContentBase):
    pass


class ScreenContentUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Display title for the screen", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Optional description of the screen", max_length=1000)
    screen_type: Optional[ScreenTypeEnum] = Field(None, description="Type of screen this represents")
    is_active: Optional[bool] = Field(None, description="Whether the screen content is active")
    display_order: Optional[int] = Field(None, description="Order in which screen appears", ge=0)
    content_lists: Optional[List[str]] = Field(None, description="List of content list IDs (UUIDs as strings)")

    @field_validator('content_lists')
    @classmethod
    def validate_content_lists(cls, v):
        if v is None:
            return v
        # Validate that all items are valid UUID strings
        for item in v:
            try:
                UUID(item)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid UUID format: {item}")
        return v


class ScreenContentInDB(ScreenContentBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: datetime
    json_last_updated: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ScreenContent(ScreenContentInDB):
    pass


class ScreenContentWithJSON(ScreenContent):
    json_data: Optional[Dict[str, Any]] = Field(None, description="Cached JSON representation")


# Request/Response schemas for specific operations
class ScreenContentReorderRequest(BaseModel):
    content_lists: List[str] = Field(..., description="New ordered list of content list IDs")

    @field_validator('content_lists')
    @classmethod
    def validate_content_lists(cls, v):
        # Validate that all items are valid UUID strings
        for item in v:
            try:
                UUID(item)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid UUID format: {item}")
        return v


class ScreenContentResponse(BaseModel):
    data: List[ScreenContent]
    pagination: Dict[str, Any]


class ScreenContentListData(BaseModel):
    """Schema for content lists within a screen content's JSON cache"""
    id: str
    title: str
    thumbnail_format: str
    display_order: int
    screen_display_order: int
    items: List[Dict[str, Any]]  # Content list items


class ScreenContentJSONResponse(BaseModel):
    """Schema for cached JSON content"""
    id: str
    title: str
    description: Optional[str]
    screen_type: Optional[ScreenTypeEnum]
    is_active: bool
    display_order: int
    last_updated: Optional[str]
    content_lists: List[ScreenContentListData]


class ScreenContentByTypeResponse(BaseModel):
    """Response schema for screens filtered by type"""
    screen_type: ScreenTypeEnum
    screens: List[ScreenContent]
    count: int