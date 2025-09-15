from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.media_description_person import PersonRoleEnum


class MediaDescriptionPersonBase(BaseModel):
    """Base schema for MediaDescriptionPerson"""
    media_description_id: UUID
    public_person_id: UUID
    role: PersonRoleEnum
    position: int = Field(default=0, description="Order within role (0, 10, 20, 30...)")
    role_details: Optional[str] = Field(None, description="Role details like 'Lead Actor', 'Executive Producer'")
    character_name: Optional[str] = Field(None, description="Character name for actors")


class MediaDescriptionPersonCreate(MediaDescriptionPersonBase):
    """Schema for creating MediaDescriptionPerson"""
    pass


class MediaDescriptionPersonUpdate(BaseModel):
    """Schema for updating MediaDescriptionPerson"""
    position: Optional[int] = None
    role_details: Optional[str] = None
    character_name: Optional[str] = None


class MediaDescriptionPersonInDB(MediaDescriptionPersonBase):
    """Schema for MediaDescriptionPerson in database"""
    created_date_utc: datetime
    updated_date_utc: datetime

    model_config = ConfigDict(from_attributes=True)


class MediaDescriptionPerson(MediaDescriptionPersonInDB):
    """Full schema for MediaDescriptionPerson with relationships"""
    pass


# Simplified schemas for nested usage
class PersonRoleSimple(BaseModel):
    """Simplified person role for nested use in MediaDescription schemas"""
    public_person_id: UUID
    role: PersonRoleEnum
    position: int
    role_details: Optional[str] = None
    character_name: Optional[str] = None
    stage_name_roman: Optional[str] = None  # From PublicPerson

    model_config = ConfigDict(from_attributes=True)


class PersonRoleCreate(BaseModel):
    """Schema for creating person role assignments"""
    public_person_id: UUID
    role: PersonRoleEnum
    position: int = Field(default=0, description="Position within role")
    role_details: Optional[str] = None
    character_name: Optional[str] = None


class PersonRoleUpdate(BaseModel):
    """Schema for updating person role assignments"""
    position: Optional[int] = None
    role_details: Optional[str] = None
    character_name: Optional[str] = None


# Bulk operation schemas
class BulkPersonRoleAssignment(BaseModel):
    """Schema for bulk person role assignments"""
    people_roles: List[PersonRoleCreate] = Field(description="List of person role assignments")

    def validate_positions(self):
        """Validate that positions are unique within each role"""
        role_positions = {}
        for person_role in self.people_roles:
            role = person_role.role
            position = person_role.position

            if role not in role_positions:
                role_positions[role] = set()

            if position in role_positions[role]:
                raise ValueError(f"Duplicate position {position} for role {role.value}")

            role_positions[role].add(position)

        return True


# Request schemas for specific endpoints
class PersonReorderRequest(BaseModel):
    """Schema for reordering people within a role"""
    person_order: List[UUID] = Field(description="List of person IDs in desired order")


class PersonReplaceRequest(BaseModel):
    """Schema for replacing all people in a role"""
    people_roles: List[PersonRoleCreate] = Field(description="List of new person role assignments")