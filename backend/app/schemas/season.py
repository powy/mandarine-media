from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class SeasonBase(BaseModel):
    program_id: Optional[UUID] = None
    season_number: int = Field(..., gt=0, le=9999)
    season_name: Optional[str] = None
    general_media_description_id: Optional[UUID] = None
    episodes_id_list: Optional[List[str]] = None
    
    @field_validator('season_name')
    @classmethod
    def validate_season_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Season name cannot be empty or only whitespace')
        return v.strip() if v else v


class SeasonCreate(SeasonBase):
    pass


class SeasonUpdate(BaseModel):
    program_id: Optional[UUID] = None
    season_number: Optional[int] = Field(None, gt=0, le=9999)
    season_name: Optional[str] = None
    general_media_description_id: Optional[UUID] = None
    episodes_id_list: Optional[List[str]] = None
    
    @field_validator('season_name')
    @classmethod
    def validate_season_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Season name cannot be empty or only whitespace')
        return v.strip() if v else v
    
    @field_validator('season_number')
    @classmethod  
    def validate_season_number(cls, v):
        # season_number is Optional for partial updates (field can be omitted)
        # But if explicitly provided, it must be valid
        if v is not None and (v <= 0 or v > 9999):
            raise ValueError('Season number must be between 1 and 9999')
        return v
    
    @model_validator(mode='before')
    @classmethod
    def validate_explicit_nulls(cls, data):
        """Validate that explicitly provided fields are not null"""
        if isinstance(data, dict):
            # Check for explicitly provided null values
            if 'season_number' in data and data['season_number'] is None:
                raise ValueError('Season number cannot be null')
        return data


class SeasonInDB(SeasonBase):
    id: UUID
    creation_date_utc: datetime
    
    class Config:
        from_attributes = True


class Season(SeasonInDB):
    pass