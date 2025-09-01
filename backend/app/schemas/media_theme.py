from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


# Shared properties
class MediaThemeBase(BaseModel):
    name: str


# Properties to receive on MediaTheme creation
class MediaThemeCreate(MediaThemeBase):
    pass


# Properties to receive on MediaTheme update
class MediaThemeUpdate(BaseModel):
    name: Optional[str] = None


# Properties shared by models stored in DB
class MediaThemeInDBBase(MediaThemeBase):
    id: UUID
    creation_date_utc: datetime

    class Config:
        from_attributes = True


# Properties to return to client
class MediaTheme(MediaThemeInDBBase):
    pass


# Properties stored in DB
class MediaThemeInDB(MediaThemeInDBBase):
    pass