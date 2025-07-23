from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime


class TerritoryBase(BaseModel):
    name: str = Field(..., min_length=1)
    country_id: Optional[UUID] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Territory name cannot be empty or only whitespace')
        return v.strip()


class TerritoryCreate(TerritoryBase):
    pass


class TerritoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    country_id: Optional[UUID] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Territory name cannot be empty or only whitespace')
        return v.strip() if v else v


class TerritoryInDB(TerritoryBase):
    id: UUID
    creation_date_utc: datetime
    
    class Config:
        from_attributes = True


class Territory(TerritoryInDB):
    pass