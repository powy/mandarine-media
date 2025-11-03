from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.db.database import Base
from app.models.common import GUID
from app.utils.media_description_serializer import serialize_media_description_to_json


class Program(Base):
    __tablename__ = "programs"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    program_name = Column(String, nullable=False, unique=True)

    # Optional fields
    general_media_description_id = Column(GUID(), ForeignKey("media_description.id", ondelete="SET NULL"), nullable=True)

    # Performance optimization - JSON cache
    json_content = Column(Text, nullable=True)  # Cached JSON representation
    json_last_updated = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    seasons = relationship("Season", back_populates="program")
    media_descriptions = relationship("MediaDescription", foreign_keys="MediaDescription.program_id", back_populates="program")
    general_media_description = relationship(
        "MediaDescription",
        foreign_keys=[general_media_description_id],
        lazy="joined"  # Eager load for JSON generation
    )

    def update_json(self, db_session) -> Dict[str, Any]:
        """
        Generate JSON representation of the program with nested seasons.

        JSON Structure:
        {
            "id": "program_uuid",
            "program_name": "Program Name",
            "creation_date_utc": "2024-01-01T00:00:00Z",
            "last_updated": "2024-01-15T10:30:00Z",
            "season_count": 3,
            "general_description": { ... },  # Full MediaDescription JSON
            "seasons": [
                { ... },  # Full Season JSON with nested episodes
                ...
            ]
        }
        """
        # Base program data
        json_data = {
            "id": str(self.id),
            "program_name": self.program_name,
            "creation_date_utc": self.creation_date_utc.isoformat() if self.creation_date_utc else None,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "season_count": 0,
            "general_description": None,
            "seasons": []
        }

        # Add general description if exists
        if self.general_media_description:
            json_data["general_description"] = serialize_media_description_to_json(
                self.general_media_description,
                db_session=db_session,
                thumbnail_format="1920x1080"  # Default format for programs
            )

        # Get seasons and refresh their JSON first
        # Sort by season_number for consistent ordering
        sorted_seasons = sorted(
            self.seasons,
            key=lambda s: s.season_number or 0
        )

        json_data["season_count"] = len(sorted_seasons)

        # Refresh and include each season's JSON
        for season in sorted_seasons:
            # Regenerate the season's JSON cache first
            season.update_json(db_session)

            # Get the season's JSON data
            season_json = season.get_json_data()
            if season_json:
                json_data["seasons"].append(season_json)

        # Store the JSON
        self.json_content = json.dumps(json_data, ensure_ascii=False, default=str)
        self.json_last_updated = datetime.now(timezone.utc)

        db_session.commit()

        return json_data

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