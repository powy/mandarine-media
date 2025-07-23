from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray


class PublicPerson(Base):
    __tablename__ = "public_person"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    stage_name_roman = Column(String, nullable=False)  # Only required field in v1.5
    
    # Optional name fields (v1.5)
    first_name_hangul = Column(String, nullable=True)
    last_name_hangul = Column(String, nullable=True)
    first_name_roman = Column(String, nullable=True)
    last_name_roman = Column(String, nullable=True)
    stage_name_hangul = Column(String, nullable=True)
    
    # v1.5 fields
    profession_list = Column(JSONArray(), nullable=True)
    face_image_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    
    # Relationships
    face_image = relationship("Picture")