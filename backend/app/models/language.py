from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID


class Language(Base):
    __tablename__ = "languages"
    
    # Required fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String, nullable=False)
    sigle = Column(String, nullable=False, unique=True)  # Language code (en, fr, ko, etc.)