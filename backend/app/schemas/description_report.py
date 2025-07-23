from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.schemas.media_description import MediaDescriptionCreate


class DescriptionReportBase(BaseModel):
    description_id: UUID = Field(..., description="ID of the media description")
    title: str = Field(..., description="Title of the media description")
    success_associated_file: bool = Field(..., description="Whether file association was successful")
    batch_id: Optional[UUID] = Field(None, description="Batch ID for bulk operations")


class DescriptionReportCreate(DescriptionReportBase):
    pass


class DescriptionReportInDB(DescriptionReportBase):
    id: UUID
    timestamp: datetime

    class Config:
        from_attributes = True


class DescriptionReport(DescriptionReportInDB):
    pass


class DescriptionReportList(BaseModel):
    data: List[DescriptionReport]
    pagination: dict


class BulkMediaDescriptionCreate(BaseModel):
    descriptions: List[MediaDescriptionCreate] = Field(..., description="List of media descriptions to create")


class BulkMediaDescriptionResponse(BaseModel):
    created_count: int = Field(..., description="Number of descriptions successfully created")
    failed_count: int = Field(..., description="Number of descriptions that failed")
    batch_id: Optional[UUID] = Field(None, description="Batch ID for tracking this operation")
    reports: List[DescriptionReport] = Field(..., description="Detailed reports for each description")