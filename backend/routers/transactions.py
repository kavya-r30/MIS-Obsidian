# backend/routers/transactions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from ..db.database import get_db
from ..db.models import Transaction, ValidationLog, User
from ..core.dependencies import get_current_user, require_admin
from ..core.audit import log_action
from ..agents.validator_agent import run_validation


class ManualTransactionCreate(BaseModel):
    vendor_name:      str
    amount:           float
    tax_amount:       Optional[float] = None
    currency:         Optional[str] = "INR"
    transaction_date: str
    approval_date:    Optional[str] = None
    department:       str
    cost_center:      Optional[str] = None
    payment_method:   Optional[str] = None
    invoice_number:   Optional[str] = None
    approval_ref:     Optional[str] = None
    expense_category: Optional[str] = None

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _tx_dict(tx: Transaction) -> dict:
    return {
        "id":                 tx.id,
        "vendor_name":        tx.vendor_name,
        "amount":             tx.amount,
        "tax_amount":         tx.tax_amount,
        "currency":           tx.currency,
        "transaction_date":   tx.transaction_date,
        "approval_date":      tx.approval_date,
        "department":         tx.department,
        "cost_center":        tx.cost_center,
        "payment_method":     tx.payment_method,
        "approval_ref":       tx.approval_ref,
        "invoice_number":     tx.invoice_number,
        "original_filename":  tx.original_filename,
        "confidence_score":   tx.confidence_score,
        "status":             tx.status,
        "is_duplicate":       tx.is_duplicate,
        "revalidation_count": tx.revalidation_count,
        "upload_date":        str(tx.upload_date),
        "expense_category":   tx.expense_category,
    }


@router.get("/")
def list_transactions(
    status:           Optional[str] = None,
    department:       Optional[str] = None,
    start_date:       Optional[str] = None,
    end_date:         Optional[str] = None,
    expense_category: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Transaction)
    if status:
        q = q.filter(Transaction.status == status)
    if department:
        q = q.filter(Transaction.department == department)
    if start_date:
        q = q.filter(Transaction.transaction_date >= start_date)
    if end_date:
        q = q.filter(Transaction.transaction_date <= end_date)
    if expense_category:
        q = q.filter(Transaction.expense_category == expense_category)
    total = q.count()
    items = q.order_by(Transaction.upload_date.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [_tx_dict(t) for t in items]}


@router.post("/")
def create_transaction_manual(
    body: ManualTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually create a transaction entry and immediately run validation."""
    tx = Transaction(
        file_path="manual",
        original_filename=None,
        vendor_name=body.vendor_name.strip(),
        amount=body.amount,
        tax_amount=body.tax_amount,
        currency=body.currency,
        transaction_date=body.transaction_date,
        approval_date=body.approval_date,
        department=body.department.strip(),
        cost_center=body.cost_center.strip() if body.cost_center else None,
        payment_method=body.payment_method.strip() if body.payment_method else None,
        invoice_number=body.invoice_number.strip() if body.invoice_number else None,
        approval_ref=body.approval_ref.strip() if body.approval_ref else None,
        expense_category=body.expense_category,
        uploaded_by=current_user.id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    # Run validation immediately so the entry has a confidence score and status
    run_validation(tx, db)
    log_action(db, current_user.id, "create_manual", "transaction", tx.id, {
        "vendor": body.vendor_name, "amount": body.amount, "department": body.department
    })
    db.commit()
    return _tx_dict(tx)


@router.get("/{tx_id}")
def get_transaction(tx_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Not found")
    # Resolve reviewer name from users table
    reviewed_by_name = None
    if tx.reviewed_by:
        reviewer = db.query(User).filter(User.id == tx.reviewed_by).first()
        reviewed_by_name = reviewer.full_name if reviewer else None
    logs = db.query(ValidationLog).filter(ValidationLog.transaction_id == tx_id).all()
    return {
        **_tx_dict(tx),
        "rejection_reason":  tx.rejection_reason,
        "reviewed_by_name":  reviewed_by_name,
        "reviewed_at":       str(tx.reviewed_at) if tx.reviewed_at else None,
        "raw_text":          tx.raw_text,
        "validation_logs": [
            {"rule_name": l.rule_name, "passed": l.passed, "severity": l.severity, "message": l.message}
            for l in logs
        ],
    }


@router.delete("/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    log_action(db, current_user.id, "delete_transaction", "transaction", tx_id)
    db.delete(tx)
    db.commit()
    return {"deleted": True}
