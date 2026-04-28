# backend/routers/budgets.py
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from ..db.database import get_db
from ..db.models import Budget, User, Transaction, TransactionStatus
from ..core.dependencies import get_current_user, require_admin, require_manager
from ..core.audit import log_action
from ..core.fiscal import fiscal_period, fy_start_iso, fy_end_iso

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _budget_dict(b: Budget) -> dict:
    return {
        "id":          b.id,
        "department":  b.department,
        "fiscal_year": b.fiscal_year,
        "quarter":     b.quarter,
        "amount":      b.amount,
        "created_at":  str(b.created_at) if b.created_at else None,
    }


class BudgetCreate(BaseModel):
    department:  str
    fiscal_year: str
    quarter:     str
    amount:      float


class BudgetUpdate(BaseModel):
    amount: Optional[float] = None


@router.get("/")
def list_budgets(
    department: Optional[str] = None,
    fiscal_year: Optional[str] = None,
    quarter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Budget)
    if department:  q = q.filter(Budget.department == department)
    if fiscal_year: q = q.filter(Budget.fiscal_year == fiscal_year)
    if quarter:     q = q.filter(Budget.quarter == quarter)
    return [_budget_dict(b) for b in q.all()]


@router.post("/")
def create_budget(
    body: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    b = Budget(**body.model_dump(), created_by=current_user.id)
    db.add(b)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Budget already exists for this department/period")
    log_action(db, current_user.id, "create_budget", "budget", b.id, body.model_dump())
    db.commit()
    db.refresh(b)
    return _budget_dict(b)


@router.patch("/{budget_id}")
def update_budget(
    budget_id: int,
    body: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    b = db.query(Budget).filter(Budget.id == budget_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")
    if body.amount is None:
        raise HTTPException(status_code=422, detail="amount is required for update")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(b, k, v)
    log_action(db, current_user.id, "update_budget", "budget", budget_id, body.model_dump(exclude_none=True))
    db.commit()
    db.refresh(b)
    return _budget_dict(b)


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    b = db.query(Budget).filter(Budget.id == budget_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")
    log_action(db, current_user.id, "delete_budget", "budget", budget_id, {})
    db.delete(b)
    db.commit()
    return {"deleted": True}


def _status_for_pct(pct: float) -> str:
    if pct > 100:
        return "over"
    if pct >= 80:
        return "warning"
    return "under"


@router.get("/variance")
def get_variance(
    fiscal_year: Optional[str] = None,
    quarter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not fiscal_year or not quarter:
        fy, q = fiscal_period(date.today())
        fiscal_year = fiscal_year or fy
        quarter = quarter or q

    start = fy_start_iso(fiscal_year, quarter)
    end = fy_end_iso(fiscal_year, quarter)

    budgets = db.query(Budget).filter_by(fiscal_year=fiscal_year, quarter=quarter).all()

    spend_rows = db.query(
        Transaction.department,
        func.coalesce(func.sum(Transaction.amount), 0.0).label("spent"),
    ).filter(
        Transaction.department.isnot(None),
        Transaction.amount.isnot(None),
        Transaction.transaction_date >= start,
        Transaction.transaction_date <= end,
        Transaction.status.in_([
            TransactionStatus.validated,
            TransactionStatus.flagged,
            TransactionStatus.approved,
        ]),
    ).group_by(Transaction.department).all()

    spend_by_dept = {row.department: row.spent for row in spend_rows}
    departments = set(b.department for b in budgets) | set(spend_by_dept.keys())

    out = []
    for dept in sorted(departments):
        budget_row = next((b for b in budgets if b.department == dept), None)
        budgeted = budget_row.amount if budget_row else 0.0
        spent = spend_by_dept.get(dept, 0.0)
        remaining = budgeted - spent
        pct = (spent / budgeted * 100) if budgeted > 0 else (100.0 if spent > 0 else 0.0)
        out.append({
            "department":  dept,
            "fiscal_year": fiscal_year,
            "quarter":     quarter,
            "budgeted":    budgeted,
            "spent":       spent,
            "remaining":   remaining,
            "pct_used":    round(pct, 1),
            "status":      _status_for_pct(pct),
        })
    return out
