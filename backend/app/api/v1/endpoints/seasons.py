from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.models.season import Season
from app.schemas.pagination import PaginatedResponse
from app.utils.pagination import paginate_query

router = APIRouter()


@router.get("", response_model=PaginatedResponse[schemas.Season])
def read_seasons(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    program_id: Optional[UUID] = Query(None),
    q: Optional[str] = Query(None, description="Search by season name or number"),
    order_by: Optional[str] = Query(None, description="Field to sort by"),
    order_dir: Optional[str] = Query('asc', description="Sort direction (asc|desc)"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve seasons.
    """
    query = db.query(Season)

    if program_id:
        query = query.filter(Season.program_id == program_id)

    if q:
        search_term = q.strip()
        filters = []
        if search_term:
            filters.append(Season.season_name.ilike(f"%{search_term}%"))
            if search_term.isdigit():
                filters.append(Season.season_number == int(search_term))
        if filters:
            query = query.filter(or_(*filters))

    seasons, pagination = paginate_query(
        query,
        Season,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir,
        default_sort='creation_date_utc',
        allowed_sort_fields=(
            'creation_date_utc',
            'season_number',
            'season_name',
            'id',
        ),
    )

    return PaginatedResponse[schemas.Season](data=seasons, pagination=pagination)


@router.post("", response_model=schemas.Season)
def create_season(
    *,
    db: Session = Depends(deps.get_db),
    season_in: schemas.SeasonCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new season. Admin only.
    """
    # Check if program exists (only if program_id is provided)
    if season_in.program_id is not None:
        try:
            program = crud.program.get(db=db, id=season_in.program_id)
            if not program:
                raise HTTPException(
                    status_code=404,
                    detail=f"Program with id '{season_in.program_id}' not found",
                )
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid program_id format: {season_in.program_id}",
            )

    # Check if season number already exists for this program (only if program_id is provided)
    if season_in.program_id:
        existing = crud.season.get_by_program_and_number(
            db=db,
            program_id=season_in.program_id,
            season_number=season_in.season_number,
        )
        if existing:
            program = crud.program.get(db=db, id=season_in.program_id)
            program_name = program.program_name if program else "Unknown"
            raise HTTPException(
                status_code=409,
                detail=f"Season {season_in.season_number} already exists for program '{program_name}'",
            )

    season = crud.season.create(db=db, obj_in=season_in)
    return season


@router.get("/{id}", response_model=schemas.Season)
def read_season(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get season by ID.
    """
    season = crud.season.get(db=db, id=id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


@router.put("/{id}", response_model=schemas.Season)
def update_season(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    season_in: schemas.SeasonUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update season. Admin only.
    """
    season = crud.season.get(db=db, id=id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    # Check if updating season number to an existing one
    if season_in.season_number is not None:
        existing = crud.season.get_by_program_and_number(
            db=db, program_id=season.program_id, season_number=season_in.season_number
        )
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Season {season_in.season_number} already exists for this program",
            )

    season = crud.season.update(db=db, db_obj=season, obj_in=season_in)
    return season


@router.delete("/{id}", response_model=schemas.Season)
def delete_season(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete season. Admin only.
    """
    season = crud.season.get(db=db, id=id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    season = crud.season.remove(db=db, id=id)
    return season


# JSON Cache Management Endpoints

@router.get("/{season_id}/json", response_model=schemas.SeasonJSON)
def get_season_json_cache(
    *,
    db: Session = Depends(deps.get_db),
    season_id: UUID,
    refresh: bool = Query(False, description="Force refresh of cached JSON"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get cached JSON representation of season with episode list.

    **Query Parameters:**
    - `refresh` (bool): If true, regenerate JSON before returning

    **Access:** All authenticated users can read season JSON.
    """
    json_data = crud.season.get_json_cache(db=db, season_id=season_id, refresh=refresh)

    if not json_data:
        raise HTTPException(status_code=404, detail="Season not found")

    return json_data


@router.post("/{season_id}/refresh-cache", response_model=schemas.Season)
def refresh_season_json_cache(
    *,
    db: Session = Depends(deps.get_db),
    season_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Force refresh of the JSON cache for a season.

    **Access:** Admin users only.
    """
    try:
        season = crud.season.refresh_json_cache(db=db, season_id=season_id)
        return season
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/refresh-all-caches", response_model=schemas.SeasonBulkRefreshResponse)
def refresh_all_season_json_caches(
    *,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Refresh JSON cache for all seasons.

    **Access:** Admin users only.

    This operation may take some time for large databases.
    Returns statistics about the refresh operation.
    """
    try:
        result = crud.season.refresh_all_json_caches(db=db)

        return schemas.SeasonBulkRefreshResponse(
            message=f"Bulk JSON cache refresh completed. {result['refreshed_count']} successful, {result['failed_count']} errors.",
            refreshed_count=result['refreshed_count'],
            failed_count=result['failed_count'],
            total_count=result['total_count'],
            errors=result['errors']
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Bulk refresh failed: {str(e)}"
        )
