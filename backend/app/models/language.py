from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID
from app.models.associations import media_description_original_languages


class Language(Base):
    __tablename__ = "languages"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String, nullable=False)
    sigle = Column(String, nullable=False, unique=True)  # Language code (en, fr, ko, etc.)
    
    # Many-to-many relationships with MediaDescription
    original_language_media = relationship("MediaDescription", secondary=media_description_original_languages, back_populates="original_languages")