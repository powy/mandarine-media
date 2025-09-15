from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class AudienceCategoryBase(BaseModel):
    name: str = Field(..., description="Category name")


class AudienceCategoryCreate(AudienceCategoryBase):
    pass


class AudienceCategoryUpdate(BaseModel):
    name: Optional[str] = None


class AudienceCategoryInDB(AudienceCategoryBase):
    id: UUID
    creation_date_utc: datetime

    model_config = ConfigDict(from_attributes=True)


class AudienceCategory(AudienceCategoryInDB):
    pass