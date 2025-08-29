from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps

router = APIRouter()


@router.get("", response_model=List[schemas.audience_category.AudienceCategory])
def read_audience_categories(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve audience categories.
    """
    audience_categories = crud.audience_category.get_multi(db=db, skip=skip, limit=limit)
    return audience_categories


@router.post("", response_model=schemas.audience_category.AudienceCategory)
def create_audience_category(
    *,
    db: Session = Depends(deps.get_db),
    audience_category_in: schemas.audience_category.AudienceCategoryCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new audience category. Admin only.
    """
    # Check if name already exists
    existing = crud.audience_category.get_by_name(db=db, name=audience_category_in.name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Audience category with name {audience_category_in.name} already exists",
        )
    
    audience_category = crud.audience_category.create(db=db, obj_in=audience_category_in)
    return audience_category


@router.get("/{id}", response_model=schemas.audience_category.AudienceCategory)
def read_audience_category(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get audience category by ID.
    """
    audience_category = crud.audience_category.get(db=db, id=id)
    if not audience_category:
        raise HTTPException(status_code=404, detail="Audience category not found")
    
    return audience_category


@router.put("/{id}", response_model=schemas.audience_category.AudienceCategory)
def update_audience_category(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    audience_category_in: schemas.audience_category.AudienceCategoryUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update an audience category. Admin only.
    """
    audience_category = crud.audience_category.get(db=db, id=id)
    if not audience_category:
        raise HTTPException(status_code=404, detail="Audience category not found")
    
    # Check if updating name to an existing one
    if audience_category_in.name is not None:
        existing = crud.audience_category.get_by_name(db=db, name=audience_category_in.name)
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Audience category with name {audience_category_in.name} already exists",
            )
    
    audience_category = crud.audience_category.update(db=db, db_obj=audience_category, obj_in=audience_category_in)
    return audience_category


@router.delete("/{id}", response_model=schemas.audience_category.AudienceCategory)
def delete_audience_category(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete an audience category. Admin only.
    """
    audience_category = crud.audience_category.get(db=db, id=id)
    if not audience_category:
        raise HTTPException(status_code=404, detail="Audience category not found")
    
    audience_category = crud.audience_category.remove(db=db, id=id)
    return audience_category