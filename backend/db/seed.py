# backend/db/seed.py
import json
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import (
    User, Rule, MasterData, AuditLog,
    UserRole, RuleType, ValidationSeverity, MasterDataType,
)


def _hash(password: str) -> str:
    from ..core.security import hash_password
    return hash_password(password)


def seed():
    db: Session = SessionLocal()
    # Only seed if the database is empty (first run)
    if db.query(User).first() is not None:
        db.close()
        return
    try:
        # ── Users ─────────────────────────────────────────────────────────────
        admin = User(
            email="admin@mis.com",
            hashed_password=_hash("admin123"),
            full_name="Admin User",
            role=UserRole.admin,
            department="Administration",
        )
        manager = User(
            email="manager@mis.com",
            hashed_password=_hash("manager123"),
            full_name="Finance Manager",
            role=UserRole.manager,
            department="Finance",
        )
        db.add_all([admin, manager])

        # ── Default validation rules ───────────────────────────────────────────
        rules = [
            Rule(
                rule_name="missing_required_fields",
                rule_type=RuleType.missing_required_fields,
                severity=ValidationSeverity.error,
                description="Vendor, amount, transaction_date, department, and cost_center must all be present.",
                parameters=json.dumps({"fields": ["vendor_name", "amount", "transaction_date", "department", "cost_center"]}),
            ),
            Rule(
                rule_name="vendor_not_in_master",
                rule_type=RuleType.vendor_not_in_master,
                severity=ValidationSeverity.error,
                description="Vendor name must match an approved vendor in master data.",
            ),
            Rule(
                rule_name="cost_center_not_in_master",
                rule_type=RuleType.cost_center_not_in_master,
                severity=ValidationSeverity.warning,
                description="Cost center must match an approved cost center in master data.",
            ),
            Rule(
                rule_name="department_not_in_master",
                rule_type=RuleType.department_not_in_master,
                severity=ValidationSeverity.warning,
                description="Department must match an approved department in master data.",
            ),
            Rule(
                rule_name="high_value_cash_payment",
                rule_type=RuleType.high_value_cash_payment,
                severity=ValidationSeverity.warning,
                threshold=5000.0,
                description="Cash payments above ₹5,000 are flagged for manager review.",
                parameters=json.dumps({"cash_methods": ["cash"]}),
            ),
            Rule(
                rule_name="temporal_inconsistency",
                rule_type=RuleType.temporal_inconsistency,
                severity=ValidationSeverity.error,
                description="Transaction date must not precede the approval date — spend must occur after pre-approval.",
            ),
            Rule(
                rule_name="duplicate_invoice",
                rule_type=RuleType.duplicate_invoice,
                severity=ValidationSeverity.warning,
                description="Invoice number must be unique across all transactions to detect duplicate submissions.",
            ),
            Rule(
                rule_name="tax_amount_missing",
                rule_type=RuleType.tax_amount_missing,
                severity=ValidationSeverity.warning,
                description="No tax amount found. Verify whether the transaction is tax-exempt or the receipt is missing a GST breakdown.",
            ),
            Rule(
                rule_name="amount_threshold",
                rule_type=RuleType.amount_threshold,
                severity=ValidationSeverity.warning,
                threshold=100000.0,
                description="Transactions above ₹1,00,000 require enhanced scrutiny and manager approval.",
            ),
            Rule(
                rule_name="payment_method_check",
                rule_type=RuleType.payment_method_check,
                severity=ValidationSeverity.warning,
                description="Payment method must be from the approved list.",
                parameters=json.dumps({"allowed_methods": ["cash", "card", "bank_transfer", "cheque", "upi", "neft", "rtgs", "imps"]}),
            ),
            Rule(
                rule_name="approval_required",
                rule_type=RuleType.approval_required,
                severity=ValidationSeverity.error,
                threshold=10000.0,
                description="Transactions above ₹10,000 require a valid approval reference.",
            ),
            Rule(
                rule_name="tax_rate_check",
                rule_type=RuleType.tax_rate_check,
                severity=ValidationSeverity.warning,
                threshold=0.18,
                description="Tax rate (tax_amount / amount) must be within ±2% of the expected rate.",
                parameters=json.dumps({"tolerance": 0.02}),
            ),
            Rule(
                rule_name="department_budget",
                rule_type=RuleType.department_budget,
                severity=ValidationSeverity.warning,
                threshold=50000.0,
                description="Transactions above the department budget limit require department head approval.",
            ),
        ]
        db.add_all(rules)

        # ── Master data ────────────────────────────────────────────────────────
        master = [
            # Vendors
            MasterData(type=MasterDataType.vendor, value="Acme Corp", description="General office supplies"),
            MasterData(type=MasterDataType.vendor, value="TechSupplies Ltd", description="IT hardware and accessories"),
            MasterData(type=MasterDataType.vendor, value="Office Depot", description="Stationery and furniture"),
            MasterData(type=MasterDataType.vendor, value="AWS", description="Cloud infrastructure"),
            MasterData(type=MasterDataType.vendor, value="Infosys", description="IT consulting services"),
            # Cost centers
            MasterData(type=MasterDataType.cost_center, value="CC001", description="General operations"),
            MasterData(type=MasterDataType.cost_center, value="CC002", description="Capital expenditure"),
            MasterData(type=MasterDataType.cost_center, value="CC003", description="Research grants"),
            MasterData(type=MasterDataType.cost_center, value="CC004", description="Recurring expenses"),
            # Departments
            MasterData(type=MasterDataType.department, value="Engineering", description="Engineering and development"),
            MasterData(type=MasterDataType.department, value="Finance", description="Finance and accounts"),
            MasterData(type=MasterDataType.department, value="HR", description="Human resources"),
            MasterData(type=MasterDataType.department, value="Operations", description="General operations"),
            MasterData(type=MasterDataType.department, value="Sales", description="Sales and business development"),
        ]
        db.add_all(master)

        db.commit()
        print("✓ Database seeded")
        print("  admin@mis.com / admin123")
        print("  manager@mis.com / manager123")
    except Exception as e:
        db.rollback()
        print(f"✗ Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
