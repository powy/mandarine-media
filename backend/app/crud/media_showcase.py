from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import desc, asc, func, and_, or_, text
from uuid import UUID

from app.crud.base import CRUDBase
from app.models.media_showcase import MediaShowcase
from app.models.media_description import MediaDescription
from app.models.associations import media_showcase_media_descriptions
from app.schemas.media_showcase import MediaShowcaseCreate, MediaShowcaseUpdate


class CRUDMediaShowcase(CRUDBase[MediaShowcase, MediaShowcaseCreate, MediaShowcaseUpdate]):
    def create(self, db: Session, *, obj_in: MediaShowcaseCreate) -> MediaShowcase:
        """Create a new MediaShowcase with initial media descriptions and themes."""
        # Extract relationship IDs that are not model fields
        media_description_ids = obj_in.media_description_ids or []
        media_theme_ids = obj_in.media_theme_ids or []

        # Create model data without the relationship fields
        obj_data = obj_in.model_dump(exclude={"media_description_ids", "media_theme_ids"})

        # Create the showcase first
        db_obj = MediaShowcase(**obj_data)
        db.add(db_obj)
        db.flush()  # Get the ID without committing

        # Set up media descriptions with priority handling
        if media_description_ids:
            # Deduplicate IDs while preserving order (idempotency)
            seen_ids = set()
            unique_ids = []
            for desc_id in media_description_ids:
                if desc_id not in seen_ids:
                    unique_ids.append(desc_id)
                    seen_ids.add(desc_id)

            # Validate that media descriptions exist
            media_descriptions = (
                db.query(MediaDescription)
                .filter(MediaDescription.id.in_(unique_ids))
                .all()
            )
            desc_by_id = {desc.id: desc for desc in media_descriptions}

            # Add descriptions in the order specified, with priority
            from sqlalchemy import insert
            for priority, desc_id in enumerate(unique_ids):
                if desc_id in desc_by_id:
                    stmt = insert(media_showcase_media_descriptions).values(
                        media_showcase_id=db_obj.id,
                        media_description_id=desc_id,
                        priority_in_showcase=priority
                    )
                    db.execute(stmt)

        if media_theme_ids:
            from app.models.media_theme import MediaTheme
            media_themes = (
                db.query(MediaTheme)
                .filter(MediaTheme.id.in_(media_theme_ids))
                .all()
            )
            db_obj.media_themes = media_themes

        db.commit()

        # Reload the object with relationships to ensure they're populated
        db_obj = (
            db.query(MediaShowcase)
            .options(joinedload(MediaShowcase.media_descriptions))
            .options(joinedload(MediaShowcase.media_themes))
            .filter(MediaShowcase.id == db_obj.id)
            .first()
        )

        return db_obj

    def update(self, db: Session, *, db_obj: MediaShowcase, obj_in: MediaShowcaseUpdate) -> MediaShowcase:
        """Update MediaShowcase with relationship handling."""
        # Extract relationship IDs
        obj_data = obj_in.model_dump(exclude_unset=True)
        media_description_ids = obj_data.pop("media_description_ids", None)
        media_theme_ids = obj_data.pop("media_theme_ids", None)

        # Update base object fields
        for field, value in obj_data.items():
            setattr(db_obj, field, value)

        # Update media descriptions with priority handling
        if media_description_ids is not None:
            # Remove existing associations
            from sqlalchemy import delete
            stmt = delete(media_showcase_media_descriptions).where(
                media_showcase_media_descriptions.c.media_showcase_id == db_obj.id
            )
            db.execute(stmt)

            # Add new associations if any provided
            if media_description_ids:
                # Validate that media descriptions exist
                media_descriptions = (
                    db.query(MediaDescription)
                    .filter(MediaDescription.id.in_(media_description_ids))
                    .all()
                )
                desc_by_id = {desc.id: desc for desc in media_descriptions}

                # Add descriptions in the order specified, with priority
                from sqlalchemy import insert
                for priority, desc_id in enumerate(media_description_ids):
                    if desc_id in desc_by_id:
                        stmt = insert(media_showcase_media_descriptions).values(
                            media_showcase_id=db_obj.id,
                            media_description_id=desc_id,
                            priority_in_showcase=priority
                        )
                        db.execute(stmt)

        if media_theme_ids is not None:
            from app.models.media_theme import MediaTheme
            media_themes = (
                db.query(MediaTheme)
                .filter(MediaTheme.id.in_(media_theme_ids))
                .all()
            )
            db_obj.media_themes = media_themes

        db.add(db_obj)
        db.commit()

        # Reload the object with relationships to ensure they're populated
        db_obj = (
            db.query(MediaShowcase)
            .options(joinedload(MediaShowcase.media_descriptions))
            .options(joinedload(MediaShowcase.media_themes))
            .filter(MediaShowcase.id == db_obj.id)
            .first()
        )

        return db_obj

    def get(self, db: Session, id: UUID) -> Optional[MediaShowcase]:
        """Get MediaShowcase with eager-loaded relationships including nested MediaDescription relationships."""
        return (
            db.query(MediaShowcase)
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.program)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.season)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_720)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_810_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1920)
            )
            .options(joinedload(MediaShowcase.media_themes))
            .filter(MediaShowcase.id == id)
            .first()
        )

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[MediaShowcase]:
        """Get multiple MediaShowcases with eager-loaded relationships including nested MediaDescription relationships."""
        return (
            db.query(MediaShowcase)
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.program)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.season)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_720)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_810_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1920)
            )
            .options(joinedload(MediaShowcase.media_themes))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_title(self, db: Session, *, title: str) -> Optional[MediaShowcase]:
        """Get media showcase by title."""
        return db.query(MediaShowcase).filter(MediaShowcase.title == title).first()

    def get_by_slug(self, db: Session, *, slug: str) -> Optional[MediaShowcase]:
        """Get media showcase by slug."""
        return db.query(MediaShowcase).filter(MediaShowcase.slug == slug).first()

    def get_active_showcases(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[MediaShowcase]:
        """Get only active media showcases ordered by priority_in_screen with nested relationships."""
        return (
            db.query(MediaShowcase)
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.program)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.season)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_720)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_810_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1920)
            )
            .options(joinedload(MediaShowcase.media_themes))
            .filter(MediaShowcase.is_active == True)
            .order_by(asc(MediaShowcase.priority_in_screen), asc(MediaShowcase.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_list_type(
        self, db: Session, *, list_type: str, skip: int = 0, limit: int = 100
    ) -> List[MediaShowcase]:
        """Get media showcases by list type."""
        return (
            db.query(MediaShowcase)
            .filter(MediaShowcase.list_type == list_type)
            .filter(MediaShowcase.is_active == True)
            .order_by(asc(MediaShowcase.priority_in_screen), asc(MediaShowcase.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_thumbnail_format(
        self, db: Session, *, thumbnail_format: str, skip: int = 0, limit: int = 100
    ) -> List[MediaShowcase]:
        """Get media showcases by thumbnail format."""
        return (
            db.query(MediaShowcase)
            .filter(MediaShowcase.thumbnail_format == thumbnail_format)
            .filter(MediaShowcase.is_active == True)
            .order_by(asc(MediaShowcase.priority_in_screen), asc(MediaShowcase.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_multi_ordered(
        self, db: Session, *, skip: int = 0, limit: int = 100, active_only: bool = False
    ) -> List[MediaShowcase]:
        """Get media showcases ordered by priority_in_screen and title with nested relationships."""
        query = (
            db.query(MediaShowcase)
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.program)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.season)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_720)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_810_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1920)
            )
            .options(joinedload(MediaShowcase.media_themes))
        )

        if active_only:
            query = query.filter(MediaShowcase.is_active == True)

        return (
            query
            .order_by(asc(MediaShowcase.priority_in_screen), asc(MediaShowcase.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_with_items(self, db: Session, *, showcase_id: UUID) -> Optional[MediaShowcase]:
        """Get media showcase with its ordered media descriptions and nested relationships."""
        return (
            db.query(MediaShowcase)
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.program)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.season)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1920_720)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_810_1080)
            )
            .options(
                joinedload(MediaShowcase.media_descriptions)
                .joinedload(MediaDescription.image_1080_1920)
            )
            .options(joinedload(MediaShowcase.media_themes))
            .filter(MediaShowcase.id == showcase_id)
            .first()
        )

    def add_media_descriptions(
        self, 
        db: Session, 
        *, 
        showcase_id: UUID, 
        media_description_ids: List[UUID],
        start_priority: Optional[int] = None
    ) -> MediaShowcase:
        """Add media descriptions to a showcase with proper ordering."""
        showcase = self.get(db, id=showcase_id)
        if not showcase:
            raise ValueError("Showcase not found")

        # Get current max priority if start_priority not specified
        if start_priority is None:
            from sqlalchemy import select, func
            max_priority_stmt = select(func.coalesce(func.max(media_showcase_media_descriptions.c.priority_in_showcase), -1)).where(
                media_showcase_media_descriptions.c.media_showcase_id == showcase_id
            )
            max_priority_result = db.execute(max_priority_stmt).scalar()
            start_priority = (max_priority_result or -1) + 1
        else:
            # If inserting at specific position, shift existing items first
            from sqlalchemy import update
            shift_stmt = update(media_showcase_media_descriptions).where(
                (media_showcase_media_descriptions.c.media_showcase_id == showcase_id) &
                (media_showcase_media_descriptions.c.priority_in_showcase >= start_priority)
            ).values(priority_in_showcase=media_showcase_media_descriptions.c.priority_in_showcase + len(media_description_ids))
            db.execute(shift_stmt)

        # Insert new associations with duplicate prevention
        from sqlalchemy import select, insert, func
        for i, media_desc_id in enumerate(media_description_ids):
            # Check if this association already exists
            existing_stmt = select(func.count()).where(
                (media_showcase_media_descriptions.c.media_showcase_id == showcase_id) &
                (media_showcase_media_descriptions.c.media_description_id == media_desc_id)
            )
            existing = db.execute(existing_stmt).scalar()

            # Only insert if not already present
            if existing == 0:
                insert_stmt = insert(media_showcase_media_descriptions).values(
                    media_showcase_id=showcase_id,
                    media_description_id=media_desc_id,
                    priority_in_showcase=start_priority + i
                )
                db.execute(insert_stmt)

        db.commit()
        # Get fresh instance with loaded relationships
        showcase = (
            db.query(MediaShowcase)
            .options(joinedload(MediaShowcase.media_descriptions))
            .filter(MediaShowcase.id == showcase_id)
            .first()
        )
        return showcase

    def remove_media_descriptions(
        self, 
        db: Session, 
        *, 
        showcase_id: UUID, 
        media_description_ids: List[UUID]
    ) -> MediaShowcase:
        """Remove media descriptions from a showcase."""
        showcase = self.get(db, id=showcase_id)
        if not showcase:
            raise ValueError("Showcase not found")

        # Remove associations using ORM
        from sqlalchemy import delete
        for media_desc_id in media_description_ids:
            delete_stmt = delete(media_showcase_media_descriptions).where(
                (media_showcase_media_descriptions.c.media_showcase_id == showcase_id) &
                (media_showcase_media_descriptions.c.media_description_id == media_desc_id)
            )
            db.execute(delete_stmt)

        db.commit()
        # Get fresh instance with loaded relationships
        showcase = (
            db.query(MediaShowcase)
            .options(joinedload(MediaShowcase.media_descriptions))
            .filter(MediaShowcase.id == showcase_id)
            .first()
        )
        return showcase

    def reorder_media_descriptions(
        self, 
        db: Session, 
        *, 
        showcase_id: UUID, 
        items: List[Dict[str, Any]]
    ) -> MediaShowcase:
        """Reorder media descriptions in a showcase.
        
        Args:
            items: List of dicts with 'media_description_id' and 'priority_in_showcase'
        """
        showcase = self.get(db, id=showcase_id)
        if not showcase:
            raise ValueError("Showcase not found")

        # Simple approach: remove and re-add all items to avoid constraint conflicts
        # Use proper UUID format for database operations
        
        # Get all media description IDs for this showcase using ORM
        from sqlalchemy import select
        existing_stmt = select(
            media_showcase_media_descriptions.c.media_description_id,
            media_showcase_media_descriptions.c.priority_in_showcase
        ).where(
            media_showcase_media_descriptions.c.media_showcase_id == showcase_id
        ).order_by(media_showcase_media_descriptions.c.priority_in_showcase)

        existing_items = db.execute(existing_stmt).fetchall()
        
        # Remove all current associations using ORM
        from sqlalchemy import delete
        delete_stmt = delete(media_showcase_media_descriptions).where(
            media_showcase_media_descriptions.c.media_showcase_id == showcase_id
        )
        db.execute(delete_stmt)
        
        # Create a mapping of item IDs to their new priorities
        priority_map = {item["media_description_id"]: item["priority_in_showcase"] for item in items}

        # Rebuild the priority sequence cleanly to avoid conflicts
        # Separate items that need new priorities from those that keep their position
        items_with_new_priority = []
        items_with_old_priority = []

        for media_desc_id, old_priority in existing_items:
            if media_desc_id in priority_map:
                items_with_new_priority.append((media_desc_id, priority_map[media_desc_id]))
            else:
                items_with_old_priority.append((media_desc_id, old_priority))

        # Sort by priority
        items_with_new_priority.sort(key=lambda x: x[1])
        items_with_old_priority.sort(key=lambda x: x[1])

        # Merge and assign clean sequential priorities
        final_priority = 0
        all_items = []

        # Process items in priority order
        new_iter = iter(items_with_new_priority)
        old_iter = iter(items_with_old_priority)

        next_new = next(new_iter, None)
        next_old = next(old_iter, None)

        while next_new is not None or next_old is not None:
            # Choose which item goes next based on priority
            if next_new is None:
                # Only old items left
                all_items.append((next_old[0], final_priority))
                next_old = next(old_iter, None)
            elif next_old is None:
                # Only new items left
                all_items.append((next_new[0], final_priority))
                next_new = next(new_iter, None)
            elif next_new[1] <= final_priority:
                # New item wants this position or earlier
                all_items.append((next_new[0], final_priority))
                next_new = next(new_iter, None)
            else:
                # Old item can take this position
                all_items.append((next_old[0], final_priority))
                next_old = next(old_iter, None)

            final_priority += 1

        # Re-insert all items with clean priorities using ORM
        from sqlalchemy import insert
        for media_desc_id, priority in all_items:
            stmt = insert(media_showcase_media_descriptions).values(
                media_showcase_id=showcase_id,
                media_description_id=media_desc_id,
                priority_in_showcase=priority
            )
            db.execute(stmt)

        db.commit()
        # Get fresh instance with loaded relationships
        showcase = (
            db.query(MediaShowcase)
            .options(joinedload(MediaShowcase.media_descriptions))
            .filter(MediaShowcase.id == showcase_id)
            .first()
        )
        return showcase

    def replace_all_media_descriptions(
        self, 
        db: Session, 
        *, 
        showcase_id: UUID, 
        media_description_ids: List[UUID]
    ) -> MediaShowcase:
        """Replace all media descriptions in a showcase with a new ordered list."""
        showcase = self.get(db, id=showcase_id)
        if not showcase:
            raise ValueError("Showcase not found")

        # Remove all existing associations using ORM
        from sqlalchemy import delete, insert
        delete_stmt = delete(media_showcase_media_descriptions).where(
            media_showcase_media_descriptions.c.media_showcase_id == showcase_id
        )
        db.execute(delete_stmt)

        # Add new associations using ORM
        for i, media_desc_id in enumerate(media_description_ids):
            insert_stmt = insert(media_showcase_media_descriptions).values(
                media_showcase_id=showcase_id,
                media_description_id=media_desc_id,
                priority_in_showcase=i
            )
            db.execute(insert_stmt)

        db.commit()
        # Get fresh instance with loaded relationships
        showcase = (
            db.query(MediaShowcase)
            .options(joinedload(MediaShowcase.media_descriptions))
            .filter(MediaShowcase.id == showcase_id)
            .first()
        )
        return showcase

    def refresh_json_cache(self, db: Session, *, showcase_id: UUID) -> MediaShowcase:
        """Refresh the JSON cache for a showcase."""
        showcase = self.get(db, id=showcase_id)
        if not showcase:
            raise ValueError("Showcase not found")

        showcase.update_json(db)
        return showcase

    def get_json_cache(self, db: Session, *, showcase_id: UUID) -> Optional[Dict[str, Any]]:
        """Get the cached JSON for a showcase."""
        showcase = self.get(db, id=showcase_id)
        if not showcase:
            return None

        if showcase.json_content:
            import json
            return json.loads(showcase.json_content)
        
        # Generate JSON if not cached
        return showcase.update_json(db)

    def search_by_title(
        self, 
        db: Session, 
        *, 
        search_term: str, 
        skip: int = 0, 
        limit: int = 100,
        active_only: bool = True
    ) -> List[MediaShowcase]:
        """Search showcases by title."""
        query = db.query(MediaShowcase).filter(
            MediaShowcase.title.ilike(f"%{search_term}%")
        )
        
        if active_only:
            query = query.filter(MediaShowcase.is_active == True)
        
        return (
            query
            .order_by(asc(MediaShowcase.priority_in_screen), asc(MediaShowcase.title))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def refresh_all_json_caches(self, db: Session) -> Dict[str, Any]:
        """Refresh JSON cache for all media showcases."""
        # Get all showcases
        showcases = self.get_multi(db, skip=0, limit=10000)  # Get all showcases

        success_count = 0
        error_count = 0
        errors = []

        for showcase in showcases:
            try:
                showcase.update_json(db)
                success_count += 1
            except Exception as e:
                error_count += 1
                errors.append(f"Showcase {showcase.title} (ID: {showcase.id}): {str(e)}")

        # Commit all changes
        db.commit()

        return {
            "success_count": success_count,
            "error_count": error_count,
            "total_count": len(showcases),
            "errors": errors
        }

    def count_total(self, db: Session) -> int:
        """Get total count of all media showcases"""
        return db.query(self.model).count()

    def count_active(self, db: Session) -> int:
        """Count active media showcases"""
        return db.query(self.model).filter(MediaShowcase.is_active == True).count()

    def count_by_list_type(self, db: Session, *, list_type: str) -> int:
        """Count media showcases by list type"""
        return (
            db.query(self.model)
            .filter(MediaShowcase.list_type == list_type)
            .filter(MediaShowcase.is_active == True)
            .count()
        )

    def count_by_thumbnail_format(self, db: Session, *, thumbnail_format: str) -> int:
        """Count media showcases by thumbnail format"""
        return (
            db.query(self.model)
            .filter(MediaShowcase.thumbnail_format == thumbnail_format)
            .filter(MediaShowcase.is_active == True)
            .count()
        )

    def count_by_title_search(self, db: Session, *, search_term: str, active_only: bool = True) -> int:
        """Count media showcases matching title search"""
        query = db.query(self.model).filter(
            MediaShowcase.title.ilike(f"%{search_term}%")
        )

        if active_only:
            query = query.filter(MediaShowcase.is_active == True)

        return query.count()


# Create instance
media_showcase = CRUDMediaShowcase(MediaShowcase)