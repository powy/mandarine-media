from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.crud.base import CRUDBase
from app.models.public_person import PublicPerson
from app.schemas.public_person import PublicPersonCreate, PublicPersonUpdate


class CRUDPublicPerson(CRUDBase[PublicPerson, PublicPersonCreate, PublicPersonUpdate]):
    def search_by_name(self, db: Session, *, name: str, skip: int = 0, limit: int = 100) -> List[PublicPerson]:
        search_term = f"%{name}%"
        return (
            db.query(self.model)
            .filter(
                or_(
                    PublicPerson.first_name_hangul.ilike(search_term),
                    PublicPerson.last_name_hangul.ilike(search_term),
                    PublicPerson.first_name_roman.ilike(search_term),
                    PublicPerson.last_name_roman.ilike(search_term),
                    PublicPerson.stage_name_hangul.ilike(search_term),
                    PublicPerson.stage_name_roman.ilike(search_term)
                )
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_profession(
        self, db: Session, *, profession: str, skip: int = 0, limit: int = 100
    ) -> List[PublicPerson]:
        """Get public persons by profession from profession_list"""
        return (
            db.query(self.model)
            .filter(PublicPerson.profession_list.contains([profession]))
            .order_by(PublicPerson.stage_name_roman)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_total(self, db: Session) -> int:
        """Get total count of all public persons"""
        return db.query(self.model).count()

    def count_by_name(self, db: Session, *, name: str) -> int:
        """Count public persons matching name search"""
        search_term = f"%{name}%"
        return (
            db.query(self.model)
            .filter(
                or_(
                    PublicPerson.first_name_hangul.ilike(search_term),
                    PublicPerson.last_name_hangul.ilike(search_term),
                    PublicPerson.first_name_roman.ilike(search_term),
                    PublicPerson.last_name_roman.ilike(search_term),
                    PublicPerson.stage_name_hangul.ilike(search_term),
                    PublicPerson.stage_name_roman.ilike(search_term)
                )
            )
            .count()
        )

    def count_by_profession(self, db: Session, *, profession: str) -> int:
        """Count public persons by profession"""
        return (
            db.query(self.model)
            .filter(PublicPerson.profession_list.contains([profession]))
            .count()
        )


public_person = CRUDPublicPerson(PublicPerson)