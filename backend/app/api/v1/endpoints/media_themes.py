from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.models.user import User

router = APIRouter()


@router.get("", response_model=List[schemas.MediaTheme])
def read_media_themes(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve media themes.
    """
    media_themes = crud.media_theme.get_multi_by_name(
        db=db, name_filter=q, skip=skip, limit=limit
    )
    return media_themes


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