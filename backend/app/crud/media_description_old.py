from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from uuid import UUID, uuid4

from app.crud.base import CRUDBase
from app.models.media_description import MediaDescription
from app.models.description_report import DescriptionReport
from app.models.video_file import VideoFile
from app.schemas.media_description import MediaDescriptionCreate, MediaDescriptionUpdate


class CRUDMediaDescription(CRUDBase[MediaDescription, MediaDescriptionCreate, MediaDescriptionUpdate]):
    def get_by_file_number(self, db: Session, *, file_number: int) -> Optional[MediaDescription]:
        return db.query(MediaDescription).filter(MediaDescription.file_number == file_number).first()

    def get_by_video_file_id(self, db: Session, *, video_file_id: UUID) -> List[MediaDescription]:
        """Get media descriptions that are linked to a specific video file"""
        return db.query(MediaDescription).filter(MediaDescription.main_video_file_id == video_file_id).all()

    def get_multi_with_filters(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        media_type: Optional[str] = None,
        category_id: Optional[UUID] = None,
        status: Optional[str] = None,
        is_featured: Optional[bool] = None,
        is_premium: Optional[bool] = None
    ) -> List[MediaDescription]:
        query = db.query(self.model)
        
        if media_type:
            query = query.filter(MediaDescription.media_type == media_type)
        
        if category_id:
            query = query.filter(MediaDescription.audience_category_id == category_id)
        
        if status:
            query = query.filter(MediaDescription.content_status == status)
            
        if is_featured is not None:
            query = query.filter(MediaDescription.is_featured == is_featured)
            
        # is_premium filter temporarily disabled - field doesn't exist in current model
        # if is_premium is not None:
        #     query = query.filter(MediaDescription.is_premium_content == is_premium)
        
        return query.order_by(desc(MediaDescription.creation_date_utc)).offset(skip).limit(limit).all()

    def get_count_with_filters(
        self,
        db: Session,
        *,
        media_type: Optional[str] = None,
        category_id: Optional[UUID] = None,
        status: Optional[str] = None,
        is_featured: Optional[bool] = None,
        is_premium: Optional[bool] = None
    ) -> int:
        query = db.query(self.model)
        
        if media_type:
            query = query.filter(MediaDescription.media_type == media_type)
        
        if category_id:
            query = query.filter(MediaDescription.audience_category_id == category_id)
        
        if status:
            query = query.filter(MediaDescription.content_status == status)
            
        if is_featured is not None:
            query = query.filter(MediaDescription.is_featured == is_featured)
            
        # is_premium filter temporarily disabled - field doesn't exist in current model
        # if is_premium is not None:
        #     query = query.filter(MediaDescription.is_premium_content == is_premium)
        
        return query.count()

    def get_featured(self, db: Session, *, skip: int = 0, limit: int = 20) -> List[MediaDescription]:
        return (
            db.query(self.model)
            .filter(MediaDescription.is_featured == True)
            .filter(MediaDescription.content_status == "published")
            .order_by(desc(MediaDescription.creation_date_utc))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_trending(self, db: Session, *, skip: int = 0, limit: int = 20) -> List[MediaDescription]:
        return (
            db.query(self.model)
            .filter(MediaDescription.content_status == "published")
            .order_by(desc(MediaDescription.view_count))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def increment_view_count(self, db: Session, *, id: UUID) -> Optional[MediaDescription]:
        obj = db.query(self.model).filter(self.model.id == id).first()
        if obj:
            if obj.view_count is None:
                obj.view_count = 0
            obj.view_count += 1
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def increment_like_count(self, db: Session, *, id: UUID) -> Optional[MediaDescription]:
        obj = db.query(self.model).filter(self.model.id == id).first()
        if obj:
            if obj.like_count is None:
                obj.like_count = 0
            obj.like_count += 1
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def increment_share_count(self, db: Session, *, id: UUID) -> Optional[MediaDescription]:
        obj = db.query(self.model).filter(self.model.id == id).first()
        if obj:
            if obj.share_count is None:
                obj.share_count = 0
            obj.share_count += 1
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def create_bulk_with_reports(
        self, db: Session, *, descriptions: List[MediaDescriptionCreate]
    ) -> Tuple[List[MediaDescription], List[DescriptionReport]]:
        """Create multiple media descriptions and generate reports for each"""
        created_descriptions = []
        reports = []
        batch_id = uuid4()
        
        for desc_data in descriptions:
            # Create the media description
            db_description = MediaDescription(**desc_data.dict())
            db.add(db_description)
            db.flush()  # Get the ID without committing
            
            # Try to associate with existing file if expected_filename is provided
            success_associated_file = False
            if desc_data.expected_filename:
                # Find an unlinked video file with the expected filename
                subquery = db.query(MediaDescription.main_video_file_id).filter(
                    MediaDescription.main_video_file_id.isnot(None)
                ).subquery()
                
                video_file = db.query(VideoFile).filter(
                    VideoFile.file_name == desc_data.expected_filename,
                    ~VideoFile.id.in_(subquery)
                ).first()
                
                if video_file:
                    db_description.main_video_file_id = video_file.id
                    success_associated_file = True
            
            # Create report
            report = DescriptionReport(
                description_id=db_description.id,
                title=db_description.episode_title,
                success_associated_file=success_associated_file,
                batch_id=batch_id
            )
            db.add(report)
            
            created_descriptions.append(db_description)
            reports.append(report)
        
        db.commit()
        
        # Refresh all objects to get updated data
        for desc in created_descriptions:
            db.refresh(desc)
        for report in reports:
            db.refresh(report)
            
        return created_descriptions, reports

    def get_by_expected_filename(self, db: Session, *, expected_filename: str) -> Optional[MediaDescription]:
        """Find media description by expected filename"""
        return db.query(MediaDescription).filter(
            MediaDescription.expected_filename == expected_filename
        ).first()


media_description = CRUDMediaDescription(MediaDescription)