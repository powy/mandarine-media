from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ProgramBase(BaseModel):
    program_name: str = Field(..., min_length=1)
    general_media_description_id: Optional[UUID] = None
    
    @field_validator('program_name')
    @classmethod
    def validate_program_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Program name cannot be empty or only whitespace')
        return v.strip()


class ProgramCreateRequest(BaseModel):
    """Schema that accepts legacy field names for backward compatibility"""
    program_name: str = Field(..., min_length=1)
    general_media_description_id: Optional[UUID] = None
    # Legacy field support
    general_media_description: Optional[str] = None
    
    @field_validator('program_name')
    @classmethod
    def validate_program_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Program name cannot be empty or only whitespace')
        return v.strip()


class ProgramCreate(ProgramBase):
    pass


class ProgramUpdate(BaseModel):
    program_name: Optional[str] = Field(None, min_length=1)
    general_media_description_id: Optional[UUID] = None
    
    @field_validator('program_name')
    @classmethod
    def validate_program_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Program name cannot be empty or only whitespace')
        return v.strip() if v else v


class ProgramInDB(ProgramBase):
    id: UUID
    creation_date_utc: datetime
    
    model_config = ConfigDict(from_attributes=True)


class Program(ProgramInDB):
    pass


# JSON Cache Schemas for Program

class ProgramJSON(BaseModel):
    """Complete JSON representation of a Program with nested seasons"""
    id: str
    program_name: str
    creation_date_utc: str
    last_updated: str
    season_count: int
    general_description: Optional[dict] = None  # Serialized MediaDescription
    seasons: List[dict]  # List of SeasonJSON objects


class ProgramBulkRefreshResponse(BaseModel):
    """Schema for bulk JSON cache refresh response"""
    message: str
    refreshed_count: int
    failed_count: int
    total_count: int
    errors: List[str] = []


# Update existing Program schema to include JSON fields
class ProgramWithJSON(ProgramInDB):
    """Program with JSON cache metadata"""
    json_last_updated: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)