import logging
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from agno.agent import Agent
from agno.models.mistral import MistralChat
from ..core.config import settings
from ..db.models import Transaction, TransactionStatus, Rule, ValidationLog

logger = logging.getLogger(__name__)

_MAX_ROWS = 20

CHAT_SYSTEM_PROMPT = """
You are a concise financial assistant for Obsidian MIS used by a finance team to manage expense transactions.

RULES:
- Always call exactly ONE tool before answering any quantitative question. Never guess numbers.
- Pick the right tool:
  • get_month_summary   → totals, counts, status breakdown, department spend, top vendors, duplicates, avg confidence
  • search_transactions → specific vendor/date/status lookups, listing rows, high-value queries, duplicate lists
  • get_validation_health → rule failures, validation quality, which rules fire most, revalidation stats
- Keep answers short and precise. Use bullet points or markdown tables for lists.
- Indian currency: ₹X,XX,XXX (no decimals for whole numbers). Percentages: XX.X%.
- SCOPE: Only answer questions about transaction data. Politely decline anything else.
"""


def build_chat_agent(db: Session) -> Agent:

    def get_month_summary() -> dict:
        """
        Comprehensive snapshot of current calendar month activity.
        Returns: transaction counts by status, total spend, top 5 vendors by spend,
        department breakdown with spend, average confidence score, duplicate count,
        and all-time totals for comparison.
        Use for: any summary, spend totals, status counts, dept breakdowns, or quality questions.
        """
        today = date.today()
        month_start = today.replace(day=1).isoformat()

        status_rows = (
            db.query(Transaction.status, func.count(Transaction.id))
            .filter(func.date(Transaction.upload_date) >= month_start)
            .group_by(Transaction.status).all()
        )
        month_counts = {str(s): c for s, c in status_rows}
        month_total = sum(month_counts.values())

        all_status_rows = db.query(Transaction.status, func.count(Transaction.id)).group_by(Transaction.status).all()
        all_counts = {str(s): c for s, c in all_status_rows}

        month_spend = (
            db.query(func.sum(Transaction.amount))
            .filter(func.date(Transaction.upload_date) >= month_start, Transaction.amount.isnot(None))
            .scalar() or 0.0
        )

        vendor_rows = (
            db.query(Transaction.vendor_name, func.sum(Transaction.amount), func.count(Transaction.id))
            .filter(func.date(Transaction.upload_date) >= month_start, Transaction.amount.isnot(None))
            .group_by(Transaction.vendor_name)
            .order_by(func.sum(Transaction.amount).desc())
            .limit(5).all()
        )
        top_vendors = [{"vendor": r[0] or "Unknown", "spend": round(float(r[1] or 0), 2), "count": r[2]} for r in vendor_rows]

        dept_rows = (
            db.query(Transaction.department, func.sum(Transaction.amount), func.count(Transaction.id))
            .filter(func.date(Transaction.upload_date) >= month_start)
            .group_by(Transaction.department)
            .order_by(func.sum(Transaction.amount).desc()).all()
        )
        by_dept = [{"department": r[0] or "Unknown", "spend": round(float(r[1] or 0), 2), "count": r[2]} for r in dept_rows]

        avg_conf = (
            db.query(func.avg(Transaction.confidence_score))
            .filter(func.date(Transaction.upload_date) >= month_start)
            .scalar() or 0.0
        )
        duplicates = (
            db.query(func.count(Transaction.id))
            .filter(func.date(Transaction.upload_date) >= month_start, Transaction.is_duplicate.is_(True))
            .scalar() or 0
        )

        return {
            "period": f"{month_start} to {today.isoformat()}",
            "this_month": {
                "total": month_total,
                "by_status": month_counts,
                "total_spend": round(float(month_spend), 2),
                "avg_confidence_score": round(float(avg_conf), 1),
                "duplicate_count": duplicates,
                "top_vendors": top_vendors,
                "by_department": by_dept,
            },
            "all_time": {
                "total": sum(all_counts.values()),
                "by_status": all_counts,
            },
        }

    def search_transactions(
        vendor: str = "",
        department: str = "",
        status: str = "",
        start_date: str = "",
        end_date: str = "",
        duplicates_only: bool = False,
        min_amount: float = 0,
        limit: int = 15,
    ) -> list[dict]:
        """
        Search and filter transactions. Returns up to 20 matching rows.
        Use for: finding specific transactions, listing by date range or status,
        duplicate invoice lists, high-value transaction lookups, vendor-specific queries.
        Parameters are all optional — combine as needed.
        status must be one of: pending, validated, flagged, approved, rejected.
        Dates must be YYYY-MM-DD.
        """
        q = db.query(Transaction)
        if vendor:
            q = q.filter(Transaction.vendor_name.ilike(f"%{vendor}%"))
        if department:
            q = q.filter(Transaction.department.ilike(f"%{department}%"))
        if status:
            try:
                q = q.filter(Transaction.status == TransactionStatus(status))
            except ValueError:
                return [{"error": f"Invalid status '{status}'. Use: pending, validated, flagged, approved, rejected"}]
        if start_date:
            q = q.filter(Transaction.transaction_date >= start_date)
        if end_date:
            q = q.filter(Transaction.transaction_date <= end_date)
        if duplicates_only:
            q = q.filter(Transaction.is_duplicate.is_(True))
        if min_amount > 0:
            q = q.filter(Transaction.amount >= min_amount)

        txs = q.order_by(Transaction.upload_date.desc()).limit(min(limit, _MAX_ROWS)).all()
        return [
            {
                "id": t.id,
                "vendor": t.vendor_name,
                "amount": t.amount,
                "transaction_date": t.transaction_date,
                "department": t.department,
                "status": t.status.value,
                "confidence_score": round(t.confidence_score or 0, 1),
                "is_duplicate": t.is_duplicate,
                "invoice_number": t.invoice_number,
                "revalidation_count": t.revalidation_count,
                "rejection_reason": t.rejection_reason,
            }
            for t in txs
        ]

    def get_validation_health() -> dict:
        """
        Validation system health report.
        Returns: top 5 failing rules with failure rates, total validation log counts,
        pass/fail ratio, transactions with high revalidation counts, and active rule count.
        Use for: questions about rule failures, validation quality, why transactions are rejected,
        which rules fire most, revalidation patterns, or compliance health.
        """
        rule_rows = (
            db.query(
                ValidationLog.rule_name,
                func.count(ValidationLog.id).label("total"),
                func.sum(case((ValidationLog.passed.is_(False), 1), else_=0)).label("failures"),
            )
            .group_by(ValidationLog.rule_name)
            .order_by(func.sum(case((ValidationLog.passed.is_(False), 1), else_=0)).desc())
            .limit(5).all()
        )
        top_failing = [
            {
                "rule": r[0],
                "failures": int(r[2] or 0),
                "total_checks": r[1],
                "failure_rate": f"{round((r[2] or 0) / r[1] * 100, 1)}%" if r[1] else "0%",
            }
            for r in rule_rows
        ]

        total_logs = db.query(func.count(ValidationLog.id)).scalar() or 0
        total_passed = db.query(func.count(ValidationLog.id)).filter(ValidationLog.passed.is_(True)).scalar() or 0
        pass_rate = round(total_passed / total_logs * 100, 1) if total_logs else 0.0

        # Transactions revalidated more than once
        revalidated = (
            db.query(Transaction.id, Transaction.vendor_name, Transaction.revalidation_count, Transaction.status)
            .filter(Transaction.revalidation_count > 1)
            .order_by(Transaction.revalidation_count.desc())
            .limit(5).all()
        )
        revalidated_list = [
            {"id": r[0], "vendor": r[1], "revalidation_count": r[2], "status": r[3].value}
            for r in revalidated
        ]

        active_rules = db.query(func.count(Rule.id)).filter(Rule.is_active.is_(True)).scalar() or 0

        return {
            "overall": {
                "total_validation_checks": total_logs,
                "pass_rate": f"{pass_rate}%",
                "active_rules": active_rules,
            },
            "top_failing_rules": top_failing,
            "most_revalidated_transactions": revalidated_list,
        }

    return Agent(
        model=MistralChat(
            id=settings.MISTRAL_MODEL,
            api_key=settings.MISTRAL_API_KEY,
            client_params={"timeout_ms": 25000},
        ),
        tools=[get_month_summary, search_transactions, get_validation_health],
        description="Obsidian MIS financial assistant",
        instructions=[CHAT_SYSTEM_PROMPT],
        markdown=True,
        add_history_to_context=False,
        tool_call_limit=2,
    )


def chat(message: str, db: Session) -> str:
    agent = build_chat_agent(db)
    try:
        response = agent.run(message)
        return (response.content or "").strip()
    except Exception:
        logger.exception("chat agent error")
        return "I encountered an error processing your request. Please try again."
