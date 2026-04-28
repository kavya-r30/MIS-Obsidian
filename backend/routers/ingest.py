# backend/routers/ingest.py
import os
import uuid
import shutil
import pathlib
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..db.models import Transaction, User
from ..core.dependencies import require_admin
from ..core.config import settings
from ..core.audit import log_action
from ..services.ocr import extract_text_from_file
from ..agents.parser_agent import parse_receipt
from ..agents.validator_agent import run_validation

router = APIRouter(prefix="/transactions", tags=["ingest"])


@router.post("/upload")
def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    allowed = {".pdf", ".jpg", ".jpeg", ".png"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_name = pathlib.Path(file.filename or "upload").name
    dest = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4().hex}_{safe_name}")
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    raw_text = extract_text_from_file(dest)
    tx = Transaction(
        file_path=dest,
        original_filename=file.filename,
        raw_text=raw_text,
        uploaded_by=current_user.id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    parsed = parse_receipt(raw_text, db)
    for key, val in parsed.items():
        if hasattr(tx, key):
            setattr(tx, key, val)
    db.commit()

    run_validation(tx, db)
    db.refresh(tx)

    log_action(db, current_user.id, "upload", "transaction", tx.id, {"filename": file.filename})
    db.commit()

    return {"id": tx.id, "status": tx.status, "confidence_score": tx.confidence_score}
