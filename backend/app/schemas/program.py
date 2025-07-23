from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime


class ProgramBase(BaseModel):
    program_name: str = Field(..., min_length=1)
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
    general_media_description: Optional[str] = None
    
    @field_validator('program_name')
    @classmethod
    def validate_program_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Program name cannot be empty or only whitespace')
        return v.strip() if v else v


class ProgramInDB(ProgramBase):
    id: UUID
    creation_date_utc: datetime
    
    class Config:
        from_attributes = True


class Program(ProgramInDB):
    pass