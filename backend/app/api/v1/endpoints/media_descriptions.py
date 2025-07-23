from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core.config import settings
from app.schemas import description_report

router = APIRouter()


@router.get("", response_model=schemas.media_description.MediaDescriptionList)
def read_media_descriptions(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    media_type: Optional[str] = Query(None),
    category_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    is_featured: Optional[bool] = Query(None),
    is_premium: Optional[bool] = Query(None),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve media descriptions with optional filtering.
    """
    # Get filtered results
    media_descriptions = crud.media_description.get_multi_with_filters(
        db=db,
        skip=skip,
        limit=limit,
        media_type=media_type,
        category_id=category_id,
        status=status,
        is_featured=is_featured,
        is_premium=is_premium,
    )
    
    # Get total count for pagination
    total = crud.media_description.get_count_with_filters(
        db=db,
        media_type=media_type,
        category_id=category_id,
        status=status,
        is_featured=is_featured,
        is_premium=is_premium,
    )
    
    # Calculate pagination info
    total_pages = (total + limit - 1) // limit
    
    return {
        "data": media_descriptions,
        "pagination": {
            "page": (skip // limit) + 1,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        }
    }


@router.post("", response_model=schemas.media_description.MediaDescription)
def create_media_description(
    *,
    db: Session = Depends(deps.get_db),
    media_description_in: schemas.media_description.MediaDescriptionCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new media description. Admin only.
    """
    # Check if file_number already exists
    existing = crud.media_description.get_by_file_number(db=db, file_number=media_description_in.file_number)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Media description with file_number {media_description_in.file_number} already exists",
        )
    
    media_description = crud.media_description.create(db=db, obj_in=media_description_in)
    return media_description


@router.post("/bulk", response_model=description_report.BulkMediaDescriptionResponse)
def create_bulk_media_descriptions(
    *,
    db: Session = Depends(deps.get_db),
    bulk_data: description_report.BulkMediaDescriptionCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create multiple media descriptions at once. Admin only.
    Returns a summary with reports for each description creation attempt.
    """
    try:
        # Check for duplicate file_numbers in the request
        file_numbers = [desc.file_number for desc in bulk_data.descriptions]
        if len(file_numbers) != len(set(file_numbers)):
            raise HTTPException(
                status_code=400,
                detail="Duplicate file_numbers found in the request"
            )
        
        # Check for existing file_numbers in database
        existing_numbers = []
        for file_number in file_numbers:
            existing = crud.media_description.get_by_file_number(db=db, file_number=file_number)
            if existing:
                existing_numbers.append(file_number)
        
        if existing_numbers:
            raise HTTPException(
                status_code=409,
                detail=f"Media descriptions with file_numbers {existing_numbers} already exist"
            )
        
        # Handle empty descriptions list
        if not bulk_data.descriptions:
            return description_report.BulkMediaDescriptionResponse(
                created_count=0,
                failed_count=0,
                batch_id=None,
                reports=[]
            )
        
        # Create bulk descriptions with reports
        created_descriptions, reports = crud.media_description.create_bulk_with_reports(
            db=db, descriptions=bulk_data.descriptions
        )
        
        return description_report.BulkMediaDescriptionResponse(
            created_count=len(created_descriptions),
            failed_count=len(bulk_data.descriptions) - len(created_descriptions),
            batch_id=reports[0].batch_id if reports else None,
            reports=reports
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create bulk media descriptions: {str(e)}"
        )


@router.get("/{id}", response_model=schemas.media_description.MediaDescription)
def read_media_description(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get media description by ID.
    """
    media_description = crud.media_description.get(db=db, id=id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")
    
    # Increment view count for non-admin users
    if not current_user.is_admin:
        crud.media_description.increment_view_count(db=db, id=id)
    
    return media_description


@router.put("/{id}", response_model=schemas.media_description.MediaDescription)
def update_media_description(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    media_description_in: schemas.media_description.MediaDescriptionUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update an media description. Admin only.
    """
    media_description = crud.media_description.get(db=db, id=id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")
    
    # Check if updating file_number to an existing one
    if media_description_in.file_number is not None:
        existing = crud.media_description.get_by_file_number(db=db, file_number=media_description_in.file_number)
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Media description with file_number {media_description_in.file_number} already exists",
            )
    
    media_description = crud.media_description.update(db=db, db_obj=media_description, obj_in=media_description_in)
    return media_description


@router.delete("/{id}", response_model=schemas.media_description.MediaDescription)
def delete_media_description(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a media description. Admin only.
    """
    media_description = crud.media_description.get(db=db, id=id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")
    
    media_description = crud.media_description.remove(db=db, id=id)
    return media_description


@router.get("/featured/list", response_model=List[schemas.media_description.MediaDescription])
def read_featured_media(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve featured media descriptions.
    """
    return crud.media_description.get_featured(db=db, skip=skip, limit=limit)


@router.get("/trending/list", response_model=List[schemas.media_description.MediaDescription])
def read_trending_media(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve trending media descriptions.
    """
    return crud.media_description.get_trending(db=db, skip=skip, limit=limit)


@router.post("/{id}/like", response_model=schemas.media_description.MediaDescription)
def like_media_description(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Like a media description (increment like count).
    """
    media_description = crud.media_description.get(db=db, id=id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")
    
    media_description = crud.media_description.increment_like_count(db=db, id=id)
    return media_description


@router.post("/{id}/share", response_model=schemas.media_description.MediaDescription)
def share_media_description(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Share a media description (increment share count).
    """
    media_description = crud.media_description.get(db=db, id=id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")
    
    media_description = crud.media_description.increment_share_count(db=db, id=id)
    return media_description