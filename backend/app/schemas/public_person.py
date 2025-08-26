from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class PublicPersonBase(BaseModel):
    # Required field in v1.5
    stage_name_roman: str = Field(..., min_length=1, description="Romanized stage name (required)")
    
    # Optional name fields (v1.5)
    first_name_hangul: Optional[str] = Field(None, description="Korean first name")
    last_name_hangul: Optional[str] = Field(None, description="Korean last name")
    first_name_roman: Optional[str] = Field(None, description="Romanized first name")
    last_name_roman: Optional[str] = Field(None, description="Romanized last name")
    stage_name_hangul: Optional[str] = Field(None, description="Korean stage name")
    
    # v1.5 fields
    face_image_id: Optional[UUID] = Field(None, description="Face image ID reference")

    @field_validator('stage_name_roman')
    @classmethod
    def validate_stage_name_roman(cls, v):
        if not v or not v.strip():
            raise ValueError('Stage name (Roman) cannot be empty or only whitespace')
        return v.strip()
    
    @field_validator('first_name_hangul', 'last_name_hangul', 'first_name_roman', 'last_name_roman', 'stage_name_hangul')
    @classmethod
    def validate_optional_name_fields(cls, v):
        # For optional fields, if provided, they should not be empty or only whitespace
        if v is not None and (not v or not v.strip()):
            raise ValueError('Name fields cannot be empty or only whitespace if provided')
        return v.strip() if v else v


class PublicPersonCreate(PublicPersonBase):
    pass


class PublicPersonUpdate(BaseModel):
    # All fields optional for updates in v1.5
    stage_name_roman: Optional[str] = Field(None, min_length=1, description="Romanized stage name")
    first_name_hangul: Optional[str] = Field(None, description="Korean first name")
    last_name_hangul: Optional[str] = Field(None, description="Korean last name")
    first_name_roman: Optional[str] = Field(None, description="Romanized first name")
    last_name_roman: Optional[str] = Field(None, description="Romanized last name")
    stage_name_hangul: Optional[str] = Field(None, description="Korean stage name")
    face_image_id: Optional[UUID] = Field(None, description="Face image ID reference")
    
    @field_validator('stage_name_roman', 'first_name_hangul', 'last_name_hangul', 'first_name_roman', 'last_name_roman', 'stage_name_hangul')
    @classmethod
    def validate_name_fields(cls, v):
        # For optional fields, if provided, they should not be empty or only whitespace
        if v is not None and (not v or not v.strip()):
            raise ValueError('Name fields cannot be empty or only whitespace if provided')
        return v.strip() if v else v


class PublicPersonInDB(PublicPersonBase):
    id: UUID
    creation_date_utc: datetime

    class Config:
        from_attributes = True


class PublicPerson(PublicPersonInDB):
    pass


class PublicPersonList(BaseModel):
    data: List[PublicPerson]
    pagination: dict