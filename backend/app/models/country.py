from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID


class Country(Base):
    __tablename__ = "countries"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String, nullable=False, unique=True)
    
    # Relationships
    territories = relationship("Territory", back_populates="country")