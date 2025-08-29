from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID
from app.models.associations import media_description_audience_categories


class AudienceCategory(Base):
    __tablename__ = "audience_category"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String, nullable=False, unique=True)
    
    # Many-to-many relationships with MediaDescription
    media = relationship("MediaDescription", secondary=media_description_audience_categories, back_populates="audience_categories")