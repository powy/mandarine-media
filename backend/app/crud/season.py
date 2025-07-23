from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.season import Season
from app.schemas.season import SeasonCreate, SeasonUpdate


class CRUDSeason(CRUDBase[Season, SeasonCreate, SeasonUpdate]):
    def get_by_program(self, db: Session, *, program_id: UUID) -> List[Season]:
        return db.query(Season).filter(Season.program_id == program_id).order_by(Season.season_number).all()
    
    def get_by_program_and_number(self, db: Session, *, program_id: UUID, season_number: int) -> Optional[Season]:
        return db.query(Season).filter(Season.program_id == program_id, Season.season_number == season_number).first()


season = CRUDSeason(Season)