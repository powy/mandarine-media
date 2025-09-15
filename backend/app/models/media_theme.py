from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID
from app.models.associations import media_description_media_themes, media_showcase_media_themes


class MediaTheme(Base):
    __tablename__ = "media_themes"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(Text, nullable=False)
    
    # Relationships
    media_descriptions = relationship("MediaDescription", secondary=media_description_media_themes, back_populates="media_themes")
    media_showcases = relationship("MediaShowcase", secondary=media_showcase_media_themes, back_populates="media_themes")