"""
View Summary Model

Aggregated view data per user+media combination.
Optimized for fast queries (continue watching, history, analytics).
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.db.database import Base
from app.models.common import GUID


class ViewSummary(Base):
    """
    Aggregated viewing statistics per user+media.

    Business Rules:
    - One record per (user/anonymous, media, video) combination
    - Updated on session completion (not every heartbeat)
    - Powers Continue Watching and Watch History
    - Stores last checkpoint for resume playback
    """

    __tablename__ = "view_summaries"

    # ========================================================================
    # PRIMARY KEY
    # ========================================================================

    id = Column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )

    # ========================================================================
    # USER ASSOCIATION
    # ========================================================================

    user_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Authenticated user (NULL for anonymous)"
    )

    anonymous_id = Column(
        String,
        nullable=True,
        index=True,
        comment="Anonymous user identifier"
    )

    # ========================================================================
    # CONTENT ASSOCIATION
    # ========================================================================

    media_description_id = Column(
        GUID(),
        ForeignKey("media_description.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Media content"
    )

    video_file_id = Column(
        GUID(),
        ForeignKey("video_file.id", ondelete="CASCADE"),
        nullable=False,
        comment="Specific video file"
    )

    # ========================================================================
    # WATCH STATISTICS
    # ========================================================================

    first_watched_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="First time user watched this content"
    )

    last_watched_at = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Most recent watch timestamp"
    )

    total_watch_duration_seconds = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Cumulative watch time across all sessions"
    )

    total_sessions = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of playback sessions"
    )

    # ========================================================================
    # CONTINUE WATCHING
    # ========================================================================

    last_checkpoint_seconds = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Resume position for Continue Watching"
    )

    completion_percentage = Column(
        Float,
        nullable=False,
        default=0.0,
        comment="Highest completion achieved (0.0 to 1.0)"
    )

    is_completed = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="True if watched >= 90%"
    )

    # ========================================================================
    # BUSINESS LOGIC
    # ========================================================================

    has_paid = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True if user paid for access (PPV, rental, etc.)"
    )

    entitlement_source = Column(
        String,
        nullable=True,
        comment="How access was granted: subscription, ppv, free, admin, promo"
    )

    last_device_type = Column(
        String,
        nullable=True,
        comment="Last device used for playback"
    )

    # ========================================================================
    # RELATIONSHIPS
    # ========================================================================

    user = relationship(
        "User",
        backref="view_summaries",
        foreign_keys=[user_id]
    )

    media_description = relationship(
        "MediaDescription",
        backref="view_summaries",
        foreign_keys=[media_description_id]
    )

    video_file = relationship(
        "VideoFile",
        backref="view_summaries",
        foreign_keys=[video_file_id]
    )

    # ========================================================================
    # CONSTRAINTS & INDEXES
    # ========================================================================

    __table_args__ = (
        # Unique constraint: one summary per user+media+video
        UniqueConstraint(
            'user_id',
            'media_description_id',
            'video_file_id',
            name='uq_user_media_video'
        ),

        # Unique constraint for anonymous users
        UniqueConstraint(
            'anonymous_id',
            'media_description_id',
            'video_file_id',
            name='uq_anon_media_video'
        ),

        # User's watch history (recent first)
        Index(
            'idx_view_summary_user_recent',
            'user_id',
            'last_watched_at'
        ),

        # Media popularity
        Index(
            'idx_view_summary_media_popular',
            'media_description_id',
            'total_sessions'
        ),

        # Anonymous user history
        Index(
            'idx_view_summary_anon_recent',
            'anonymous_id',
            'last_watched_at'
        ),
    )

    # ========================================================================
    # BUSINESS METHODS
    # ========================================================================

    def update_from_session(self, session):
        """
        Update summary from a completed session.

        Args:
            session: ViewSession instance
        """
        # Update timestamps
        self.last_watched_at = datetime.now(timezone.utc)

        # Increment counters
        self.total_watch_duration_seconds += session.total_watch_duration_seconds
        self.total_sessions += 1

        # Update checkpoint (resume position)
        self.last_checkpoint_seconds = session.current_position_seconds

        # Update completion (keep highest)
        self.completion_percentage = max(
            self.completion_percentage,
            session.completion_percentage
        )

        # Mark as completed if >= 90%
        self.is_completed = self.completion_percentage >= 0.9

        # Update device
        if session.device_type:
            self.last_device_type = session.device_type

    def should_show_in_continue_watching(self, min_completion: float = 0.05) -> bool:
        """
        Check if this should appear in Continue Watching UI.

        Args:
            min_completion: Minimum completion to show (default 5%)

        Returns:
            True if should show
        """
        return (
            not self.is_completed and
            self.completion_percentage >= min_completion
        )

    def __repr__(self):
        viewer = f"user={self.user_id}" if self.user_id else f"anon={self.anonymous_id}"
        return (
            f"<ViewSummary({viewer}, "
            f"media={self.media_description_id}, "
            f"sessions={self.total_sessions}, "
            f"completion={self.completion_percentage:.2%})>"
        )
