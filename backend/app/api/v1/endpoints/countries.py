from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps

router = APIRouter()


@router.get("", response_model=schemas.CountryListResponse)
def read_countries(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    q: Optional[str] = Query(None, description="Search query for country names"),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve countries with optional search and proper pagination.
    """
    countries, total = crud.country.get_multi_with_search(
        db, skip=skip, limit=limit, search_query=q
    )
    return schemas.CountryListResponse(
        data=countries,
        pagination=schemas.PaginationInfo(
            skip=skip,
            limit=limit,
            total=total,
            page=skip // limit + 1,
            pages=(total + limit - 1) // limit
        )
    )


@router.post("", response_model=schemas.Country)
def create_country(
    *,
    db: Session = Depends(deps.get_db),
    country_in: schemas.CountryCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new country. Admin only.
    """
    # Check if country name already exists
    existing = crud.country.get_by_name(db=db, name=country_in.name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Country with name '{country_in.name}' already exists",
        )
    
    country = crud.country.create(db=db, obj_in=country_in)
    return country


@router.get("/{id}", response_model=schemas.Country)
def read_country(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get country by ID.
    """
    country = crud.country.get(db=db, id=id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return country


@router.put("/{id}", response_model=schemas.Country)
def update_country(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    country_in: schemas.CountryUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update country. Admin only.
    """
    country = crud.country.get(db=db, id=id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    
    # Check if updating name to an existing one
    if country_in.name is not None:
        existing = crud.country.get_by_name(db=db, name=country_in.name)
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Country with name '{country_in.name}' already exists",
            )
    
    country = crud.country.update(db=db, db_obj=country, obj_in=country_in)
    return country


@router.delete("/{id}", response_model=schemas.Country)
def delete_country(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete country. Admin only.
    """
    country = crud.country.get(db=db, id=id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    
    country = crud.country.remove(db=db, id=id)
    return country