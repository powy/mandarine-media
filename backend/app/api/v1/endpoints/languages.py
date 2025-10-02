from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import crud, schemas
from app.models.language import Language
from app.schemas.pagination import PaginatedResponse
from app.utils.pagination import paginate_query
from app.api import deps

router = APIRouter()


@router.get("", response_model=PaginatedResponse[schemas.Language])
def read_languages(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="Search by language name or code"),
    order_by: Optional[str] = Query(None, description="Field to sort by"),
    order_dir: Optional[str] = Query('asc', description="Sort direction (asc|desc)"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve languages.
    """
    query = db.query(Language)

    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(or_(Language.name.ilike(search_term), Language.sigle.ilike(search_term)))

    languages, pagination = paginate_query(
        query,
        Language,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir,
        default_sort='name',
        allowed_sort_fields=('name', 'sigle', 'creation_date_utc', 'id'),
    )

    return PaginatedResponse[schemas.Language](data=languages, pagination=pagination)


@router.post("", response_model=schemas.Language)
def create_language(
    *,
    db: Session = Depends(deps.get_db),
    language_in: schemas.LanguageCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new language. Admin only.
    """
    # Check if language sigle already exists
    existing_sigle = crud.language.get_by_sigle(db=db, sigle=language_in.sigle)
    if existing_sigle:
        raise HTTPException(
            status_code=409,
            detail=f"Language with sigle '{language_in.sigle}' already exists",
        )
    
    language = crud.language.create(db=db, obj_in=language_in)
    return language


@router.get("/{id}", response_model=schemas.Language)
def read_language(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get language by ID.
    """
    language = crud.language.get(db=db, id=id)
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    return language


@router.put("/{id}", response_model=schemas.Language)
def update_language(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    language_in: schemas.LanguageUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update language. Admin only.
    """
    language = crud.language.get(db=db, id=id)
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    
    # Check if updating sigle to an existing one
    if language_in.sigle is not None:
        existing_sigle = crud.language.get_by_sigle(db=db, sigle=language_in.sigle)
        if existing_sigle and existing_sigle.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Language with sigle '{language_in.sigle}' already exists",
            )
    
    language = crud.language.update(db=db, db_obj=language, obj_in=language_in)
    return language


@router.delete("/{id}", response_model=schemas.Language)
def delete_language(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete language. Admin only.
    """
    language = crud.language.get(db=db, id=id)
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    
    language = crud.language.remove(db=db, id=id)
    return language
