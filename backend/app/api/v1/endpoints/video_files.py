from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime, timezone
import time
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Response
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.api.dependencies.caching import cache_video_metadata, no_cache
from app.core.config import settings
from app.services.upload_service import MediaUploadService
from app.services.mux_token_service import mux_token_service
from app.models.video_file import VideoFile
from app.schemas.pagination import PaginatedResponse
from app.utils.pagination import paginate_query

router = APIRouter()


@router.get("", response_model=PaginatedResponse[schemas.video_file.VideoFile])
def read_video_files(
    response: Response,
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="Search by file name"),
    encoding_status: Optional[str] = Query(None, description="Filter by encoding status"),
    order_by: Optional[str] = Query(None, description="Field to sort by"),
    order_dir: Optional[str] = Query('asc', description="Sort direction (asc|desc)"),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve video files.
    """
    cache_video_metadata(response)
    query = db.query(VideoFile)

    if q:
        query = query.filter(VideoFile.file_name.ilike(f'%{q}%'))

    if encoding_status:
        query = query.filter(VideoFile.encoding_status == encoding_status)

    video_files, pagination = paginate_query(
        query,
        VideoFile,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir,
        default_sort='creation_date_utc',
        allowed_sort_fields=(
            'creation_date_utc',
            'file_name',
            'encoding_status',
            'upload_status',
            'id',
        ),
    )

    return PaginatedResponse[schemas.video_file.VideoFile](data=video_files, pagination=pagination)


@router.post("", response_model=schemas.video_file.VideoFile)
def create_video_file(
    *,
    db: Session = Depends(deps.get_db),
    video_file_in: schemas.video_file.VideoFileCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new video file record. Admin only.
    """
    video_file = crud.video_file.create(db=db, obj_in=video_file_in)
    return video_file


@router.get("/{id}", response_model=schemas.video_file.VideoFile)
def read_video_file(
    *,
    response: Response,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get video file by ID.
    """
    cache_video_metadata(response)
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    return video_file


@router.put("/{id}", response_model=schemas.video_file.VideoFile)
def update_video_file(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    video_file_in: schemas.video_file.VideoFileUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update a video file. Admin only.
    """
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    video_file = crud.video_file.update(db=db, db_obj=video_file, obj_in=video_file_in)
    return video_file


@router.delete("/{id}", response_model=schemas.video_file.VideoFile)
def delete_video_file(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a video file. Admin only.
    Creates orphan report and removes video file object, but preserves actual file.
    """
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    video_file = crud.video_file.remove_with_orphan_report(db=db, id=id)
    return video_file


@router.post("/{id}/destroy", response_model=dict)
def destroy_video_file(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Destroy actual video file. Admin only.
    Creates destruction report. For now, only logs the request.
    """
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    crud.video_file.destroy_actual_file(db=db, id=id)
    
    return {
        "message": "File destruction request logged",
        "video_file_id": str(id),
        "status": "destroyed"
    }


@router.post("/upload", response_model=dict)
async def upload_video_file(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Upload video file. Admin only.
    Uploads to configured storage backend (S3, Mux, or Local) and creates database record.
    """
    
    # Initialize upload service with configuration
    upload_config = settings.get_upload_config()
    upload_service = MediaUploadService(upload_config)
    
    # Upload file
    upload_result = await upload_service.upload_single_file(file, "video")
    
    if not upload_result.success:
        raise HTTPException(
            status_code=400,
            detail=f"Upload failed: {upload_result.error_message}"
        )
    
    # Create video file record in database
    try:
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url=upload_result.file_url,
            file_name=file.filename or "unknown",
            file_size_bytes=upload_result.file_size or 0,
            encoding_status="pending",
        )
        
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        # Update with metadata if available
        if upload_result.metadata:
            if 'mux_asset_id' in upload_result.metadata:
                video_file = crud.video_file.update(
                    db=db,
                    db_obj=video_file,
                    obj_in={"mux_asset_id": upload_result.metadata['mux_asset_id']}
                )
        
        return {
            "success": True,
            "message": "Video file uploaded successfully",
            "video_file_id": str(video_file.id),
            "file_url": upload_result.file_url,
            "backend": upload_result.metadata.get('selected_backend') if upload_result.metadata else None,
            "encoding_status": "pending"
        }
        
    except Exception as e:
        # If database creation fails, try to clean up uploaded file
        await upload_service.delete_file(upload_result.file_url)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create database record: {str(e)}"
        )


@router.post("/{file_id}/link/{media_id}", response_model=schemas.video_file.VideoFile)
def link_video_to_media(
    *,
    db: Session = Depends(deps.get_db),
    file_id: UUID,
    media_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Link video file to media description. Admin only.
    """
    # Check if both video file and media description exist
    video_file = crud.video_file.get(db=db, id=file_id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    media_description = crud.media_description.get(db=db, id=media_id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")
    
    # Link them
    video_file = crud.video_file.link_to_media(db=db, file_id=file_id, media_description_id=media_id)
    return video_file


@router.get("/unlinked/list", response_model=List[schemas.video_file.VideoFile])
def read_unlinked_video_files(
    response: Response,
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Retrieve unlinked video files. Admin only.
    """
    cache_video_metadata(response)
    return crud.video_file.get_unlinked(db=db, skip=skip, limit=limit)


@router.get("/by-media/{media_id}", response_model=List[schemas.video_file.VideoFile])
def read_video_files_by_media(
    *,
    response: Response,
    db: Session = Depends(deps.get_db),
    media_id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get video files by media description ID.
    Returns the main video file linked to this media description.
    """
    cache_video_metadata(response)
    media_description = crud.media_description.get(db=db, id=media_id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")
    
    # With the reversed relationship, return the main video file if it exists
    if media_description.main_video_file_id:
        video_file = crud.video_file.get(db=db, id=media_description.main_video_file_id)
        if video_file:
            return [video_file]  # Return as list for API compatibility
    
    return []  # Return empty list if no video file linked


@router.put("/{id}/encoding-status", response_model=schemas.video_file.VideoFile)
def update_encoding_status(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    status: str,
    logs: str = None,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update encoding status of a video file. Admin only.
    """
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Validate status
    valid_statuses = ["pending", "processing", "completed", "failed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    video_file = crud.video_file.update_encoding_status(db=db, file_id=id, status=status, logs=logs)
    return video_file


@router.post("/create-metadata", response_model=schemas.video_file.VideoFileUploadResponse)
def create_video_file_metadata(
    *,
    db: Session = Depends(deps.get_db),
    video_file_in: schemas.video_file.VideoFileMetadataCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create video file metadata only (first step of two-step upload). Admin only.
    Returns upload URL for subsequent file upload.
    """
    try:
        # Create video file record with metadata only
        video_file_data = schemas.video_file.VideoFileCreate(
            file_name=video_file_in.file_name,
            upload_status=schemas.video_file.UploadStatusEnum.metadata_only,
            external_url=video_file_in.external_url,
        )
        
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        # Generate upload URL for new uploads (when no external_url provided)
        upload_url = None
        if not video_file_in.external_url:
            # Generate presigned URL or upload endpoint URL for new uploads
            upload_url = f"/api/v1/video-files/{video_file.id}/upload-file"
        
        return schemas.video_file.VideoFileUploadResponse(
            id=video_file.id,
            upload_url=upload_url,
            upload_status=video_file.upload_status,
            message="Video file metadata created successfully. Use upload_url to upload the actual file."
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create video file metadata: {str(e)}"
        )


@router.post("/create-with-existing-url", response_model=schemas.video_file.VideoFile)
def create_video_file_with_existing_url(
    *,
    db: Session = Depends(deps.get_db),
    video_file_in: schemas.video_file.VideoFileExistingUrlCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create video file record using existing media URL. Admin only.
    """
    try:
        # Create video file record with existing URL
        video_file_data = schemas.video_file.VideoFileCreate(
            file_name=video_file_in.file_name,
            external_url=video_file_in.external_url,
            upload_status=schemas.video_file.UploadStatusEnum.upload_completed,
            file_url=video_file_in.external_url,  # Use external URL as file URL
        )
        
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        return video_file
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create video file with existing URL: {str(e)}"
        )


@router.post("/{file_id}/upload-file", response_model=dict)
async def upload_file_to_existing_metadata(
    *,
    db: Session = Depends(deps.get_db),
    file_id: UUID,
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Upload actual file for existing video file metadata record (second step of two-step upload). Admin only.
    """
    # Get existing video file record
    video_file = crud.video_file.get(db=db, id=file_id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file metadata not found")
    
    # Validate that this is a metadata-only record
    if video_file.upload_status != schemas.video_file.UploadStatusEnum.metadata_only:
        raise HTTPException(
            status_code=400, 
            detail=f"Video file is not in metadata_only status. Current status: {video_file.upload_status}"
        )
    
    try:
        # Update status to uploading
        crud.video_file.update(
            db=db,
            db_obj=video_file,
            obj_in={"upload_status": schemas.video_file.UploadStatusEnum.file_uploading, "upload_timestamp": datetime.now(timezone.utc)}
        )
        
        # Initialize upload service
        upload_config = settings.get_upload_config()
        upload_service = MediaUploadService(upload_config)
        
        # Upload file
        upload_result = await upload_service.upload_single_file(file, "video")
        
        if not upload_result.success:
            # Update status to failed
            crud.video_file.update(
                db=db,
                db_obj=video_file,
                obj_in={"upload_status": schemas.video_file.UploadStatusEnum.upload_failed}
            )
            raise HTTPException(
                status_code=400,
                detail=f"Upload failed: {upload_result.error_message}"
            )
        
        # Update video file record with upload details
        update_data = {
            "file_url": upload_result.file_url,
            "file_size_bytes": upload_result.file_size or 0,
            "upload_status": schemas.video_file.UploadStatusEnum.upload_completed,
            "encoding_status": "pending",
        }
        
        # Add metadata if available
        if upload_result.metadata:
            if 'mux_asset_id' in upload_result.metadata:
                update_data['mux_asset_id'] = upload_result.metadata['mux_asset_id']
            if 'mux_playback_id' in upload_result.metadata:
                update_data['mux_playback_id'] = upload_result.metadata['mux_playback_id']
        
        video_file = crud.video_file.update(db=db, db_obj=video_file, obj_in=update_data)
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "video_file_id": str(video_file.id),
            "file_url": upload_result.file_url,
            "backend": upload_result.metadata.get('selected_backend') if upload_result.metadata else None,
            "upload_status": video_file.upload_status,
            "encoding_status": video_file.encoding_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Update status to failed
        crud.video_file.update(
            db=db,
            db_obj=video_file,
            obj_in={"upload_status": schemas.video_file.UploadStatusEnum.upload_failed}
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.post("/{file_id}/test", response_model=schemas.video_file.VideoFileTestResponse)
def test_video_file_playback(
    *,
    db: Session = Depends(deps.get_db),
    file_id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Test video file playback. Returns playback URL or error message.
    """
    video_file = crud.video_file.get(db=db, id=file_id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    try:
        # Check if file has a valid URL
        playback_url = None
        error_message = None
        success = False
        
        if video_file.mux_playback_id:
            # Use Mux playback ID if available
            playback_url = f"https://stream.mux.com/{video_file.mux_playback_id}.m3u8"
            success = True
        elif video_file.file_url:
            # Use direct file URL
            playback_url = video_file.file_url
            success = True
        elif video_file.external_url:
            # Use external URL
            playback_url = video_file.external_url
            success = True
        else:
            error_message = "No playback URL available for this video file"
            success = False
        
        # Check upload status
        if video_file.upload_status == schemas.video_file.UploadStatusEnum.metadata_only:
            error_message = "Video file upload not completed yet"
            success = False
        elif video_file.upload_status == schemas.video_file.UploadStatusEnum.upload_failed:
            error_message = "Video file upload failed"
            success = False
        elif video_file.encoding_status == "failed":
            error_message = "Video file encoding failed"
            success = False
        
        return schemas.video_file.VideoFileTestResponse(
            success=success,
            playback_url=playback_url,
            error_message=error_message,
            mux_playback_id=video_file.mux_playback_id
        )
        
    except Exception as e:
        return schemas.video_file.VideoFileTestResponse(
            success=False,
            error_message=f"Error testing video file: {str(e)}",
            playback_url=None,
            mux_playback_id=video_file.mux_playback_id
        )


@router.post("/{id}/playback-token", response_model=dict)
def generate_playback_token(
    *,
    response: Response,
    db: Session = Depends(deps.get_db),
    id: UUID,
    expiration_minutes: int = Query(settings.MUX_TOKEN_EXPIRATION_MINUTES, ge=1, le=1440),  # 1 minute to 24 hours
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Generate signed JWT token for secure video playback.

    This endpoint generates a JWT token required for accessing Mux videos
    with signed playback policies.
    """
    no_cache(response)

    import re
    import logging

    logger = logging.getLogger(__name__)
    
    # Get video file
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    logger.info(f"Generating token for video file {id}")
    logger.info(f"mux_playback_id: {video_file.mux_playback_id}")
    logger.info(f"external_url: {video_file.external_url}")
    
    # Get playback ID from mux_playback_id or extract from external_url
    playback_id = video_file.mux_playback_id
    
    if not playback_id and video_file.external_url:
        # Try to extract playback ID from external URL
        # Pattern: https://stream.mux.com/{playback_id}.m3u8
        match = re.search(r'stream\.mux\.com/([^/.]+)(?:\.m3u8)?', video_file.external_url)
        if match:
            playback_id = match.group(1)
            logger.info(f"Extracted playback ID from URL: {playback_id}")
    
    if not playback_id:
        logger.error(f"Could not extract playback ID from video file {id}")
        raise HTTPException(
            status_code=400, 
            detail="Video file does not have a MUX playback ID and cannot extract one from external URL"
        )
    
    try:
        logger.info(f"Attempting to generate token for playback ID: {playback_id}")
        # Generate playback token
        token = mux_token_service.generate_playback_token(
            playback_id=playback_id,
            expiration_minutes=expiration_minutes,
            audience="v"  # "v" for video
        )
        logger.info(f"Token generated successfully")
        
        # Generate signed playback URL
        signed_url = mux_token_service.generate_signed_playback_url(
            playback_id=playback_id,
            expiration_minutes=expiration_minutes
        )
        
        return {
            "success": True,
            "token": token,
            "playback_url": signed_url,
            "playback_id": playback_id,
            "expires_in_minutes": expiration_minutes,
            "expires_at": int(time.time()) + (expiration_minutes * 60)
        }
        
    except ValueError as e:
        logger.error(f"ValueError in token generation: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Exception in token generation: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate playback token: {str(e)}"
        )


@router.post("/{id}/drm-token", response_model=dict)
def generate_drm_token(
    *,
    response: Response,
    db: Session = Depends(deps.get_db),
    id: UUID,
    expiration_minutes: int = Query(settings.MUX_TOKEN_EXPIRATION_MINUTES, ge=1, le=1440),  # 1 minute to 24 hours
    drm_key_id: Optional[str] = Query(None),
    current_user: schemas.User = Depends(deps.get_current_active_admin),  # Admin only
) -> Any:
    """
    Generate JWT token for DRM license requests.

    This endpoint generates a DRM-specific JWT token for accessing
    DRM-protected content through Mux's license server.
    """
    no_cache(response)

    import re
    import logging

    logger = logging.getLogger(__name__)
    
    # Get video file
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    logger.info(f"Generating DRM token for video file {id}")
    logger.info(f"mux_playback_id: {video_file.mux_playback_id}")
    logger.info(f"external_url: {video_file.external_url}")
    
    # Get playback ID from mux_playback_id or extract from external_url
    playback_id = video_file.mux_playback_id
    
    if not playback_id and video_file.external_url:
        # Try to extract playback ID from external URL
        # Pattern: https://stream.mux.com/{playback_id}.m3u8
        match = re.search(r'stream\.mux\.com/([^/.]+)(?:\.m3u8)?', video_file.external_url)
        if match:
            playback_id = match.group(1)
    
    if not playback_id:
        raise HTTPException(
            status_code=400, 
            detail="Video file does not have a MUX playback ID and cannot extract one from external URL"
        )
    
    # Check if video file is DRM protected (this would need to be tracked in your video_file model)
    # For now, we'll assume any video with a playback ID can potentially be DRM protected
    
    try:
        # Generate DRM token
        token = mux_token_service.generate_drm_token(
            playback_id=playback_id,
            expiration_minutes=expiration_minutes,
            key_id=drm_key_id
        )
        
        return {
            "success": True,
            "drm_token": token,
            "playback_id": playback_id,
            "drm_key_id": drm_key_id,
            "expires_in_minutes": expiration_minutes,
            "expires_at": int(time.time()) + (expiration_minutes * 60)
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate DRM token: {str(e)}"
        )


@router.get("/{id}/token-info", response_model=dict)
def get_token_info(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    token: str = Query(..., description="JWT token to analyze"),
    current_user: schemas.User = Depends(deps.get_current_active_admin),  # Admin only
) -> Any:
    """
    Get information about a JWT token (for debugging). Admin only.
    
    This endpoint decodes and analyzes a JWT token without validating 
    the signature, useful for debugging token issues.
    """
    # Verify video file exists (for context)
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    try:
        # Get token information
        token_info = mux_token_service.get_token_info(token)
        
        # Add video file context
        token_info["video_file_id"] = str(id)
        token_info["video_file_playback_id"] = video_file.mux_playback_id
        
        return {
            "success": True,
            "token_info": token_info
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to analyze token: {str(e)}",
            "video_file_id": str(id)
        }


@router.post("/{id}/complete-from-mux", response_model=schemas.video_file.VideoFile)
async def complete_video_file_from_mux(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Complete video file data using Mux API. Admin only.
    
    Fetches complete video information from Mux using the stored mux_asset_id
    and updates the video file record with all available data.
    """
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Get video file
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Check if video file has mux_asset_id
    if not video_file.mux_asset_id:
        raise HTTPException(
            status_code=400,
            detail="Video file does not have a mux_asset_id. Cannot complete from Mux."
        )
    
    logger.info(f"Completing video file {id} from Mux asset {video_file.mux_asset_id}")
    
    try:
        # Get Mux configuration and create service
        upload_config = settings.get_upload_config()
        
        # Check if Mux is configured
        if 'mux' not in upload_config.get('backends', {}):
            raise HTTPException(
                status_code=500,
                detail="Mux backend not configured. Check UPLOAD_MUX_TOKEN_ID and UPLOAD_MUX_TOKEN_SECRET environment variables."
            )
        
        from app.services.storage.mux import MuxStorageBackend
        mux_service = MuxStorageBackend(upload_config['backends']['mux'])
        
        # Get complete asset information from Mux with retry for incomplete data
        asset_info = await mux_service.get_complete_asset_info(video_file.mux_asset_id)

        # If the asset info is incomplete but successful, try a few more times
        # This handles cases where the asset is "ready" but playback IDs aren't available yet
        max_retries = 3
        retry_delay = 2  # seconds

        for retry_attempt in range(max_retries):
            if asset_info.get('success') and asset_info.get('debug_info'):
                debug_info = asset_info['debug_info']

                # Check if we have essential data
                has_playback_ids = debug_info.get('has_file_url', False)
                playback_count = debug_info.get('playback_ids_count', 0)

                if not has_playback_ids and playback_count == 0:
                    logger.warning(f"[VIDEO_FILES DEBUG] Asset {video_file.mux_asset_id} is missing playback IDs (attempt {retry_attempt + 1}/{max_retries + 1})")

                    if retry_attempt < max_retries:
                        logger.info(f"[VIDEO_FILES DEBUG] Retrying asset info retrieval in {retry_delay} seconds...")
                        await asyncio.sleep(retry_delay)
                        asset_info = await mux_service.get_complete_asset_info(video_file.mux_asset_id)
                        continue
                    else:
                        logger.warning(f"[VIDEO_FILES DEBUG] Max retries reached - proceeding with incomplete data")
                        break
                else:
                    logger.info(f"[VIDEO_FILES DEBUG] Asset data appears complete on attempt {retry_attempt + 1}")
                    break
            else:
                # If the call failed entirely, don't retry here - let it fail
                break
        
        logger.info(f"[VIDEO_FILES DEBUG] Received asset_info from Mux service:")
        logger.info(f"[VIDEO_FILES DEBUG] - success: {asset_info.get('success')}")
        logger.info(f"[VIDEO_FILES DEBUG] - file_url: {asset_info.get('file_url')}")
        logger.info(f"[VIDEO_FILES DEBUG] - mux_playback_id: {asset_info.get('mux_playback_id')}")
        logger.info(f"[VIDEO_FILES DEBUG] - playback_policy: {asset_info.get('playback_policy')}")
        
        if not asset_info['success']:
            error_code = asset_info.get('error_code', 'UNKNOWN_ERROR')
            error_msg = asset_info.get('error', 'Failed to retrieve asset information')
            
            if error_code == 'ASSET_NOT_FOUND':
                raise HTTPException(
                    status_code=404,
                    detail=f"Asset {video_file.mux_asset_id} not found in Mux"
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to retrieve asset information: {error_msg}"
                )
        
        # Prepare update data - only update fields that have values from Mux
        update_data = {}
        
        # Always update these fields if they have values or are explicitly None
        logger.info(f"[VIDEO_FILES DEBUG] Checking file_url: asset_info.get('file_url') = {repr(asset_info.get('file_url'))}")

        # Always try to update file_url, even if it's None - this clears invalid data
        if 'file_url' in asset_info:
            update_data['file_url'] = asset_info['file_url']
            logger.info(f"[VIDEO_FILES DEBUG] Added file_url to update_data: {asset_info['file_url']}")

            # Log warning if file_url is None - this indicates missing playback ID
            if asset_info['file_url'] is None:
                logger.warning(f"[VIDEO_FILES DEBUG] file_url is None - likely missing Mux playback ID for asset {video_file.mux_asset_id}")
        else:
            logger.warning(f"[VIDEO_FILES DEBUG] file_url key missing from asset_info")
        if asset_info.get('duration_seconds') is not None:
            update_data['duration_seconds'] = asset_info['duration_seconds']
        if 'max_resolution_width' in asset_info:
            update_data['max_resolution_width'] = asset_info['max_resolution_width']
        if 'max_resolution_height' in asset_info:
            update_data['max_resolution_height'] = asset_info['max_resolution_height']
        if 'frame_rate' in asset_info:
            update_data['frame_rate'] = asset_info['frame_rate']
        if 'aspect_ratio' in asset_info:
            update_data['aspect_ratio'] = asset_info['aspect_ratio']
        if asset_info.get('encoding_status'):
            update_data['encoding_status'] = asset_info['encoding_status']
        if asset_info.get('upload_status'):
            update_data['upload_status'] = asset_info['upload_status']
        if 'upload_timestamp' in asset_info:
            update_data['upload_timestamp'] = asset_info['upload_timestamp']
        if 'encodage_date_utc' in asset_info:
            update_data['encodage_date_utc'] = asset_info['encodage_date_utc']
        if asset_info.get('encoding_profile'):
            update_data['encoding_profile'] = asset_info['encoding_profile']
        if asset_info.get('subtitle_tracks_text_list') is not None:
            update_data['subtitle_tracks_text_list'] = asset_info['subtitle_tracks_text_list']
        if asset_info.get('mux_playback_id'):
            update_data['mux_playback_id'] = asset_info['mux_playback_id']
        if asset_info.get('drm_protection') is not None:
            update_data['drm_protection'] = asset_info['drm_protection']
        if asset_info.get('playback_policy'):
            update_data['playback_policy'] = asset_info['playback_policy']
        
        # Note: bitrate_kbps, file_size_bytes, and audio_sample_rate are not updated to null to preserve existing values if any
        # All unavailable fields from Mux API are now preserved instead of being overwritten
        
        logger.info(f"[VIDEO_FILES DEBUG] Final update_data dictionary:")
        for key, value in update_data.items():
            logger.info(f"[VIDEO_FILES DEBUG]   - {key}: {repr(value)}")

        # Log debug info if available
        if 'debug_info' in asset_info:
            debug = asset_info['debug_info']
            logger.info(f"[VIDEO_FILES DEBUG] Mux asset debug info:")
            logger.info(f"[VIDEO_FILES DEBUG]   - playback_ids_count: {debug.get('playback_ids_count', 'unknown')}")
            logger.info(f"[VIDEO_FILES DEBUG]   - has_file_url: {debug.get('has_file_url', 'unknown')}")
            logger.info(f"[VIDEO_FILES DEBUG]   - playback_ids_raw: {debug.get('playback_ids_raw', [])}")

        logger.info(f"Updating video file {id} with {len(update_data)} fields from Mux")

        # Update the video file
        video_file = crud.video_file.update(db=db, db_obj=video_file, obj_in=update_data)

        logger.info(f"Successfully completed video file {id} from Mux asset {video_file.mux_asset_id}")

        # Log final status
        if asset_info.get('file_url') is None:
            logger.warning(f"Video file {id} was updated but file_url is None - this may indicate Mux asset is not fully ready")
        
        return video_file
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing video file {id} from Mux: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to complete video file from Mux: {str(e)}"
        )


@router.post("/{id}/verify", response_model=schemas.video_file.VideoFileVerifyResponse)
async def verify_video_file(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Verify video file against Mux API and check data consistency. Admin only.

    Performs comprehensive validation:
    - Mux asset exists and is ready
    - Subtitle validation (broken, missing FR, duplicates)
    - Media description linkage
    - Data consistency checks

    Returns diagnostics field set to "ready" or comma-separated errors.
    Note: Does NOT automatically fix mismatches.
    """
    import logging
    logger = logging.getLogger(__name__)

    # Get video file
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(status_code=404, detail="Video file not found")

    logger.info(f"Starting verification for video file {id}")

    try:
        # Get Mux configuration
        upload_config = settings.get_upload_config()

        if 'mux' not in upload_config.get('backends', {}):
            raise HTTPException(
                status_code=500,
                detail="Mux backend not configured"
            )

        from app.services.storage.mux import MuxStorageBackend
        mux_service = MuxStorageBackend(upload_config['backends']['mux'])

        # Call diagnostic method
        diagnostics = await video_file.diagnostic(db=db, mux_service=mux_service)

        logger.info(f"Verification complete for video file {id}: {diagnostics}")

        # Parse response
        is_ready = diagnostics == "ready"
        errors = [] if is_ready else [e.strip() for e in diagnostics.split(",")]

        return schemas.video_file.VideoFileVerifyResponse(
            id=video_file.id,
            diagnostics=diagnostics,
            is_ready=is_ready,
            errors=errors
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying video file {id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify video file: {str(e)}"
        )


# Audio Language Relationship Endpoints

@router.post("/{id}/audio_languages/{language_id}", response_model=schemas.video_file.VideoFile)
def add_audio_language_to_video_file(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    language_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Add an audio language to a video file.
    """
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(
            status_code=404,
            detail="Video file not found"
        )

    updated_video_file = crud.video_file.add_audio_language(
        db=db, video_file_id=id, language_id=language_id
    )

    if not updated_video_file:
        raise HTTPException(
            status_code=400,
            detail="Failed to add audio language to video file"
        )

    return updated_video_file


@router.delete("/{id}/audio_languages/{language_id}", response_model=schemas.video_file.VideoFile)
def remove_audio_language_from_video_file(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    language_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Remove an audio language from a video file.
    """
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(
            status_code=404,
            detail="Video file not found"
        )

    updated_video_file = crud.video_file.remove_audio_language(
        db=db, video_file_id=id, language_id=language_id
    )

    if not updated_video_file:
        raise HTTPException(
            status_code=400,
            detail="Failed to remove audio language from video file"
        )

    return updated_video_file


@router.put("/{id}/audio_languages", response_model=schemas.video_file.VideoFile)
def update_video_file_audio_languages(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    language_ids: List[UUID],
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update all audio languages for a video file.
    """
    video_file = crud.video_file.get(db=db, id=id)
    if not video_file:
        raise HTTPException(
            status_code=404,
            detail="Video file not found"
        )

    updated_video_file = crud.video_file.update_audio_languages(
        db=db, video_file_id=id, language_ids=language_ids
    )

    if not updated_video_file:
        raise HTTPException(
            status_code=400,
            detail="Failed to update audio languages for video file"
        )

    return updated_video_file
