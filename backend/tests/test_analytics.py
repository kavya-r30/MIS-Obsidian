from backend.db.models import Transaction, TransactionStatus

def test_summary(client, admin_token, db, admin_user):
    db.add(Transaction(file_path="x.png", uploaded_by=admin_user.id, status=TransactionStatus.validated, confidence_score=90.0))
    db.add(Transaction(file_path="y.png", uploaded_by=admin_user.id, status=TransactionStatus.flagged, confidence_score=60.0))
    db.commit()
    res = client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    assert data["validated"] >= 1
    assert data["flagged"] >= 1

def test_department_analytics(client, admin_token, db, admin_user):
    db.add(Transaction(file_path="z.png", uploaded_by=admin_user.id, department="Engineering", confidence_score=85.0))
    db.commit()
    res = client.get("/api/analytics/department", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_trends(client, admin_token, db, admin_user):
    db.add(Transaction(file_path="t.png", uploaded_by=admin_user.id, status=TransactionStatus.validated, confidence_score=80.0))
    db.commit()
    res = client.get("/api/analytics/trends", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)
