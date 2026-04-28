import sys
import os


_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.database import create_tables
from backend.core.config import settings
from backend.routers import auth, users, rules, master_data, ingest, validate, transactions, exceptions, analytics, export, chat, audit_log


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    create_tables()
    try:
        from backend.db.seed import seed
        seed()
    except Exception as e:
        print(f"Seed failed: {e}")
    yield


app = FastAPI(title="MIS Transaction Validation API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(rules.router, prefix="/api")
app.include_router(master_data.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(validate.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(exceptions.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(audit_log.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
