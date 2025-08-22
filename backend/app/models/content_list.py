from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean
from sqlalchemy.sql import func
import uuid
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import enum

from app.db.database import Base
from app.models.common import GUID, JSONArray


class ThumbnailFormatEnum(enum.Enum):
    """Enum defining standardized thumbnail formats for consistent image sizing"""
    small_square = "small_square"          # 1080x1080 - User avatars, compact lists
    medium_portrait = "medium_portrait"    # 810x1080 - Content cards, mobile displays
    large_landscape = "large_landscape"    # 1920x1080 - Homepage banners, desktop displays
    vertical_mobile = "vertical_mobile"    # 1080x1920 - Mobile app screens, stories


class ContentTypeEnum(enum.Enum):
    """Enum defining content types that can be included in content lists"""
    program = "program"
    season = "season"
    media_description = "media_description"


class ContentList(Base):
    __tablename__ = "content_lists"

    # Primary fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_updated_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Content list identification
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Thumbnail format specification
    thumbnail_format = Column(String, nullable=False)  # Will use enum validation in schemas
    
    # Display properties
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    
    # Content organization - arrays of content IDs and their types
    content_items = Column(JSONArray(), nullable=True, default=list)  # Array of UUIDs
    content_types = Column(JSONArray(), nullable=True, default=list)  # Array of content types corresponding to content_items
    
    # NEW v1.9 fields - Content filtering and organization
    media_type = Column(String, nullable=True)  # Filter by media type
    media_categories_id_list = Column(JSONArray(), nullable=True)  # Filter by category IDs
    themes_and_genres_id_list = Column(JSONArray(), nullable=True)  # Filter by theme/genre IDs
    latest_first = Column(Boolean, default=True, nullable=False)  # Order items by latest first
    slug = Column(String, nullable=True, unique=True)  # SEO-friendly URL slug
    
    # JSON cache for performance
    json_content = Column(Text, nullable=True)  # Cached JSON representation
    json_last_updated = Column(DateTime(timezone=True), nullable=True)

    def update_json(self, db_session=None):
        """
        Generate JSON representation of the content list based on current content items.
        """
        try:
            from app.crud.program import program as crud_program
            from app.crud.season import season as crud_season  
            from app.crud.media_description import media_description as crud_media_description
            
            # Build the JSON structure
            json_data = {
                "id": str(self.id),
                "title": self.title,
                "description": self.description,
                "thumbnail_format": self.thumbnail_format,
                "is_active": self.is_active,
                "display_order": self.display_order,
                "last_updated": self.last_updated_utc.isoformat() if self.last_updated_utc else None,
                "items": []
            }
            
            # Process content items with their corresponding types
            content_items = self.content_items or []
            content_types = self.content_types or []
            
            for i, content_id in enumerate(content_items):
                if i >= len(content_types):
                    continue  # Skip if no corresponding type
                    
                content_type = content_types[i]
                content_obj = None
                
                try:
                    content_uuid = uuid.UUID(content_id) if isinstance(content_id, str) else content_id
                    
                    # Fetch content based on type
                    if content_type == ContentTypeEnum.program.value and db_session:
                        content_obj = crud_program.get(db_session, id=content_uuid)
                    elif content_type == ContentTypeEnum.season.value and db_session:
                        content_obj = crud_season.get(db_session, id=content_uuid)
                    elif content_type == ContentTypeEnum.media_description.value and db_session:
                        content_obj = crud_media_description.get(db_session, id=content_uuid)
                    
                    if content_obj:
                        item_data = {
                            "content_id": str(content_id),
                            "content_type": content_type,
                            "title": self._get_content_title(content_obj, content_type),
                            "thumbnail_url": self._get_content_thumbnail(content_obj, content_type),
                            "display_order": i + 1
                        }
                        json_data["items"].append(item_data)
                        
                except (ValueError, AttributeError) as e:
                    # Skip invalid content items
                    continue
            
            # Update the JSON content and timestamp
            self.json_content = json.dumps(json_data, ensure_ascii=False, indent=2)
            self.json_last_updated = datetime.utcnow()
            
            # Save to database if session provided
            if db_session:
                db_session.add(self)
                db_session.commit()
                
            return json_data
            
        except Exception as e:
            print(f"Error updating JSON for content list {self.title}: {str(e)}")
            return None

    def _get_content_title(self, content_obj, content_type: str) -> str:
        """Extract title from content object based on type"""
        if content_type == ContentTypeEnum.program.value:
            return getattr(content_obj, 'program_name', 'Unknown Program')
        elif content_type == ContentTypeEnum.season.value:
            return getattr(content_obj, 'season_name', 'Unknown Season')
        elif content_type == ContentTypeEnum.media_description.value:
            return getattr(content_obj, 'episode_title', 'Unknown Episode')
        return 'Unknown Content'

    def _get_content_thumbnail(self, content_obj, content_type: str) -> Optional[str]:
        """Extract thumbnail URL from content object based on type"""
        if content_type == ContentTypeEnum.media_description.value:
            return getattr(content_obj, 'main_thumbnail_url', None)
        # For programs and seasons, we'd need to implement thumbnail logic
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

    def add_content_item(self, content_id: str, content_type: str, position: Optional[int] = None):
        """
        Add a content item to the list at the specified position.
        """
        content_items = self.content_items or []
        content_types = self.content_types or []
        
        if position is None:
            # Add to end
            content_items.append(str(content_id))
            content_types.append(content_type)
        else:
            # Insert at position
            content_items.insert(position, str(content_id))
            content_types.insert(position, content_type)
        
        self.content_items = content_items
        self.content_types = content_types
        self.last_updated_utc = datetime.utcnow()

    def remove_content_item(self, content_id: str):
        """
        Remove a content item from the list.
        """
        content_items = self.content_items or []
        content_types = self.content_types or []
        
        # Find and remove the item
        try:
            index = content_items.index(str(content_id))
            content_items.pop(index)
            if index < len(content_types):
                content_types.pop(index)
                
            # Update the fields
            self.content_items = content_items
            self.content_types = content_types
            self.last_updated_utc = datetime.utcnow()
        except ValueError:
            # Item not found, ignore
            pass

    def reorder_content_items(self, new_content_items: List[str], new_content_types: List[str]):
        """
        Reorder content items with new arrays.
        """
        if len(new_content_items) != len(new_content_types):
            raise ValueError("Content items and types arrays must have the same length")
            
        self.content_items = new_content_items
        self.content_types = new_content_types
        self.last_updated_utc = datetime.utcnow()