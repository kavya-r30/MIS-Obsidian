# backend/routers/auth.py
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db.database import get_db
from ..db.models import User
from ..core.security import verify_password, create_access_token
from ..core.audit import log_action

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.is_active == True).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user.last_login = datetime.utcnow()
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    log_action(db, user.id, "login", "user", user.id)
    db.commit()
    return LoginResponse(access_token=token, token_type="bearer", role=user.role.value, full_name=user.full_name)
