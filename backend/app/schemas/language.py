from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime


class LanguageBase(BaseModel):
    name: str = Field(..., min_length=1)
    sigle: str = Field(..., min_length=1)
    
    @field_validator('name', 'sigle')
    @classmethod
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or only whitespace')
        return v.strip()


class LanguageCreate(LanguageBase):
    pass


class LanguageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    sigle: Optional[str] = Field(None, min_length=1)
    
    @field_validator('name', 'sigle')
    @classmethod
    def validate_not_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Field cannot be empty or only whitespace')
        return v.strip() if v else v


class LanguageInDB(LanguageBase):
    id: UUID
    creation_date_utc: datetime
    
    class Config:
        from_attributes = True


class Language(LanguageInDB):
    pass