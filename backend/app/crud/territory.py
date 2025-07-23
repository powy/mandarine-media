from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.territory import Territory
from app.schemas.territory import TerritoryCreate, TerritoryUpdate


class CRUDTerritory(CRUDBase[Territory, TerritoryCreate, TerritoryUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Territory]:
        return db.query(Territory).filter(Territory.name == name).first()


territory = CRUDTerritory(Territory)