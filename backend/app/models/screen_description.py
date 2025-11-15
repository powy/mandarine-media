from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean
from sqlalchemy.sql import func
import uuid
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import enum

from app.db.database import Base
from app.models.common import GUID, JSONArray


class ScreenTypeEnum(enum.Enum):
    """Enum defining different types of screens in the application"""
    homepage = "homepage"
    category = "category"
    search = "search"
    profile = "profile"
    discover = "discover"


class ScreenDescription(Base):
    __tablename__ = "screen_descriptions"

    # Primary fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_updated_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Screen identification
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    screen_type = Column(String, nullable=True)  # Will use enum validation in schemas
    
    # Display properties
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    in_top_menu = Column(Boolean, default=False, nullable=False)
    
    # Content organization - ordered list of media showcase IDs
    media_showcases = Column(JSONArray(), nullable=True, default=list)  # Array of media showcase UUIDs
    
    # NEW v1.9 field
    slug = Column(String, nullable=True, unique=True)  # SEO-friendly URL slug
    
    # JSON cache for performance
    json_content = Column(Text, nullable=True)  # Cached JSON representation
    json_last_updated = Column(DateTime(timezone=True), nullable=True)

    def update_json(self, db_session=None):
        """
        Generate JSON representation of the screen content with nested content lists.
        """
        try:
            from app.crud.media_showcase import media_showcase as crud_media_showcase

            # Build the JSON structure
            json_data = {
                "id": str(self.id),
                "title": self.title,
                "description": self.description,
                "screen_type": self.screen_type,
                "is_active": self.is_active,
                "display_order": self.display_order,
                "in_top_menu": self.in_top_menu,
                "last_updated": self.last_updated_utc.isoformat() if self.last_updated_utc else None,
                "media_showcases": []
            }
            
            # Process media showcases
            media_showcases = self.media_showcases or []
            
            for i, media_showcase_id in enumerate(media_showcases):
                try:
                    media_showcase_uuid = uuid.UUID(media_showcase_id) if isinstance(media_showcase_id, str) else media_showcase_id

                    # Fetch media showcase
                    if db_session:
                        media_showcase_obj = crud_media_showcase.get(db_session, id=media_showcase_uuid)

                        if media_showcase_obj and media_showcase_obj.is_active:
                            # Always regenerate JSON for the media showcase to ensure freshness
                            media_showcase_json = media_showcase_obj.update_json(db_session)

                            if media_showcase_json:
                                # Add the media showcase with its display order
                                media_showcase_data = media_showcase_json.copy()
                                media_showcase_data["screen_display_order"] = i + 1
                                json_data["media_showcases"].append(media_showcase_data)
                        
                except ValueError as e:
                    # Skip invalid media showcase IDs (UUID parse errors)
                    print(f"Warning: Invalid media showcase ID {media_showcase_id} in screen {self.title}: {str(e)}")
                    continue
                except AttributeError as e:
                    # Skip if media showcase object has missing methods or attributes
                    print(f"Warning: Media showcase {media_showcase_id} missing required attributes in screen {self.title}: {str(e)}")
                    continue
                except Exception as e:
                    # Log other unexpected errors but continue processing
                    print(f"Warning: Unexpected error processing media showcase {media_showcase_id} in screen {self.title}: {str(e)}")
                    continue
            
            # Update the JSON content and timestamp
            self.json_content = json.dumps(json_data, ensure_ascii=False, indent=2)
            self.json_last_updated = datetime.now(timezone.utc)
            
            # Save to database if session provided
            if db_session:
                db_session.add(self)
                db_session.commit()
                
            return json_data
            
        except Exception as e:
            print(f"Error updating JSON for screen content {self.title}: {str(e)}")
            # In case of critical error, ensure we don't leave partial data
            self.json_content = None
            self.json_last_updated = None
            return None

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

    def add_media_showcase(self, media_showcase_id: str, position: Optional[int] = None):
        """
        Add a media showcase to the screen at the specified position.
        """
        media_showcases = self.media_showcases or []

        if position is None:
            # Add to end
            media_showcases.append(str(media_showcase_id))
        else:
            # Insert at position
            media_showcases.insert(position, str(media_showcase_id))

        self.media_showcases = media_showcases
        self.last_updated_utc = datetime.now(timezone.utc)

    def remove_media_showcase(self, media_showcase_id: str):
        """
        Remove a media showcase from the screen.
        """
        media_showcases = self.media_showcases or []

        # Find and remove the media showcase
        try:
            media_showcases.remove(str(media_showcase_id))
            self.media_showcases = media_showcases
            self.last_updated_utc = datetime.now(timezone.utc)
        except ValueError:
            # Media showcase not found, ignore
            pass

    def reorder_media_showcases(self, new_media_showcases: List[str]):
        """
        Reorder media showcases with new array.
        """
        self.media_showcases = new_media_showcases
        self.last_updated_utc = datetime.now(timezone.utc)

    def get_media_showcase_count(self) -> int:
        """
        Get the number of media showcases in this screen.
        """
        return len(self.media_showcases) if self.media_showcases else 0

    def get_active_media_showcases(self, db_session) -> List[Dict[str, Any]]:
        """
        Get all active media showcases for this screen with their data.
        """
        try:
            from app.crud.media_showcase import media_showcase as crud_media_showcase

            active_lists = []
            media_showcases = self.media_showcases or []

            for media_showcase_id in media_showcases:
                try:
                    media_showcase_uuid = uuid.UUID(media_showcase_id) if isinstance(media_showcase_id, str) else media_showcase_id
                    media_showcase_obj = crud_media_showcase.get(db_session, id=media_showcase_uuid)

                    if media_showcase_obj and media_showcase_obj.is_active:
                        media_showcase_data = media_showcase_obj.get_json_data()
                        if media_showcase_data:
                            active_lists.append(media_showcase_data)

                except (ValueError, AttributeError):
                    continue

            return active_lists

        except Exception as e:
            print(f"Error getting active media showcases for screen {self.title}: {str(e)}")
            return []