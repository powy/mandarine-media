from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps

router = APIRouter()


@router.get("", response_model=List[schemas.Picture])
def read_pictures(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve pictures.
    """
    pictures = crud.picture.get_multi(db, skip=skip, limit=limit)
    return pictures


@router.post("", response_model=schemas.Picture)
def create_picture(
    *,
    db: Session = Depends(deps.get_db),
    picture_in: schemas.PictureCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new picture. Admin only.
    """
    # Check if picture URL already exists
    existing = crud.picture.get_by_url(db=db, url=picture_in.photo_url)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Picture with URL '{picture_in.photo_url}' already exists",
        )
    
    picture = crud.picture.create(db=db, obj_in=picture_in)
    return picture


@router.get("/{id}", response_model=schemas.Picture)
def read_picture(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get picture by ID.
    """
    picture = crud.picture.get(db=db, id=id)
    if not picture:
        raise HTTPException(status_code=404, detail="Picture not found")
    return picture


@router.put("/{id}", response_model=schemas.Picture)
def update_picture(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    picture_in: schemas.PictureUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update picture. Admin only.
    """
    picture = crud.picture.get(db=db, id=id)
    if not picture:
        raise HTTPException(status_code=404, detail="Picture not found")
    
    # Check if updating photo_url to an existing one
    if picture_in.photo_url is not None:
        existing = crud.picture.get_by_url(db=db, url=picture_in.photo_url)
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Picture with URL '{picture_in.photo_url}' already exists",
            )
    
    picture = crud.picture.update(db=db, db_obj=picture, obj_in=picture_in)
    return picture


@router.delete("/{id}", response_model=schemas.Picture)
def delete_picture(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete picture. Admin only.
    """
    picture = crud.picture.get(db=db, id=id)
    if not picture:
        raise HTTPException(status_code=404, detail="Picture not found")
    
    picture = crud.picture.remove(db=db, id=id)
    return picture