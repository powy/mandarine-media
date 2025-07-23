from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID

from app.crud.base import CRUDBase
from app.models.description_report import DescriptionReport
from app.schemas.description_report import DescriptionReportCreate, DescriptionReportBase


class CRUDDescriptionReport(CRUDBase[DescriptionReport, DescriptionReportCreate, DescriptionReportBase]):
    def get_by_batch_id(self, db: Session, *, batch_id: UUID) -> List[DescriptionReport]:
        """Get all reports for a specific batch"""
        return (
            db.query(DescriptionReport)
            .filter(DescriptionReport.batch_id == batch_id)
            .order_by(desc(DescriptionReport.timestamp))
            .all()
        )
    
    def get_by_description_id(self, db: Session, *, description_id: UUID) -> List[DescriptionReport]:
        """Get all reports for a specific description"""
        return (
            db.query(DescriptionReport)
            .filter(DescriptionReport.description_id == description_id)
            .order_by(desc(DescriptionReport.timestamp))
            .all()
        )
    
    def get_multi_ordered(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[DescriptionReport]:
        """Get reports ordered by timestamp (latest first)"""
        return (
            db.query(self.model)
            .order_by(desc(DescriptionReport.timestamp))
            .offset(skip)
            .limit(limit)
            .all()
        )


description_report = CRUDDescriptionReport(DescriptionReport)