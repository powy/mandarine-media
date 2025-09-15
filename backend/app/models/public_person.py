from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray
# No longer need the individual association table imports


class PublicPerson(Base):
    __tablename__ = "public_person"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    stage_name_roman = Column(String, nullable=False)  # Only required field in v1.5
    
    # Optional name fields (v1.5)
    first_name_hangul = Column(String, nullable=True)
    last_name_hangul = Column(String, nullable=True)
    first_name_roman = Column(String, nullable=True)
    last_name_roman = Column(String, nullable=True)
    stage_name_hangul = Column(String, nullable=True)
    
    # v1.5 fields
    face_image_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    profession_list = Column(JSONArray(), nullable=True)  # List of professions
    
    # Relationships
    face_image = relationship("Picture")
    
    # New unified media roles relationship
    media_roles = relationship("MediaDescriptionPerson", back_populates="public_person", cascade="all, delete-orphan")

    # Helper properties for backward compatibility
    @property
    def acted_in(self):
        """Get all media descriptions where this person is an actor"""
        return [pr.media_description for pr in self.media_roles if pr.role == 'actor']

    @property
    def directed(self):
        """Get all media descriptions where this person is a director"""
        return [pr.media_description for pr in self.media_roles if pr.role == 'director']

    @property
    def produced(self):
        """Get all media descriptions where this person is a producer"""
        return [pr.media_description for pr in self.media_roles if pr.role == 'producer']

    @property
    def authored(self):
        """Get all media descriptions where this person is an author"""
        return [pr.media_description for pr in self.media_roles if pr.role == 'author']