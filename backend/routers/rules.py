# backend/routers/rules.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..db.database import get_db
from ..db.models import Rule, User, RuleType, ValidationSeverity
from ..core.dependencies import get_current_user, require_admin
from ..core.audit import log_action

router = APIRouter(prefix="/rules", tags=["rules"])


def _rule_dict(r: Rule) -> dict:
    return {
        "id":          r.id,
        "rule_name":   r.rule_name,
        "rule_type":   r.rule_type,
        "threshold":   r.threshold,
        "severity":    r.severity,
        "description": r.description,
        "parameters":  r.parameters,
        "is_active":   r.is_active,
        "created_at":  str(r.created_at) if r.created_at else None,
    }


class RuleCreate(BaseModel):
    rule_name:   str
    rule_type:   RuleType
    severity:    ValidationSeverity = ValidationSeverity.warning
    threshold:   Optional[float] = None
    description: str
    parameters:  Optional[str] = None


class RuleUpdate(BaseModel):
    threshold:   Optional[float] = None
    severity:    Optional[ValidationSeverity] = None
    description: Optional[str] = None
    is_active:   Optional[bool] = None
    parameters:  Optional[str] = None


@router.get("/")
def list_rules(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return [_rule_dict(r) for r in db.query(Rule).all()]


@router.post("/")
def create_rule(body: RuleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    if db.query(Rule).filter(Rule.rule_name == body.rule_name).first():
        raise HTTPException(status_code=400, detail="Rule with this name already exists")
    rule = Rule(**body.model_dump(), created_by=current_user.id)
    db.add(rule)
    db.flush()
    log_action(db, current_user.id, "create_rule", "rule", rule.id, {"rule_name": rule.rule_name})
    db.commit()
    db.refresh(rule)
    return _rule_dict(rule)


@router.patch("/{rule_id}")
def update_rule(rule_id: int, body: RuleUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(rule, k, v)
    log_action(db, current_user.id, "update_rule", "rule", rule_id, {"changes": body.model_dump(exclude_none=True)})
    db.commit()
    db.refresh(rule)
    return _rule_dict(rule)


@router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    log_action(db, current_user.id, "delete_rule", "rule", rule_id, {"rule_name": rule.rule_name})
    db.delete(rule)
    db.commit()
    return {"deleted": True}
