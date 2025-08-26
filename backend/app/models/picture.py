from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID


class Picture(Base):
    __tablename__ = "pictures"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    photo_url = Column(String, nullable=False)
    
    # Optional metadata
    file_name = Column(String, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    alt_text = Column(String, nullable=True)
    description = Column(String, nullable=True)