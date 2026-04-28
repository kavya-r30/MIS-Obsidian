from backend.db.models import Transaction, Rule, MasterData, TransactionStatus, MasterDataType, UserRole, User, RuleType, ValidationLog, Budget
from backend.core.security import hash_password
from backend.agents.validator_agent import run_validation

def setup_base(db):
    user = User(email="a@test.com", hashed_password=hash_password("x"), full_name="A", role=UserRole.admin)
    db.add(user)
    db.flush()
    db.add(Rule(rule_name="missing_required_fields", rule_type=RuleType.missing_required_fields, description="Required fields", is_active=True))
    db.add(Rule(rule_name="vendor_not_in_master", rule_type=RuleType.vendor_not_in_master, description="Vendor check", is_active=True))
    db.add(Rule(rule_name="cost_center_not_in_master", rule_type=RuleType.cost_center_not_in_master, description="Cost center check", is_active=True))
    db.add(Rule(rule_name="department_not_in_master", rule_type=RuleType.department_not_in_master, description="Department check", is_active=True))
    db.add(MasterData(type=MasterDataType.vendor, value="Acme Corp", is_active=True))
    db.add(MasterData(type=MasterDataType.cost_center, value="CC001", is_active=True))
    db.add(MasterData(type=MasterDataType.department, value="Engineering", is_active=True))
    db.flush()
    return user

def test_valid_transaction_scores_high(db):
    user = setup_base(db)
    tx = Transaction(
        file_path="x.png", vendor_name="Acme Corp", amount=100.0, currency="USD",
        transaction_date="2024-01-15", department="Engineering", cost_center="CC001",
        uploaded_by=user.id
    )
    db.add(tx)
    db.commit()
    score = run_validation(tx, db)
    assert score >= 80
    assert tx.status == TransactionStatus.validated

def test_missing_fields_lowers_score(db):
    user = setup_base(db)
    tx = Transaction(file_path="x.png", uploaded_by=user.id)
    db.add(tx)
    db.commit()
    score = run_validation(tx, db)
    assert score < 80

def test_unknown_vendor_flags_transaction(db):
    user = setup_base(db)
    tx = Transaction(
        file_path="x.png", vendor_name="Unknown Vendor", amount=100.0,
        transaction_date="2024-01-15", department="Engineering", cost_center="CC001",
        uploaded_by=user.id
    )
    db.add(tx)
    db.commit()
    score = run_validation(tx, db)
    log = db.query(ValidationLog).filter(
        ValidationLog.transaction_id == tx.id,
        ValidationLog.rule_name == "vendor_not_in_master"
    ).first()
    assert log is not None
    assert log.passed == False


def test_transaction_can_store_expense_category(db):
    user = setup_base(db)
    tx = Transaction(
        file_path="x.png", vendor_name="Acme Corp", amount=100.0,
        transaction_date="2024-01-15", department="Engineering", cost_center="CC001",
        expense_category="travel",
        uploaded_by=user.id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    assert tx.expense_category == "travel"


def test_master_data_supports_expense_category_type(db):
    md = MasterData(type=MasterDataType.expense_category, value="travel", is_active=True)
    db.add(md)
    db.commit()
    db.refresh(md)
    assert md.type == MasterDataType.expense_category


def test_seed_source_contains_fourteen_expense_categories():
    """Static source-code check that seed.py declares all 14 expense category rows.
    This is NOT a dynamic test (seed() uses production SessionLocal, can't bind to test DB)."""
    import inspect
    from backend.db import seed as seed_module
    source = inspect.getsource(seed_module.seed)
    expected = [
        "travel", "meals", "office_supplies", "it_hardware", "it_software",
        "professional_fees", "utilities", "rent_lease", "repairs_maintenance",
        "training", "marketing", "capex", "taxes_duties", "other",
    ]
    for category in expected:
        assert f'value="{category}"' in source, f"Seed source missing expense_category value: {category}"
    # Also assert the type is set to expense_category for these rows
    assert "MasterDataType.expense_category" in source, "Seed source must use MasterDataType.expense_category for the new rows"


def test_department_budget_skipped_without_budget(db):
    user = setup_base(db)
    db.add(Rule(rule_name="department_budget", rule_type=RuleType.department_budget,
                description="Budget", is_active=True))
    db.flush()
    tx = Transaction(file_path="x", vendor_name="Acme Corp", amount=1000.0,
                     transaction_date="2026-05-15", department="Engineering",
                     cost_center="CC001", uploaded_by=user.id)
    db.add(tx); db.commit()
    run_validation(tx, db)
    log = db.query(ValidationLog).filter_by(transaction_id=tx.id, rule_name="department_budget").first()
    assert log is not None
    assert log.passed is True
    assert "skipped" in log.message.lower() or "no budget" in log.message.lower()


def test_department_budget_passes_when_under(db):
    user = setup_base(db)
    db.add(Rule(rule_name="department_budget", rule_type=RuleType.department_budget,
                description="Budget", is_active=True))
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=10000))
    db.flush()
    tx = Transaction(file_path="x", vendor_name="Acme Corp", amount=1000.0,
                     transaction_date="2026-05-15", department="Engineering",
                     cost_center="CC001", uploaded_by=user.id)
    db.add(tx); db.commit()
    run_validation(tx, db)
    log = db.query(ValidationLog).filter_by(transaction_id=tx.id, rule_name="department_budget").first()
    assert log.passed is True
    assert "remaining" in log.message.lower()


def test_department_budget_fails_when_over(db):
    user = setup_base(db)
    db.add(Rule(rule_name="department_budget", rule_type=RuleType.department_budget,
                description="Budget", is_active=True))
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=1000))
    db.flush()
    tx = Transaction(file_path="x", vendor_name="Acme Corp", amount=5000.0,
                     transaction_date="2026-05-15", department="Engineering",
                     cost_center="CC001", uploaded_by=user.id)
    db.add(tx); db.commit()
    run_validation(tx, db)
    log = db.query(ValidationLog).filter_by(transaction_id=tx.id, rule_name="department_budget").first()
    assert log.passed is False
    assert "exceed" in log.message.lower()


def test_department_budget_counts_prior_validated_spend(db):
    user = setup_base(db)
    db.add(Rule(rule_name="department_budget", rule_type=RuleType.department_budget,
                description="Budget", is_active=True))
    db.add(Budget(department="Engineering", fiscal_year="2026-27", quarter="Q1", amount=1000))
    db.add(Transaction(file_path="prior", department="Engineering", amount=900,
                       transaction_date="2026-05-01", uploaded_by=user.id,
                       status=TransactionStatus.validated, vendor_name="Acme Corp",
                       cost_center="CC001"))
    db.flush()
    tx = Transaction(file_path="x", vendor_name="Acme Corp", amount=200.0,
                     transaction_date="2026-05-15", department="Engineering",
                     cost_center="CC001", uploaded_by=user.id)
    db.add(tx); db.commit()
    run_validation(tx, db)
    log = db.query(ValidationLog).filter_by(transaction_id=tx.id, rule_name="department_budget").first()
    assert log.passed is False
