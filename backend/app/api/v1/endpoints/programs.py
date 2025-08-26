from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps

router = APIRouter()


@router.get("", response_model=List[schemas.Program])
def read_programs(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve programs.
    """
    programs = crud.program.get_multi(db, skip=skip, limit=limit)
    return programs


@router.post("", response_model=schemas.Program)
def create_program(
    *,
    db: Session = Depends(deps.get_db),
    program_in: schemas.ProgramCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new program. Admin only.
    """
    # Check if program name already exists
    existing = crud.program.get_by_name(db=db, name=program_in.program_name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Program with name '{program_in.program_name}' already exists",
        )
    
    # Validate general_media_description_id exists if provided
    if program_in.general_media_description_id is not None:
        media_desc = crud.media_description.get(db=db, id=program_in.general_media_description_id)
        if not media_desc:
            raise HTTPException(
                status_code=404,
                detail=f"MediaDescription with ID '{program_in.general_media_description_id}' not found",
            )
    
    program = crud.program.create(db=db, obj_in=program_in)
    return program


@router.get("/{id}", response_model=schemas.Program)
def read_program(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get program by ID.
    """
    program = crud.program.get(db=db, id=id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return program


@router.put("/{id}", response_model=schemas.Program)
def update_program(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    program_in: schemas.ProgramUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update program. Admin only.
    """
    program = crud.program.get(db=db, id=id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Check if updating name to an existing one
    if program_in.program_name is not None:
        existing = crud.program.get_by_name(db=db, name=program_in.program_name)
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Program with name '{program_in.program_name}' already exists",
            )
    
    # Validate general_media_description_id exists if provided
    if program_in.general_media_description_id is not None:
        media_desc = crud.media_description.get(db=db, id=program_in.general_media_description_id)
        if not media_desc:
            raise HTTPException(
                status_code=404,
                detail=f"MediaDescription with ID '{program_in.general_media_description_id}' not found",
            )
    
    program = crud.program.update(db=db, db_obj=program, obj_in=program_in)
    return program


@router.delete("/{id}", response_model=schemas.Program)
def delete_program(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete program. Admin only.
    """
    program = crud.program.get(db=db, id=id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    program = crud.program.remove(db=db, id=id)
    return program