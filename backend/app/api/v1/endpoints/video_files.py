from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime
import time

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core.config import settings
from app.services.upload_service import MediaUploadService
from app.services.mux_token_service import mux_token_service

router = APIRouter()


@router.get("", response_model=schemas.video_file.VideoFileList)
def read_video_files(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve video files.
    """
    video_files = crud.video_file.get_multi(db=db, skip=skip, limit=limit)
    total = len(video_files)  # Simple count for now
    total_pages = (total + limit - 1) // limit
    
    return {
        "data": video_files,
        "pagination": {
            "page": (skip // limit) + 1,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        }
    }


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
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get video file by ID.
    """
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
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Retrieve unlinked video files. Admin only.
    """
    return crud.video_file.get_unlinked(db=db, skip=skip, limit=limit)


@router.get("/by-media/{media_id}", response_model=List[schemas.video_file.VideoFile])
def read_video_files_by_media(
    *,
    db: Session = Depends(deps.get_db),
    media_id: UUID,
    current_user: Optional[schemas.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get video files by media description ID.
    Returns the main video file linked to this media description.
    """
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
            upload_method=video_file_in.upload_method,
            upload_status=schemas.video_file.UploadStatusEnum.metadata_only,
            external_url=video_file_in.external_url,
        )
        
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        # Generate upload URL if this is for new upload method
        upload_url = None
        if video_file_in.upload_method == schemas.video_file.UploadMethodEnum.new_upload:
            # Generate presigned URL or upload endpoint URL
            upload_url = f"/api/v1/video/files/{video_file.id}/upload-file"
        
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
            upload_method=schemas.video_file.UploadMethodEnum.existing_url,
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
            obj_in={"upload_status": schemas.video_file.UploadStatusEnum.file_uploading, "upload_timestamp": datetime.utcnow()}
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
    db: Session = Depends(deps.get_db),
    id: UUID,
    expiration_minutes: int = Query(60, ge=1, le=1440),  # 1 minute to 24 hours
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Generate signed JWT token for secure video playback.
    
    This endpoint generates a JWT token required for accessing Mux videos 
    with signed playback policies.
    """
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
    db: Session = Depends(deps.get_db),
    id: UUID,
    expiration_minutes: int = Query(60, ge=1, le=1440),  # 1 minute to 24 hours
    drm_key_id: Optional[str] = Query(None),
    current_user: schemas.User = Depends(deps.get_current_active_user),  # Regular users can get DRM tokens
) -> Any:
    """
    Generate JWT token for DRM license requests.
    
    This endpoint generates a DRM-specific JWT token for accessing 
    DRM-protected content through Mux's license server.
    """
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