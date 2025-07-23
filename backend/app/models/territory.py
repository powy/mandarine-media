from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID


class Territory(Base):
    __tablename__ = "territories"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String, nullable=False, unique=True)
    
    # Optional fields
    country_id = Column(GUID(), ForeignKey("countries.id"), nullable=True)
    
    # Relationships
    country = relationship("Country", back_populates="territories")