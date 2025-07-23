from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.picture import Picture
from app.schemas.picture import PictureCreate, PictureUpdate


class CRUDPicture(CRUDBase[Picture, PictureCreate, PictureUpdate]):
    def get_by_url(self, db: Session, *, url: str) -> Optional[Picture]:
        return db.query(Picture).filter(Picture.photo_url == url).first()


picture = CRUDPicture(Picture)