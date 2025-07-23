from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# CategoryListItem schemas
class CategoryListItemBase(BaseModel):
    title: str = Field(..., description="Display title for the item")
    display_order: int = Field(0, description="Order in which item appears")
    is_active: bool = Field(True, description="Whether the item is active")
    size_width: Optional[int] = Field(None, description="Display width")
    size_height: Optional[int] = Field(None, description="Display height")
    forward_link: Optional[str] = Field(None, description="Navigation link")
    media_description_id: Optional[UUID] = Field(None, description="Related media description")


class CategoryListItemCreate(CategoryListItemBase):
    category_list_id: UUID = Field(..., description="Parent category list ID")


class CategoryListItemUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Display title for the item")
    display_order: Optional[int] = Field(None, description="Order in which item appears")
    is_active: Optional[bool] = Field(None, description="Whether the item is active")
    size_width: Optional[int] = Field(None, description="Display width")
    size_height: Optional[int] = Field(None, description="Display height")
    forward_link: Optional[str] = Field(None, description="Navigation link")
    media_description_id: Optional[UUID] = Field(None, description="Related media description")


class CategoryListItem(CategoryListItemBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: datetime
    category_list_id: UUID
    
    # Related data
    media_title: Optional[str] = Field(None, description="Title from related media description")
    media_type: Optional[str] = Field(None, description="Type from related media description")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail from related media description")

    class Config:
        from_attributes = True


# CategoryList schemas
class CategoryListBase(BaseModel):
    name: str = Field(..., description="Unique category name", pattern="^[a-z_]+$")
    title: str = Field(..., description="Display title")
    description: Optional[str] = Field(None, description="Category description")
    is_active: bool = Field(True, description="Whether the category is active")
    display_order: int = Field(0, description="Order in which category appears")


class CategoryListCreate(CategoryListBase):
    pass


class CategoryListUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Unique category name", pattern="^[a-z_]+$")
    title: Optional[str] = Field(None, description="Display title")
    description: Optional[str] = Field(None, description="Category description")
    is_active: Optional[bool] = Field(None, description="Whether the category is active")
    display_order: Optional[int] = Field(None, description="Order in which category appears")


class CategoryList(CategoryListBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: datetime
    json_last_updated: Optional[datetime] = Field(None, description="When JSON was last generated")
    
    items: List[CategoryListItem] = Field(default_factory=list, description="Items in this category")

    class Config:
        from_attributes = True


class CategoryListWithItemCount(CategoryListBase):
    id: UUID
    creation_date_utc: datetime
    last_updated_utc: datetime
    json_last_updated: Optional[datetime] = Field(None, description="When JSON was last generated")
    item_count: int = Field(0, description="Number of items in this category")

    class Config:
        from_attributes = True


# JSON output schemas
class CategoryListItemJSON(BaseModel):
    id: str
    title: str
    display_order: int
    size_width: Optional[int]
    size_height: Optional[int]
    media_description_id: Optional[str]
    thumbnail_url: Optional[str]
    forward_link: Optional[str]
    media_title: Optional[str]
    media_type: Optional[str]


class CategoryListJSON(BaseModel):
    id: str
    name: str
    title: str
    description: Optional[str]
    is_active: bool
    display_order: int
    last_updated: Optional[str]
    items: List[CategoryListItemJSON]


# Response schemas
class CategoryListListResponse(BaseModel):
    data: List[CategoryListWithItemCount]
    pagination: Dict[str, Any]


class CategoryListItemListResponse(BaseModel):
    data: List[CategoryListItem]
    pagination: Dict[str, Any]


# Bulk operations
class BulkUpdateCategoryListsRequest(BaseModel):
    category_list_ids: List[UUID] = Field(..., description="List of category list IDs to update JSON for")


class BulkUpdateCategoryListsResponse(BaseModel):
    updated_count: int = Field(..., description="Number of category lists updated")
    failed_count: int = Field(0, description="Number of category lists that failed to update")
    updated_ids: List[str] = Field(default_factory=list, description="IDs of successfully updated lists")
    failed_ids: List[str] = Field(default_factory=list, description="IDs of failed updates")


# Order update schemas
class CategoryListItemOrderUpdate(BaseModel):
    id: UUID
    display_order: int


class UpdateCategoryListItemsOrderRequest(BaseModel):
    items: List[CategoryListItemOrderUpdate] = Field(..., description="Items with new display orders")


# Default category creation schema
class DefaultCategoryConfig(BaseModel):
    name: str
    title: str
    description: Optional[str] = None
    display_order: int = 0
    sub_lists: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Sub-category lists for home page")