import pytest
from sqlalchemy.exc import IntegrityError
from backend.db.models import Budget


def test_create_budget_row(db):
    b = Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=5000000)
    db.add(b)
    db.commit()
    db.refresh(b)
    assert b.id is not None
    assert b.amount == 5000000


def test_budget_unique_constraint(db):
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=5000000))
    db.commit()
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=9999))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_budget_allows_same_dept_different_quarter(db):
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=1))
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q2", amount=2))
    db.commit()
    rows = db.query(Budget).filter_by(department="Engineering").all()
    assert len(rows) == 2


def test_list_budgets_requires_auth(client):
    res = client.get("/api/budgets/")
    assert res.status_code in (401, 403)


def test_create_budget_admin(client, admin_token):
    res = client.post("/api/budgets/",
        json={"department": "Engineering", "fiscal_year": "2026-27", "quarter": "Q1", "amount": 5000000},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["amount"] == 5000000


def test_create_budget_manager_allowed(client, manager_token):
    res = client.post("/api/budgets/",
        json={"department": "Finance", "fiscal_year": "2026-27", "quarter": "Q1", "amount": 1000000},
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert res.status_code == 200


def test_create_budget_user_forbidden(client, db):
    from backend.db.models import User, UserRole
    from backend.core.security import hash_password
    user = User(email="u@test.com", hashed_password=hash_password("pw"), full_name="U", role=UserRole.user)
    db.add(user); db.commit()
    login = client.post("/api/auth/login", json={"email": "u@test.com", "password": "pw"})
    token = login.json()["access_token"]
    res = client.post("/api/budgets/",
        json={"department": "Engineering", "fiscal_year": "2026-27", "quarter": "Q1", "amount": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_create_budget_duplicate_returns_409(client, admin_token):
    body = {"department": "Engineering", "fiscal_year": "2026-27", "quarter": "Q1", "amount": 1}
    h = {"Authorization": f"Bearer {admin_token}"}
    client.post("/api/budgets/", json=body, headers=h)
    res = client.post("/api/budgets/", json=body, headers=h)
    assert res.status_code == 409


def test_update_budget_amount(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    create = client.post("/api/budgets/",
        json={"department": "Engineering", "fiscal_year": "2026-27", "quarter": "Q1", "amount": 1},
        headers=h,
    )
    bid = create.json()["id"]
    res = client.patch(f"/api/budgets/{bid}", json={"amount": 99}, headers=h)
    assert res.status_code == 200
    assert res.json()["amount"] == 99


def test_delete_budget_admin(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    create = client.post("/api/budgets/",
        json={"department": "Engineering", "fiscal_year": "2026-27", "quarter": "Q1", "amount": 1},
        headers=h,
    )
    bid = create.json()["id"]
    res = client.delete(f"/api/budgets/{bid}", headers=h)
    assert res.status_code == 200


def test_variance_empty_when_no_budgets(client, admin_token):
    res = client.get("/api/budgets/variance", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json() == []


def test_variance_under_status(client, admin_token, db):
    from backend.db.models import Budget, Transaction, TransactionStatus, User
    user = db.query(User).first()
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=1000000))
    db.add(Transaction(file_path="x", department="Engineering", amount=500000,
                       transaction_date="2026-05-15", uploaded_by=user.id,
                       status=TransactionStatus.validated))
    db.commit()
    res = client.get("/api/budgets/variance?fiscal_year=2026-27&quarter=Q1",
                     headers={"Authorization": f"Bearer {admin_token}"})
    data = res.json()
    eng = next(d for d in data if d["department"] == "Engineering")
    assert eng["budgeted"] == 1000000
    assert eng["spent"] == 500000
    assert eng["remaining"] == 500000
    assert eng["status"] == "under"
    assert 49.0 < eng["pct_used"] < 51.0


def test_variance_warning_status(client, admin_token, db):
    from backend.db.models import Budget, Transaction, TransactionStatus, User
    user = db.query(User).first()
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=1000000))
    db.add(Transaction(file_path="x", department="Engineering", amount=850000,
                       transaction_date="2026-05-15", uploaded_by=user.id,
                       status=TransactionStatus.validated))
    db.commit()
    res = client.get("/api/budgets/variance?fiscal_year=2026-27&quarter=Q1",
                     headers={"Authorization": f"Bearer {admin_token}"})
    eng = next(d for d in res.json() if d["department"] == "Engineering")
    assert eng["status"] == "warning"


def test_variance_over_status(client, admin_token, db):
    from backend.db.models import Budget, Transaction, TransactionStatus, User
    user = db.query(User).first()
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=1000000))
    db.add(Transaction(file_path="x", department="Engineering", amount=1200000,
                       transaction_date="2026-05-15", uploaded_by=user.id,
                       status=TransactionStatus.flagged))
    db.commit()
    res = client.get("/api/budgets/variance?fiscal_year=2026-27&quarter=Q1",
                     headers={"Authorization": f"Bearer {admin_token}"})
    eng = next(d for d in res.json() if d["department"] == "Engineering")
    assert eng["status"] == "over"
    assert eng["remaining"] < 0


def test_variance_excludes_rejected_and_pending(client, admin_token, db):
    from backend.db.models import Budget, Transaction, TransactionStatus, User
    user = db.query(User).first()
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=1000000))
    db.add(Transaction(file_path="x", department="Engineering", amount=500000,
                       transaction_date="2026-05-15", uploaded_by=user.id,
                       status=TransactionStatus.rejected))
    db.add(Transaction(file_path="y", department="Engineering", amount=300000,
                       transaction_date="2026-05-16", uploaded_by=user.id,
                       status=TransactionStatus.pending))
    db.commit()
    res = client.get("/api/budgets/variance?fiscal_year=2026-27&quarter=Q1",
                     headers={"Authorization": f"Bearer {admin_token}"})
    eng = next(d for d in res.json() if d["department"] == "Engineering")
    assert eng["spent"] == 0
