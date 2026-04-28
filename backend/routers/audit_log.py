# backend/routers/audit_log.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..db.database import get_db
from ..db.models import AuditLog
from ..core.dependencies import require_admin

router = APIRouter(prefix="/audit-log", tags=["audit-log"])


@router.get("/")
def list_audit_log(
    action:      Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id:   Optional[int] = None,
    skip:  int = Query(default=0,  ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        q = q.filter(AuditLog.entity_id == entity_id)
    total = q.count()
    items = q.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id":          e.id,
                "user_id":     e.user_id,
                "action":      e.action,
                "entity_type": e.entity_type,
                "entity_id":   e.entity_id,
                "details":     e.details,
                "timestamp":   e.timestamp.isoformat(),
            }
            for e in items
        ],
    }
