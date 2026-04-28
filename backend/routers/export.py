from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from ..db.database import get_db
from ..db.models import User
from ..core.dependencies import get_current_user
from ..agents.report_agent import generate_report_excel, generate_report_pdf

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/excel")
def export_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    data = generate_report_excel(db, start_date, end_date, department)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=mis_report.xlsx"}
    )

@router.get("/pdf")
def export_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    data = generate_report_pdf(db, start_date, end_date, department)
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=mis_report.pdf"}
    )
