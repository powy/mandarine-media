from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from uuid import UUID


# Shared properties
class MediaThemeBase(BaseModel):
    name: str

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty or whitespace only')
        return v.strip()


# Properties to receive on MediaTheme creation
class MediaThemeCreate(MediaThemeBase):
    pass


# Properties to receive on MediaTheme update
class MediaThemeUpdate(BaseModel):
    name: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Name cannot be empty or whitespace only')
        return v.strip() if v else v


# Properties shared by models stored in DB
class MediaThemeInDBBase(MediaThemeBase):
    id: UUID
    creation_date_utc: datetime

    model_config = ConfigDict(from_attributes=True)


# Properties to return to client
class MediaTheme(MediaThemeInDBBase):
    pass


# Properties stored in DB
class MediaThemeInDB(MediaThemeInDBBase):
    pass