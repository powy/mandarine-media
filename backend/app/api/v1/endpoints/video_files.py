from typing import Any, List
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core.config import settings
from app.services.upload_service import MediaUploadService

router = APIRouter()


@router.get("", response_model=schemas.video_file.VideoFileList)
def read_video_files(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: schemas.User = Depends(deps.get_current_active_user),
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
    current_user: schemas.User = Depends(deps.get_current_active_user),
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
            video_codec="unknown",  # Will be updated during processing
            audio_codec="unknown",  # Will be updated during processing
            file_format="unknown",  # Will be updated during processing
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
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get video files by media description ID.
    """
    media_description = crud.media_description.get(db=db, id=media_id)
    if not media_description:
        raise HTTPException(status_code=404, detail="Media description not found")
    
    return crud.video_file.get_by_media_description_id(db=db, media_description_id=media_id)


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
            media_description_id=video_file_in.media_description_id,
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
            media_description_id=video_file_in.media_description_id,
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
            "video_codec": "unknown",  # Will be updated during processing
            "audio_codec": "unknown",  # Will be updated during processing
            "file_format": "unknown",  # Will be updated during processing
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
    current_user: schemas.User = Depends(deps.get_current_active_user),
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