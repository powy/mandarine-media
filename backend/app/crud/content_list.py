from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, and_, or_
from uuid import UUID

from app.crud.base import CRUDBase
from app.models.content_list import ContentList
from app.schemas.content_list import ContentListCreate, ContentListUpdate


class CRUDContentList(CRUDBase[ContentList, ContentListCreate, ContentListUpdate]):
    def get_by_title(self, db: Session, *, title: str) -> Optional[ContentList]:
        """Get content list by title."""
        return db.query(ContentList).filter(ContentList.title == title).first()

    def get_active_lists(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ContentList]:
        """Get only active content lists ordered by display_order."""
        return (
            db.query(ContentList)
            .filter(ContentList.is_active == True)
            .order_by(asc(ContentList.display_order), asc(ContentList.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_thumbnail_format(
        self, db: Session, *, thumbnail_format: str, skip: int = 0, limit: int = 100
    ) -> List[ContentList]:
        """Get content lists by thumbnail format."""
        return (
            db.query(ContentList)
            .filter(ContentList.thumbnail_format == thumbnail_format)
            .filter(ContentList.is_active == True)
            .order_by(asc(ContentList.display_order), asc(ContentList.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_multi_ordered(
        self, db: Session, *, skip: int = 0, limit: int = 100, active_only: bool = False
    ) -> List[ContentList]:
        """Get content lists ordered by display_order and title."""
        query = db.query(ContentList)
        
        if active_only:
            query = query.filter(ContentList.is_active == True)
            
        return (
            query
            .order_by(asc(ContentList.display_order), asc(ContentList.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def search_by_title(
        self, db: Session, *, search_term: str, skip: int = 0, limit: int = 100
    ) -> List[ContentList]:
        """Search content lists by title."""
        return (
            db.query(ContentList)
            .filter(ContentList.title.ilike(f"%{search_term}%"))
            .order_by(asc(ContentList.display_order), asc(ContentList.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_active(self, db: Session) -> int:
        """Count active content lists."""
        return db.query(ContentList).filter(ContentList.is_active == True).count()

    def count_by_thumbnail_format(self, db: Session, *, thumbnail_format: str) -> int:
        """Count content lists by thumbnail format."""
        return (
            db.query(ContentList)
            .filter(ContentList.thumbnail_format == thumbnail_format)
            .filter(ContentList.is_active == True)
            .count()
        )

    def update_json_cache(self, db: Session, *, content_list: ContentList) -> Optional[Dict[str, Any]]:
        """Update JSON cache for a content list."""
        json_data = content_list.update_json(db_session=db)
        return json_data

    def regenerate_all_json_cache(self, db: Session) -> Dict[str, Any]:
        """Regenerate JSON cache for all active content lists."""
        content_lists = self.get_active_lists(db, skip=0, limit=1000)  # Get all active lists
        results = {
            "updated": 0,
            "failed": 0,
            "errors": []
        }
        
        for content_list in content_lists:
            try:
                json_data = self.update_json_cache(db, content_list=content_list)
                if json_data:
                    results["updated"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append(f"Failed to update JSON for content list: {content_list.title}")
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Error updating content list {content_list.title}: {str(e)}")
        
        return results

    def add_content_item(
        self, db: Session, *, content_list: ContentList, content_id: str, content_type: str, position: Optional[int] = None
    ) -> ContentList:
        """Add a content item to the content list."""
        content_list.add_content_item(content_id, content_type, position)
        db.add(content_list)
        db.commit()
        db.refresh(content_list)
        
        # Update JSON cache
        self.update_json_cache(db, content_list=content_list)
        
        return content_list

    def remove_content_item(
        self, db: Session, *, content_list: ContentList, content_id: str
    ) -> ContentList:
        """Remove a content item from the content list."""
        content_list.remove_content_item(content_id)
        
        # Explicitly mark the fields as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(content_list, 'content_items')
        flag_modified(content_list, 'content_types')
        
        db.add(content_list)
        db.commit()
        db.refresh(content_list)
        
        # Update JSON cache
        self.update_json_cache(db, content_list=content_list)
        
        return content_list

    def reorder_content_items(
        self, db: Session, *, content_list: ContentList, new_content_items: List[str], new_content_types: List[str]
    ) -> ContentList:
        """Reorder content items in the content list."""
        content_list.reorder_content_items(new_content_items, new_content_types)
        db.add(content_list)
        db.commit()
        db.refresh(content_list)
        
        # Update JSON cache
        self.update_json_cache(db, content_list=content_list)
        
        return content_list

    def get_content_lists_containing_item(
        self, db: Session, *, content_id: str, content_type: str
    ) -> List[ContentList]:
        """Find content lists that contain a specific content item."""
        # For SQLite, we need to use JSON operations differently than PostgreSQL
        # This is a simplified version that searches in the JSON text
        content_lists = db.query(ContentList).filter(ContentList.is_active == True).all()
        
        matching_lists = []
        for content_list in content_lists:
            content_items = content_list.content_items or []
            content_types = content_list.content_types or []
            
            # Check if the content item exists in this list
            for i, item_id in enumerate(content_items):
                if (item_id == content_id and 
                    i < len(content_types) and 
                    content_types[i] == content_type):
                    matching_lists.append(content_list)
                    break
        
        return matching_lists

    def create_with_json_cache(self, db: Session, *, obj_in: ContentListCreate) -> ContentList:
        """Create a content list and generate its JSON cache."""
        content_list = self.create(db, obj_in=obj_in)
        
        # Generate initial JSON cache
        self.update_json_cache(db, content_list=content_list)
        
        return content_list

    def update_with_json_cache(
        self, db: Session, *, db_obj: ContentList, obj_in: ContentListUpdate
    ) -> ContentList:
        """Update a content list and regenerate its JSON cache."""
        content_list = self.update(db, db_obj=db_obj, obj_in=obj_in)
        
        # Regenerate JSON cache
        self.update_json_cache(db, content_list=content_list)
        
        return content_list


content_list = CRUDContentList(ContentList)