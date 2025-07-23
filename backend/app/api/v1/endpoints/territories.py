from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps

router = APIRouter()


@router.get("", response_model=List[schemas.Territory])
def read_territories(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    country_id: Optional[UUID] = Query(None),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve territories.
    """
    territories = crud.territory.get_multi(db, skip=skip, limit=limit)
    if country_id:
        territories = [territory for territory in territories if territory.country_id == country_id]
    return territories


@router.post("", response_model=schemas.Territory)
def create_territory(
    *,
    db: Session = Depends(deps.get_db),
    territory_in: schemas.TerritoryCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new territory. Admin only.
    """
    # Check if country exists (if country_id is provided)
    if territory_in.country_id:
        country = crud.country.get(db=db, id=territory_in.country_id)
        if not country:
            raise HTTPException(
                status_code=404,
                detail=f"Country with id '{territory_in.country_id}' not found",
            )
    
    # Check if territory name already exists
    existing = crud.territory.get_by_name(db=db, name=territory_in.name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Territory with name '{territory_in.name}' already exists",
        )
    
    territory = crud.territory.create(db=db, obj_in=territory_in)
    return territory


@router.get("/{id}", response_model=schemas.Territory)
def read_territory(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get territory by ID.
    """
    territory = crud.territory.get(db=db, id=id)
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    return territory


@router.put("/{id}", response_model=schemas.Territory)
def update_territory(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    territory_in: schemas.TerritoryUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update territory. Admin only.
    """
    territory = crud.territory.get(db=db, id=id)
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    
    # Check if country exists (if country_id is being updated)
    if territory_in.country_id:
        country = crud.country.get(db=db, id=territory_in.country_id)
        if not country:
            raise HTTPException(
                status_code=404,
                detail=f"Country with id '{territory_in.country_id}' not found",
            )
    
    # Check if updating name to an existing one
    if territory_in.name is not None:
        existing = crud.territory.get_by_name(db=db, name=territory_in.name)
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Territory with name '{territory_in.name}' already exists",
            )
    
    territory = crud.territory.update(db=db, db_obj=territory, obj_in=territory_in)
    return territory


@router.delete("/{id}", response_model=schemas.Territory)
def delete_territory(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete territory. Admin only.
    """
    territory = crud.territory.get(db=db, id=id)
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    
    territory = crud.territory.remove(db=db, id=id)
    return territory