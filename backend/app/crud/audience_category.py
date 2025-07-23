from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.audience_category import AudienceCategory
from app.schemas.audience_category import AudienceCategoryCreate, AudienceCategoryUpdate


class CRUDAudienceCategory(CRUDBase[AudienceCategory, AudienceCategoryCreate, AudienceCategoryUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[AudienceCategory]:
        return db.query(AudienceCategory).filter(AudienceCategory.name == name).first()


audience_category = CRUDAudienceCategory(AudienceCategory)