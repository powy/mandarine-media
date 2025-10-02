from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.models.country import Country
from app.schemas.pagination import PaginatedResponse
from app.utils.pagination import paginate_query
from app.api import deps

router = APIRouter()


@router.get("", response_model=PaginatedResponse[schemas.Country])
def read_countries(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="Search by country name"),
    order_by: Optional[str] = Query(None, description="Field to sort by"),
    order_dir: Optional[str] = Query('asc', description="Sort direction (asc|desc)"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve countries.
    """
    query = db.query(Country)

    if q:
        query = query.filter(Country.name.ilike(f"%{q.strip()}%"))

    countries, pagination = paginate_query(
        query,
        Country,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir,
        default_sort='name',
        allowed_sort_fields=('name', 'creation_date_utc', 'id'),
    )

    return PaginatedResponse[schemas.Country](data=countries, pagination=pagination)


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
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
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
