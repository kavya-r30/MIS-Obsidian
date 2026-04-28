# backend/routers/exceptions.py
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..db.database import get_db
from ..db.models import Transaction, TransactionStatus, User
from ..core.dependencies import require_manager, get_current_user
from ..core.audit import log_action

router = APIRouter(prefix="/exceptions", tags=["exceptions"])


class RejectBody(BaseModel):
    reason: Optional[str] = None


@router.get("/")
def list_exceptions(db: Session = Depends(get_db), _: User = Depends(require_manager)):
    txs = db.query(Transaction).filter(Transaction.status == TransactionStatus.flagged).all()
    return [
        {
            "id":               t.id,
            "vendor_name":      t.vendor_name,
            "amount":           t.amount,
            "confidence_score": t.confidence_score,
            "department":       t.department,
            "transaction_date": t.transaction_date,
            "payment_method":   t.payment_method,
            "cost_center":      t.cost_center,
            "approval_ref":     t.approval_ref,
            "invoice_number":   t.invoice_number,
            "is_duplicate":     t.is_duplicate,
        }
        for t in txs
    ]


@router.post("/{tx_id}/approve")
def approve(tx_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.status == TransactionStatus.flagged).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Flagged transaction not found")
    tx.status = TransactionStatus.approved
    tx.reviewed_by = current_user.id
    tx.reviewed_at = datetime.utcnow()
    log_action(db, current_user.id, "approve", "transaction", tx_id)
    db.commit()
    return {"id": tx.id, "status": tx.status}


@router.post("/{tx_id}/reject")
def reject(tx_id: int, body: RejectBody, db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.status == TransactionStatus.flagged).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Flagged transaction not found")
    tx.status = TransactionStatus.rejected
    tx.reviewed_by = current_user.id
    tx.reviewed_at = datetime.utcnow()
    if body.reason:
        tx.rejection_reason = body.reason.strip()
    log_action(db, current_user.id, "reject", "transaction", tx_id, {"reason": body.reason})
    db.commit()
    return {"id": tx.id, "status": tx.status}
