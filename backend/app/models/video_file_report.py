from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.db.database import Base
from app.models.common import GUID


class VideoFileReport(Base):
    __tablename__ = "video_file_reports"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Related video file information
    video_file_id = Column(GUID(), ForeignKey("video_file.id"), nullable=True)
    video_file_name = Column(String, nullable=False)
    video_file_url = Column(String, nullable=True)
    upload_method = Column(String, nullable=True)
    file_size = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    
    # Related media description information
    media_description_id = Column(GUID(), ForeignKey("media_description.id"), nullable=True)
    media_description_title = Column(String, nullable=True)
    
    # Report information
    event = Column(String, nullable=False)  # "possible_orphan", "file_delete", etc.
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    additional_info = Column(Text, nullable=True)
    
    # Relationships
    video_file = relationship("VideoFile", back_populates="reports")
    media_description = relationship("MediaDescription", back_populates="video_file_reports")