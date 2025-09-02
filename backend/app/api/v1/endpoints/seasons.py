from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps

router = APIRouter()


@router.get("", response_model=List[schemas.Season])
def read_seasons(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    program_id: Optional[UUID] = Query(None),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve seasons.
    """
    seasons = crud.season.get_multi(db, skip=skip, limit=limit)
    if program_id:
        seasons = [season for season in seasons if season.program_id == program_id]
    return seasons


@router.post("", response_model=schemas.Season)
def create_season(
    *,
    db: Session = Depends(deps.get_db),
    season_in: schemas.SeasonCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new season. Admin only.
    """
    # Check if program exists (only if program_id is provided)
    if season_in.program_id is not None:
        try:
            program = crud.program.get(db=db, id=season_in.program_id)
            if not program:
                raise HTTPException(
                    status_code=404,
                    detail=f"Program with id '{season_in.program_id}' not found",
                )
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid program_id format: {season_in.program_id}",
            )

    # Check if season number already exists for this program (only if program_id is provided)
    if season_in.program_id:
        existing = crud.season.get_by_program_and_number(
            db=db,
            program_id=season_in.program_id,
            season_number=season_in.season_number,
        )
        if existing:
            program = crud.program.get(db=db, id=season_in.program_id)
            program_name = program.program_name if program else "Unknown"
            raise HTTPException(
                status_code=409,
                detail=f"Season {season_in.season_number} already exists for program '{program_name}'",
            )

    season = crud.season.create(db=db, obj_in=season_in)
    return season


@router.get("/{id}", response_model=schemas.Season)
def read_season(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get season by ID.
    """
    season = crud.season.get(db=db, id=id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


@router.put("/{id}", response_model=schemas.Season)
def update_season(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    season_in: schemas.SeasonUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update season. Admin only.
    """
    season = crud.season.get(db=db, id=id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    # Check if updating season number to an existing one
    if season_in.season_number is not None:
        existing = crud.season.get_by_program_and_number(
            db=db, program_id=season.program_id, season_number=season_in.season_number
        )
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Season {season_in.season_number} already exists for this program",
            )

    season = crud.season.update(db=db, db_obj=season, obj_in=season_in)
    return season


@router.delete("/{id}", response_model=schemas.Season)
def delete_season(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete season. Admin only.
    """
    season = crud.season.get(db=db, id=id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    season = crud.season.remove(db=db, id=id)
    return season
