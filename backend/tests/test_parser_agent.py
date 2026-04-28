from unittest.mock import patch, MagicMock
from backend.agents.parser_agent import parse_receipt

def make_mock_db():
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = []
    return mock_db

def test_parse_receipt_returns_dict():
    mock_response = MagicMock()
    mock_response.content = '{"vendor_name": "Acme Corp", "amount": 500.0, "currency": "USD", "transaction_date": "2024-01-15", "approval_date": "2024-01-14", "payment_method": "card", "department": "Engineering", "cost_center": "CC001", "approval_ref": "REF001"}'

    with patch("backend.agents.parser_agent.make_mistral_agent") as mock_make:
        mock_agent = MagicMock()
        mock_agent.run.return_value = mock_response
        mock_make.return_value = mock_agent
        result = parse_receipt("Invoice from Acme Corp for $500", make_mock_db())

    assert result["vendor_name"] == "Acme Corp"
    assert result["amount"] == 500.0

def test_parse_receipt_handles_bad_json():
    mock_response = MagicMock()
    mock_response.content = "I cannot parse this receipt."

    with patch("backend.agents.parser_agent.make_mistral_agent") as mock_make:
        mock_agent = MagicMock()
        mock_agent.run.return_value = mock_response
        mock_make.return_value = mock_agent
        result = parse_receipt("bad text", make_mock_db())

    assert result["vendor_name"] is None
    assert result["amount"] is None
