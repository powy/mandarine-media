from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=List[schemas.Theme])
def read_themes(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve themes.
    """
    themes = crud.theme.get_multi(db, skip=skip, limit=limit)
    return themes


@router.post("/", response_model=schemas.Theme)
def create_theme(
    *,
    db: Session = Depends(deps.get_db),
    theme_in: schemas.ThemeCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new theme.
    """
    if crud.theme.get_by_name(db, name=theme_in.name):
        raise HTTPException(status_code=400, detail="Theme with this name already exists")
    theme = crud.theme.create(db=db, obj_in=theme_in)
    return theme


@router.put("/{id}", response_model=schemas.Theme)
def update_theme(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    theme_in: schemas.ThemeUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a theme.
    """
    theme = crud.theme.get(db=db, id=id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    theme = crud.theme.update(db=db, db_obj=theme, obj_in=theme_in)
    return theme


@router.get("/{id}", response_model=schemas.Theme)
def read_theme(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Get theme by ID.
    """
    theme = crud.theme.get(db=db, id=id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme


@router.delete("/{id}", response_model=schemas.Theme)
def delete_theme(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a theme.
    """
    theme = crud.theme.get(db=db, id=id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    theme = crud.theme.remove(db=db, id=id)
    return theme


@router.get("/by-category/{category}", response_model=List[schemas.Theme])
def read_themes_by_category(
    *,
    db: Session = Depends(deps.get_db),
    category: str,
) -> Any:
    """
    Get themes by category.
    """
    themes = crud.theme.get_by_category(db=db, category=category)
    return themes