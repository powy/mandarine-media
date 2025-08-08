from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.country import Country
from app.schemas.country import CountryCreate, CountryUpdate


class CRUDCountry(CRUDBase[Country, CountryCreate, CountryUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Country]:
        return db.query(Country).filter(Country.name == name).first()


country = CRUDCountry(Country)