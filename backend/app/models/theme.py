from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID
from app.models.associations import media_description_themes


class Theme(Base):
    __tablename__ = "themes"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String, nullable=False, unique=True)
    
    # Optional Fields
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)  # e.g., "genre", "theme", "mood"
    
    # Many-to-many relationships with MediaDescription
    media = relationship("MediaDescription", secondary=media_description_themes, back_populates="themes")