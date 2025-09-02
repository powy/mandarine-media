from typing import Any, List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core.config import settings
from app.schemas import description_report
from app.services.text_to_uuid_service import (
    get_or_create_program, get_or_create_season, get_or_create_themes,
    get_or_create_persons, get_image_by_filename, get_or_create_countries,
    get_or_create_audience_categories, get_or_create_subscription_plans,
    get_next_available_file_number
)

router = APIRouter()


@router.get("", response_model=schemas.media_description.MediaDescriptionListResponse)
def read_media_descriptions(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    media_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    is_featured: Optional[bool] = Query(None),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve media descriptions with optional filtering.
    """
    # Get filtered results using the available method
    media_descriptions = crud.media_description.get_multi_with_filters(
        db=db,
        skip=skip,
        limit=limit,
        media_type=media_type,
        status=status,
        is_featured=is_featured,
    )
    
    # Get total count with same filters
    total = crud.media_description.count_with_filters(
        db=db,
        media_type=media_type,
        status=status,
        is_featured=is_featured,
    )
    
    return schemas.media_description.MediaDescriptionListResponse(
        data=media_descriptions,
        pagination={
            "skip": skip,
            "limit": limit,
            "total": total,
            "page": (skip // limit) + 1,
            "total_pages": (total + limit - 1) // limit,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


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
        
        # Create descriptions one by one and collect results
        created_descriptions = []
        reports = []
        batch_id = str(uuid4())
        
        for desc in bulk_data.descriptions:
            try:
                created_desc = crud.media_description.create(db=db, obj_in=desc)
                created_descriptions.append(created_desc)
                
                # Create and save report to database
                report_data = schemas.DescriptionReportCreate(
                    description_id=created_desc.id,
                    title=created_desc.episode_title,
                    success_associated_file=True,
                    batch_id=UUID(batch_id)
                )
                saved_report = crud.description_report.create(db=db, obj_in=report_data)
                
                reports.append({
                    "batch_id": batch_id,
                    "description_id": str(created_desc.id),
                    "file_number": desc.file_number,
                    "title": created_desc.episode_title,
                    "status": "success",
                    "message": "Created successfully",
                    "success_associated_file": True,
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                # Create and save failure report to database if we have the needed info
                report_data = schemas.DescriptionReportCreate(
                    description_id=UUID('00000000-0000-0000-0000-000000000000'),  # Placeholder for failed creation
                    title=desc.episode_title,
                    success_associated_file=False,
                    batch_id=UUID(batch_id)
                )
                try:
                    saved_report = crud.description_report.create(db=db, obj_in=report_data)
                except:
                    pass  # Don't fail bulk operation if report creation fails
                
                reports.append({
                    "batch_id": batch_id,
                    "description_id": None,
                    "file_number": desc.file_number,
                    "title": desc.episode_title,
                    "status": "failed", 
                    "message": str(e),
                    "success_associated_file": False,
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        return description_report.BulkMediaDescriptionResponse(
            created_count=len(created_descriptions),
            failed_count=len(bulk_data.descriptions) - len(created_descriptions),
            batch_id=batch_id,
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
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get media description by ID.
    """
    media_description = crud.media_description.get(db=db, id=id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")
    
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
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve featured media descriptions.
    """
    return crud.media_description.get_multi_with_filters(
        db=db, skip=skip, limit=limit, is_featured=True
    )


@router.get("/trending/list", response_model=List[schemas.media_description.MediaDescription])
def read_trending_media(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve trending media descriptions. (Returns all for now)
    """
    return crud.media_description.get_multi(db=db, skip=skip, limit=limit)


# Removed endpoints for like and share - engagement features no longer supported


@router.get("/by-video/{video_file_id}", response_model=List[schemas.media_description.MediaDescription])
def read_media_descriptions_by_video(
    *,
    db: Session = Depends(deps.get_db),
    video_file_id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get media descriptions by video file ID.
    Returns all media descriptions that use this video file as their main video.
    """
    # Check if video file exists
    video_file = crud.video_file.get(db=db, id=video_file_id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Get media descriptions that reference this video file
    return crud.media_description.get_by_video_file_id(db=db, video_file_id=video_file_id)


@router.post("/from-text", response_model=schemas.media_description.MediaDescription)
def create_media_description_from_text(
    *,
    db: Session = Depends(deps.get_db),
    media_description_in: schemas.media_description.MediaDescriptionCreateFromText,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new media description from text fields. Admin only.
    
    This endpoint accepts text values for relationship fields and converts them to UUIDs
    using get-or-create logic. Fields with multiple matches will be logged as errors 
    and set to None.
    """
    # Handle file_number - generate if not provided
    file_number = media_description_in.file_number
    if file_number is None:
        file_number = get_next_available_file_number(db)
    else:
        # Check if file_number already exists
        existing = crud.media_description.get_by_file_number(db=db, file_number=file_number)
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Media description with file_number {file_number} already exists",
            )
    
    # Convert text fields to UUIDs
    program_id = None
    if media_description_in.program_name:
        program_id = get_or_create_program(db, media_description_in.program_name)
    
    season_id = None
    if media_description_in.season_name:
        season_id = get_or_create_season(db, media_description_in.season_name)
    
    # Handle image fields (lookup only, don't create)
    image_1920_1080_id = None
    if media_description_in.image_1920_1080_filename:
        image_1920_1080_id = get_image_by_filename(db, media_description_in.image_1920_1080_filename)
    
    image_1920_720_id = None
    if media_description_in.image_1920_720_filename:
        image_1920_720_id = get_image_by_filename(db, media_description_in.image_1920_720_filename)
    
    image_1080_1080_id = None
    if media_description_in.image_1080_1080_filename:
        image_1080_1080_id = get_image_by_filename(db, media_description_in.image_1080_1080_filename)
    
    image_810_1080_id = None
    if media_description_in.image_810_1080_filename:
        image_810_1080_id = get_image_by_filename(db, media_description_in.image_810_1080_filename)
    
    image_1080_1920_id = None
    if media_description_in.image_1080_1920_filename:
        image_1080_1920_id = get_image_by_filename(db, media_description_in.image_1080_1920_filename)
    
    # Handle list fields
    theme_ids = get_or_create_themes(db, media_description_in.theme_names or [])
    actor_ids = get_or_create_persons(db, media_description_in.actor_names or [])
    director_ids = get_or_create_persons(db, media_description_in.director_names or [])
    producer_ids = get_or_create_persons(db, media_description_in.producer_names or [])
    author_ids = get_or_create_persons(db, media_description_in.author_names or [])
    available_country_ids = get_or_create_countries(db, media_description_in.available_country_names or [])
    audience_category_ids = get_or_create_audience_categories(db, media_description_in.audience_category_names or [])
    eligible_plan_ids = get_or_create_subscription_plans(db, media_description_in.eligible_plan_names or [])
    
    # Convert UUIDs to strings for the relationship fields
    theme_id_strings = [str(uuid_id) for uuid_id in theme_ids]
    actor_id_strings = [str(uuid_id) for uuid_id in actor_ids]
    director_id_strings = [str(uuid_id) for uuid_id in director_ids]
    producer_id_strings = [str(uuid_id) for uuid_id in producer_ids]
    author_id_strings = [str(uuid_id) for uuid_id in author_ids]
    available_country_id_strings = [str(uuid_id) for uuid_id in available_country_ids]
    audience_category_id_strings = [str(uuid_id) for uuid_id in audience_category_ids]
    eligible_plan_id_strings = [str(uuid_id) for uuid_id in eligible_plan_ids]
    
    # Create the standard MediaDescriptionCreate object
    media_description_data = schemas.media_description.MediaDescriptionCreate(
        # Required fields
        file_number=file_number,
        episode_title=media_description_in.episode_title,
        media_type=media_description_in.media_type,
        
        # Converted UUID fields
        program_id=program_id,
        season_id=season_id,
        image_1920_1080_id=image_1920_1080_id,
        image_1920_720_id=image_1920_720_id,
        image_1080_1080_id=image_1080_1080_id,
        image_810_1080_id=image_810_1080_id,
        image_1080_1920_id=image_1080_1920_id,
        
        # Relationship fields
        actor_ids=actor_id_strings,
        director_ids=director_id_strings,
        producer_ids=producer_id_strings,
        author_ids=author_id_strings,
        available_country_ids=available_country_id_strings,
        # TODO: Check if we need origin_country_ids or theme_ids fields in MediaDescriptionCreate
        theme_ids=theme_id_strings,
        eligible_plan_id_list=eligible_plan_id_strings,
        audience_category_ids=audience_category_id_strings,
        
        # All other fields from input
        expected_filename=media_description_in.expected_filename,
        main_video_file_id=media_description_in.main_video_file_id,
        episode_number=media_description_in.episode_number,
        media_categories_list=media_description_in.media_categories_list,
        descriptive_summary_text=media_description_in.descriptive_summary_text,
        synopsis_text=media_description_in.synopsis_text,
        contract_start_date_utc=media_description_in.contract_start_date_utc,
        contract_end_date_utc=media_description_in.contract_end_date_utc,
        production_year=media_description_in.production_year,
        original_broadcast_date_utc=media_description_in.original_broadcast_date_utc,
        is_featured=media_description_in.is_featured,
        content_status=media_description_in.content_status,
        seo_title=media_description_in.seo_title,
        seo_description=media_description_in.seo_description,
        seo_keywords_text_list=media_description_in.seo_keywords_text_list,
        hashtags_text_list=media_description_in.hashtags_text_list,
        external_identifier_text=media_description_in.external_identifier_text,
        rights_holder=media_description_in.rights_holder,
        friendly_url=media_description_in.friendly_url,
        copyright_owner_text=media_description_in.copyright_owner_text,
        slug=media_description_in.slug,
        human_keywords_text_list=media_description_in.human_keywords_text_list,
        additional_images_id_list=media_description_in.additional_images_id_list,
        translation_share=media_description_in.translation_share,
        sacem_share=media_description_in.sacem_share,
        other_share=media_description_in.other_share,
        revenue_share=media_description_in.revenue_share,
        paid_token_cost=media_description_in.paid_token_cost,
    )
    
    # Create the media description using existing logic
    media_description = crud.media_description.create(db=db, obj_in=media_description_data)
    return media_description