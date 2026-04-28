from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db.database import get_db
from ..db.models import Transaction, TransactionStatus, User
from ..core.dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/summary")
def summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total     = db.query(Transaction).count()
    pending   = db.query(Transaction).filter(Transaction.status == TransactionStatus.pending).count()
    validated = db.query(Transaction).filter(Transaction.status == TransactionStatus.validated).count()
    flagged   = db.query(Transaction).filter(Transaction.status == TransactionStatus.flagged).count()
    rejected  = db.query(Transaction).filter(Transaction.status == TransactionStatus.rejected).count()
    approved  = db.query(Transaction).filter(Transaction.status == TransactionStatus.approved).count()
    avg_score = db.query(func.avg(Transaction.confidence_score)).scalar() or 0.0
    return {
        "total": total,
        "pending": pending,
        "validated": validated,
        "flagged": flagged,
        "rejected": rejected,
        "approved": approved,
        "avg_confidence_score": round(float(avg_score), 2),
    }

@router.get("/department")
def by_department(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(
        Transaction.department,
        func.count(Transaction.id),
        func.avg(Transaction.confidence_score)
    ).group_by(Transaction.department).all()
    return [{"department": r[0] or "Unknown", "count": r[1], "avg_score": round(float(r[2] or 0), 2)} for r in rows]

@router.get("/trends")
def trends(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    # Group by transaction_date (when the spend occurred), not upload_date
    rows = db.query(
        Transaction.transaction_date,
        Transaction.status,
        func.count(Transaction.id)
    ).filter(
        Transaction.transaction_date.isnot(None)
    ).group_by(
        Transaction.transaction_date, Transaction.status
    ).order_by(Transaction.transaction_date).all()
    return [{"date": str(r[0]), "status": r[1], "count": r[2]} for r in rows]

@router.get("/spend")
def spend_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    for d_str in (start_date, end_date):
        if d_str:
            try:
                datetime.strptime(d_str, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=422, detail=f"Invalid date format '{d_str}'. Use YYYY-MM-DD.")

    department = department.strip() if department and department.strip() else None

    def _base(q):
        """Apply common filters to any query — now on transaction_date."""
        q = q.filter(Transaction.amount.isnot(None))
        if start_date:
            q = q.filter(Transaction.transaction_date >= start_date)
        if end_date:
            q = q.filter(Transaction.transaction_date <= end_date)
        if department:
            q = q.filter(Transaction.department == department)
        return q

    total = round(float(_base(db.query(func.sum(Transaction.amount))).scalar() or 0.0), 2)

    dept_rows = _base(
        db.query(Transaction.department, func.sum(Transaction.amount), func.count(Transaction.id))
    ).group_by(Transaction.department).order_by(func.sum(Transaction.amount).desc()).all()
    by_department = [{"department": r[0] or "Unknown", "amount": round(float(r[1] or 0), 2), "count": r[2]} for r in dept_rows]

    vendor_rows = _base(
        db.query(Transaction.vendor_name, func.sum(Transaction.amount), func.count(Transaction.id))
    ).group_by(Transaction.vendor_name).order_by(func.sum(Transaction.amount).desc()).all()
    by_vendor = [{"vendor_name": r[0] or "Unknown", "amount": round(float(r[1] or 0), 2), "count": r[2]} for r in vendor_rows]

    period_rows = _base(
        db.query(Transaction.transaction_date, func.sum(Transaction.amount))
    ).filter(Transaction.transaction_date.isnot(None)).group_by(Transaction.transaction_date).order_by(Transaction.transaction_date).all()
    by_period = [{"date": str(r[0]), "amount": round(float(r[1] or 0), 2)} for r in period_rows]

    return {"total_spend": total, "by_department": by_department, "by_vendor": by_vendor, "by_period": by_period}


@router.get("/pipeline")
def pipeline_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    statuses = ["pending", "validated", "flagged", "approved", "rejected"]
    counts = {}
    for s in statuses:
        counts[s] = db.query(func.count(Transaction.id)).filter(
            Transaction.status == TransactionStatus[s]
        ).scalar() or 0

    total = sum(counts.values())

    def pct(n):
        return round((n / total) * 100, 1) if total > 0 else 0.0

    decided = counts["approved"] + counts["rejected"]
    approval_rate = round((counts["approved"] / decided) * 100, 1) if decided > 0 else 0.0
    flag_rate = pct(counts["flagged"])

    return {
        "pending":   {"count": counts["pending"],   "pct": pct(counts["pending"])},
        "validated": {"count": counts["validated"], "pct": pct(counts["validated"])},
        "flagged":   {"count": counts["flagged"],   "pct": pct(counts["flagged"])},
        "approved":  {"count": counts["approved"],  "pct": pct(counts["approved"])},
        "rejected":  {"count": counts["rejected"],  "pct": pct(counts["rejected"])},
        "total": total,
        "approval_rate": approval_rate,
        "flag_rate": flag_rate,
    }


@router.get("/top-vendors")
def top_vendors(
    limit: int = 10,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Validate dates if provided
    for d_str in (start_date, end_date):
        if d_str:
            try:
                datetime.strptime(d_str, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=422, detail=f"Invalid date format '{d_str}'. Use YYYY-MM-DD.")

    q = (
        db.query(
            Transaction.vendor_name,
            func.sum(Transaction.amount).label("total_amount"),
            func.count(Transaction.id).label("transaction_count"),
            func.avg(Transaction.confidence_score).label("avg_confidence_score"),
        )
        .filter(Transaction.amount.isnot(None))
    )
    if start_date:
        q = q.filter(Transaction.transaction_date >= start_date)
    if end_date:
        q = q.filter(Transaction.transaction_date <= end_date)

    rows = (
        q.group_by(Transaction.vendor_name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "vendor_name": r.vendor_name or "Unknown",
            "total_amount": round(float(r.total_amount or 0), 2),
            "transaction_count": r.transaction_count,
            "avg_confidence_score": round(float(r.avg_confidence_score or 0), 2),
        }
        for r in rows
    ]
