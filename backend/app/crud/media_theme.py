from typing import List, Optional
from sqlalchemy.orm import Session
from uuid import UUID

from app.crud.base import CRUDBase
from app.models.media_theme import MediaTheme
from app.schemas.media_theme import MediaThemeCreate, MediaThemeUpdate


class CRUDMediaTheme(CRUDBase[MediaTheme, MediaThemeCreate, MediaThemeUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[MediaTheme]:
        return db.query(MediaTheme).filter(MediaTheme.name == name).first()
    
    def get_multi_by_name(
        self, db: Session, *, name_filter: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[MediaTheme]:
        query = db.query(MediaTheme)
        if name_filter:
            query = query.filter(MediaTheme.name.ilike(f"%{name_filter}%"))
        return query.offset(skip).limit(limit).all()


media_theme = CRUDMediaTheme(MediaTheme)