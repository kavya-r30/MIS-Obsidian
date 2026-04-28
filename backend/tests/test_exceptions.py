from backend.db.models import Transaction, TransactionStatus

def make_flagged_tx(db, user_id):
    tx = Transaction(
        file_path="x.png", vendor_name="Acme", amount=100.0,
        uploaded_by=user_id, status=TransactionStatus.flagged
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

def test_list_exceptions_manager(client, manager_token, db, manager_user):
    make_flagged_tx(db, manager_user.id)
    res = client.get("/api/exceptions/", headers={"Authorization": f"Bearer {manager_token}"})
    assert res.status_code == 200
    assert len(res.json()) >= 1

def test_approve_exception(client, manager_token, db, manager_user):
    tx = make_flagged_tx(db, manager_user.id)
    res = client.post(f"/api/exceptions/{tx.id}/approve", headers={"Authorization": f"Bearer {manager_token}"})
    assert res.status_code == 200
    assert res.json()["status"] == "approved"

def test_reject_exception(client, manager_token, db, manager_user):
    tx = make_flagged_tx(db, manager_user.id)
    res = client.post(
        f"/api/exceptions/{tx.id}/reject",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"reason": "duplicate submission"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "rejected"
