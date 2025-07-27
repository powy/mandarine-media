from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from uuid import UUID

from app import crud, schemas
from app.api import deps

router = APIRouter()


# Screen Contents endpoints
@router.get("/", response_model=schemas.ScreenContentResponse)
def get_screen_contents(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    screen_type: Optional[schemas.ScreenTypeEnum] = Query(None, description="Filter by screen type"),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve screen contents.
    
    **Access:** All authenticated users can read screen contents.
    """
    if screen_type:
        screen_contents = crud.screen_content.get_by_screen_type(
            db=db, screen_type=screen_type, skip=skip, limit=limit
        )
        total = crud.screen_content.count_by_screen_type(
            db=db, screen_type=screen_type
        )
    elif is_active is not None:
        if is_active:
            screen_contents = crud.screen_content.get_active_screens(
                db=db, skip=skip, limit=limit
            )
            total = crud.screen_content.count_active(db=db)
        else:
            screen_contents = crud.screen_content.get_multi_ordered(
                db=db, skip=skip, limit=limit, active_only=False
            )
            total = len(crud.screen_content.get_multi(db=db, skip=0, limit=10000))  # Simple count
    else:
        screen_contents = crud.screen_content.get_multi_ordered(
            db=db, skip=skip, limit=limit, active_only=False
        )
        total = len(crud.screen_content.get_multi(db=db, skip=0, limit=10000))  # Simple count
    
    # Calculate pagination info
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    current_page = (skip // limit) + 1
    
    return {
        "data": screen_contents,
        "pagination": {
            "page": current_page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages
        }
    }


@router.get("/{screen_content_id}", response_model=schemas.ScreenContent)
def get_screen_content(
    screen_content_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get screen content by ID.
    
    **Access:** All authenticated users can read screen contents.
    """
    screen_content = crud.screen_content.get(db=db, id=screen_content_id)
    if not screen_content:
        raise HTTPException(status_code=404, detail="Screen content not found")
    return screen_content


@router.post("/", response_model=schemas.ScreenContent)
def create_screen_content(
    *,
    db: Session = Depends(deps.get_db),
    screen_content_in: schemas.ScreenContentCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new screen content.
    
    **Access:** Manager/Admin only
    """
    # Check if title already exists
    existing_screen_content = crud.screen_content.get_by_title(db=db, title=screen_content_in.title)
    if existing_screen_content:
        raise HTTPException(
            status_code=400,
            detail="Screen content with this title already exists"
        )
    
    screen_content = crud.screen_content.create_with_json_cache(db=db, obj_in=screen_content_in)
    return screen_content


@router.put("/{screen_content_id}", response_model=schemas.ScreenContent)
def update_screen_content(
    *,
    db: Session = Depends(deps.get_db),
    screen_content_id: UUID,
    screen_content_in: schemas.ScreenContentUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update screen content.
    
    **Access:** Manager/Admin only
    """
    screen_content = crud.screen_content.get(db=db, id=screen_content_id)
    if not screen_content:
        raise HTTPException(status_code=404, detail="Screen content not found")
    
    # Check if title already exists for another screen content
    if screen_content_in.title:
        existing_screen_content = crud.screen_content.get_by_title(db=db, title=screen_content_in.title)
        if existing_screen_content and existing_screen_content.id != screen_content_id:
            raise HTTPException(
                status_code=400,
                detail="Screen content with this title already exists"
            )
    
    screen_content = crud.screen_content.update_with_json_cache(
        db=db, db_obj=screen_content, obj_in=screen_content_in
    )
    return screen_content


@router.delete("/{screen_content_id}")
def delete_screen_content(
    *,
    db: Session = Depends(deps.get_db),
    screen_content_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete screen content.
    
    **Access:** Manager/Admin only
    """
    screen_content = crud.screen_content.get(db=db, id=screen_content_id)
    if not screen_content:
        raise HTTPException(status_code=404, detail="Screen content not found")
    
    crud.screen_content.remove(db=db, id=screen_content_id)
    return {"message": "Screen content deleted successfully"}


@router.put("/{screen_content_id}/reorder-lists", response_model=schemas.ScreenContent)
def reorder_content_lists(
    *,
    db: Session = Depends(deps.get_db),
    screen_content_id: UUID,
    reorder_data: schemas.ScreenContentReorderRequest,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Reorder content lists in a screen content.
    
    **Access:** Manager/Admin only
    """
    screen_content = crud.screen_content.get(db=db, id=screen_content_id)
    if not screen_content:
        raise HTTPException(status_code=404, detail="Screen content not found")
    
    screen_content = crud.screen_content.reorder_content_lists(
        db=db,
        screen_content=screen_content,
        new_content_lists=reorder_data.content_lists
    )
    return screen_content


@router.get("/{screen_content_id}/json", response_model=schemas.ScreenContentJSONResponse)
def get_screen_content_json(
    screen_content_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get cached JSON content for a screen content.
    
    **Access:** All authenticated users can read JSON content.
    """
    screen_content = crud.screen_content.get(db=db, id=screen_content_id)
    if not screen_content:
        raise HTTPException(status_code=404, detail="Screen content not found")
    
    json_data = screen_content.get_json_data()
    if not json_data:
        # Generate JSON if not available
        json_data = crud.screen_content.update_json_cache(db=db, screen_content=screen_content)
        if not json_data:
            raise HTTPException(status_code=500, detail="Failed to generate JSON content")
    
    return json_data


@router.post("/{screen_content_id}/regenerate-json")
def regenerate_screen_content_json(
    *,
    db: Session = Depends(deps.get_db),
    screen_content_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Regenerate JSON cache for a screen content.
    
    **Access:** Manager/Admin only
    """
    screen_content = crud.screen_content.get(db=db, id=screen_content_id)
    if not screen_content:
        raise HTTPException(status_code=404, detail="Screen content not found")
    
    json_data = crud.screen_content.update_json_cache(db=db, screen_content=screen_content)
    if not json_data:
        raise HTTPException(status_code=500, detail="Failed to regenerate JSON content")
    
    return {
        "message": "JSON cache regenerated successfully",
        "screen_content_id": str(screen_content_id),
        "last_updated": screen_content.json_last_updated
    }


@router.post("/regenerate-all-json")
def regenerate_all_json(
    *,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Regenerate JSON cache for all active screen contents.
    
    **Access:** Manager/Admin only
    """
    results = crud.screen_content.regenerate_all_json_cache(db=db)
    return {
        "message": "JSON cache regeneration completed",
        "results": results
    }


@router.get("/by-type/{screen_type}", response_model=schemas.ScreenContentByTypeResponse)
def get_screen_contents_by_type(
    screen_type: schemas.ScreenTypeEnum,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get screen contents by type.
    
    **Access:** All authenticated users can read screen contents.
    """
    screen_contents = crud.screen_content.get_by_screen_type(
        db=db, screen_type=screen_type, skip=0, limit=1000
    )
    
    return {
        "screen_type": screen_type,
        "screens": screen_contents,
        "count": len(screen_contents)
    }


@router.get("/search/by-title", response_model=schemas.ScreenContentResponse)
def search_screen_contents_by_title(
    search: str = Query(..., min_length=1, description="Search term for screen content titles"),
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Search screen contents by title.
    
    **Access:** All authenticated users can search screen contents.
    """
    screen_contents = crud.screen_content.search_by_title(
        db=db, search_term=search, skip=skip, limit=limit
    )
    
    # Get total count for pagination
    total = crud.screen_content.count_search_by_title(db=db, search_term=search) if hasattr(crud.screen_content, 'count_search_by_title') else len(screen_contents)
    
    # Calculate pagination info
    total_pages = (total + limit - 1) // limit
    
    return {
        "data": screen_contents,
        "pagination": {
            "page": (skip // limit) + 1,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        }
    }


@router.get("/stats/summary")
def get_screen_contents_stats(
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get screen contents statistics summary.
    
    **Access:** Manager/Admin only
    """
    total_active = crud.screen_content.count_active(db=db)
    type_counts = crud.screen_content.get_screen_types_with_counts(db=db)
    
    return {
        "total_active_screens": total_active,
        "counts_by_screen_type": type_counts,
    }


@router.get("/homepage/primary", response_model=schemas.ScreenContent)
def get_primary_homepage_screen(
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get the primary homepage screen (lowest display_order).
    
    **Access:** All authenticated users can read homepage screen.
    """
    screen_content = crud.screen_content.get_primary_screen_by_type(
        db=db, screen_type="homepage"
    )
    
    if not screen_content:
        raise HTTPException(status_code=404, detail="No homepage screen found")
    
    return screen_content