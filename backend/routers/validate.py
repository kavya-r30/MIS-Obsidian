# backend/routers/validate.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..db.models import Transaction, User
from ..core.dependencies import require_admin
from ..core.audit import log_action
from ..agents.validator_agent import run_validation

router = APIRouter(prefix="/transactions", tags=["validate"])


@router.post("/{tx_id}/validate")
def revalidate(tx_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    score = run_validation(tx, db)
    log_action(db, current_user.id, "revalidate", "transaction", tx_id)
    db.commit()
    return {"id": tx.id, "status": tx.status, "confidence_score": score}
