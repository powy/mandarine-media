from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base
from app.models.common import GUID
import enum


class PersonRoleEnum(enum.Enum):
    actor = "actor"
    director = "director"
    producer = "producer"
    author = "author"


class MediaDescriptionPerson(Base):
    """
    Association object for MediaDescription <-> PublicPerson relationships.
    Replaces the 4 separate association tables with a unified approach that supports:
    - Ordering within roles via position field
    - Multi-role people (same person can be both actor and director)
    - Extended role information (character names, role details)
    - Future extensibility for role hierarchies
    """
    __tablename__ = "media_description_people"

    # Primary relationship columns
    media_description_id = Column(GUID(), ForeignKey("media_description.id"), primary_key=True)
    public_person_id = Column(GUID(), ForeignKey("public_person.id"), primary_key=True)
    role = Column(String(50), primary_key=True)  # 'actor', 'director', 'producer', 'author'

    # Ordering and role details
    position = Column(Integer, nullable=False, default=0)  # Order within role (0, 10, 20, 30...)
    role_details = Column(String(255), nullable=True)  # 'Lead Actor', 'Executive Producer', etc.
    character_name = Column(String(255), nullable=True)  # For actors: character they play

    # Metadata
    created_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_date_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    media_description = relationship("MediaDescription", back_populates="people_roles")
    public_person = relationship("PublicPerson", back_populates="media_roles")

    # Constraints and indexes
    __table_args__ = (
        # Ensure position uniqueness within media_description + role
        UniqueConstraint('media_description_id', 'role', 'position', name='unique_role_position'),
        # Index for efficient querying by media and role with ordering
        Index('idx_media_role_position', 'media_description_id', 'role', 'position'),
        # Index for querying person's roles across all media
        Index('idx_person_roles', 'public_person_id', 'role'),
    )

    def __repr__(self):
        return (f"<MediaDescriptionPerson("
                f"media={self.media_description_id}, "
                f"person={self.public_person_id}, "
                f"role={self.role}, "
                f"position={self.position})>")