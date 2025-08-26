from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=schemas.VideoFileReportList)
def get_video_file_reports(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    event: str = Query(None, description="Filter by event type"),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve video file reports.
    Most recent reports first.
    """
    if event:
        reports = crud.video_file_report.get_by_event_type(
            db=db, event=event, skip=skip, limit=limit
        )
        total = crud.video_file_report.count_by_event(db=db, event=event)
    else:
        reports = crud.video_file_report.get_list(
            db=db, skip=skip, limit=limit
        )
        total = crud.video_file_report.count_total(db=db)
    
    return schemas.VideoFileReportList(
        data=reports,
        pagination={
            "skip": skip,
            "limit": limit,
            "total": total,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


@router.get("/{report_id}", response_model=schemas.VideoFileReport)
def get_video_file_report(
    *,
    db: Session = Depends(deps.get_db),
    report_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get video file report by ID.
    """
    report = crud.video_file_report.get(db=db, id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Video file report not found")
    return report


@router.get("/video-file/{video_file_id}", response_model=List[schemas.VideoFileReport])
def get_reports_by_video_file(
    *,
    db: Session = Depends(deps.get_db),
    video_file_id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all reports for a specific video file.
    """
    reports = crud.video_file_report.get_by_video_file_id(
        db=db, video_file_id=video_file_id
    )
    return reports