from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core.config import settings
from app.models.public_person import PublicPerson
from app.schemas.pagination import PaginatedResponse
from app.utils.pagination import paginate_query

router = APIRouter()


@router.get("", response_model=PaginatedResponse[schemas.public_person.PublicPerson])
def read_public_persons(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None, description="Search by name"),
    profession: str = Query(None, description="Filter by profession"),
    order_by: Optional[str] = Query(None, description="Field to sort by"),
    order_dir: Optional[str] = Query('asc', description="Sort direction (asc|desc)"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve public persons with optional filtering (v1.5).
    """
    query = db.query(PublicPerson)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PublicPerson.first_name_hangul.ilike(search_term),
                PublicPerson.last_name_hangul.ilike(search_term),
                PublicPerson.first_name_roman.ilike(search_term),
                PublicPerson.last_name_roman.ilike(search_term),
                PublicPerson.stage_name_hangul.ilike(search_term),
                PublicPerson.stage_name_roman.ilike(search_term),
            )
        )

    if profession:
        query = query.filter(PublicPerson.profession_list.contains([profession]))

    public_persons, pagination = paginate_query(
        query,
        PublicPerson,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir,
        default_sort='stage_name_roman',
        allowed_sort_fields=(
            'stage_name_roman',
            'creation_date_utc',
            'id',
        ),
    )

    return PaginatedResponse[schemas.public_person.PublicPerson](
        data=public_persons,
        pagination=pagination,
    )


@router.post("", response_model=schemas.public_person.PublicPerson)
def create_public_person(
    *,
    db: Session = Depends(deps.get_db),
    public_person_in: schemas.public_person.PublicPersonCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new public person. Admin only.
    """
    public_person = crud.public_person.create(db=db, obj_in=public_person_in)
    return public_person


@router.get("/{id}", response_model=schemas.public_person.PublicPerson)
def read_public_person(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get public person by ID.
    """
    public_person = crud.public_person.get(db=db, id=id)
    if not public_person:
        raise HTTPException(status_code=404, detail="Public person not found")
    return public_person


@router.put("/{id}", response_model=schemas.public_person.PublicPerson)
def update_public_person(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    public_person_in: schemas.public_person.PublicPersonUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update a public person. Admin only.
    """
    public_person = crud.public_person.get(db=db, id=id)
    if not public_person:
        raise HTTPException(status_code=404, detail="Public person not found")
    
    public_person = crud.public_person.update(db=db, db_obj=public_person, obj_in=public_person_in)
    return public_person


@router.delete("/{id}", response_model=schemas.public_person.PublicPerson)
def delete_public_person(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a public person. Admin only.
    """
    public_person = crud.public_person.get(db=db, id=id)
    if not public_person:
        raise HTTPException(status_code=404, detail="Public person not found")
    
    public_person = crud.public_person.remove(db=db, id=id)
    return public_person


@router.get("/search/by-name", response_model=List[schemas.public_person.PublicPerson])
def search_public_persons_by_name(
    *,
    db: Session = Depends(deps.get_db),
    name: str = Query(..., description="Name to search for"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Search public persons by name.
    """
    return crud.public_person.search_by_name(db=db, name=name, skip=skip, limit=limit)


@router.get("/profession/{profession}", response_model=List[schemas.public_person.PublicPerson])
def read_public_persons_by_profession(
    *,
    db: Session = Depends(deps.get_db),
    profession: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get public persons by profession.
    """
    return crud.public_person.get_by_profession(db=db, profession=profession, skip=skip, limit=limit)

