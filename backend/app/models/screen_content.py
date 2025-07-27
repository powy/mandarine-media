from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean
from sqlalchemy.sql import func
import uuid
import json
from datetime import datetime
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


class ScreenContent(Base):
    __tablename__ = "screen_contents"

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
    
    # Content organization - ordered list of content list IDs
    content_lists = Column(JSONArray(), nullable=True, default=list)  # Array of content list UUIDs
    
    # JSON cache for performance
    json_content = Column(Text, nullable=True)  # Cached JSON representation
    json_last_updated = Column(DateTime(timezone=True), nullable=True)

    def update_json(self, db_session=None):
        """
        Generate JSON representation of the screen content with nested content lists.
        """
        try:
            from app.crud.content_list import content_list as crud_content_list
            
            # Build the JSON structure
            json_data = {
                "id": str(self.id),
                "title": self.title,
                "description": self.description,
                "screen_type": self.screen_type,
                "is_active": self.is_active,
                "display_order": self.display_order,
                "last_updated": self.last_updated_utc.isoformat() if self.last_updated_utc else None,
                "content_lists": []
            }
            
            # Process content lists
            content_lists = self.content_lists or []
            
            for i, content_list_id in enumerate(content_lists):
                try:
                    content_list_uuid = uuid.UUID(content_list_id) if isinstance(content_list_id, str) else content_list_id
                    
                    # Fetch content list
                    if db_session:
                        content_list_obj = crud_content_list.get(db_session, id=content_list_uuid)
                        
                        if content_list_obj and content_list_obj.is_active:
                            # Get or generate JSON data for the content list
                            content_list_json = content_list_obj.get_json_data()
                            if not content_list_json:
                                # Generate fresh JSON if not available
                                content_list_json = content_list_obj.update_json(db_session)
                            
                            if content_list_json:
                                # Add the content list with its display order
                                content_list_data = content_list_json.copy()
                                content_list_data["screen_display_order"] = i + 1
                                json_data["content_lists"].append(content_list_data)
                        
                except (ValueError, AttributeError) as e:
                    # Skip invalid content list IDs
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
            print(f"Error updating JSON for screen content {self.title}: {str(e)}")
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

    def add_content_list(self, content_list_id: str, position: Optional[int] = None):
        """
        Add a content list to the screen at the specified position.
        """
        content_lists = self.content_lists or []
        
        if position is None:
            # Add to end
            content_lists.append(str(content_list_id))
        else:
            # Insert at position
            content_lists.insert(position, str(content_list_id))
        
        self.content_lists = content_lists
        self.last_updated_utc = datetime.utcnow()

    def remove_content_list(self, content_list_id: str):
        """
        Remove a content list from the screen.
        """
        content_lists = self.content_lists or []
        
        # Find and remove the content list
        try:
            content_lists.remove(str(content_list_id))
            self.content_lists = content_lists
            self.last_updated_utc = datetime.utcnow()
        except ValueError:
            # Content list not found, ignore
            pass

    def reorder_content_lists(self, new_content_lists: List[str]):
        """
        Reorder content lists with new array.
        """
        self.content_lists = new_content_lists
        self.last_updated_utc = datetime.utcnow()

    def get_content_list_count(self) -> int:
        """
        Get the number of content lists in this screen.
        """
        return len(self.content_lists) if self.content_lists else 0

    def get_active_content_lists(self, db_session) -> List[Dict[str, Any]]:
        """
        Get all active content lists for this screen with their data.
        """
        try:
            from app.crud.content_list import content_list as crud_content_list
            
            active_lists = []
            content_lists = self.content_lists or []
            
            for content_list_id in content_lists:
                try:
                    content_list_uuid = uuid.UUID(content_list_id) if isinstance(content_list_id, str) else content_list_id
                    content_list_obj = crud_content_list.get(db_session, id=content_list_uuid)
                    
                    if content_list_obj and content_list_obj.is_active:
                        content_list_data = content_list_obj.get_json_data()
                        if content_list_data:
                            active_lists.append(content_list_data)
                            
                except (ValueError, AttributeError):
                    continue
                    
            return active_lists
            
        except Exception as e:
            print(f"Error getting active content lists for screen {self.title}: {str(e)}")
            return []