"""
View Session Model

Represents a single playback session from start to end.
Tracks real-time viewing data and serves as the source of truth for user engagement.
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone, timedelta
import uuid

from app.db.database import Base
from app.models.common import GUID


class ViewSession(Base):
    """
    Single playback session tracking.

    Business Rules:
    - One session per video playback instance
    - Session starts when video loads
    - Session ends when video completes, user closes, or timeout (30min)
    - Both authenticated and anonymous users supported
    - Heartbeats update session state every 15 seconds
    """

    __tablename__ = "view_sessions"

    # ========================================================================
    # PRIMARY KEY
    # ========================================================================

    session_id = Column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
        comment="Unique session identifier"
    )

    # ========================================================================
    # USER ASSOCIATION
    # ========================================================================

    user_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Authenticated user (NULL for anonymous)"
    )

    anonymous_id = Column(
        String,
        nullable=True,
        index=True,
        comment="Client-generated UUID for anonymous users"
    )

    # ========================================================================
    # CONTENT ASSOCIATION
    # ========================================================================

    media_description_id = Column(
        GUID(),
        ForeignKey("media_description.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Editorial content being watched"
    )

    video_file_id = Column(
        GUID(),
        ForeignKey("video_file.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Technical video file being played"
    )

    # ========================================================================
    # MUX INTEGRATION
    # ========================================================================

    playback_id = Column(
        String,
        nullable=False,
        index=True,
        comment="Mux playback ID (correlates with Mux analytics)"
    )

    playback_token_hash = Column(
        String,
        nullable=True,
        comment="SHA256 hash of JWT playback token (for validation)"
    )

    mux_view_id = Column(
        String,
        nullable=True,
        comment="Mux internal view ID (from webhooks, future use)"
    )

    # ========================================================================
    # SESSION LIFECYCLE
    # ========================================================================

    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
        comment="Session start timestamp (UTC)"
    )

    last_heartbeat_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last heartbeat received (UTC)"
    )

    ended_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Session end timestamp (UTC)"
    )

    session_status = Column(
        String,
        nullable=False,
        default="active",
        index=True,
        comment="Status: active, completed, abandoned"
    )

    # ========================================================================
    # PLAYBACK METRICS
    # ========================================================================

    current_position_seconds = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Last known playback position (seconds)"
    )

    total_watch_duration_seconds = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Total time spent watching (excludes pauses)"
    )

    completion_percentage = Column(
        Float,
        nullable=False,
        default=0.0,
        comment="Completion ratio (0.0 to 1.0)"
    )

    max_position_reached = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Furthest position reached (for skip detection)"
    )

    # ========================================================================
    # TECHNICAL METADATA
    # ========================================================================

    device_type = Column(
        String,
        nullable=True,
        comment="Device category: web, ios, android, tv"
    )

    user_agent = Column(
        String,
        nullable=True,
        comment="Browser/app user agent string"
    )

    ip_address = Column(
        String,
        nullable=True,
        comment="Client IP address (anonymized after 90 days)"
    )

    player_version = Column(
        String,
        nullable=True,
        comment="Mux player version"
    )

    # ========================================================================
    # BUSINESS FIELDS
    # ========================================================================

    is_preview = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True if this was a preview/trailer playback"
    )

    billing_counted = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True if counted toward usage limits"
    )

    # ========================================================================
    # RELATIONSHIPS
    # ========================================================================

    user = relationship(
        "User",
        backref="view_sessions",
        foreign_keys=[user_id]
    )

    media_description = relationship(
        "MediaDescription",
        backref="view_sessions",
        foreign_keys=[media_description_id]
    )

    video_file = relationship(
        "VideoFile",
        backref="view_sessions",
        foreign_keys=[video_file_id]
    )

    # ========================================================================
    # INDEXES - Defined in __table_args__
    # ========================================================================

    __table_args__ = (
        # User's recent sessions
        Index(
            'idx_view_session_user_recent',
            'user_id',
            'started_at'
        ),

        # Media popularity queries
        Index(
            'idx_view_session_media_recent',
            'media_description_id',
            'started_at'
        ),

        # Session status queries
        Index(
            'idx_view_session_status_time',
            'session_status',
            'started_at'
        ),

        # Anonymous user tracking
        Index(
            'idx_view_session_anonymous',
            'anonymous_id',
            'started_at'
        ),
    )

    # ========================================================================
    # BUSINESS METHODS
    # ========================================================================

    def calculate_completion_percentage(self, video_duration_seconds: int) -> float:
        """
        Calculate completion percentage based on current position.

        Args:
            video_duration_seconds: Total video duration

        Returns:
            Completion ratio (0.0 to 1.0)
        """
        if not video_duration_seconds or video_duration_seconds == 0:
            return 0.0

        return min(self.current_position_seconds / video_duration_seconds, 1.0)

    def is_abandoned(self, timeout_minutes: int = 30) -> bool:
        """
        Check if session should be marked as abandoned.

        Args:
            timeout_minutes: Minutes of inactivity before abandonment

        Returns:
            True if session is abandoned
        """
        if self.session_status != "active":
            return False

        if not self.last_heartbeat_at:
            return False

        timeout = timedelta(minutes=timeout_minutes)
        cutoff = datetime.now(timezone.utc) - timeout

        return self.last_heartbeat_at < cutoff

    def get_viewer_identifier(self) -> str:
        """
        Get unique viewer identifier (user_id or anonymous_id).

        Returns:
            User ID or anonymous ID as string
        """
        if self.user_id:
            return str(self.user_id)
        elif self.anonymous_id:
            return f"anon:{self.anonymous_id}"
        else:
            return "unknown"

    def __repr__(self):
        return (
            f"<ViewSession(session_id={self.session_id}, "
            f"user={self.get_viewer_identifier()}, "
            f"media={self.media_description_id}, "
            f"status={self.session_status}, "
            f"completion={self.completion_percentage:.2%})>"
        )
