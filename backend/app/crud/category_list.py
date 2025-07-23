from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func, and_
from uuid import UUID

from app.crud.base import CRUDBase
from app.models.category_list import CategoryList, CategoryListItem
from app.models.media_description import MediaDescription
from app.schemas.category_list import (
    CategoryListCreate, 
    CategoryListUpdate,
    CategoryListItemCreate,
    CategoryListItemUpdate
)


class CRUDCategoryList(CRUDBase[CategoryList, CategoryListCreate, CategoryListUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[CategoryList]:
        """Get category list by unique name."""
        return db.query(CategoryList).filter(CategoryList.name == name).first()

    def get_list_with_item_count(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[CategoryList]:
        """Get category lists with item counts."""
        return (
            db.query(CategoryList)
            .options(joinedload(CategoryList.items))
            .order_by(asc(CategoryList.display_order), asc(CategoryList.name))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_active_lists(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[CategoryList]:
        """Get only active category lists."""
        return (
            db.query(CategoryList)
            .filter(CategoryList.is_active == True)
            .options(joinedload(CategoryList.items))
            .order_by(asc(CategoryList.display_order), asc(CategoryList.name))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_with_items(self, db: Session, *, id: UUID) -> Optional[CategoryList]:
        """Get category list with all its items."""
        return (
            db.query(CategoryList)
            .options(
                joinedload(CategoryList.items)
                .joinedload(CategoryListItem.media_description)
            )
            .filter(CategoryList.id == id)
            .first()
        )

    def update_json_for_list(self, db: Session, *, id: UUID) -> bool:
        """Update JSON content for a specific category list."""
        try:
            category_list = self.get_with_items(db=db, id=id)
            if not category_list:
                return False
            
            category_list.update_json(db_session=db)
            return True
        except Exception as e:
            print(f"Error updating JSON for category list {id}: {str(e)}")
            return False

    def update_json_for_all(self, db: Session) -> Dict[str, Any]:
        """Update JSON content for all category lists."""
        try:
            category_lists = db.query(CategoryList).all()
            updated_count = 0
            failed_count = 0
            updated_ids = []
            failed_ids = []
            
            for category_list in category_lists:
                try:
                    # Get full data with items and media descriptions
                    full_list = self.get_with_items(db=db, id=category_list.id)
                    if full_list:
                        full_list.update_json(db_session=db)
                        updated_count += 1
                        updated_ids.append(str(category_list.id))
                    else:
                        failed_count += 1
                        failed_ids.append(str(category_list.id))
                except Exception as e:
                    print(f"Error updating JSON for category list {category_list.id}: {str(e)}")
                    failed_count += 1
                    failed_ids.append(str(category_list.id))
            
            return {
                "updated_count": updated_count,
                "failed_count": failed_count,
                "updated_ids": updated_ids,
                "failed_ids": failed_ids
            }
        except Exception as e:
            print(f"Error in bulk JSON update: {str(e)}")
            return {
                "updated_count": 0,
                "failed_count": 0,
                "updated_ids": [],
                "failed_ids": []
            }

    def get_json_content(self, db: Session, *, name: str) -> Optional[str]:
        """Get the JSON content for a category list by name."""
        category_list = self.get_by_name(db=db, name=name)
        if category_list:
            return category_list.json_content
        return None

    def create_default_categories(self, db: Session) -> List[CategoryList]:
        """Create the default category lists as specified."""
        default_categories = [
            {
                "name": "home",
                "title": "Welcome Page",
                "description": "Main welcome page with featured content and category previews",
                "display_order": 1,
                "sub_lists": [
                    {"title": "Carrousel (featured)", "display_order": 1, "size_width": 320, "size_height": 180},
                    {"title": "Films", "display_order": 2, "size_width": 160, "size_height": 240},
                    {"title": "Short dramas", "display_order": 3, "size_width": 160, "size_height": 240},
                    {"title": "Webtoons", "display_order": 4, "size_width": 120, "size_height": 180},
                    {"title": "Dramas", "display_order": 5, "size_width": 160, "size_height": 240},
                    {"title": "Recommandés", "display_order": 6, "size_width": 160, "size_height": 240},
                    {"title": "Populaires", "display_order": 7, "size_width": 160, "size_height": 240},
                    {"title": "Poursuivre", "display_order": 8, "size_width": 160, "size_height": 240},
                    {"title": "Concerts", "display_order": 9, "size_width": 160, "size_height": 240},
                    {"title": "TV show", "display_order": 10, "size_width": 160, "size_height": 240},
                ]
            },
            {"name": "movies", "title": "Films", "description": "Movies category", "display_order": 2},
            {"name": "short_dramas", "title": "Short Dramas", "description": "Short drama series", "display_order": 3},
            {"name": "webtoons", "title": "Webtoons", "description": "Webtoon content", "display_order": 4},
            {"name": "dramas", "title": "Dramas", "description": "Drama series", "display_order": 5},
            {"name": "concerts", "title": "Concerts", "description": "Concert and music content", "display_order": 6},
            {"name": "tv_shows", "title": "TV Shows", "description": "Television shows", "display_order": 7},
        ]
        
        created_lists = []
        
        for cat_config in default_categories:
            # Check if category already exists
            existing = self.get_by_name(db=db, name=cat_config["name"])
            if existing:
                continue
                
            # Create category list
            category_data = CategoryListCreate(
                name=cat_config["name"],
                title=cat_config["title"],
                description=cat_config.get("description"),
                display_order=cat_config["display_order"]
            )
            
            category_list = self.create(db=db, obj_in=category_data)
            created_lists.append(category_list)
            
            # Create sub-lists for home category
            if cat_config["name"] == "home" and "sub_lists" in cat_config:
                for sub_list in cat_config["sub_lists"]:
                    item_data = CategoryListItemCreate(
                        category_list_id=category_list.id,
                        title=sub_list["title"],
                        display_order=sub_list["display_order"],
                        size_width=sub_list.get("size_width"),
                        size_height=sub_list.get("size_height"),
                        is_active=True
                    )
                    CRUDCategoryListItem(CategoryListItem).create(db=db, obj_in=item_data)
        
        return created_lists


class CRUDCategoryListItem(CRUDBase[CategoryListItem, CategoryListItemCreate, CategoryListItemUpdate]):
    def get_by_category_list(
        self, db: Session, *, category_list_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[CategoryListItem]:
        """Get items for a specific category list."""
        return (
            db.query(CategoryListItem)
            .filter(CategoryListItem.category_list_id == category_list_id)
            .options(joinedload(CategoryListItem.media_description))
            .order_by(asc(CategoryListItem.display_order))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_active_by_category_list(
        self, db: Session, *, category_list_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[CategoryListItem]:
        """Get active items for a specific category list."""
        return (
            db.query(CategoryListItem)
            .filter(
                and_(
                    CategoryListItem.category_list_id == category_list_id,
                    CategoryListItem.is_active == True
                )
            )
            .options(joinedload(CategoryListItem.media_description))
            .order_by(asc(CategoryListItem.display_order))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_items_order(
        self, db: Session, *, items_order: List[Dict[str, Any]]
    ) -> bool:
        """Update the display order of multiple items."""
        try:
            for item_order in items_order:
                item = db.query(CategoryListItem).filter(
                    CategoryListItem.id == item_order["id"]
                ).first()
                if item:
                    item.display_order = item_order["display_order"]
                    db.add(item)
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error updating items order: {str(e)}")
            return False

    def count_by_category_list(self, db: Session, *, category_list_id: UUID) -> int:
        """Count items in a category list."""
        return (
            db.query(CategoryListItem)
            .filter(CategoryListItem.category_list_id == category_list_id)
            .count()
        )

    def count_active_by_category_list(self, db: Session, *, category_list_id: UUID) -> int:
        """Count active items in a category list."""
        return (
            db.query(CategoryListItem)
            .filter(
                and_(
                    CategoryListItem.category_list_id == category_list_id,
                    CategoryListItem.is_active == True
                )
            )
            .count()
        )


# Create instances
category_list = CRUDCategoryList(CategoryList)
category_list_item = CRUDCategoryListItem(CategoryListItem)