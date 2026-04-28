# backend/routers/master_data.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..db.database import get_db
from ..db.models import MasterData, MasterDataType, User
from ..core.dependencies import get_current_user, require_admin
from ..core.audit import log_action

router = APIRouter(prefix="/master-data", tags=["master-data"])


def _entry_dict(e: MasterData) -> dict:
    return {
        "id":          e.id,
        "data_type":   e.type,
        "value":       e.value,
        "is_active":   e.is_active,
        "description": e.description,
        "created_at":  str(e.created_at) if e.created_at else None,
    }


class MasterDataCreate(BaseModel):
    data_type:   MasterDataType
    value:       str
    description: Optional[str] = None


@router.get("/")
def list_master_data(data_type: Optional[MasterDataType] = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(MasterData).filter(MasterData.is_active == True)
    if data_type:
        q = q.filter(MasterData.type == data_type)
    return [_entry_dict(e) for e in q.all()]


@router.post("/")
def create_master_data(body: MasterDataCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    entry = MasterData(type=body.data_type, value=body.value, description=body.description)
    db.add(entry)
    db.flush()
    log_action(db, current_user.id, "create_master_data", "master_data", entry.id, {"data_type": body.data_type, "value": body.value})
    db.commit()
    db.refresh(entry)
    return _entry_dict(entry)


@router.patch("/{entry_id}")
def deactivate_master_data(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    entry = db.query(MasterData).filter(MasterData.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    entry.is_active = False
    log_action(db, current_user.id, "deactivate_master_data", "master_data", entry_id, {"value": entry.value})
    db.commit()
    return {"deactivated": True}
