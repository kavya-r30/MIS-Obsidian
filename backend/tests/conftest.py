import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.db.database import get_db, Base
from backend.db.models import User, UserRole
from backend.core.security import hash_password

TEST_DB_URL = "sqlite:///./test_mis.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def admin_user(db):
    user = User(email="admin@test.com", hashed_password=hash_password("password"), full_name="Test Admin", role=UserRole.admin)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def manager_user(db):
    user = User(email="manager@test.com", hashed_password=hash_password("password"), full_name="Test Manager", role=UserRole.manager)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def admin_token(client, admin_user):
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "password"})
    return res.json()["access_token"]

@pytest.fixture
def manager_token(client, manager_user):
    res = client.post("/api/auth/login", json={"email": "manager@test.com", "password": "password"})
    return res.json()["access_token"]
