from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base
from app.models.common import GUID


class DescriptionReport(Base):
    __tablename__ = "description_report"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    description_id = Column(GUID(), ForeignKey("media_description.id"), nullable=False)
    title = Column(String, nullable=False)
    success_associated_file = Column(Boolean, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Optional Fields
    batch_id = Column(GUID(), nullable=True)  # For grouping bulk operations
    
    # Relationships
    media_description = relationship("MediaDescription", backref="description_reports")