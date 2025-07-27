from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.language import Language
from app.schemas.language import LanguageCreate, LanguageUpdate


class CRUDLanguage(CRUDBase[Language, LanguageCreate, LanguageUpdate]):
    def get_by_sigle(self, db: Session, *, sigle: str) -> Optional[Language]:
        return db.query(Language).filter(Language.sigle == sigle).first()
    
    def get_by_name(self, db: Session, *, name: str) -> Optional[Language]:
        return db.query(Language).filter(Language.name == name).first()


language = CRUDLanguage(Language)