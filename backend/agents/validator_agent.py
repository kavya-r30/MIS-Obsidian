# backend/agents/validator_agent.py
import json
from datetime import datetime
from sqlalchemy.orm import Session
from ..db.models import (
    Transaction, ValidationLog, Rule, MasterData,
    ValidationSeverity, TransactionStatus, RuleType,
)

DEFAULT_REQUIRED_FIELDS = ["vendor_name", "amount", "transaction_date", "department", "cost_center"]
DEFAULT_CASH_METHODS = ["cash"]
DEFAULT_ALLOWED_METHODS = {"cash", "card", "bank_transfer", "cheque", "upi", "neft", "rtgs", "imps"}


def _params(rule: Rule) -> dict:
    if rule.parameters:
        try:
            return json.loads(rule.parameters)
        except (json.JSONDecodeError, TypeError):
            pass
    return {}


def run_validation(transaction: Transaction, db: Session) -> float:
    # Clear previous logs for this transaction
    db.query(ValidationLog).filter(ValidationLog.transaction_id == transaction.id).delete()

    rules = db.query(Rule).filter(Rule.is_active == True).all()
    logs = []

    for rule in rules:
        passed, message = _check_rule(rule, transaction, db)
        logs.append(ValidationLog(
            transaction_id=transaction.id,
            rule_name=rule.rule_name,
            severity=rule.severity,   # read severity from DB, not hardcoded
            message=message,
            passed=passed,
        ))

    db.add_all(logs)

    # Score: start at 100, deduct per failed rule by severity
    score = 100.0
    for log in logs:
        if not log.passed:
            score -= 20.0 if log.severity == ValidationSeverity.error else 10.0
    score = max(0.0, score)

    transaction.confidence_score = score
    transaction.revalidation_count = (transaction.revalidation_count or 0) + 1

    if score >= 80:
        transaction.status = TransactionStatus.validated
    elif score >= 50:
        transaction.status = TransactionStatus.flagged
    else:
        transaction.status = TransactionStatus.rejected

    db.commit()
    return score


def _check_rule(rule: Rule, tx: Transaction, db: Session) -> tuple[bool, str]:

    if rule.rule_type == RuleType.missing_required_fields:
        fields = _params(rule).get("fields", DEFAULT_REQUIRED_FIELDS)
        missing = [f for f in fields if not getattr(tx, f, None)]
        if missing:
            return False, f"Missing required fields: {', '.join(missing)}. These must be present for processing."
        return True, f"All required fields present: {', '.join(fields)}."

    if rule.rule_type == RuleType.vendor_not_in_master:
        if not tx.vendor_name:
            return False, "Vendor name is missing — cannot verify against master data."
        exists = db.query(MasterData).filter(
            MasterData.type == "vendor",
            MasterData.value == tx.vendor_name,
            MasterData.is_active == True,
        ).first()
        if exists:
            return True, f"Vendor '{tx.vendor_name}' is registered in master data."
        return False, (
            f"Vendor '{tx.vendor_name}' is not in the approved vendor list. "
            "Add it under Configuration → Reference Data or verify the vendor name."
        )

    if rule.rule_type == RuleType.cost_center_not_in_master:
        if not tx.cost_center:
            return False, "Cost center is missing — cannot verify against master data."
        exists = db.query(MasterData).filter(
            MasterData.type == "cost_center",
            MasterData.value == tx.cost_center,
            MasterData.is_active == True,
        ).first()
        if exists:
            return True, f"Cost center '{tx.cost_center}' is registered in master data."
        return False, (
            f"Cost center '{tx.cost_center}' is not recognised. "
            "Verify the cost center code or add it under Configuration → Reference Data."
        )

    if rule.rule_type == RuleType.department_not_in_master:
        if not tx.department:
            return False, "Department is missing — cannot verify against master data."
        exists = db.query(MasterData).filter(
            MasterData.type == "department",
            MasterData.value == tx.department,
            MasterData.is_active == True,
        ).first()
        if exists:
            return True, f"Department '{tx.department}' is registered in master data."
        return False, (
            f"Department '{tx.department}' is not in the approved department list. "
            "Verify spelling or add it under Configuration → Reference Data."
        )

    if rule.rule_type == RuleType.high_value_cash_payment:
        threshold = rule.threshold or 5000.0
        cash_methods = set(_params(rule).get("cash_methods", DEFAULT_CASH_METHODS))
        if tx.payment_method and tx.payment_method.lower() in cash_methods and tx.amount and tx.amount > threshold:
            return False, (
                f"Cash payment of ₹{tx.amount:,.2f} exceeds the allowed threshold of ₹{threshold:,.2f}. "
                "High-value cash transactions require manager review."
            )
        return True, f"Cash payment is within the allowed threshold of ₹{threshold:,.2f}."

    if rule.rule_type == RuleType.temporal_inconsistency:
        if tx.approval_date and tx.transaction_date:
            try:
                a = datetime.strptime(tx.approval_date, "%Y-%m-%d")
                t = datetime.strptime(tx.transaction_date, "%Y-%m-%d")
                if t < a:
                    return False, (
                        f"Transaction date {tx.transaction_date} is before approval date {tx.approval_date} — "
                        "spend occurred before the approval was granted. Verify with the originating department."
                    )
            except ValueError:
                return False, "Invalid date format in transaction_date or approval_date — expected YYYY-MM-DD."
        return True, "Dates are consistent — transaction occurred on or after the approval date."

    if rule.rule_type == RuleType.duplicate_invoice:
        if not tx.invoice_number:
            return True, "No invoice number present — duplicate check skipped."
        existing = db.query(Transaction).filter(
            Transaction.invoice_number == tx.invoice_number,
            Transaction.id != tx.id,
        ).first()
        if existing:
            tx.is_duplicate = True
            return False, (
                f"Invoice number '{tx.invoice_number}' already exists in transaction #{existing.id}. "
                "This may be a duplicate submission — verify before approving."
            )
        tx.is_duplicate = False
        return True, f"Invoice number '{tx.invoice_number}' is unique in the system."

    if rule.rule_type == RuleType.tax_amount_missing:
        if tx.tax_amount is None:
            return False, (
                "No tax amount found in this document. "
                "Confirm whether the transaction is tax-exempt or if the receipt is missing a GST breakdown."
            )
        return True, f"Tax amount ₹{tx.tax_amount:,.2f} is recorded in the document."

    if rule.rule_type == RuleType.amount_threshold:
        threshold = rule.threshold or 100000.0
        if tx.amount and tx.amount > threshold:
            return False, (
                f"Transaction amount ₹{tx.amount:,.2f} exceeds the high-value threshold of ₹{threshold:,.2f}. "
                "Enhanced review is required for large transactions."
            )
        return True, f"Transaction amount is within the review threshold of ₹{threshold:,.2f}."

    if rule.rule_type == RuleType.department_budget:
        threshold = rule.threshold or 50000.0
        if tx.amount and tx.amount > threshold:
            dept = tx.department or "Unknown"
            return False, (
                f"Transaction amount ₹{tx.amount:,.2f} exceeds the department budget limit of ₹{threshold:,.2f} "
                f"for department '{dept}'. Obtain department head approval before processing."
            )
        return True, f"Transaction amount is within the department budget limit of ₹{threshold:,.2f}."

    if rule.rule_type == RuleType.tax_rate_check:
        expected_rate = rule.threshold or 0.18
        if tx.amount and tx.amount > 0 and tx.tax_amount is not None:
            actual_rate = tx.tax_amount / tx.amount
            tolerance = _params(rule).get("tolerance", 0.02)
            if abs(actual_rate - expected_rate) > tolerance:
                return False, (
                    f"Tax rate {actual_rate:.1%} deviates from expected {expected_rate:.1%} "
                    f"(tolerance ±{tolerance:.0%}). Verify the GST/tax breakdown on the invoice."
                )
            return True, f"Tax rate {actual_rate:.1%} is within expected range of {expected_rate:.1%}."
        return True, "Tax rate check skipped — insufficient data (amount or tax_amount missing)."

    if rule.rule_type == RuleType.payment_method_check:
        allowed = set(_params(rule).get("allowed_methods", list(DEFAULT_ALLOWED_METHODS)))
        if not tx.payment_method:
            return False, (
                "Payment method is missing. All transactions must specify how payment was made."
            )
        if tx.payment_method.lower() not in allowed:
            return False, (
                f"Payment method '{tx.payment_method}' is not in the approved list: "
                f"{', '.join(sorted(allowed))}. Update the transaction with a valid payment method."
            )
        return True, f"Payment method '{tx.payment_method}' is an approved method."

    if rule.rule_type == RuleType.approval_required:
        threshold = rule.threshold or 10000.0
        if tx.amount and tx.amount > threshold and not tx.approval_ref:
            return False, (
                f"Transactions above ₹{threshold:,.2f} require a valid approval reference. "
                "Obtain approval from the appropriate authority and attach the reference number."
            )
        return True, (
            "Approval reference is present."
            if tx.approval_ref
            else f"Transaction is below the approval threshold of ₹{threshold:,.2f}."
        )

    # Unknown rule type — pass silently
    return True, f"Rule '{rule.rule_name}' evaluated (no matching logic for type '{rule.rule_type}')."
