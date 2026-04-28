from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db.database import get_db
from ..db.models import User
from ..core.dependencies import get_current_user
from ..agents.chat_agent import chat

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
def send_message(body: ChatRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    reply = chat(body.message, db)
    return ChatResponse(reply=reply)
