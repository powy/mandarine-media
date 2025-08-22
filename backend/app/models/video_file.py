from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray
import enum


class EncodingStatusEnum(enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class UploadMethodEnum(enum.Enum):
    existing_url = "existing_url"
    new_upload = "new_upload"


class UploadStatusEnum(enum.Enum):
    metadata_only = "metadata_only"
    file_uploading = "file_uploading"
    upload_completed = "upload_completed"
    upload_failed = "upload_failed"


class VideoFile(Base):
    __tablename__ = "video_file"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    file_url = Column(String, nullable=True)  # Now nullable for two-step upload
    file_name = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)  # Now nullable for two-step upload
    encoding_status = Column(String, nullable=False, default="pending")  # Will use enum validation in schemas
    video_codec = Column(String, nullable=True)  # Now nullable for two-step upload
    audio_codec = Column(String, nullable=True)  # Now nullable for two-step upload
    file_format = Column(String, nullable=True)  # Now nullable for two-step upload
    
    # New fields for dual upload functionality
    upload_method = Column(String, nullable=False, default="new_upload")  # Will use enum validation in schemas
    upload_status = Column(String, nullable=False, default="metadata_only")  # Will use enum validation in schemas
    upload_timestamp = Column(DateTime(timezone=True), nullable=True)  # When file upload was initiated
    external_url = Column(String, nullable=True)  # For existing media URL method
    
    # Optional Fields
    media_description_id = Column(GUID(), ForeignKey("media_description.id"), nullable=True)
    encodage_date_utc = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    resolution_width = Column(Integer, nullable=True)
    resolution_height = Column(Integer, nullable=True)
    bitrate_kbps = Column(Integer, nullable=True)
    frame_rate = Column(Float, nullable=True)
    aspect_ratio = Column(String, nullable=True)
    audio_sample_rate = Column(Integer, nullable=True)
    audio_channels = Column(Integer, nullable=True)
    subtitle_tracks = Column(JSONArray(), nullable=True)
    thumbnail_timestamps = Column(JSONArray(), nullable=True)
    chapter_markers = Column(Text, nullable=True)
    encoding_profile = Column(String, nullable=True)
    cdn_url = Column(String, nullable=True)
    mux_asset_id = Column(String, nullable=True)
    mux_playback_id = Column(String, nullable=True)
    drm_protection = Column(Boolean, default=False, nullable=True)
    geo_restrictions = Column(JSONArray(), nullable=True)
    quality_variants = Column(JSONArray(), nullable=True)
    processing_logs = Column(Text, nullable=True)
    
    # NEW v1.4 fields - Language and technical fields
    subtitle_languages_id_list = Column(JSONArray(), nullable=True)
    audio_languages_id_list = Column(JSONArray(), nullable=True)
    resolutions_id_list = Column(JSONArray(), nullable=True)
    accessibilities_id_list = Column(JSONArray(), nullable=True)
    encodage_date_utc = Column(DateTime(timezone=True), nullable=True)
    
    # NEW v1.9 fields
    environment_key = Column(String, nullable=True, default="")  # Environment identifier
    protection_key = Column(String, nullable=True, default="")  # Content protection key
    slug = Column(String, nullable=True, unique=True)  # SEO-friendly URL slug
    
    # Relationships
    media_description = relationship("MediaDescription", backref="video_files")
    reports = relationship("VideoFileReport", back_populates="video_file")