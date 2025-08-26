from pydantic import BaseModel, Field, field_validator, HttpUrl
from typing import Optional
from uuid import UUID
from datetime import datetime


class PictureBase(BaseModel):
    photo_url: str = Field(..., min_length=1)
    file_name: Optional[str] = None
    width: Optional[int] = Field(None, ge=0)
    height: Optional[int] = Field(None, ge=0)
    alt_text: Optional[str] = None
    description: Optional[str] = None
    
    @field_validator('photo_url')
    @classmethod
    def validate_photo_url(cls, v):
        if not v or not v.strip():
            raise ValueError('Photo URL cannot be empty or only whitespace')
        return v.strip()
    
    @field_validator('file_name')
    @classmethod
    def validate_file_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('File name cannot be empty or only whitespace')
        return v.strip() if v else v


class PictureCreate(PictureBase):
    pass


class PictureUpdate(BaseModel):
    photo_url: Optional[str] = Field(None, min_length=1)
    file_name: Optional[str] = None
    width: Optional[int] = Field(None, ge=0)
    height: Optional[int] = Field(None, ge=0)
    alt_text: Optional[str] = None
    description: Optional[str] = None
    
    @field_validator('photo_url')
    @classmethod
    def validate_photo_url(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Photo URL cannot be empty or only whitespace')
        return v.strip() if v else v
    
    @field_validator('file_name')
    @classmethod
    def validate_file_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('File name cannot be empty or only whitespace')
        return v.strip() if v else v


class PictureInDB(PictureBase):
    id: UUID
    creation_date_utc: datetime
    
    class Config:
        from_attributes = True


class Picture(PictureInDB):
    pass