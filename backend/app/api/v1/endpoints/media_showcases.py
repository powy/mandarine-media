from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from app import crud, schemas
from app.api import deps

router = APIRouter()


# MediaShowcase endpoints
@router.get("", response_model=schemas.MediaShowcaseResponse)
def get_media_showcases(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    list_type: Optional[schemas.ListTypeEnum] = Query(None, description="Filter by list type"),
    thumbnail_format: Optional[schemas.ThumbnailFormatEnum] = Query(None, description="Filter by thumbnail format"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve media showcases.
    
    **Access:** All authenticated users can read media showcases.
    """
    if list_type:
        showcases = crud.media_showcase.get_by_list_type(
            db=db, list_type=list_type, skip=skip, limit=limit
        )
        total = crud.media_showcase.count_by_list_type(
            db=db, list_type=list_type
        )
    elif thumbnail_format:
        showcases = crud.media_showcase.get_by_thumbnail_format(
            db=db, thumbnail_format=thumbnail_format, skip=skip, limit=limit
        )
        total = crud.media_showcase.count_by_thumbnail_format(
            db=db, thumbnail_format=thumbnail_format
        )
    elif is_active is not None:
        if is_active:
            showcases = crud.media_showcase.get_active_showcases(
                db=db, skip=skip, limit=limit
            )
            total = crud.media_showcase.count_active(db=db)
        else:
            showcases = crud.media_showcase.get_multi_ordered(
                db=db, skip=skip, limit=limit, active_only=False
            )
            total = crud.media_showcase.count_total(db=db)
    else:
        showcases = crud.media_showcase.get_multi_ordered(
            db=db, skip=skip, limit=limit, active_only=False
        )
        total = crud.media_showcase.count_total(db=db)
    
    return {
        "data": showcases,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1,
        }
    }


@router.post("", response_model=schemas.MediaShowcase)
def create_media_showcase(
    *,
    db: Session = Depends(deps.get_db),
    showcase_in: schemas.MediaShowcaseCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new media showcase.
    
    **Access:** Authenticated users can create media showcases.
    """
    # Check if slug is unique if provided
    if showcase_in.slug:
        existing = crud.media_showcase.get_by_slug(db=db, slug=showcase_in.slug)
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A media showcase with this slug already exists."
            )
    
    # Create showcase (this already handles media_description_ids internally)
    try:
        showcase = crud.media_showcase.create(db=db, obj_in=showcase_in)
        return showcase
    except IntegrityError as e:
        # Handle database constraint violations gracefully
        if "UNIQUE constraint failed" in str(e):
            if "media_showcase_media_descriptions" in str(e):
                raise HTTPException(
                    status_code=400,
                    detail="One or more media descriptions are already associated with another showcase or have duplicate entries."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="A constraint violation occurred. Please check for duplicate or conflicting data."
                )
        raise HTTPException(
            status_code=500,
            detail="An unexpected database error occurred."
        )


@router.get("/{showcase_id}", response_model=schemas.MediaShowcaseWithItems)
def get_media_showcase(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get media showcase by ID with relationships.
    """
    showcase = crud.media_showcase.get(db=db, id=showcase_id)
    if not showcase:
        raise HTTPException(status_code=404, detail="Media showcase not found")
    return showcase


@router.put("/{showcase_id}", response_model=schemas.MediaShowcase)
def update_media_showcase(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    showcase_in: schemas.MediaShowcaseUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update a media showcase.
    """
    showcase = crud.media_showcase.get(db=db, id=showcase_id)
    if not showcase:
        raise HTTPException(status_code=404, detail="Media showcase not found")
    
    # Check slug uniqueness if being updated
    if showcase_in.slug and showcase_in.slug != showcase.slug:
        existing = crud.media_showcase.get_by_slug(db=db, slug=showcase_in.slug)
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A media showcase with this slug already exists."
            )
    
    showcase = crud.media_showcase.update(db=db, db_obj=showcase, obj_in=showcase_in)
    return showcase


@router.delete("/{showcase_id}")
def delete_media_showcase(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a media showcase.
    """
    showcase = crud.media_showcase.get(db=db, id=showcase_id)
    if not showcase:
        raise HTTPException(status_code=404, detail="Media showcase not found")
    
    crud.media_showcase.remove(db=db, id=showcase_id)
    return {"message": "Media showcase deleted successfully"}


# Showcase items management endpoints
@router.get("/{showcase_id}/items", response_model=schemas.MediaShowcaseWithItems)
def get_showcase_items(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get media showcase with its ordered items.
    """
    showcase = crud.media_showcase.get(db=db, id=showcase_id)
    if not showcase:
        raise HTTPException(status_code=404, detail="Media showcase not found")
    
    return showcase


@router.put("/{showcase_id}/items", response_model=schemas.MediaShowcaseItemOperationResponse)
def replace_showcase_items(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    items_update: schemas.MediaShowcaseItemsUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Replace all items in a media showcase with a new ordered list.
    """
    try:
        showcase = crud.media_showcase.replace_all_media_descriptions(
            db=db,
            showcase_id=showcase_id,
            media_description_ids=items_update.media_description_ids
        )
        
        return {
            "message": "Showcase items replaced successfully",
            "showcase_id": str(showcase.id),
            "items_affected": len(items_update.media_description_ids),
            "new_item_count": len(items_update.media_description_ids)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{showcase_id}/items", response_model=schemas.MediaShowcaseItemOperationResponse)
def add_showcase_items(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    items_add: schemas.MediaShowcaseAddItems,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Add media descriptions to a showcase.
    """
    try:
        showcase = crud.media_showcase.add_media_descriptions(
            db=db,
            showcase_id=showcase_id,
            media_description_ids=items_add.media_description_ids,
            start_priority=items_add.position
        )
        
        return {
            "message": "Items added to showcase successfully",
            "showcase_id": str(showcase.id),
            "items_affected": len(items_add.media_description_ids),
            "new_item_count": len(showcase.media_descriptions)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{showcase_id}/items", response_model=schemas.MediaShowcaseItemOperationResponse)
def remove_showcase_items(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    items_remove: schemas.MediaShowcaseRemoveItems,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Remove media descriptions from a showcase.
    """
    try:
        showcase = crud.media_showcase.remove_media_descriptions(
            db=db,
            showcase_id=showcase_id,
            media_description_ids=items_remove.media_description_ids
        )
        
        return {
            "message": "Items removed from showcase successfully",
            "showcase_id": str(showcase.id),
            "items_affected": len(items_remove.media_description_ids),
            "new_item_count": len(showcase.media_descriptions)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{showcase_id}/items/reorder", response_model=schemas.MediaShowcaseItemOperationResponse)
def reorder_showcase_items(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    reorder_item: schemas.MediaShowcaseReorderItem,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Reorder a single item within a showcase.
    """
    try:
        items = [{
            "media_description_id": reorder_item.media_description_id,
            "priority_in_showcase": reorder_item.new_priority
        }]
        
        showcase = crud.media_showcase.reorder_media_descriptions(
            db=db,
            showcase_id=showcase_id,
            items=items
        )
        
        return {
            "message": "Item reordered successfully",
            "showcase_id": str(showcase.id),
            "items_affected": 1,
            "new_item_count": len(showcase.media_descriptions)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# Special endpoints
@router.get("/by-slug/{slug}", response_model=schemas.MediaShowcase)
def get_showcase_by_slug(
    *,
    db: Session = Depends(deps.get_db),
    slug: str,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get media showcase by slug.
    """
    showcase = crud.media_showcase.get_by_slug(db=db, slug=slug)
    if not showcase:
        raise HTTPException(status_code=404, detail="Media showcase not found")
    return showcase


@router.get("/{showcase_id}/json", response_model=schemas.MediaShowcaseJSONResponse)
def get_showcase_json(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    refresh: bool = Query(False, description="Force refresh of cached JSON"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get cached JSON representation of media showcase.
    Includes all item details optimized for frontend display.
    """
    if refresh:
        showcase = crud.media_showcase.refresh_json_cache(db=db, showcase_id=showcase_id)
        if not showcase:
            raise HTTPException(status_code=404, detail="Media showcase not found")
        json_data = crud.media_showcase.get_json_cache(db=db, showcase_id=showcase_id)
    else:
        json_data = crud.media_showcase.get_json_cache(db=db, showcase_id=showcase_id)
        if not json_data:
            raise HTTPException(status_code=404, detail="Media showcase not found")
    
    return {"showcase": json_data}


@router.post("/{showcase_id}/refresh-cache", response_model=schemas.MediaShowcase)
def refresh_showcase_cache(
    *,
    db: Session = Depends(deps.get_db),
    showcase_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Refresh the JSON cache for a media showcase.
    """
    try:
        showcase = crud.media_showcase.refresh_json_cache(db=db, showcase_id=showcase_id)
        return showcase
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# Search endpoint
@router.get("/search/", response_model=schemas.MediaShowcaseResponse)
def search_media_showcases(
    *,
    db: Session = Depends(deps.get_db),
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True, description="Search only active showcases"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Search media showcases by title.
    """
    showcases = crud.media_showcase.search_by_title(
        db=db, search_term=q, skip=skip, limit=limit, active_only=active_only
    )

    total = crud.media_showcase.count_by_title_search(
        db=db, search_term=q, active_only=active_only
    )

    return {
        "data": showcases,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1,
        }
    }


@router.post("/refresh-all-caches", response_model=schemas.MediaShowcaseBulkRefreshResponse)
def refresh_all_showcase_caches(
    *,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Refresh JSON cache for all media showcases.

    **Access:** Admin users only.
    """
    try:
        result = crud.media_showcase.refresh_all_json_caches(db=db)

        return schemas.MediaShowcaseBulkRefreshResponse(
            message=f"Bulk JSON cache refresh completed. {result['success_count']} successful, {result['error_count']} errors.",
            success_count=result['success_count'],
            error_count=result['error_count'],
            total_count=result['total_count'],
            errors=result['errors']
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Bulk refresh failed: {str(e)}"
        )