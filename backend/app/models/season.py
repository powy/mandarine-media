from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.db.database import Base
from app.models.common import GUID, JSONArray
from app.models.associations import season_episodes
from app.utils.media_description_serializer import serialize_media_description_to_json


class Season(Base):
    __tablename__ = "seasons"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    program_id = Column(GUID(), ForeignKey("programs.id"), nullable=True)
    season_number = Column(Integer, nullable=False)
    
    # Optional fields
    season_name = Column(String, nullable=True)
    general_media_description_id = Column(GUID(), ForeignKey("media_description.id", ondelete="SET NULL"), nullable=True)
    # Note: Removed episodes_id_list - replaced with proper many-to-many relationship

    # Performance optimization - JSON cache
    json_content = Column(Text, nullable=True)  # Cached JSON representation
    json_last_updated = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    program = relationship("Program", back_populates="seasons")
    media_descriptions = relationship(
        "MediaDescription",
        foreign_keys="MediaDescription.season_id",
        back_populates="season"
    )
    episodes = relationship("MediaDescription", secondary=season_episodes, back_populates="seasons_episodes", order_by="season_episodes.c.episode_order")
    general_media_description = relationship(
        "MediaDescription",
        foreign_keys=[general_media_description_id],
        lazy="joined"  # Eager load for JSON generation
    )
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('program_id', 'season_number', name='unique_program_season'),
    )

    def update_json(self, db_session) -> Dict[str, Any]:
        """
        Generate JSON representation of the season with episode list.

        JSON Structure:
        {
            "id": "season_uuid",
            "season_number": 1,
            "season_name": "Season 1",
            "program_id": "program_uuid",
            "creation_date_utc": "2024-01-01T00:00:00Z",
            "last_updated": "2024-01-15T10:30:00Z",
            "episode_count": 12,
            "general_description": { ... },  # Full MediaDescription JSON
            "episodes": [
                { ... },  # Full MediaDescription JSON with episode_order
                ...
            ]
        }
        """
        # Base season data
        json_data = {
            "id": str(self.id),
            "season_number": self.season_number,
            "season_name": self.season_name,
            "program_id": str(self.program_id) if self.program_id else None,
            "creation_date_utc": self.creation_date_utc.isoformat() if self.creation_date_utc else None,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "episode_count": 0,
            "general_description": None,
            "episodes": []
        }

        # Add general description if exists
        if self.general_media_description:
            json_data["general_description"] = serialize_media_description_to_json(
                self.general_media_description,
                db_session=db_session,
                thumbnail_format="1920x1080"  # Default format for seasons
            )

        # Get episodes using FK relationship (season_id)
        # Filter: only include published episodes
        # Sort by episode_number for consistent ordering
        published_episodes = sorted(
            [ep for ep in self.media_descriptions if ep.content_status == "published"],
            key=lambda ep: ep.episode_number or 0
        )

        json_data["episode_count"] = len(published_episodes)

        # Serialize each episode
        for episode in published_episodes:
            episode_data = serialize_media_description_to_json(
                episode,
                db_session=db_session,
                thumbnail_format="1920x1080"
            )

            # Add episode_order - try association table first, fallback to episode_number
            episode_order = self._get_episode_order(episode.id, db_session)
            if episode_order == 0:
                episode_order = episode.episode_number or 0
            episode_data["episode_order"] = episode_order

            json_data["episodes"].append(episode_data)

        # Store the JSON
        self.json_content = json.dumps(json_data, ensure_ascii=False, default=str)
        self.json_last_updated = datetime.now(timezone.utc)

        db_session.commit()

        return json_data

    def _get_episode_order(self, episode_id, db_session) -> int:
        """Get episode_order from season_episodes association table"""
        from sqlalchemy import text

        result = db_session.execute(
            text("""
                SELECT episode_order
                FROM season_episodes
                WHERE season_id = :season_id
                AND media_description_id = :episode_id
            """),
            {
                "season_id": str(self.id),
                "episode_id": str(episode_id)
            }
        ).scalar()

        return result if result is not None else 0

    def get_json_data(self) -> Optional[Dict[str, Any]]:
        """
        Get the JSON data as a Python dictionary.
        """
        if self.json_content:
            try:
                return json.loads(self.json_content)
            except json.JSONDecodeError:
                return None
        return None