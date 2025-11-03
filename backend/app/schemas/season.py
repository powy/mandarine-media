from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class SeasonBase(BaseModel):
    program_id: Optional[UUID] = None
    season_number: int = Field(..., gt=0, le=9999)
    season_name: Optional[str] = None
    general_media_description_id: Optional[UUID] = None
    # Note: Removed episodes_id_list - replaced with proper relationship
    
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
    # Note: Removed episodes_id_list - replaced with proper relationship
    
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
    
    model_config = ConfigDict(from_attributes=True)


class Season(SeasonInDB):
    pass


# JSON Cache Schemas for Season

class SeasonEpisodeItemJSON(BaseModel):
    """Individual episode in the season JSON cache"""
    id: str
    title: str
    media_type: str
    friendly_url: Optional[str]
    slug: Optional[str]
    media_categories_list: Optional[List[str]]
    descriptive_summary_text: Optional[str]
    is_featured: bool
    program_id: Optional[str]
    season_id: Optional[str]
    episode_number: Optional[int]
    episode_order: int  # Order within the season
    # Picture format URLs for all 5 supported formats
    image_1920_1080_url: Optional[str] = None
    image_1920_720_url: Optional[str] = None
    image_1080_1080_url: Optional[str] = None
    image_810_1080_url: Optional[str] = None
    image_1080_1920_url: Optional[str] = None


class SeasonJSON(BaseModel):
    """Complete JSON representation of a Season with episodes"""
    id: str
    season_number: int
    season_name: Optional[str]
    program_id: Optional[str]
    creation_date_utc: str
    last_updated: str
    episode_count: int
    general_description: Optional[dict] = None  # Serialized MediaDescription
    episodes: List[SeasonEpisodeItemJSON]


class SeasonBulkRefreshResponse(BaseModel):
    """Schema for bulk JSON cache refresh response"""
    message: str
    refreshed_count: int
    failed_count: int
    total_count: int
    errors: List[str] = []


# Update existing Season schema to include JSON fields
class SeasonWithJSON(SeasonInDB):
    """Season with JSON cache metadata"""
    json_last_updated: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)