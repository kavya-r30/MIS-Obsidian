from backend.db.models import Transaction, Rule, MasterData, TransactionStatus, MasterDataType, UserRole, User, RuleType, ValidationLog
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
