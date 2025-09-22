from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.crud.base import CRUDBase
from app.models.media_description_person import MediaDescriptionPerson
from app.schemas.media_description_person import (
    MediaDescriptionPersonCreate,
    MediaDescriptionPersonUpdate,
    PersonRoleCreate,
)


class CRUDMediaDescriptionPerson(CRUDBase[MediaDescriptionPerson, MediaDescriptionPersonCreate, MediaDescriptionPersonUpdate]):

    def get_by_media_and_role(
        self,
        db: Session,
        *,
        media_description_id: UUID,
        role: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[MediaDescriptionPerson]:
        """Get all people for a specific media and role, ordered by position"""
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.media_description_id == media_description_id,
                    self.model.role == role
                )
            )
            .order_by(self.model.position)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_person_and_role(
        self,
        db: Session,
        *,
        public_person_id: UUID,
        role: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[MediaDescriptionPerson]:
        """Get all media descriptions for a specific person and role"""
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.public_person_id == public_person_id,
                    self.model.role == role
                )
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_composite_key(
        self,
        db: Session,
        *,
        media_description_id: UUID,
        public_person_id: UUID,
        role: str
    ) -> Optional[MediaDescriptionPerson]:
        """Get a specific person role assignment by composite key"""
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.media_description_id == media_description_id,
                    self.model.public_person_id == public_person_id,
                    self.model.role == role
                )
            )
            .first()
        )

    def get_max_position_for_role(
        self,
        db: Session,
        *,
        media_description_id: UUID,
        role: str
    ) -> int:
        """Get the maximum position for a role in a media description"""
        result = (
            db.query(func.max(self.model.position))
            .filter(
                and_(
                    self.model.media_description_id == media_description_id,
                    self.model.role == role
                )
            )
            .scalar()
        )
        return result or 0

    def get_next_available_position(
        self,
        db: Session,
        *,
        media_description_id: UUID,
        role: str
    ) -> int:
        """Get the next available position for a role (max + 10)"""
        max_position = self.get_max_position_for_role(
            db=db,
            media_description_id=media_description_id,
            role=role
        )
        return max_position + 10

    def check_position_available(
        self,
        db: Session,
        *,
        media_description_id: UUID,
        role: str,
        position: int,
        exclude_person_id: Optional[UUID] = None
    ) -> bool:
        """Check if a position is available for a role"""
        query = db.query(self.model).filter(
            and_(
                self.model.media_description_id == media_description_id,
                self.model.role == role,
                self.model.position == position
            )
        )

        if exclude_person_id:
            query = query.filter(self.model.public_person_id != exclude_person_id)

        existing = query.first()
        return existing is None

    def create_with_auto_position(
        self,
        db: Session,
        *,
        obj_in: PersonRoleCreate,
        media_description_id: UUID,
        commit: bool = True
    ) -> MediaDescriptionPerson:
        """Create a person role assignment with automatic position assignment if not provided"""

        # If position is 0 or not provided, auto-assign
        if obj_in.position == 0:
            position = self.get_next_available_position(
                db=db,
                media_description_id=media_description_id,
                role=obj_in.role.value
            )
        else:
            position = obj_in.position

            # Verify position is available
            if not self.check_position_available(
                db=db,
                media_description_id=media_description_id,
                role=obj_in.role.value,
                position=position
            ):
                raise ValueError(f"Position {position} is already taken for role {obj_in.role}")

        # Create the record
        db_obj_data = {
            "media_description_id": media_description_id,
            "public_person_id": obj_in.public_person_id,
            "role": obj_in.role.value,
            "position": position,
            "role_details": obj_in.role_details,
            "character_name": obj_in.character_name,
        }

        db_obj = self.model(**db_obj_data)
        db.add(db_obj)
        db.flush()  # This ensures the object gets an ID without committing
        if commit:
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def update_position(
        self,
        db: Session,
        *,
        db_obj: MediaDescriptionPerson,
        new_position: int
    ) -> MediaDescriptionPerson:
        """Update the position of a person role, checking for conflicts"""

        # Check if new position is available
        if not self.check_position_available(
            db=db,
            media_description_id=db_obj.media_description_id,
            role=db_obj.role,
            position=new_position,
            exclude_person_id=db_obj.public_person_id
        ):
            raise ValueError(f"Position {new_position} is already taken for role {db_obj.role}")

        db_obj.position = new_position
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def reorder_roles(
        self,
        db: Session,
        *,
        media_description_id: UUID,
        role: str,
        person_order: List[UUID]
    ) -> List[MediaDescriptionPerson]:
        """Reorder people within a role by providing the desired order of person IDs"""

        # Get existing assignments
        existing_assignments = self.get_by_media_and_role(
            db=db,
            media_description_id=media_description_id,
            role=role
        )

        # Create a mapping from person_id to assignment
        assignment_map = {assign.public_person_id: assign for assign in existing_assignments}

        # Step 1: First set all to temporary positions to avoid conflicts
        # Use large negative positions as temporary values
        for assignment in existing_assignments:
            assignment.position = -abs(assignment.position) - 1000  # Make it negative and unique
            db.add(assignment)

        # Commit temporary positions
        db.commit()

        # Step 2: Now set final positions safely
        updated_assignments = []
        for i, person_id in enumerate(person_order):
            if person_id in assignment_map:
                assignment = assignment_map[person_id]
                assignment.position = (i + 1) * 10  # 10, 20, 30, etc.
                db.add(assignment)
                updated_assignments.append(assignment)

        # Commit final positions
        db.commit()

        # Refresh all objects
        for assignment in updated_assignments:
            db.refresh(assignment)

        return updated_assignments

    def bulk_create_for_media(
        self,
        db: Session,
        *,
        media_description_id: UUID,
        people_roles: List[PersonRoleCreate]
    ) -> List[MediaDescriptionPerson]:
        """Create multiple person role assignments for a media description"""

        # Validate that the media description exists before creating relationships
        from app.models.media_description import MediaDescription
        media_desc = db.query(MediaDescription).filter(MediaDescription.id == media_description_id).first()
        if not media_desc:
            raise ValueError(f"Media description with ID {media_description_id} does not exist")

        created_assignments = []
        errors = []

        # Keep track of positions used in this bulk operation to catch conflicts early
        used_positions = {}  # role -> set of positions

        try:
            for person_role in people_roles:
                try:
                    # Check for position conflicts within this bulk operation
                    role_key = person_role.role.value if hasattr(person_role.role, 'value') else person_role.role
                    if role_key not in used_positions:
                        used_positions[role_key] = set()

                    # If position is specified and not 0, check for conflicts
                    if person_role.position != 0:
                        if person_role.position in used_positions[role_key]:
                            errors.append(f"Position conflict within bulk operation: {person_role.position} already used for role {role_key}")
                            continue
                        used_positions[role_key].add(person_role.position)

                    assignment = self.create_with_auto_position(
                        db=db,
                        obj_in=person_role,
                        media_description_id=media_description_id,
                        commit=False  # Defer commits until all are created
                    )
                    created_assignments.append(assignment)

                    # Track auto-assigned positions too
                    if person_role.position == 0:
                        used_positions[role_key].add(assignment.position)

                except ValueError as e:
                    # Collect errors but continue with other assignments
                    errors.append(f"Error creating assignment: {e}")
                    continue

            # Note: Do not commit here - let the parent transaction handle the commit
            # This ensures atomicity with the media description creation

            # Log any non-critical errors
            for error in errors:
                print(f"ERROR: {error}")

        except Exception as e:
            # Do not rollback here - let the parent transaction handle rollback
            # to maintain transaction atomicity
            raise ValueError(f"Failed to create person role assignments: {e}")

        return created_assignments

    def replace_all_for_media_and_role(
        self,
        db: Session,
        *,
        media_description_id: UUID,
        role: str,
        people_roles: List[PersonRoleCreate]
    ) -> List[MediaDescriptionPerson]:
        """Replace all people for a specific media and role"""

        # Delete existing assignments for this role
        db.query(self.model).filter(
            and_(
                self.model.media_description_id == media_description_id,
                self.model.role == role
            )
        ).delete()

        # Create new assignments
        created_assignments = []
        for person_role in people_roles:
            db_obj_data = {
                "media_description_id": media_description_id,
                "public_person_id": person_role.public_person_id,
                "role": role,
                "position": person_role.position,
                "role_details": person_role.role_details,
                "character_name": person_role.character_name,
            }

            db_obj = self.model(**db_obj_data)
            db.add(db_obj)
            created_assignments.append(db_obj)

        db.commit()

        # Refresh all objects
        for assignment in created_assignments:
            db.refresh(assignment)

        return created_assignments


media_description_person = CRUDMediaDescriptionPerson(MediaDescriptionPerson)