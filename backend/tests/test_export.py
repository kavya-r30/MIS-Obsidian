from unittest.mock import patch, MagicMock
from backend.db.models import Transaction, TransactionStatus

def test_export_excel(client, admin_token, db, admin_user):
    db.add(Transaction(file_path="x.png", uploaded_by=admin_user.id, vendor_name="Acme", amount=100.0, status=TransactionStatus.validated, confidence_score=90.0))
    db.commit()
    res = client.get("/api/export/excel", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "spreadsheetml" in res.headers["content-type"]

def test_export_pdf_mocked(client, admin_token, db, admin_user):
    db.add(Transaction(file_path="x.png", uploaded_by=admin_user.id, vendor_name="Acme", amount=100.0, status=TransactionStatus.validated, confidence_score=90.0))
    db.commit()
    with patch("backend.agents.report_agent.make_mistral_agent") as mock_make:
        mock_agent = MagicMock()
        mock_agent.run.return_value.content = "Data quality is strong with high validation rates."
        mock_make.return_value = mock_agent
        res = client.get("/api/export/pdf", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
