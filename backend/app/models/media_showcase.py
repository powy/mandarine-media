from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.db.database import Base
from app.models.common import GUID, JSONArray
from app.models.associations import media_showcase_media_descriptions, media_showcase_media_themes
from app.utils.media_description_serializer import serialize_media_description_to_json


class MediaShowcase(Base):
    __tablename__ = "media_showcases"
    
    # Primary fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_updated_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Showcase identification
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Display configuration
    thumbnail_format = Column(String, nullable=False)  # "1920x1080", "1920x720", "1080x1080", "810x1080", "1080x1920"
    is_active = Column(Boolean, default=True, nullable=False)
    priority_in_screen = Column(Integer, default=0, nullable=False)  # Order of showcase on screen
    list_type = Column(String, nullable=False)  # "classic", "carousel", "hero", "field", or "ranking"
    percentage_width = Column(Integer, nullable=False)
    percentage_height = Column(Integer, nullable=False)

    # Content filtering
    media_type = Column(String, nullable=True)  # Filter by media type
    media_categories_list = Column(JSONArray(), nullable=True)  # Array of MediaCategoryEnum values
    latest_first = Column(Boolean, default=True, nullable=False)
    slug = Column(String, nullable=True, unique=True, index=True)
    
    # Performance optimization
    json_content = Column(Text, nullable=True)  # Cached JSON representation
    json_last_updated = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    media_themes = relationship("MediaTheme", secondary=media_showcase_media_themes, 
                               back_populates="media_showcases")
    media_descriptions = relationship("MediaDescription", secondary=media_showcase_media_descriptions,
                                     back_populates="media_showcases")

    def update_json(self, db_session=None) -> Dict[str, Any]:
        """
        Generate JSON representation of the media showcase with final item structure.
        Items include: id, title, media_type, friendly_url, slug, media_categories_list,
        descriptive_summary_text, is_featured, thumbnail_url, program_id, season_id,
        episode_number, display_order
        """
        json_data = {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "thumbnail_format": self.thumbnail_format,
            "width_percentage": self.percentage_width,
            "height_percentage": self.percentage_height,
            "is_active": self.is_active,
            "priority_in_screen": self.priority_in_screen,
            "list_type": self.list_type,
            "last_updated": self.last_updated_utc.isoformat() if self.last_updated_utc else None,
            "items": []
        }

        # Get ordered media descriptions with their details
        # Filter: only include published media descriptions
        for media_desc in [md for md in self.media_descriptions if md.content_status == "published"]:
            # Use common serialization function
            item_data = serialize_media_description_to_json(
                media_desc,
                db_session=db_session,
                thumbnail_format=self.thumbnail_format
            )

            # Add showcase-specific display_order
            item_data["display_order"] = self._get_item_priority_in_showcase(media_desc.id, db_session)

            json_data["items"].append(item_data)

        # Store the JSON
        self.json_content = json.dumps(json_data, ensure_ascii=False, default=str)
        self.json_last_updated = datetime.now(timezone.utc)

        if db_session:
            db_session.commit()

        return json_data

    def _get_thumbnail_url(self, media_desc, format_type: str) -> str:
        """Helper to get the appropriate thumbnail URL based on format"""
        format_to_picture = {
            "1920x1080": getattr(media_desc, 'image_1920_1080', None),
            "1920x720": getattr(media_desc, 'image_1920_720', None),
            "1080x1080": getattr(media_desc, 'image_1080_1080', None),
            "810x1080": getattr(media_desc, 'image_810_1080', None),
            "1080x1920": getattr(media_desc, 'image_1080_1920', None)
        }

        picture = format_to_picture.get(format_type)
        if picture and hasattr(picture, 'image_url') and picture.image_url:
            return picture.image_url
        return None

    def _get_all_format_urls(self, media_desc) -> Dict[str, Optional[str]]:
        """Helper to get all thumbnail format URLs for a media description"""
        format_fields = {
            "image_1920_1080_url": 'image_1920_1080',
            "image_1920_720_url": 'image_1920_720',
            "image_1080_1080_url": 'image_1080_1080',
            "image_810_1080_url": 'image_810_1080',
            "image_1080_1920_url": 'image_1080_1920'
        }

        result = {}
        for url_field, picture_attr in format_fields.items():
            picture = getattr(media_desc, picture_attr, None)
            if picture and hasattr(picture, 'image_url') and picture.image_url:
                result[url_field] = picture.image_url
            else:
                result[url_field] = None

        return result

    def _get_item_priority_in_showcase(self, media_desc_id, db_session=None) -> int:
        """Get priority_in_showcase for a specific item within this showcase"""
        from sqlalchemy import text
        from app.db.database import SessionLocal

        # Use provided session or create new one as fallback
        db = db_session if db_session else SessionLocal()
        should_close = db_session is None  # Only close if we created the session

        try:
            result = db.execute(
                text("""
                    SELECT priority_in_showcase
                    FROM media_showcase_media_descriptions
                    WHERE media_showcase_id = :showcase_id
                    AND media_description_id = :media_desc_id
                """),
                {
                    "showcase_id": str(self.id),
                    "media_desc_id": str(media_desc_id)
                }
            ).scalar()
            return result or 0
        finally:
            if should_close:
                db.close()

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