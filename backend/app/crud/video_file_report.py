from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.crud.base import CRUDBase
from app.models.video_file_report import VideoFileReport
from app.schemas.video_file_report import VideoFileReportCreate, VideoFileReportInDB


class CRUDVideoFileReport(CRUDBase[VideoFileReport, VideoFileReportCreate, None]):
    def get_list(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "timestamp",
        order_direction: str = "desc"
    ) -> List[VideoFileReport]:
        """
        Get list of video file reports, most recent first by default
        """
        query = db.query(self.model)
        
        # Apply ordering
        if order_direction.lower() == "desc":
            query = query.order_by(desc(getattr(self.model, order_by)))
        else:
            query = query.order_by(getattr(self.model, order_by))
        
        return query.offset(skip).limit(limit).all()
    
    def get_by_video_file_id(
        self,
        db: Session,
        *,
        video_file_id: UUID
    ) -> List[VideoFileReport]:
        """
        Get all reports for a specific video file
        """
        return db.query(self.model).filter(
            self.model.video_file_id == video_file_id
        ).order_by(desc(self.model.timestamp)).all()
    
    def get_by_event_type(
        self,
        db: Session,
        *,
        event: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[VideoFileReport]:
        """
        Get reports by event type
        """
        return db.query(self.model).filter(
            self.model.event == event
        ).order_by(desc(self.model.timestamp)).offset(skip).limit(limit).all()
    
    def count_total(self, db: Session) -> int:
        """
        Get total count of reports
        """
        return db.query(self.model).count()
    
    def count_by_event(self, db: Session, *, event: str) -> int:
        """
        Get count of reports by event type
        """
        return db.query(self.model).filter(self.model.event == event).count()


video_file_report = CRUDVideoFileReport(VideoFileReport)