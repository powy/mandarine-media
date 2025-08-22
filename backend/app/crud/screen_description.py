from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, and_
from uuid import UUID

from app.crud.base import CRUDBase
from app.models.screen_description import ScreenDescription
from app.schemas.screen_description import ScreenDescriptionCreate, ScreenDescriptionUpdate


class CRUDScreenDescription(CRUDBase[ScreenDescription, ScreenDescriptionCreate, ScreenDescriptionUpdate]):
    def get_by_title(self, db: Session, *, title: str) -> Optional[ScreenDescription]:
        """Get screen content by title."""
        return db.query(ScreenDescription).filter(ScreenDescription.title == title).first()

    def get_active_screens(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ScreenDescription]:
        """Get only active screen contents ordered by display_order."""
        return (
            db.query(ScreenDescription)
            .filter(ScreenDescription.is_active == True)
            .order_by(asc(ScreenDescription.display_order), asc(ScreenDescription.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_screen_type(
        self, db: Session, *, screen_type: str, skip: int = 0, limit: int = 100
    ) -> List[ScreenDescription]:
        """Get screen contents by screen type."""
        return (
            db.query(ScreenDescription)
            .filter(ScreenDescription.screen_type == screen_type)
            .filter(ScreenDescription.is_active == True)
            .order_by(asc(ScreenDescription.display_order), asc(ScreenDescription.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_multi_ordered(
        self, db: Session, *, skip: int = 0, limit: int = 100, active_only: bool = False
    ) -> List[ScreenDescription]:
        """Get screen contents ordered by display_order and title."""
        query = db.query(ScreenDescription)
        
        if active_only:
            query = query.filter(ScreenDescription.is_active == True)
            
        return (
            query
            .order_by(asc(ScreenDescription.display_order), asc(ScreenDescription.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def search_by_title(
        self, db: Session, *, search_term: str, skip: int = 0, limit: int = 100
    ) -> List[ScreenDescription]:
        """Search screen contents by title."""
        return (
            db.query(ScreenDescription)
            .filter(ScreenDescription.title.ilike(f"%{search_term}%"))
            .order_by(asc(ScreenDescription.display_order), asc(ScreenDescription.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_active(self, db: Session) -> int:
        """Count active screen contents."""
        return db.query(ScreenDescription).filter(ScreenDescription.is_active == True).count()

    def count_by_screen_type(self, db: Session, *, screen_type: str) -> int:
        """Count screen contents by screen type."""
        return (
            db.query(ScreenDescription)
            .filter(ScreenDescription.screen_type == screen_type)
            .filter(ScreenDescription.is_active == True)
            .count()
        )

    def update_json_cache(self, db: Session, *, screen_content: ScreenDescription) -> Optional[Dict[str, Any]]:
        """Update JSON cache for a screen content."""
        json_data = screen_content.update_json(db_session=db)
        return json_data

    def regenerate_all_json_cache(self, db: Session) -> Dict[str, Any]:
        """Regenerate JSON cache for all active screen contents."""
        screen_contents = self.get_active_screens(db, skip=0, limit=1000)  # Get all active screens
        results = {
            "updated": 0,
            "failed": 0,
            "errors": []
        }
        
        for screen_content in screen_contents:
            try:
                json_data = self.update_json_cache(db, screen_content=screen_content)
                if json_data:
                    results["updated"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append(f"Failed to update JSON for screen content: {screen_content.title}")
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Error updating screen content {screen_content.title}: {str(e)}")
        
        return results

    def add_content_list(
        self, db: Session, *, screen_content: ScreenDescription, content_list_id: str, position: Optional[int] = None
    ) -> ScreenDescription:
        """Add a content list to the screen content."""
        screen_content.add_content_list(content_list_id, position)
        db.add(screen_content)
        db.commit()
        db.refresh(screen_content)
        
        # Update JSON cache
        self.update_json_cache(db, screen_content=screen_content)
        
        return screen_content

    def remove_content_list(
        self, db: Session, *, screen_content: ScreenDescription, content_list_id: str
    ) -> ScreenDescription:
        """Remove a content list from the screen content."""
        screen_content.remove_content_list(content_list_id)
        
        # Explicitly mark the field as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(screen_content, 'content_lists')
        
        db.add(screen_content)
        db.commit()
        db.refresh(screen_content)
        
        # Update JSON cache
        self.update_json_cache(db, screen_content=screen_content)
        
        return screen_content

    def reorder_content_lists(
        self, db: Session, *, screen_content: ScreenDescription, new_content_lists: List[str]
    ) -> ScreenDescription:
        """Reorder content lists in the screen content."""
        screen_content.reorder_content_lists(new_content_lists)
        db.add(screen_content)
        db.commit()
        db.refresh(screen_content)
        
        # Update JSON cache
        self.update_json_cache(db, screen_content=screen_content)
        
        return screen_content

    def get_screens_containing_content_list(
        self, db: Session, *, content_list_id: str
    ) -> List[ScreenDescription]:
        """Find screen contents that contain a specific content list."""
        screen_contents = db.query(ScreenDescription).filter(ScreenDescription.is_active == True).all()
        
        matching_screens = []
        for screen_content in screen_contents:
            content_lists = screen_content.content_lists or []
            
            # Check if the content list exists in this screen
            if content_list_id in content_lists:
                matching_screens.append(screen_content)
        
        return matching_screens

    def get_screen_types_with_counts(self, db: Session) -> Dict[str, int]:
        """Get screen types with their counts."""
        screen_contents = db.query(ScreenDescription).filter(ScreenDescription.is_active == True).all()
        
        type_counts = {}
        for screen_content in screen_contents:
            screen_type = screen_content.screen_type or "unknown"
            type_counts[screen_type] = type_counts.get(screen_type, 0) + 1
        
        return type_counts

    def create_with_json_cache(self, db: Session, *, obj_in: ScreenDescriptionCreate) -> ScreenDescription:
        """Create a screen content and generate its JSON cache."""
        screen_content = self.create(db, obj_in=obj_in)
        
        # Generate initial JSON cache
        self.update_json_cache(db, screen_content=screen_content)
        
        return screen_content

    def update_with_json_cache(
        self, db: Session, *, db_obj: ScreenDescription, obj_in: ScreenDescriptionUpdate
    ) -> ScreenDescription:
        """Update a screen content and regenerate its JSON cache."""
        screen_content = self.update(db, db_obj=db_obj, obj_in=obj_in)
        
        # Regenerate JSON cache
        self.update_json_cache(db, screen_content=screen_content)
        
        return screen_content

    def get_homepage_screens(self, db: Session) -> List[ScreenDescription]:
        """Get screens specifically for homepage."""
        return self.get_by_screen_type(db, screen_type="homepage", skip=0, limit=100)

    def get_category_screens(self, db: Session) -> List[ScreenDescription]:
        """Get screens specifically for category browsing."""
        return self.get_by_screen_type(db, screen_type="category", skip=0, limit=100)

    def get_primary_screen_by_type(self, db: Session, *, screen_type: str) -> Optional[ScreenDescription]:
        """Get the primary (lowest display_order) screen for a given type."""
        return (
            db.query(ScreenDescription)
            .filter(ScreenDescription.screen_type == screen_type)
            .filter(ScreenDescription.is_active == True)
            .order_by(asc(ScreenDescription.display_order))
            .first()
        )


screen_description = CRUDScreenDescription(ScreenDescription)