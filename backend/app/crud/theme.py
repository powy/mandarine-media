from typing import List, Optional

from app.crud.base import CRUDBase
from app.models.theme import Theme
from app.schemas.theme import ThemeCreate, ThemeUpdate


class CRUDTheme(CRUDBase[Theme, ThemeCreate, ThemeUpdate]):
    def get_by_name(self, db, *, name: str) -> Optional[Theme]:
        return db.query(Theme).filter(Theme.name == name).first()

    def get_by_category(self, db, *, category: str) -> List[Theme]:
        return db.query(Theme).filter(Theme.category == category).all()


theme = CRUDTheme(Theme)