from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core.config import settings

router = APIRouter()


@router.get("", response_model=schemas.public_person.PublicPersonList)
def read_public_persons(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None, description="Search by name"),
    profession: str = Query(None, description="Filter by profession"),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve public persons with optional filtering (v1.5).
    """
    if search:
        public_persons = crud.public_person.search_by_name(db=db, name=search, skip=skip, limit=limit)
    elif profession:
        public_persons = crud.public_person.get_by_profession(db=db, profession=profession, skip=skip, limit=limit)
    else:
        public_persons = crud.public_person.get_multi(db=db, skip=skip, limit=limit)
    
    total = len(public_persons)  # Simple count for now
    total_pages = (total + limit - 1) // limit
    
    return {
        "data": public_persons,
        "pagination": {
            "page": (skip // limit) + 1,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        }
    }


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
    current_user: schemas.User = Depends(deps.get_current_active_user),
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
    current_user: schemas.User = Depends(deps.get_current_active_user),
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
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get public persons by profession.
    """
    return crud.public_person.get_by_profession(db=db, profession=profession, skip=skip, limit=limit)


