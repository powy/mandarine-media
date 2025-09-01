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
    """Enum defining standardized thumbnail formats using dimension-based naming"""
    format_1920x1080 = "1920x1080"  # Large landscape - Homepage banners, desktop displays
    format_1920x720 = "1920x720"    # Wide landscape - Cinema format
    format_1080x1080 = "1080x1080"  # Square - User avatars, compact lists
    format_810x1080 = "810x1080"    # Portrait - Content cards, mobile displays
    format_1080x1920 = "1080x1920"  # Vertical mobile - Mobile app screens, stories


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
    thumbnail_format = Column(String, nullable=False)  # enum using ThumbnailFormatEnum: 1920x1080, 1920x720, 1080x1080, 810x1080, 1080x1920
    
    # Display properties
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    list_type = Column(String, nullable=False)  # enum between classic and carrousel (might be extended later)
    percentage_width = Column(Integer, nullable=False)
    percentage_height = Column(Integer, nullable=False)
    
    # Content organization - arrays of content IDs and their types
    content_items = Column(JSONArray(), nullable=True, default=list)  # Array of UUIDs
    content_types = Column(JSONArray(), nullable=True, default=list)  # Array of content types corresponding to content_items
    
    # NEW v1.9 fields - Content filtering and organization
    media_type = Column(String, nullable=True)  # Filter by media type
    media_categories_list = Column(JSONArray(), nullable=True)  # Array of MediaCategoryEnum values
    media_themes_id_list = Column(JSONArray(), nullable=True)  # List of MediaTheme IDs
    latest_first = Column(Boolean, default=True, nullable=False)  # Order items by latest first
    slug = Column(String, nullable=True, unique=True)
    
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
            
            # Build the JSON structure with new width/height percentage fields
            json_data = {
                "id": str(self.id),
                "title": self.title,
                "description": self.description,
                "thumbnail_format": self.thumbnail_format,
                "width_percentage": self.percentage_width,
                "height_percentage": self.percentage_height,
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
                            "thumbnail_url": self._get_content_thumbnail(content_obj, content_type, db_session),
                            "description": self._get_content_description(content_obj, content_type),
                            "short_summary": self._get_content_short_summary(content_obj, content_type),
                            "image_alt_text": self._generate_image_alt_text(content_obj, content_type),
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

    def _get_content_thumbnail(self, content_obj, content_type: str, db_session=None) -> Optional[str]:
        """Extract thumbnail URL from content object using format-specific image selection"""
        if content_type == ContentTypeEnum.media_description.value and db_session:
            return self._select_thumbnail_by_format(content_obj, db_session)
        # For programs and seasons, we'd need to implement thumbnail logic
        return None
    
    def _select_thumbnail_by_format(self, media_obj, db_session) -> Optional[str]:
        """Select thumbnail based on content list's thumbnail format"""
        try:
            # Import here to avoid circular imports
            from app.crud.picture import picture as crud_picture
            
            # Map thumbnail format to MediaDescription image field
            format_to_field = {
                "1920x1080": "image_1920_1080_id",
                "1920x720": "image_1920_720_id",
                "1080x1080": "image_1080_1080_id",
                "810x1080": "image_810_1080_id",
                "1080x1920": "image_1080_1920_id"
            }
            
            # Get the appropriate image field
            image_field = format_to_field.get(self.thumbnail_format)
            if not image_field:
                # Log error and default to 1080x1080
                print(f"Warning: Unknown thumbnail_format '{self.thumbnail_format}', defaulting to 1080x1080")
                image_field = "image_1080_1080_id"
            
            # Get image ID from the media object
            image_id = getattr(media_obj, image_field, None)
            if not image_id:
                return None
            
            # Fetch the Picture record and return image URL
            picture = crud_picture.get(db_session, id=image_id)
            if picture and hasattr(picture, 'image_url'):
                return picture.image_url
            
            return None
            
        except Exception as e:
            print(f"Error selecting thumbnail by format: {str(e)}")
            return None
    
    def _get_content_description(self, content_obj, content_type: str) -> Optional[str]:
        """Extract description from content object based on type"""
        if content_type == ContentTypeEnum.media_description.value:
            return getattr(content_obj, 'descriptive_summary_text', None)
        # For programs and seasons, we'd need to implement description logic
        return None
    
    def _get_content_short_summary(self, content_obj, content_type: str) -> Optional[str]:
        """Extract short summary from content object (truncated description)"""
        description = self._get_content_description(content_obj, content_type)
        if description and len(description) > 150:
            return description[:150] + "..."
        return description
    
    def _generate_image_alt_text(self, content_obj, content_type: str) -> str:
        """Generate appropriate alt text for the image"""
        title = self._get_content_title(content_obj, content_type)
        description = self._get_content_short_summary(content_obj, content_type)
        
        if description:
            return f"{title} - {description}"
        return title

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