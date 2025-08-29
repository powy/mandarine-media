from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ThemeBase(BaseModel):
    name: str = Field(..., description="Theme or genre name")
    description: Optional[str] = Field(None, description="Description of the theme/genre")
    category: Optional[str] = Field(None, description="Category type (genre, theme, mood)")


class ThemeCreate(ThemeBase):
    pass


class ThemeUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Theme or genre name")
    description: Optional[str] = Field(None, description="Description of the theme/genre")
    category: Optional[str] = Field(None, description="Category type (genre, theme, mood)")


class ThemeInDBBase(ThemeBase):
    id: str
    creation_date_utc: datetime

    class Config:
        from_attributes = True


class Theme(ThemeInDBBase):
    pass


class ThemeInDB(ThemeInDBBase):
    pass