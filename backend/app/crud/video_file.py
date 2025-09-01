from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID

from app.crud.base import CRUDBase
from app.models.video_file import VideoFile
from app.schemas.video_file import VideoFileCreate, VideoFileUpdate
from app.schemas.video_file_report import VideoFileReportCreate
from app.crud.video_file_report import video_file_report


class CRUDVideoFile(CRUDBase[VideoFile, VideoFileCreate, VideoFileUpdate]):
    def get_unlinked(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[VideoFile]:
        """Get video files that don't have any media descriptions linked to them"""
        from app.models.media_description import MediaDescription
        # Get video files that don't have any media descriptions pointing to them
        subquery = db.query(MediaDescription.main_video_file_id).filter(
            MediaDescription.main_video_file_id.isnot(None)
        ).subquery()
        
        return (
            db.query(self.model)
            .filter(~VideoFile.id.in_(subquery))
            .order_by(desc(VideoFile.creation_date_utc))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_encoding_status(
        self, db: Session, *, encoding_status: str, skip: int = 0, limit: int = 100
    ) -> List[VideoFile]:
        return (
            db.query(self.model)
            .filter(VideoFile.encoding_status == encoding_status)
            .order_by(desc(VideoFile.creation_date_utc))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def link_to_media(
        self, db: Session, *, file_id: UUID, media_description_id: UUID
    ) -> Optional[VideoFile]:
        """Link a video file to a media description by updating the media description"""
        from app.models.media_description import MediaDescription
        
        # Update the media description to point to this video file
        media_desc = db.query(MediaDescription).filter(MediaDescription.id == media_description_id).first()
        if media_desc:
            media_desc.main_video_file_id = file_id
            db.add(media_desc)
            db.commit()
            db.refresh(media_desc)
            
            # Return the video file for consistency with the old API
            return db.query(self.model).filter(self.model.id == file_id).first()
        return None

    def update_encoding_status(
        self, db: Session, *, file_id: UUID, status: str, logs: Optional[str] = None
    ) -> Optional[VideoFile]:
        obj = db.query(self.model).filter(self.model.id == file_id).first()
        if obj:
            obj.encoding_status = status
            if logs:
                obj.processing_logs = logs
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def get_by_upload_status(
        self, db: Session, *, upload_status: str, skip: int = 0, limit: int = 100
    ) -> List[VideoFile]:
        """Get video files by upload status"""
        return (
            db.query(self.model)
            .filter(VideoFile.upload_status == upload_status)
            .order_by(desc(VideoFile.creation_date_utc))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_metadata_only_files(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[VideoFile]:
        """Get video files that have metadata only (pending file upload)"""
        return self.get_by_upload_status(
            db=db, upload_status="metadata_only", skip=skip, limit=limit
        )


    def update_upload_status(
        self, db: Session, *, file_id: UUID, status: str, upload_timestamp: Optional[str] = None
    ) -> Optional[VideoFile]:
        """Update upload status and timestamp"""
        obj = db.query(self.model).filter(self.model.id == file_id).first()
        if obj:
            obj.upload_status = status
            if upload_timestamp:
                obj.upload_timestamp = upload_timestamp
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def remove_with_orphan_report(
        self, db: Session, *, id: UUID
    ) -> Optional[VideoFile]:
        """
        Remove video file and create orphan report instead of actually deleting the file
        """
        obj = db.query(self.model).filter(self.model.id == id).first()
        if obj:
            # Get related media description info if exists
            from app.models.media_description import MediaDescription
            media_description_title = None
            media_description_id = None
            
            # Find any media description that points to this video file
            media_desc = db.query(MediaDescription).filter(
                MediaDescription.main_video_file_id == obj.id
            ).first()
            
            if media_desc:
                media_description_title = media_desc.episode_title
                media_description_id = media_desc.id
            
            # Create orphan report
            report_data = VideoFileReportCreate(
                video_file_id=obj.id,
                video_file_name=obj.file_name,
                video_file_url=obj.file_url or obj.external_url,
                file_size=f"{obj.file_size_bytes} bytes" if obj.file_size_bytes else None,
                duration=f"{obj.duration_seconds} seconds" if obj.duration_seconds else None,
                media_description_id=media_description_id,
                media_description_title=media_description_title,
                event="possible_orphan",
                additional_info=f"Video file object deleted but actual file preserved. Original encoding status: {obj.encoding_status}, upload status: {obj.upload_status}"
            )
            
            video_file_report.create(db=db, obj_in=report_data)
            
            # Remove the video file object
            db.delete(obj)
            db.commit()
            
        return obj

    def destroy_actual_file(
        self, db: Session, *, id: UUID
    ) -> Optional[VideoFile]:
        """
        Mark file for actual destruction and create destruction report
        """
        obj = db.query(self.model).filter(self.model.id == id).first()
        if obj:
            # Get related media description info if exists
            from app.models.media_description import MediaDescription
            media_description_title = None
            media_description_id = None
            
            # Find any media description that points to this video file
            media_desc = db.query(MediaDescription).filter(
                MediaDescription.main_video_file_id == obj.id
            ).first()
            
            if media_desc:
                media_description_title = media_desc.episode_title
                media_description_id = media_desc.id
            
            # Create destruction report
            report_data = VideoFileReportCreate(
                video_file_id=obj.id,
                video_file_name=obj.file_name,
                video_file_url=obj.file_url or obj.external_url,
                file_size=f"{obj.file_size_bytes} bytes" if obj.file_size_bytes else None,
                duration=f"{obj.duration_seconds} seconds" if obj.duration_seconds else None,
                media_description_id=media_description_id,
                media_description_title=media_description_title,
                event="file_delete",
                additional_info=f"File destruction requested. For now, this is logged only. Original encoding status: {obj.encoding_status}, upload status: {obj.upload_status}"
            )
            
            video_file_report.create(db=db, obj_in=report_data)
            
            # TODO: Implement actual file deletion logic here
            # For now, we just log the request
            
        return obj


video_file = CRUDVideoFile(VideoFile)