from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class VideoFileReportBase(BaseModel):
    video_file_id: Optional[UUID] = Field(None, description="ID of the related video file")
    video_file_name: str = Field(..., description="Name of the video file")
    video_file_url: Optional[str] = Field(None, description="URL of the video file")
    file_size: Optional[str] = Field(None, description="File size information")
    duration: Optional[str] = Field(None, description="Video duration")
    
    media_description_id: Optional[UUID] = Field(None, description="ID of related media description")
    media_description_title: Optional[str] = Field(None, description="Title of related media description")
    
    event: str = Field(..., description="Event type: 'possible_orphan', 'file_delete', etc.")
    additional_info: Optional[str] = Field(None, description="Additional information about the event")


class VideoFileReportCreate(VideoFileReportBase):
    pass


class VideoFileReportInDB(VideoFileReportBase):
    id: UUID
    timestamp: datetime

    class Config:
        from_attributes = True


class VideoFileReport(VideoFileReportInDB):
    pass


class VideoFileReportList(BaseModel):
    data: List[VideoFileReport]
    pagination: dict