from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from uuid import UUID

from app import crud, schemas
from app.api import deps

router = APIRouter()


# Content Lists endpoints
@router.get("/", response_model=schemas.ContentListResponse)
def get_content_lists(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    thumbnail_format: Optional[schemas.ThumbnailFormatEnum] = Query(None, description="Filter by thumbnail format"),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve content lists.
    
    **Access:** All authenticated users can read content lists.
    """
    if thumbnail_format:
        content_lists = crud.content_list.get_by_thumbnail_format(
            db=db, thumbnail_format=thumbnail_format, skip=skip, limit=limit
        )
        total = crud.content_list.count_by_thumbnail_format(
            db=db, thumbnail_format=thumbnail_format
        )
    elif is_active is not None:
        if is_active:
            content_lists = crud.content_list.get_active_lists(
                db=db, skip=skip, limit=limit
            )
            total = crud.content_list.count_active(db=db)
        else:
            content_lists = crud.content_list.get_multi_ordered(
                db=db, skip=skip, limit=limit, active_only=False
            )
            total = len(crud.content_list.get_multi(db=db, skip=0, limit=10000))  # Simple count
    else:
        content_lists = crud.content_list.get_multi_ordered(
            db=db, skip=skip, limit=limit, active_only=False
        )
        total = len(crud.content_list.get_multi(db=db, skip=0, limit=10000))  # Simple count
    
    # Calculate pagination info
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    current_page = (skip // limit) + 1
    
    return {
        "data": content_lists,
        "pagination": {
            "page": current_page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages
        }
    }


@router.get("/{content_list_id}", response_model=schemas.ContentList)
def get_content_list(
    content_list_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get content list by ID.
    
    **Access:** All authenticated users can read content lists.
    """
    content_list = crud.content_list.get(db=db, id=content_list_id)
    if not content_list:
        raise HTTPException(status_code=404, detail="Content list not found")
    return content_list


@router.post("/", response_model=schemas.ContentList)
def create_content_list(
    *,
    db: Session = Depends(deps.get_db),
    content_list_in: schemas.ContentListCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new content list.
    
    **Access:** Manager/Admin only
    """
    # Check if title already exists
    existing_content_list = crud.content_list.get_by_title(db=db, title=content_list_in.title)
    if existing_content_list:
        raise HTTPException(
            status_code=400,
            detail="Content list with this title already exists"
        )
    
    content_list = crud.content_list.create_with_json_cache(db=db, obj_in=content_list_in)
    return content_list


@router.put("/{content_list_id}", response_model=schemas.ContentList)
def update_content_list(
    *,
    db: Session = Depends(deps.get_db),
    content_list_id: UUID,
    content_list_in: schemas.ContentListUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update content list.
    
    **Access:** Manager/Admin only
    """
    content_list = crud.content_list.get(db=db, id=content_list_id)
    if not content_list:
        raise HTTPException(status_code=404, detail="Content list not found")
    
    # Check if title already exists for another content list
    if content_list_in.title:
        existing_content_list = crud.content_list.get_by_title(db=db, title=content_list_in.title)
        if existing_content_list and existing_content_list.id != content_list_id:
            raise HTTPException(
                status_code=400,
                detail="Content list with this title already exists"
            )
    
    content_list = crud.content_list.update_with_json_cache(
        db=db, db_obj=content_list, obj_in=content_list_in
    )
    return content_list


@router.delete("/{content_list_id}")
def delete_content_list(
    *,
    db: Session = Depends(deps.get_db),
    content_list_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete content list.
    
    **Access:** Manager/Admin only
    """
    content_list = crud.content_list.get(db=db, id=content_list_id)
    if not content_list:
        raise HTTPException(status_code=404, detail="Content list not found")
    
    # Check if content list is used in any screen contents
    screens_using_list = crud.screen_content.get_screens_containing_content_list(
        db=db, content_list_id=str(content_list_id)
    )
    if screens_using_list:
        screen_titles = [screen.title for screen in screens_using_list]
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete content list. It is used in screens: {', '.join(screen_titles)}"
        )
    
    crud.content_list.remove(db=db, id=content_list_id)
    return {"message": "Content list deleted successfully"}


@router.put("/{content_list_id}/reorder", response_model=schemas.ContentList)
def reorder_content_items(
    *,
    db: Session = Depends(deps.get_db),
    content_list_id: UUID,
    reorder_data: schemas.ContentListReorderRequest,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Reorder content items in a content list.
    
    **Access:** Manager/Admin only
    """
    content_list = crud.content_list.get(db=db, id=content_list_id)
    if not content_list:
        raise HTTPException(status_code=404, detail="Content list not found")
    
    content_list = crud.content_list.reorder_content_items(
        db=db,
        content_list=content_list,
        new_content_items=reorder_data.content_items,
        new_content_types=[ct.value for ct in reorder_data.content_types]
    )
    return content_list


@router.get("/{content_list_id}/json", response_model=schemas.ContentListJSONResponse)
def get_content_list_json(
    content_list_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get cached JSON content for a content list.
    
    **Access:** All authenticated users can read JSON content.
    """
    content_list = crud.content_list.get(db=db, id=content_list_id)
    if not content_list:
        raise HTTPException(status_code=404, detail="Content list not found")
    
    json_data = content_list.get_json_data()
    if not json_data:
        # Generate JSON if not available
        json_data = crud.content_list.update_json_cache(db=db, content_list=content_list)
        if not json_data:
            raise HTTPException(status_code=500, detail="Failed to generate JSON content")
    
    return json_data


@router.post("/{content_list_id}/regenerate-json")
def regenerate_content_list_json(
    *,
    db: Session = Depends(deps.get_db),
    content_list_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Regenerate JSON cache for a content list.
    
    **Access:** Manager/Admin only
    """
    content_list = crud.content_list.get(db=db, id=content_list_id)
    if not content_list:
        raise HTTPException(status_code=404, detail="Content list not found")
    
    json_data = crud.content_list.update_json_cache(db=db, content_list=content_list)
    if not json_data:
        raise HTTPException(status_code=500, detail="Failed to regenerate JSON content")
    
    return {
        "message": "JSON cache regenerated successfully",
        "content_list_id": str(content_list_id),
        "last_updated": content_list.json_last_updated
    }


@router.post("/regenerate-all-json")
def regenerate_all_json(
    *,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Regenerate JSON cache for all active content lists.
    
    **Access:** Manager/Admin only
    """
    results = crud.content_list.regenerate_all_json_cache(db=db)
    return {
        "message": "JSON cache regeneration completed",
        "results": results
    }


@router.get("/search/by-title", response_model=schemas.ContentListResponse)
def search_content_lists_by_title(
    search: str = Query(..., min_length=1, description="Search term for content list titles"),
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Search content lists by title.
    
    **Access:** All authenticated users can search content lists.
    """
    content_lists = crud.content_list.search_by_title(
        db=db, search_term=search, skip=skip, limit=limit
    )
    
    # Get total count for pagination
    total = crud.content_list.count_search_by_title(db=db, search_term=search) if hasattr(crud.content_list, 'count_search_by_title') else len(content_lists)
    
    # Calculate pagination info
    total_pages = (total + limit - 1) // limit
    
    return {
        "data": content_lists,
        "pagination": {
            "page": (skip // limit) + 1,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        }
    }


@router.get("/stats/summary")
def get_content_lists_stats(
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get content lists statistics summary.
    
    **Access:** Manager/Admin only
    """
    total_active = crud.content_list.count_active(db=db)
    
    # Count by thumbnail format
    format_counts = {}
    for format_type in schemas.ThumbnailFormatEnum:
        count = crud.content_list.count_by_thumbnail_format(
            db=db, thumbnail_format=format_type.value
        )
        format_counts[format_type.value] = count
    
    return {
        "total_active_lists": total_active,
        "counts_by_thumbnail_format": format_counts,
    }