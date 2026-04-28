# backend/routers/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..db.database import get_db
from ..db.models import User, UserRole
from ..core.dependencies import require_admin
from ..core.security import hash_password
from ..core.audit import log_action

router = APIRouter(prefix="/users", tags=["users"])


def _user_dict(u: User) -> dict:
    return {
        "id":         u.id,
        "email":      u.email,
        "full_name":  u.full_name,
        "role":       u.role,
        "is_active":  u.is_active,
        "department": u.department,
        "last_login": str(u.last_login) if u.last_login else None,
    }


class CreateUserRequest(BaseModel):
    email:      str
    password:   str
    full_name:  str
    role:       UserRole
    department: Optional[str] = None


class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None


@router.get("/")
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [_user_dict(u) for u in db.query(User).all()]


@router.post("/")
def create_user(body: CreateUserRequest, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        department=body.department,
    )
    db.add(user)
    db.flush()
    log_action(db, current_user.id, "create_user", "user", user.id, {"email": body.email, "role": body.role})
    db.commit()
    db.refresh(user)
    return _user_dict(user)


@router.patch("/{user_id}")
def update_user(user_id: int, body: UpdateUserRequest, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.is_active is not None:
        user.is_active = body.is_active
    log_action(db, current_user.id, "update_user", "user", user_id, {"is_active": body.is_active})
    db.commit()
    return _user_dict(user)
