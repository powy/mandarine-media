from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID


class MediaTheme(Base):
    __tablename__ = "media_themes"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(Text, nullable=False)
    
    # Relationships will be added once association tables are created