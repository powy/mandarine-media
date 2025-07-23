from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID


class Program(Base):
    __tablename__ = "programs"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    program_name = Column(String, nullable=False, unique=True)
    
    # Optional fields
    general_media_description = Column(String, nullable=True)
    
    # Relationships
    seasons = relationship("Season", back_populates="program")
    media_descriptions = relationship("MediaDescription", back_populates="program")