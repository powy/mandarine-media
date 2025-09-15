from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.models.media_description_person import PersonRoleEnum
from app.schemas.media_description_person import PersonReorderRequest, PersonReplaceRequest

router = APIRouter()


@router.get("/{media_description_id}/people", response_model=List[schemas.MediaDescriptionPerson])
def get_media_people(
    *,
    db: Session = Depends(deps.get_db),
    media_description_id: UUID,
    role: PersonRoleEnum = None,
    current_user: schemas.User = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get all people associated with a media description, optionally filtered by role.
    """
    # Check if media description exists
    media_description = crud.media_description.get(db=db, id=media_description_id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")

    if role:
        # Get people for specific role
        people = crud.media_description_person.get_by_media_and_role(
            db=db,
            media_description_id=media_description_id,
            role=role.value
        )
    else:
        # Get all people for media description
        people = (
            db.query(crud.media_description_person.model)
            .filter(crud.media_description_person.model.media_description_id == media_description_id)
            .order_by(crud.media_description_person.model.role, crud.media_description_person.model.position)
            .all()
        )

    return people


@router.post("/{media_description_id}/people", response_model=schemas.MediaDescriptionPerson)
def add_person_to_media(
    *,
    db: Session = Depends(deps.get_db),
    media_description_id: UUID,
    person_role_in: schemas.PersonRoleCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Add a person to a media description with a specific role. Admin only.
    """
    # Check if media description exists
    media_description = crud.media_description.get(db=db, id=media_description_id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")

    # Check if person exists
    person = crud.public_person.get(db=db, id=person_role_in.public_person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Check if this person-role combination already exists
    existing = crud.media_description_person.get_by_composite_key(
        db=db,
        media_description_id=media_description_id,
        public_person_id=person_role_in.public_person_id,
        role=person_role_in.role.value
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Person is already assigned as {person_role_in.role.value} for this media"
        )

    try:
        person_role = crud.media_description_person.create_with_auto_position(
            db=db,
            obj_in=person_role_in,
            media_description_id=media_description_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return person_role


@router.put("/{media_description_id}/people/{role}/reorder")
def reorder_people_in_role(
    *,
    db: Session = Depends(deps.get_db),
    media_description_id: UUID,
    role: PersonRoleEnum,
    request: PersonReorderRequest,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Reorder people within a specific role. Admin only.
    Provide the desired order of person IDs.
    """
    # Check if media description exists
    media_description = crud.media_description.get(db=db, id=media_description_id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")

    # Reorder the people
    reordered_assignments = crud.media_description_person.reorder_roles(
        db=db,
        media_description_id=media_description_id,
        role=role.value,
        person_order=request.person_order
    )

    return {
        "message": f"Reordered {len(reordered_assignments)} people in role {role.value}",
        "assignments": [schemas.MediaDescriptionPerson.from_orm(assignment) for assignment in reordered_assignments]
    }


@router.put("/{media_description_id}/people/{role}/replace")
def replace_all_people_in_role(
    *,
    db: Session = Depends(deps.get_db),
    media_description_id: UUID,
    role: PersonRoleEnum,
    request: PersonReplaceRequest,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Replace all people for a specific role in a media description. Admin only.
    """
    # Check if media description exists
    media_description = crud.media_description.get(db=db, id=media_description_id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")

    # Replace all assignments for this role
    new_assignments = crud.media_description_person.replace_all_for_media_and_role(
        db=db,
        media_description_id=media_description_id,
        role=role.value,
        people_roles=request.people_roles
    )

    return {
        "message": f"Replaced all people in role {role.value}",
        "assignments": [schemas.MediaDescriptionPerson.from_orm(assignment) for assignment in new_assignments]
    }


@router.put("/{media_description_id}/people/{public_person_id}/{role}", response_model=schemas.MediaDescriptionPerson)
def update_person_role(
    *,
    db: Session = Depends(deps.get_db),
    media_description_id: UUID,
    public_person_id: UUID,
    role: PersonRoleEnum,
    person_role_in: schemas.PersonRoleUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update a person's role details (position, role_details, character_name). Admin only.
    """
    # Get the existing person role
    person_role = crud.media_description_person.get_by_composite_key(
        db=db,
        media_description_id=media_description_id,
        public_person_id=public_person_id,
        role=role.value
    )
    if not person_role:
        raise HTTPException(status_code=404, detail="Person role assignment not found")

    # If updating position, use the special method
    if person_role_in.position is not None and person_role_in.position != person_role.position:
        try:
            person_role = crud.media_description_person.update_position(
                db=db,
                db_obj=person_role,
                new_position=person_role_in.position
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Update other fields
    person_role = crud.media_description_person.update(
        db=db,
        db_obj=person_role,
        obj_in=person_role_in
    )

    return person_role


@router.delete("/{media_description_id}/people/{public_person_id}/{role}")
def remove_person_from_media(
    *,
    db: Session = Depends(deps.get_db),
    media_description_id: UUID,
    public_person_id: UUID,
    role: PersonRoleEnum,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Remove a person from a media description role. Admin only.
    """
    # Get the existing person role
    person_role = crud.media_description_person.get_by_composite_key(
        db=db,
        media_description_id=media_description_id,
        public_person_id=public_person_id,
        role=role.value
    )
    if not person_role:
        raise HTTPException(status_code=404, detail="Person role assignment not found")

    # Delete the record directly since it has a composite primary key
    db.delete(person_role)
    db.commit()
    return {"message": "Person role removed successfully"}


@router.post("/{media_description_id}/people/bulk", response_model=List[schemas.MediaDescriptionPerson])
def bulk_assign_people(
    *,
    db: Session = Depends(deps.get_db),
    media_description_id: UUID,
    bulk_assignment: schemas.BulkPersonRoleAssignment,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Bulk assign people to a media description. Admin only.
    """
    # Check if media description exists
    media_description = crud.media_description.get(db=db, id=media_description_id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")

    # Validate positions are unique within roles
    try:
        bulk_assignment.validate_positions()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create assignments
    created_assignments = crud.media_description_person.bulk_create_for_media(
        db=db,
        media_description_id=media_description_id,
        people_roles=bulk_assignment.people_roles
    )

    return created_assignments