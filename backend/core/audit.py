# backend/core/audit.py
import json
from sqlalchemy.orm import Session
from ..db.models import AuditLog


def log_action(
    db: Session,
    user_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: dict | None = None,
) -> None:
    """Append an audit entry. Caller is responsible for db.commit()."""
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=json.dumps(details) if details else None,
    ))
