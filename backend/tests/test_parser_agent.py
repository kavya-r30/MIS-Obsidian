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


def test_empty_dict_includes_expense_category():
    from backend.agents.parser_agent import _EMPTY
    assert "expense_category" in _EMPTY
    assert _EMPTY["expense_category"] is None


def test_parse_receipt_includes_categories_in_prompt(monkeypatch, db):
    from backend.db.models import MasterData, MasterDataType
    db.add(MasterData(type=MasterDataType.expense_category, value="travel", is_active=True))
    db.add(MasterData(type=MasterDataType.expense_category, value="meals", is_active=True))
    db.commit()

    from backend.agents import parser_agent
    captured = {}
    class FakeAgent:
        def __init__(self):
            self._instructions = ""
        def run(self, msg):
            captured["instructions"] = self._instructions
            class R:
                content = ('{"vendor_name":null,"amount":null,"currency":null,'
                           '"transaction_date":null,"approval_date":null,'
                           '"payment_method":null,"department":null,'
                           '"cost_center":null,"approval_ref":null,'
                           '"invoice_number":null,"tax_amount":null,'
                           '"expense_category":"travel"}')
            return R()

    def fake_make(tools, instructions, description):
        a = FakeAgent()
        a._instructions = instructions
        return a

    monkeypatch.setattr(parser_agent, "make_mistral_agent", fake_make)

    out = parser_agent.parse_receipt("Travel expense receipt", db)
    assert out["expense_category"] == "travel"
    assert "travel" in captured["instructions"]
    assert "meals" in captured["instructions"]


def test_parse_receipt_drops_invalid_category(monkeypatch, db):
    """If model returns a category not in active master list, it's nullified."""
    from backend.db.models import MasterData, MasterDataType
    db.add(MasterData(type=MasterDataType.expense_category, value="travel", is_active=True))
    db.commit()

    from backend.agents import parser_agent
    class FakeAgent:
        def __init__(self):
            self._instructions = ""
        def run(self, msg):
            class R:
                content = ('{"vendor_name":null,"amount":null,"currency":null,'
                           '"transaction_date":null,"approval_date":null,'
                           '"payment_method":null,"department":null,'
                           '"cost_center":null,"approval_ref":null,'
                           '"invoice_number":null,"tax_amount":null,'
                           '"expense_category":"hallucinated_category"}')
            return R()

    def fake_make(tools, instructions, description):
        a = FakeAgent()
        a._instructions = instructions
        return a

    monkeypatch.setattr(parser_agent, "make_mistral_agent", fake_make)

    out = parser_agent.parse_receipt("Some receipt text", db)
    assert out["expense_category"] is None


def test_parse_receipt_drops_invalid_category_when_db_empty(monkeypatch, db):
    """Even with empty DB, fallback list is used to validate model output."""
    # Note: db has no expense_category MasterData rows
    from backend.agents import parser_agent
    class FakeAgent:
        def __init__(self):
            self._instructions = ""
        def run(self, msg):
            class R:
                content = ('{"vendor_name":null,"amount":null,"currency":null,'
                           '"transaction_date":null,"approval_date":null,'
                           '"payment_method":null,"department":null,'
                           '"cost_center":null,"approval_ref":null,'
                           '"invoice_number":null,"tax_amount":null,'
                           '"expense_category":"not_a_real_category"}')
            return R()

    def fake_make(tools, instructions, description):
        a = FakeAgent()
        a._instructions = instructions
        return a

    monkeypatch.setattr(parser_agent, "make_mistral_agent", fake_make)
    out = parser_agent.parse_receipt("Receipt text", db)
    assert out["expense_category"] is None  # nullified by fallback validation


def test_parse_receipt_keeps_valid_fallback_category_when_db_empty(monkeypatch, db):
    """When DB has no active categories, a valid value from the fallback list passes through."""
    from backend.agents import parser_agent
    class FakeAgent:
        def __init__(self):
            self._instructions = ""
        def run(self, msg):
            class R:
                content = ('{"vendor_name":null,"amount":null,"currency":null,'
                           '"transaction_date":null,"approval_date":null,'
                           '"payment_method":null,"department":null,'
                           '"cost_center":null,"approval_ref":null,'
                           '"invoice_number":null,"tax_amount":null,'
                           '"expense_category":"travel"}')
            return R()

    def fake_make(tools, instructions, description):
        a = FakeAgent()
        a._instructions = instructions
        return a

    monkeypatch.setattr(parser_agent, "make_mistral_agent", fake_make)
    out = parser_agent.parse_receipt("Travel receipt", db)
    assert out["expense_category"] == "travel"  # preserved


def test_parse_receipt_drops_invalid_department(monkeypatch, db):
    """Model returns a department not in active master — should be nullified."""
    from backend.db.models import MasterData, MasterDataType
    db.add(MasterData(type=MasterDataType.department, value="Engineering", is_active=True))
    db.commit()

    from backend.agents import parser_agent
    class FakeAgent:
        def __init__(self):
            self._instructions = ""
        def run(self, msg):
            class R:
                content = ('{"vendor_name":null,"amount":null,"currency":null,'
                           '"transaction_date":null,"approval_date":null,'
                           '"payment_method":null,"department":"FakeDepartment",'
                           '"cost_center":null,"approval_ref":null,'
                           '"invoice_number":null,"tax_amount":null,'
                           '"expense_category":null}')
            return R()

    def fake_make(tools, instructions, description):
        a = FakeAgent()
        a._instructions = instructions
        return a

    monkeypatch.setattr(parser_agent, "make_mistral_agent", fake_make)
    out = parser_agent.parse_receipt("Some receipt", db)
    assert out["department"] is None


def test_parse_receipt_keeps_valid_department(monkeypatch, db):
    """Model returns a department from the active master — should pass through."""
    from backend.db.models import MasterData, MasterDataType
    db.add(MasterData(type=MasterDataType.department, value="Engineering", is_active=True))
    db.commit()

    from backend.agents import parser_agent
    class FakeAgent:
        def __init__(self):
            self._instructions = ""
        def run(self, msg):
            class R:
                content = ('{"vendor_name":null,"amount":null,"currency":null,'
                           '"transaction_date":null,"approval_date":null,'
                           '"payment_method":null,"department":"Engineering",'
                           '"cost_center":null,"approval_ref":null,'
                           '"invoice_number":null,"tax_amount":null,'
                           '"expense_category":null}')
            return R()

    def fake_make(tools, instructions, description):
        a = FakeAgent()
        a._instructions = instructions
        return a

    monkeypatch.setattr(parser_agent, "make_mistral_agent", fake_make)
    out = parser_agent.parse_receipt("Receipt", db)
    assert out["department"] == "Engineering"


def test_parse_receipt_includes_departments_in_prompt(monkeypatch, db):
    """The active department list should be embedded in the agent's instructions."""
    from backend.db.models import MasterData, MasterDataType
    db.add(MasterData(type=MasterDataType.department, value="Engineering", is_active=True))
    db.add(MasterData(type=MasterDataType.department, value="Finance", is_active=True))
    db.commit()

    from backend.agents import parser_agent
    captured = {}
    class FakeAgent:
        def __init__(self):
            self._instructions = ""
        def run(self, msg):
            captured["instructions"] = self._instructions
            class R:
                content = ('{"vendor_name":null,"amount":null,"currency":null,'
                           '"transaction_date":null,"approval_date":null,'
                           '"payment_method":null,"department":null,'
                           '"cost_center":null,"approval_ref":null,'
                           '"invoice_number":null,"tax_amount":null,'
                           '"expense_category":null}')
            return R()

    def fake_make(tools, instructions, description):
        a = FakeAgent()
        a._instructions = instructions
        return a

    monkeypatch.setattr(parser_agent, "make_mistral_agent", fake_make)
    parser_agent.parse_receipt("Receipt", db)
    assert "Engineering" in captured["instructions"]
    assert "Finance" in captured["instructions"]
    assert "Allowed department values" in captured["instructions"]
