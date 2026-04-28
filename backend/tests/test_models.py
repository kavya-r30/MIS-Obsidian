from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from backend.db.database import Base
from backend.db import models  # noqa

def test_all_tables_created():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    assert "users" in tables
    assert "transactions" in tables
    assert "validation_logs" in tables
    assert "rules" in tables
    assert "master_data" in tables