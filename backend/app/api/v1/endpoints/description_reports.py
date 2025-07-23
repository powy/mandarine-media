from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.models.description_report import DescriptionReport

router = APIRouter()


@router.get("", response_model=schemas.description_report.DescriptionReportList)
def read_description_reports(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Retrieve description reports. Admin only.
    Reports are sorted by timestamp (latest first).
    """
    reports = crud.description_report.get_multi_ordered(db=db, skip=skip, limit=limit)
    total = db.query(DescriptionReport).count()
    total_pages = (total + limit - 1) // limit
    
    return {
        "data": reports,
        "pagination": {
            "page": (skip // limit) + 1,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        }
    }


@router.get("/{id}", response_model=schemas.description_report.DescriptionReport)
def read_description_report(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get description report by ID. Admin only.
    """
    report = crud.description_report.get(db=db, id=id)
    if not report:
        raise HTTPException(status_code=404, detail="Description report not found")
    return report


@router.get("/batch/{batch_id}", response_model=List[schemas.description_report.DescriptionReport])
def read_reports_by_batch(
    *,
    db: Session = Depends(deps.get_db),
    batch_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get all reports for a specific batch ID. Admin only.
    """
    reports = crud.description_report.get_by_batch_id(db=db, batch_id=batch_id)
    return reports


@router.get("/description/{description_id}", response_model=List[schemas.description_report.DescriptionReport])
def read_reports_by_description(
    *,
    db: Session = Depends(deps.get_db),
    description_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get all reports for a specific media description ID. Admin only.
    """
    reports = crud.description_report.get_by_description_id(db=db, description_id=description_id)
    return reports