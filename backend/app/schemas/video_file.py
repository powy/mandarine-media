from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import enum


class EncodingStatusEnum(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class UploadMethodEnum(str, enum.Enum):
    existing_url = "existing_url"
    new_upload = "new_upload"


class UploadStatusEnum(str, enum.Enum):
    metadata_only = "metadata_only"
    file_uploading = "file_uploading"
    upload_completed = "upload_completed"
    upload_failed = "upload_failed"
    ready_no_subtitles = "ready_no_subtitles"


class VideoFileBase(BaseModel):
    file_url: Optional[str] = Field(None, description="File storage URL")
    file_name: str = Field(..., description="Original filename")
    file_size_bytes: Optional[int] = Field(None, description="File size in bytes")
    encoding_status: EncodingStatusEnum = Field(default=EncodingStatusEnum.pending)
    
    # New fields for dual upload functionality
    upload_method: UploadMethodEnum = Field(default=UploadMethodEnum.new_upload, description="Upload method used")
    upload_status: UploadStatusEnum = Field(default=UploadStatusEnum.metadata_only, description="Current upload status")
    upload_timestamp: Optional[datetime] = Field(None, description="When file upload was initiated")
    external_url: Optional[str] = Field(None, description="External media URL for existing files")
    encodage_date_utc: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    max_resolution_width: Optional[int] = None
    max_resolution_height: Optional[int] = None
    bitrate_kbps: Optional[int] = None
    frame_rate: Optional[float] = None
    aspect_ratio: Optional[str] = None
    audio_sample_rate: Optional[int] = None
    subtitle_tracks: Optional[List[str]] = None
    encoding_profile: Optional[str] = None
    mux_asset_id: Optional[str] = None
    mux_playback_id: Optional[str] = None
    drm_protection: Optional[bool] = False
    
    # v1.9 fields - New environment and protection fields
    environment_key: Optional[str] = Field(None, description="Environment identifier key")
    slug: Optional[str] = Field(None, description="SEO-friendly URL slug (auto-generated from file_name if empty)")
    
    # NEW v1.10-C fields
    playback_policy: Optional[str] = None
    subtitle_tracks_text_list: Optional[List[str]] = None
    resolutions_list: Optional[List[str]] = None
    accessibilities_list: Optional[List[str]] = None
    
    # NEW v1.4 fields - Language fields
    audio_languages_id_list: Optional[List[str]] = None


class VideoFileCreate(VideoFileBase):
    pass


class VideoFileUpdate(BaseModel):
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    encoding_status: Optional[EncodingStatusEnum] = None
    upload_method: Optional[UploadMethodEnum] = None
    upload_status: Optional[UploadStatusEnum] = None
    upload_timestamp: Optional[datetime] = None
    external_url: Optional[str] = None
    encodage_date_utc: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    max_resolution_width: Optional[int] = None
    max_resolution_height: Optional[int] = None
    bitrate_kbps: Optional[int] = None
    frame_rate: Optional[float] = None
    aspect_ratio: Optional[str] = None
    audio_sample_rate: Optional[int] = None
    subtitle_tracks: Optional[List[str]] = None
    encoding_profile: Optional[str] = None
    mux_asset_id: Optional[str] = None
    mux_playback_id: Optional[str] = None
    drm_protection: Optional[bool] = None
    
    # v1.9 fields - New environment and protection fields
    environment_key: Optional[str] = Field(None, description="Environment identifier key")
    slug: Optional[str] = Field(None, description="SEO-friendly URL slug (auto-generated from file_name if empty)")
    
    # NEW v1.10-C fields
    playback_policy: Optional[str] = None
    subtitle_tracks_text_list: Optional[List[str]] = None
    resolutions_list: Optional[List[str]] = None
    accessibilities_list: Optional[List[str]] = None
    
    # NEW v1.4 fields - Language fields
    audio_languages_id_list: Optional[List[str]] = None


class VideoFileInDB(VideoFileBase):
    id: UUID
    creation_date_utc: datetime

    class Config:
        from_attributes = True


class VideoFile(VideoFileInDB):
    pass


class VideoFileList(BaseModel):
    data: List[VideoFile]
    pagination: dict


class VideoFileMetadataCreate(BaseModel):
    """Schema for creating video file metadata only (first step of two-step upload)"""
    file_name: str = Field(..., description="Original filename")
    upload_method: UploadMethodEnum = Field(default=UploadMethodEnum.new_upload)
    external_url: Optional[str] = Field(None, description="External media URL for existing files")


class VideoFileExistingUrlCreate(BaseModel):
    """Schema for creating video file with existing URL"""
    file_name: str = Field(..., description="Display name for the file")
    external_url: str = Field(..., description="External media URL")


class VideoFileUploadResponse(BaseModel):
    """Response after creating metadata-only video file"""
    id: UUID
    upload_url: Optional[str] = Field(None, description="URL for uploading the actual file")
    upload_status: UploadStatusEnum
    message: str


class VideoFileTestRequest(BaseModel):
    """Schema for testing video file playback"""
    video_file_id: UUID


class VideoFileTestResponse(BaseModel):
    """Response for video file test"""
    success: bool
    playback_url: Optional[str] = None
    error_message: Optional[str] = None
    mux_playback_id: Optional[str] = None