from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray


class Season(Base):
    __tablename__ = "seasons"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    program_id = Column(GUID(), ForeignKey("programs.id"), nullable=False)
    season_number = Column(Integer, nullable=False)
    
    # Optional fields
    season_name = Column(String, nullable=True)
    general_media_description_id = Column(GUID(), nullable=True)  # link to media_description
    episodes_id_list = Column(JSONArray(), nullable=True)
    
    # Relationships
    program = relationship("Program", back_populates="seasons")
    media_descriptions = relationship("MediaDescription", back_populates="season")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('program_id', 'season_number', name='unique_program_season'),
    )