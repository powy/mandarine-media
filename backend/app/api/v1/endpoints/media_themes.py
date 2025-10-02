from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.models.media_theme import MediaTheme
from app.models.user import User
from app.schemas.pagination import PaginatedResponse
from app.utils.pagination import paginate_query

router = APIRouter()


@router.get("", response_model=PaginatedResponse[schemas.MediaTheme])
def read_media_themes(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="Search by theme name"),
    order_by: Optional[str] = Query(None, description="Field to sort by"),
    order_dir: Optional[str] = Query('asc', description="Sort direction (asc|desc)"),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve media themes.
    """
    query = db.query(MediaTheme)

    if q:
        query = query.filter(MediaTheme.name.ilike(f"%{q.strip()}%"))

    media_themes, pagination = paginate_query(
        query,
        MediaTheme,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir,
        default_sort='name',
        allowed_sort_fields=('name', 'creation_date_utc', 'id'),
    )

    return PaginatedResponse[schemas.MediaTheme](data=media_themes, pagination=pagination)


@router.post("", response_model=schemas.MediaTheme)
def create_media_theme(
    *,
    db: Session = Depends(deps.get_db),
    media_theme_in: schemas.MediaThemeCreate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new media theme.
    """
    # Check if media theme with same name already exists
    existing_theme = crud.media_theme.get_by_name(db=db, name=media_theme_in.name)
    if existing_theme:
        raise HTTPException(
            status_code=400,
            detail="Media theme with this name already exists."
        )
    media_theme = crud.media_theme.create(db=db, obj_in=media_theme_in)
    return media_theme


@router.put("/{id}", response_model=schemas.MediaTheme)
def update_media_theme(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    media_theme_in: schemas.MediaThemeUpdate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update a media theme.
    """
    media_theme = crud.media_theme.get(db=db, id=id)
    if not media_theme:
        raise HTTPException(status_code=404, detail="Media theme not found")
    
    # Check for duplicate name if name is being updated
    if media_theme_in.name and media_theme_in.name != media_theme.name:
        existing_theme = crud.media_theme.get_by_name(db=db, name=media_theme_in.name)
        if existing_theme:
            raise HTTPException(
                status_code=400,
                detail="Media theme with this name already exists."
            )
    
    media_theme = crud.media_theme.update(db=db, db_obj=media_theme, obj_in=media_theme_in)
    return media_theme


@router.get("/{id}", response_model=schemas.MediaTheme)
def read_media_theme(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get media theme by ID.
    """
    media_theme = crud.media_theme.get(db=db, id=id)
    if not media_theme:
        raise HTTPException(status_code=404, detail="Media theme not found")
    return media_theme


@router.delete("/{id}", response_model=schemas.MediaTheme)
def delete_media_theme(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a media theme.
    """
    media_theme = crud.media_theme.get(db=db, id=id)
    if not media_theme:
        raise HTTPException(status_code=404, detail="Media theme not found")
    media_theme = crud.media_theme.remove(db=db, id=id)
    return media_theme
