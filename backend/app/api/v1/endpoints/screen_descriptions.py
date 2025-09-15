from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from uuid import UUID

from app import crud, schemas
from app.api import deps

router = APIRouter()


# Screen Descriptions endpoints
@router.get("", response_model=schemas.ScreenDescriptionResponse)
def get_screen_descriptions(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    screen_type: Optional[schemas.ScreenTypeEnum] = Query(None, description="Filter by screen type"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve screen descriptions.
    
    **Access:** All authenticated users can read screen descriptions.
    """
    if screen_type:
        screen_descriptions = crud.screen_description.get_by_screen_type(
            db=db, screen_type=screen_type, skip=skip, limit=limit
        )
        total = crud.screen_description.count_by_screen_type(
            db=db, screen_type=screen_type
        )
    elif is_active is not None:
        if is_active:
            screen_descriptions = crud.screen_description.get_active_screens(
                db=db, skip=skip, limit=limit
            )
            total = crud.screen_description.count_active(db=db)
        else:
            screen_descriptions = crud.screen_description.get_multi_ordered(
                db=db, skip=skip, limit=limit, active_only=False
            )
            total = len(crud.screen_description.get_multi(db=db, skip=0, limit=10000))  # Simple count
    else:
        screen_descriptions = crud.screen_description.get_multi_ordered(
            db=db, skip=skip, limit=limit, active_only=False
        )
        total = len(crud.screen_description.get_multi(db=db, skip=0, limit=10000))  # Simple count
    
    # Calculate pagination info
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    current_page = (skip // limit) + 1
    
    return {
        "data": screen_descriptions,
        "pagination": {
            "page": current_page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages
        }
    }


@router.get("/{screen_description_id}", response_model=schemas.ScreenDescription)
def get_screen_description(
    screen_description_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get screen content by ID.
    
    **Access:** All authenticated users can read screen descriptions.
    """
    screen_description = crud.screen_description.get(db=db, id=screen_description_id)
    if not screen_description:
        raise HTTPException(status_code=404, detail="Screen content not found")
    return screen_description


@router.post("", response_model=schemas.ScreenDescription)
def create_screen_description(
    *,
    db: Session = Depends(deps.get_db),
    screen_description_in: schemas.ScreenDescriptionCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new screen content.
    
    **Access:** Manager/Admin only
    """
    # Check if title already exists
    existing_screen_description = crud.screen_description.get_by_title(db=db, title=screen_description_in.title)
    if existing_screen_description:
        raise HTTPException(
            status_code=400,
            detail="Screen content with this title already exists"
        )
    
    screen_description = crud.screen_description.create_with_json_cache(db=db, obj_in=screen_description_in)
    return screen_description


@router.put("/{screen_description_id}", response_model=schemas.ScreenDescription)
def update_screen_description(
    *,
    db: Session = Depends(deps.get_db),
    screen_description_id: UUID,
    screen_description_in: schemas.ScreenDescriptionUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update screen content.
    
    **Access:** Manager/Admin only
    """
    screen_description = crud.screen_description.get(db=db, id=screen_description_id)
    if not screen_description:
        raise HTTPException(status_code=404, detail="Screen content not found")
    
    # Check if title already exists for another screen content
    if screen_description_in.title:
        existing_screen_description = crud.screen_description.get_by_title(db=db, title=screen_description_in.title)
        if existing_screen_description and existing_screen_description.id != screen_description_id:
            raise HTTPException(
                status_code=400,
                detail="Screen content with this title already exists"
            )
    
    screen_description = crud.screen_description.update_with_json_cache(
        db=db, db_obj=screen_description, obj_in=screen_description_in
    )
    return screen_description


@router.delete("/{screen_description_id}")
def delete_screen_description(
    *,
    db: Session = Depends(deps.get_db),
    screen_description_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete screen content.
    
    **Access:** Manager/Admin only
    """
    screen_description = crud.screen_description.get(db=db, id=screen_description_id)
    if not screen_description:
        raise HTTPException(status_code=404, detail="Screen content not found")
    
    crud.screen_description.remove(db=db, id=screen_description_id)
    return {"message": "Screen content deleted successfully"}


@router.put("/{screen_description_id}/reorder-lists", response_model=schemas.ScreenDescription)
def reorder_media_showcases(
    *,
    db: Session = Depends(deps.get_db),
    screen_description_id: UUID,
    reorder_data: schemas.ScreenDescriptionReorderRequest,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Reorder media showcases in a screen content.

    **Access:** Manager/Admin only
    """
    screen_description = crud.screen_description.get(db=db, id=screen_description_id)
    if not screen_description:
        raise HTTPException(status_code=404, detail="Screen content not found")

    screen_description = crud.screen_description.reorder_media_showcases(
        db=db,
        screen_description=screen_description,
        new_media_showcases=reorder_data.media_showcases
    )
    return screen_description


@router.get("/{screen_description_id}/json", response_model=schemas.ScreenDescriptionJSONResponse)
def get_screen_description_json(
    screen_description_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get cached JSON content for a screen content.
    
    **Access:** All authenticated users can read JSON content.
    """
    screen_description = crud.screen_description.get(db=db, id=screen_description_id)
    if not screen_description:
        raise HTTPException(status_code=404, detail="Screen content not found")
    
    json_data = screen_description.get_json_data()
    if not json_data:
        # Generate JSON if not available
        json_data = crud.screen_description.update_json_cache(db=db, screen_content=screen_description)
        if not json_data:
            raise HTTPException(status_code=500, detail="Failed to generate JSON content")
    
    return json_data


@router.post("/{screen_description_id}/regenerate-json")
def regenerate_screen_description_json(
    *,
    db: Session = Depends(deps.get_db),
    screen_description_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Regenerate JSON cache for a screen content.
    
    **Access:** Manager/Admin only
    """
    screen_description = crud.screen_description.get(db=db, id=screen_description_id)
    if not screen_description:
        raise HTTPException(status_code=404, detail="Screen content not found")
    
    json_data = crud.screen_description.update_json_cache(db=db, screen_content=screen_description)
    if not json_data:
        raise HTTPException(status_code=500, detail="Failed to regenerate JSON content")
    
    return {
        "message": "JSON cache regenerated successfully",
        "screen_description_id": str(screen_description_id),
        "last_updated": screen_description.json_last_updated
    }


@router.post("/regenerate-all-json")
def regenerate_all_json(
    *,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Regenerate JSON cache for all active screen descriptions.
    
    **Access:** Manager/Admin only
    """
    results = crud.screen_description.regenerate_all_json_cache(db=db)
    return {
        "message": "JSON cache regeneration completed",
        "results": results
    }


@router.get("/by-type/{screen_type}", response_model=schemas.ScreenDescriptionByTypeResponse)
def get_screen_descriptions_by_type(
    screen_type: schemas.ScreenTypeEnum,
    db: Session = Depends(deps.get_db),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get screen descriptions by type.
    
    **Access:** All authenticated users can read screen descriptions.
    """
    screen_descriptions = crud.screen_description.get_by_screen_type(
        db=db, screen_type=screen_type, skip=0, limit=1000
    )
    
    return {
        "screen_type": screen_type,
        "screens": screen_descriptions,
        "count": len(screen_descriptions)
    }


@router.get("/search/by-title", response_model=schemas.ScreenDescriptionResponse)
def search_screen_descriptions_by_title(
    search: str = Query(..., min_length=1, description="Search term for screen content titles"),
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Search screen descriptions by title.
    
    **Access:** All authenticated users can search screen descriptions.
    """
    screen_descriptions = crud.screen_description.search_by_title(
        db=db, search_term=search, skip=skip, limit=limit
    )
    
    # Get total count for pagination
    total = crud.screen_description.count_search_by_title(db=db, search_term=search) if hasattr(crud.screen_description, 'count_search_by_title') else len(screen_descriptions)
    
    # Calculate pagination info
    total_pages = (total + limit - 1) // limit
    
    return {
        "data": screen_descriptions,
        "pagination": {
            "page": (skip // limit) + 1,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        }
    }


@router.get("/stats/summary")
def get_screen_descriptions_stats(
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get screen descriptions statistics summary.
    
    **Access:** Manager/Admin only
    """
    total_active = crud.screen_description.count_active(db=db)
    type_counts = crud.screen_description.get_screen_types_with_counts(db=db)
    
    return {
        "total_active_screens": total_active,
        "counts_by_screen_type": type_counts,
    }


@router.get("/homepage/primary", response_model=schemas.ScreenDescription)
def get_primary_homepage_screen(
    db: Session = Depends(deps.get_db),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get the primary homepage screen (lowest display_order).
    
    **Access:** All authenticated users can read homepage screen.
    """
    screen_description = crud.screen_description.get_primary_screen_by_type(
        db=db, screen_type="homepage"
    )
    
    if not screen_description:
        raise HTTPException(status_code=404, detail="No homepage screen found")
    
    return screen_description