from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from uuid import UUID

from app import crud, schemas
from app.api import deps

router = APIRouter()


# CategoryList endpoints
@router.get("/", response_model=schemas.CategoryListListResponse)
def get_category_lists(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False, description="Show only active category lists"),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve category lists with item counts.
    """
    if active_only:
        category_lists = crud.category_list.get_active_lists(
            db=db, skip=skip, limit=limit
        )
    else:
        category_lists = crud.category_list.get_list_with_item_count(
            db=db, skip=skip, limit=limit
        )
    
    total = crud.category_list.count_total(db=db)
    
    # Convert to response format with item counts
    response_data = []
    for cat_list in category_lists:
        item_count = len([item for item in cat_list.items if item.is_active]) if active_only else len(cat_list.items)
        cat_data = {
            "id": cat_list.id,
            "name": cat_list.name,
            "title": cat_list.title,
            "description": cat_list.description,
            "is_active": cat_list.is_active,
            "display_order": cat_list.display_order,
            "creation_date_utc": cat_list.creation_date_utc,
            "last_updated_utc": cat_list.last_updated_utc,
            "json_last_updated": cat_list.json_last_updated,
            "item_count": item_count
        }
        response_data.append(cat_data)
    
    return schemas.CategoryListListResponse(
        data=response_data,
        pagination={
            "skip": skip,
            "limit": limit,
            "total": total,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


@router.post("/", response_model=schemas.CategoryList)
def create_category_list(
    *,
    db: Session = Depends(deps.get_db),
    category_list_in: schemas.CategoryListCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new category list. Admin only.
    """
    # Check if name already exists
    existing = crud.category_list.get_by_name(db=db, name=category_list_in.name)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Category list with name '{category_list_in.name}' already exists"
        )
    
    category_list = crud.category_list.create(db=db, obj_in=category_list_in)
    return category_list


@router.get("/{category_list_id}", response_model=schemas.CategoryList)
def get_category_list(
    *,
    db: Session = Depends(deps.get_db),
    category_list_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get category list by ID with all items.
    """
    category_list = crud.category_list.get_with_items(db=db, id=category_list_id)
    if not category_list:
        raise HTTPException(status_code=404, detail="Category list not found")
    
    return category_list


@router.put("/{category_list_id}", response_model=schemas.CategoryList)
def update_category_list(
    *,
    db: Session = Depends(deps.get_db),
    category_list_id: UUID,
    category_list_in: schemas.CategoryListUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update category list. Admin only.
    """
    category_list = crud.category_list.get(db=db, id=category_list_id)
    if not category_list:
        raise HTTPException(status_code=404, detail="Category list not found")
    
    # Check name uniqueness if name is being updated
    if category_list_in.name and category_list_in.name != category_list.name:
        existing = crud.category_list.get_by_name(db=db, name=category_list_in.name)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Category list with name '{category_list_in.name}' already exists"
            )
    
    category_list = crud.category_list.update(
        db=db, db_obj=category_list, obj_in=category_list_in
    )
    return category_list


@router.delete("/{category_list_id}", response_model=schemas.CategoryList)
def delete_category_list(
    *,
    db: Session = Depends(deps.get_db),
    category_list_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete category list. Admin only.
    """
    category_list = crud.category_list.get(db=db, id=category_list_id)
    if not category_list:
        raise HTTPException(status_code=404, detail="Category list not found")
    
    category_list = crud.category_list.remove(db=db, id=category_list_id)
    return category_list


# CategoryListItem endpoints
@router.get("/{category_list_id}/items", response_model=schemas.CategoryListItemListResponse)
def get_category_list_items(
    *,
    db: Session = Depends(deps.get_db),
    category_list_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False, description="Show only active items"),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get items for a specific category list.
    """
    # Verify category list exists
    category_list = crud.category_list.get(db=db, id=category_list_id)
    if not category_list:
        raise HTTPException(status_code=404, detail="Category list not found")
    
    if active_only:
        items = crud.category_list_item.get_active_by_category_list(
            db=db, category_list_id=category_list_id, skip=skip, limit=limit
        )
        total = crud.category_list_item.count_active_by_category_list(
            db=db, category_list_id=category_list_id
        )
    else:
        items = crud.category_list_item.get_by_category_list(
            db=db, category_list_id=category_list_id, skip=skip, limit=limit
        )
        total = crud.category_list_item.count_by_category_list(
            db=db, category_list_id=category_list_id
        )
    
    # Enhance items with media description data
    enhanced_items = []
    for item in items:
        item_data = {
            "id": item.id,
            "title": item.title,
            "display_order": item.display_order,
            "is_active": item.is_active,
            "size_width": item.size_width,
            "size_height": item.size_height,
            "forward_link": item.forward_link,
            "media_description_id": item.media_description_id,
            "category_list_id": item.category_list_id,
            "creation_date_utc": item.creation_date_utc,
            "last_updated_utc": item.last_updated_utc,
            "media_title": None,
            "media_type": None,
            "thumbnail_url": None
        }
        
        if item.media_description:
            item_data.update({
                "media_title": item.media_description.episode_title,
                "media_type": item.media_description.media_type,
                "thumbnail_url": item.media_description.main_thumbnail_url
            })
        
        enhanced_items.append(item_data)
    
    return schemas.CategoryListItemListResponse(
        data=enhanced_items,
        pagination={
            "skip": skip,
            "limit": limit,
            "total": total,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


@router.post("/{category_list_id}/items", response_model=schemas.CategoryListItem)
def create_category_list_item(
    *,
    db: Session = Depends(deps.get_db),
    category_list_id: UUID,
    item_in: schemas.CategoryListItemCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new item in category list. Admin only.
    """
    # Verify category list exists
    category_list = crud.category_list.get(db=db, id=category_list_id)
    if not category_list:
        raise HTTPException(status_code=404, detail="Category list not found")
    
    # Ensure category_list_id matches
    item_in.category_list_id = category_list_id
    
    # Verify media description exists if provided
    if item_in.media_description_id:
        media_desc = crud.media_description.get(db=db, id=item_in.media_description_id)
        if not media_desc:
            raise HTTPException(status_code=400, detail="Invalid media description ID")
    
    item = crud.category_list_item.create(db=db, obj_in=item_in)
    
    # Update JSON for the category list
    crud.category_list.update_json_for_list(db=db, id=category_list_id)
    
    return item


@router.put("/{category_list_id}/items/order", response_model=dict)
def update_category_list_items_order(
    *,
    db: Session = Depends(deps.get_db),
    category_list_id: UUID,
    order_update: schemas.UpdateCategoryListItemsOrderRequest,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update the display order of category list items. Admin only.
    """
    # Verify category list exists
    category_list = crud.category_list.get(db=db, id=category_list_id)
    if not category_list:
        raise HTTPException(status_code=404, detail="Category list not found")
    
    # Convert to dict format expected by CRUD
    items_order = [
        {"id": item.id, "display_order": item.display_order}
        for item in order_update.items
    ]
    
    success = crud.category_list_item.update_items_order(db=db, items_order=items_order)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update items order")
    
    # Update JSON for the category list
    crud.category_list.update_json_for_list(db=db, id=category_list_id)
    
    return {"message": "Items order updated successfully"}


@router.put("/{category_list_id}/items/{item_id}", response_model=schemas.CategoryListItem)
def update_category_list_item(
    *,
    db: Session = Depends(deps.get_db),
    category_list_id: UUID,
    item_id: UUID,
    item_in: schemas.CategoryListItemUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update category list item. Admin only.
    """
    item = crud.category_list_item.get(db=db, id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Category list item not found")
    
    if item.category_list_id != category_list_id:
        raise HTTPException(status_code=400, detail="Item does not belong to this category list")
    
    # Verify media description exists if provided
    if item_in.media_description_id:
        media_desc = crud.media_description.get(db=db, id=item_in.media_description_id)
        if not media_desc:
            raise HTTPException(status_code=404, detail="Media description not found")
    
    item = crud.category_list_item.update(db=db, db_obj=item, obj_in=item_in)
    
    # Update JSON for the category list
    crud.category_list.update_json_for_list(db=db, id=category_list_id)
    
    return item


@router.delete("/{category_list_id}/items/{item_id}", response_model=schemas.CategoryListItem)
def delete_category_list_item(
    *,
    db: Session = Depends(deps.get_db),
    category_list_id: UUID,
    item_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete category list item. Admin only.
    """
    item = crud.category_list_item.get(db=db, id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Category list item not found")
    
    if item.category_list_id != category_list_id:
        raise HTTPException(status_code=400, detail="Item does not belong to this category list")
    
    item = crud.category_list_item.remove(db=db, id=item_id)
    
    # Update JSON for the category list
    crud.category_list.update_json_for_list(db=db, id=category_list_id)
    
    return item


# JSON endpoints
@router.get("/{category_list_name}/json", response_class=Response)
def get_category_list_json(
    *,
    db: Session = Depends(deps.get_db),
    category_list_name: str,
) -> Response:
    """
    Get category list JSON content by name (for caching).
    Public endpoint for frontend consumption.
    """
    json_content = crud.category_list.get_json_content(db=db, name=category_list_name)
    if not json_content:
        raise HTTPException(status_code=404, detail="Category list not found or JSON not generated")
    
    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Cache-Control": "public, max-age=300",  # 5 minutes cache
            "Content-Type": "application/json; charset=utf-8"
        }
    )


@router.post("/{category_list_id}/regenerate-json", response_model=dict)
def regenerate_category_list_json(
    *,
    db: Session = Depends(deps.get_db),
    category_list_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Regenerate JSON for a specific category list. Admin only.
    """
    success = crud.category_list.update_json_for_list(db=db, id=category_list_id)
    if not success:
        raise HTTPException(status_code=404, detail="Category list not found or failed to update JSON")
    
    return {"message": "JSON regenerated successfully"}


@router.post("/regenerate-all-json", response_model=schemas.BulkUpdateCategoryListsResponse)
def regenerate_all_category_lists_json(
    *,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Regenerate JSON for all category lists. Admin only.
    """
    result = crud.category_list.update_json_for_all(db=db)
    
    return schemas.BulkUpdateCategoryListsResponse(
        updated_count=result["updated_count"],
        failed_count=result["failed_count"],
        updated_ids=result["updated_ids"],
        failed_ids=result["failed_ids"]
    )


# Initialize default categories
@router.post("/initialize-defaults", response_model=dict)
def initialize_default_categories(
    *,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Initialize default category lists. Admin only.
    Use with caution - only for initial setup.
    """
    created_lists = crud.category_list.create_default_categories(db=db)
    
    return {
        "message": f"Initialized {len(created_lists)} default category lists",
        "created_categories": [cat.name for cat in created_lists]
    }