from backend.db.models import Transaction, User, UserRole, TransactionStatus
from backend.core.security import hash_password

def make_tx(db, user_id):
    tx = Transaction(file_path="x.png", vendor_name="Acme", amount=100.0, uploaded_by=user_id)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

def test_list_transactions(client, admin_token, db, admin_user):
    make_tx(db, admin_user.id)
    res = client.get("/api/transactions/", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["total"] >= 1

def test_get_transaction(client, admin_token, db, admin_user):
    tx = make_tx(db, admin_user.id)
    res = client.get(f"/api/transactions/{tx.id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["id"] == tx.id

def test_get_transaction_not_found(client, admin_token):
    res = client.get("/api/transactions/9999", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 404


def test_create_transaction_with_expense_category(client, admin_token):
    res = client.post("/api/transactions/",
        json={
            "vendor_name": "Acme", "amount": 100, "transaction_date": "2026-05-15",
            "department": "Engineering", "cost_center": "CC001",
            "expense_category": "travel",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["expense_category"] == "travel"


def test_filter_transactions_by_category(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    client.post("/api/transactions/",
        json={"vendor_name": "A", "amount": 1, "transaction_date": "2026-05-15",
              "department": "Engineering", "cost_center": "CC001", "expense_category": "travel"},
        headers=h)
    client.post("/api/transactions/",
        json={"vendor_name": "B", "amount": 2, "transaction_date": "2026-05-15",
              "department": "Engineering", "cost_center": "CC001", "expense_category": "meals"},
        headers=h)
    res = client.get("/api/transactions/?expense_category=travel", headers=h)
    items = res.json()["items"]
    assert len(items) >= 1
    assert all(it["expense_category"] == "travel" for it in items)
