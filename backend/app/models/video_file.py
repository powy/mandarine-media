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
    diagnostics = Column(String, nullable=False, default="pending")  # Verification diagnostics status
    
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

    async def diagnostic(self, db, mux_service):
        """
        Perform diagnostic verification of video file against Mux.

        Validates:
        - Mux connection and asset readiness
        - Subtitle integrity (broken, missing FR, duplicates)
        - Media description linkage
        - Data consistency (duration, resolution, etc.)

        Args:
            db: SQLAlchemy database session
            mux_service: MuxStorageBackend instance

        Returns:
            str: "ready" or comma-separated error messages

        Side Effects:
            Updates self.diagnostics and commits to database
        """
        import logging
        logger = logging.getLogger(__name__)
        errors = []

        # Check 1: Mux asset exists
        if not self.mux_asset_id:
            errors.append("No Mux asset ID")
            self.diagnostics = ", ".join(errors)
            db.commit()
            return self.diagnostics

        # Check 2: Connect to Mux and get asset info
        try:
            asset_info = await mux_service.get_complete_asset_info(self.mux_asset_id)
        except Exception as e:
            logger.error(f"Mux connection failed for asset {self.mux_asset_id}: {e}")
            errors.append("Mux connection failed")
            self.diagnostics = ", ".join(errors)
            db.commit()
            return self.diagnostics

        if not asset_info.get('success'):
            error_code = asset_info.get('error_code', 'UNKNOWN')
            if error_code == 'ASSET_NOT_FOUND':
                errors.append("Asset not found in Mux")
            else:
                errors.append(f"Mux error: {error_code}")
            self.diagnostics = ", ".join(errors)
            db.commit()
            return self.diagnostics

        # Check 3: Asset ready status
        if asset_info.get('asset_status') != 'ready':
            errors.append(f"Mux asset not ready (status: {asset_info.get('asset_status')})")

        # Check 4: Subtitle validation
        local_subtitles = self.subtitle_tracks_text_list or []
        mux_subtitles = asset_info.get('subtitle_tracks_text_list', [])

        # Check for duplicates (case-insensitive)
        subtitle_counts = {}
        for lang in local_subtitles:
            lang_lower = lang.lower()
            subtitle_counts[lang_lower] = subtitle_counts.get(lang_lower, 0) + 1

        for lang, count in subtitle_counts.items():
            if count > 1:
                errors.append(f"Subtitle {lang.upper()} duplicated")

        # Check for mandatory French subtitle
        has_french = any(s.lower() == 'fr' for s in local_subtitles)
        if not has_french:
            errors.append("Subtitle FR is missing")

        # Check for broken/missing subtitles (compare with Mux)
        local_set = set(s.lower() for s in local_subtitles)
        mux_set = set(s.lower() for s in mux_subtitles)

        # In local but not on Mux = broken
        broken_subs = local_set - mux_set
        for lang in sorted(broken_subs):
            errors.append(f"Subtitle {lang.upper()} broken")

        # On Mux but not in local = missing from local
        missing_from_local = mux_set - local_set
        for lang in sorted(missing_from_local):
            errors.append(f"Subtitle {lang.upper()} missing from local")

        # Check 5: Media description linkage
        has_main_link = bool(self.media_descriptions)  # backref from MediaDescription.main_video_file
        has_trailer_link = bool(self.trailer_for)      # Many-to-Many
        has_excerpt_link = bool(self.excerpt_for)      # Many-to-Many

        if not (has_main_link or has_trailer_link or has_excerpt_link):
            errors.append("No media description")

        # Check 6: Data consistency (Mux vs Local)

        # Duration (allow 1 second tolerance)
        if self.duration_seconds and asset_info.get('duration_seconds'):
            duration_diff = abs(self.duration_seconds - asset_info['duration_seconds'])
            if duration_diff > 1:
                errors.append(
                    f"Duration mismatch (local: {self.duration_seconds}s, "
                    f"Mux: {asset_info['duration_seconds']}s)"
                )

        # Resolution width
        if self.max_resolution_width and asset_info.get('max_resolution_width'):
            if self.max_resolution_width != asset_info['max_resolution_width']:
                errors.append(
                    f"Resolution width mismatch (local: {self.max_resolution_width}px, "
                    f"Mux: {asset_info['max_resolution_width']}px)"
                )

        # Resolution height
        if self.max_resolution_height and asset_info.get('max_resolution_height'):
            if self.max_resolution_height != asset_info['max_resolution_height']:
                errors.append(
                    f"Resolution height mismatch (local: {self.max_resolution_height}px, "
                    f"Mux: {asset_info['max_resolution_height']}px)"
                )

        # Playback ID
        if self.mux_playback_id and asset_info.get('mux_playback_id'):
            if self.mux_playback_id != asset_info['mux_playback_id']:
                errors.append("Playback ID mismatch")

        # Encoding status
        expected_encoding_status = asset_info.get('encoding_status', '')
        if self.encoding_status and expected_encoding_status:
            if self.encoding_status != expected_encoding_status:
                errors.append(
                    f"Encoding status mismatch (local: {self.encoding_status}, "
                    f"Mux: {expected_encoding_status})"
                )

        # Set diagnostics and commit
        if errors:
            self.diagnostics = ", ".join(errors)
        else:
            self.diagnostics = "ready"

        db.commit()
        logger.info(f"Diagnostic complete for video file {self.id}: {self.diagnostics}")
        return self.diagnostics