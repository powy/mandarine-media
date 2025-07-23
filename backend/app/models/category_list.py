from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import json
from datetime import datetime
from typing import List, Dict, Any

from app.db.database import Base
from app.models.common import GUID


class CategoryList(Base):
    __tablename__ = "category_lists"

    # Primary fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_updated_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Category identification
    name = Column(String, nullable=False, unique=True)  # e.g., "home", "movies", "short_dramas"
    title = Column(String, nullable=False)  # e.g., "Welcome Page", "Films"
    description = Column(Text, nullable=True)
    
    # Display properties
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    
    # JSON cache
    json_content = Column(Text, nullable=True)  # Cached JSON representation
    json_last_updated = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    items = relationship("CategoryListItem", back_populates="category_list", cascade="all, delete-orphan", order_by="CategoryListItem.display_order")

    def update_json(self, db_session=None):
        """
        Generate JSON representation of the category list based on current items and their media descriptions.
        """
        try:
            # Build the JSON structure
            json_data = {
                "id": str(self.id),
                "name": self.name,
                "title": self.title,
                "description": self.description,
                "is_active": self.is_active,
                "display_order": self.display_order,
                "last_updated": self.last_updated_utc.isoformat() if self.last_updated_utc else None,
                "items": []
            }
            
            # Add items with their media description data
            for item in sorted(self.items, key=lambda x: x.display_order):
                if not item.is_active:
                    continue
                    
                item_data = {
                    "id": str(item.id),
                    "title": item.title,
                    "display_order": item.display_order,
                    "size_width": item.size_width,
                    "size_height": item.size_height,
                    "media_description_id": str(item.media_description_id) if item.media_description_id else None,
                    "thumbnail_url": None,
                    "forward_link": item.forward_link,
                    "media_title": None,
                    "media_type": None
                }
                
                # Add media description data if available
                if item.media_description:
                    item_data.update({
                        "thumbnail_url": item.media_description.main_thumbnail_url,
                        "media_title": item.media_description.episode_title,
                        "media_type": item.media_description.media_type
                    })
                
                json_data["items"].append(item_data)
            
            # Update the JSON content and timestamp
            self.json_content = json.dumps(json_data, ensure_ascii=False, indent=2)
            self.json_last_updated = datetime.utcnow()
            
            # Save to database if session provided
            if db_session:
                db_session.add(self)
                db_session.commit()
                
            return json_data
            
        except Exception as e:
            print(f"Error updating JSON for category list {self.name}: {str(e)}")
            return None

    def get_json_data(self):
        """
        Get the JSON data as a Python dictionary.
        """
        if self.json_content:
            try:
                return json.loads(self.json_content)
            except json.JSONDecodeError:
                return None
        return None


class CategoryListItem(Base):
    __tablename__ = "category_list_items"

    # Primary fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_updated_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Foreign keys
    category_list_id = Column(GUID(), ForeignKey("category_lists.id"), nullable=False)
    media_description_id = Column(GUID(), ForeignKey("media_description.id"), nullable=True)
    
    # Item properties
    title = Column(String, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Display properties
    size_width = Column(Integer, nullable=True)  # Width in pixels or relative units
    size_height = Column(Integer, nullable=True)  # Height in pixels or relative units
    forward_link = Column(String, nullable=True)  # URL or route to navigate to
    
    # Relationships
    category_list = relationship("CategoryList", back_populates="items")
    media_description = relationship("MediaDescription")