from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.models.picture import Picture
from app.schemas.pagination import PaginatedResponse
from app.utils.pagination import paginate_query

router = APIRouter()


@router.get("", response_model=PaginatedResponse[schemas.Picture])
def read_pictures(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="Search by file name or URL"),
    order_by: Optional[str] = Query(None, description="Field to sort by"),
    order_dir: Optional[str] = Query('asc', description="Sort direction (asc|desc)"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve pictures.
    """
    query = db.query(Picture)

    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(or_(Picture.file_name.ilike(search_term), Picture.image_url.ilike(search_term)))

    pictures, pagination = paginate_query(
        query,
        Picture,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir,
        default_sort='creation_date_utc',
        allowed_sort_fields=(
            'creation_date_utc',
            'file_name',
            'image_url',
            'id',
        ),
    )

    return PaginatedResponse[schemas.Picture](data=pictures, pagination=pagination)


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
    existing = crud.picture.get_by_url(db=db, url=picture_in.image_url)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Picture with URL '{picture_in.image_url}' already exists",
        )
    
    picture = crud.picture.create(db=db, obj_in=picture_in)
    return picture


@router.get("/{id}", response_model=schemas.Picture)
def read_picture(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
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
    
    # Check if updating image_url to an existing one
    if picture_in.image_url is not None:
        existing = crud.picture.get_by_url(db=db, url=picture_in.image_url)
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Picture with URL '{picture_in.image_url}' already exists",
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
