from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core.config import settings
from app.services.upload_service import MediaUploadService

router = APIRouter()


@router.post("/video", response_model=dict)
async def upload_video(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    media_description_id: Optional[UUID] = Form(None),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Upload a video file. Admin only.
    Uploads to configured storage backend (S3, Mux, or Local) and creates database record.
    Optionally links to an existing media description.
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
            media_description_id=media_description_id,
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
            "encoding_status": "pending",
            "linked_to_media": media_description_id is not None
        }
        
    except Exception as e:
        # If database creation fails, try to clean up uploaded file
        await upload_service.delete_file(upload_result.file_url)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create database record: {str(e)}"
        )


@router.post("/webcomic", response_model=dict)
async def upload_webcomic(
    *,
    db: Session = Depends(deps.get_db),
    files: List[UploadFile] = File(...),
    media_description_id: Optional[UUID] = Form(None),
    chapter_number: Optional[int] = Form(None),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Upload webcomic image files. Admin only.
    Supports multiple image files for a single webcomic chapter.
    Uploads to configured storage backend (S3 or Local) and creates database records.
    """
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Initialize upload service with configuration
    upload_config = settings.get_upload_config()
    upload_service = MediaUploadService(upload_config)
    
    # Upload all files
    upload_results = await upload_service.upload_multiple_files(files, "webtoon")
    
    # Check for any failures
    failed_uploads = [r for r in upload_results if not r.success]
    if failed_uploads:
        error_messages = [r.error_message for r in failed_uploads]
        raise HTTPException(
            status_code=400,
            detail=f"Some uploads failed: {'; '.join(error_messages)}"
        )
    
    # Create webcomic file records in database
    created_files = []
    try:
        for i, (file, result) in enumerate(zip(files, upload_results)):
            # For webcomics, we'll store them as video_file records with media_type info
            # In a more complete implementation, you might have a separate webcomic_file table
            video_file_data = schemas.video_file.VideoFileCreate(
                file_url=result.file_url,
                file_name=file.filename or f"page_{i+1:03d}",
                file_size_bytes=result.file_size or 0,
                encoding_status="completed",  # Images don't need encoding
                video_codec="N/A",  # Not applicable for images
                audio_codec="N/A",  # Not applicable for images
                file_format=result.content_type or "image/unknown",
                media_description_id=media_description_id,
            )
            
            video_file = crud.video_file.create(db=db, obj_in=video_file_data)
            created_files.append({
                "id": str(video_file.id),
                "file_url": result.file_url,
                "file_name": video_file.file_name,
                "page_number": i + 1
            })
        
        return {
            "success": True,
            "message": f"Webcomic uploaded successfully with {len(created_files)} pages",
            "files": created_files,
            "total_pages": len(created_files),
            "backend": upload_results[0].metadata.get('selected_backend') if upload_results[0].metadata else None,
            "linked_to_media": media_description_id is not None,
            "chapter_number": chapter_number
        }
        
    except Exception as e:
        # If database creation fails, try to clean up uploaded files
        for result in upload_results:
            await upload_service.delete_file(result.file_url)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create database records: {str(e)}"
        )


@router.get("/backends", response_model=dict)
def get_available_backends(
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get information about available storage backends. Admin only.
    """
    
    upload_config = settings.get_upload_config()
    upload_service = MediaUploadService(upload_config)
    
    backends = upload_service.get_available_backends()
    backend_info = {}
    
    for backend_name in backends:
        info = upload_service.get_backend_info(backend_name)
        if info:
            backend_info[backend_name] = info
    
    return {
        "available_backends": backends,
        "backend_details": backend_info,
        "media_type_routing": upload_config.get("media_types", {})
    }


@router.delete("/file")
async def delete_uploaded_file(
    *,
    file_url: str,
    backend: Optional[str] = None,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a file from storage. Admin only.
    """
    
    upload_config = settings.get_upload_config()
    upload_service = MediaUploadService(upload_config)
    
    success = await upload_service.delete_file(file_url, backend)
    
    if success:
        return {"success": True, "message": "File deleted successfully"}
    else:
        raise HTTPException(
            status_code=404,
            detail="File not found or could not be deleted"
        )