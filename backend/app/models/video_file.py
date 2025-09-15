from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray
from app.models.associations import media_description_trailers, media_description_excerpts, video_file_audio_languages
import enum


class EncodingStatusEnum(enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ResolutionEnum(enum.Enum):
    r4320p = "4320p"
    r2160p = "2160p"
    r1440p = "1440p"
    r1080p = "1080p"
    r720p = "720p"
    r480p = "480p"
    r360p = "360p"


class UploadStatusEnum(enum.Enum):
    metadata_only = "metadata_only"
    file_uploading = "file_uploading"
    upload_completed = "upload_completed"
    upload_failed = "upload_failed"
    ready_no_subtitles = "ready_no_subtitles"


class VideoFile(Base):
    __tablename__ = "video_file"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    file_url = Column(String, nullable=True)  # Now nullable for two-step upload
    file_name = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)  # Now nullable for two-step upload
    encoding_status = Column(String, nullable=False, default="pending")  # Will use enum validation in schemas
    
    # New fields for dual upload functionality
    upload_status = Column(String, nullable=False, default="metadata_only")  # Will use enum validation in schemas
    upload_timestamp = Column(DateTime(timezone=True), nullable=True)  # When file upload was initiated
    external_url = Column(String, nullable=True)  # For existing media URL method
    
    # Optional Fields
    encodage_date_utc = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    max_resolution_width = Column(Integer, nullable=True)
    max_resolution_height = Column(Integer, nullable=True)
    bitrate_kbps = Column(Integer, nullable=True)
    frame_rate = Column(Float, nullable=True)
    aspect_ratio = Column(String, nullable=True)
    audio_sample_rate = Column(Integer, nullable=True)
    subtitle_tracks = Column(JSONArray(), nullable=True)
    encoding_profile = Column(String, nullable=True)
    mux_asset_id = Column(String, nullable=True)
    mux_playback_id = Column(String, nullable=True)
    drm_protection = Column(Boolean, default=False, nullable=True)
    
    # NEW v1.10-C fields
    playback_policy = Column(String, nullable=True)
    subtitle_tracks_text_list = Column(JSONArray(), nullable=True)  # List of strings
    resolutions_list = Column(JSONArray(), nullable=True)  # List of resolution enum
    accessibilities_list = Column(JSONArray(), nullable=True)  # List of enum 'accessibility'
    
    # NEW v1.9 fields
    environment_key = Column(String, nullable=True, default="")  # Environment identifier
    slug = Column(String, nullable=True, unique=True)  # SEO-friendly URL slug
    
    # Relationships
    reports = relationship("VideoFileReport", back_populates="video_file")

    # Many-to-many relationships with MediaDescription
    trailer_for = relationship("MediaDescription", secondary=media_description_trailers, back_populates="trailers")
    excerpt_for = relationship("MediaDescription", secondary=media_description_excerpts, back_populates="excerpts")

    # Many-to-many relationships with Language
    audio_languages = relationship("Language", secondary=video_file_audio_languages, back_populates="audio_video_files")