from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID
from app.models.associations import media_description_additional_images
from sqlalchemy.orm import relationship


class Picture(Base):
    __tablename__ = "pictures"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    image_url = Column(String, nullable=False)
    large_image_url = Column(String, nullable=True)
    small_image_url = Column(String, nullable=True)

    # Optional metadata
    file_name = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    alt_text = Column(String, nullable=True)
    description = Column(String, nullable=True)
    
    # Relationships
    additional_for_media = relationship("MediaDescription", secondary=media_description_additional_images, back_populates="additional_images")