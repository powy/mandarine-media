from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID
from app.models.associations import (
    media_description_origin_countries, media_description_available_countries
)


class Country(Base):
    __tablename__ = "countries"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String, nullable=False, unique=True)
    
    # Many-to-many relationships with MediaDescription
    origin_media = relationship("MediaDescription", secondary=media_description_origin_countries, back_populates="origin_countries")
    available_media = relationship("MediaDescription", secondary=media_description_available_countries, back_populates="available_countries")
