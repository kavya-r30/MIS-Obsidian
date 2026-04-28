# backend/agents/report_agent.py
import logging
from sqlalchemy.orm import Session
from ..db.models import Transaction, TransactionStatus
from ..services.agno_runner import make_mistral_agent
from ..services.exporter import generate_excel, generate_pdf_html

REPORT_INSTRUCTIONS = """
You are a senior financial analyst writing an executive summary for an institutional MIS report.
The institution is Indian; use ₹ (Indian Rupee) for all currency amounts.

Given transaction statistics, write a concise 3–5 sentence executive summary that:
1. States the total number of transactions and overall spend in the period.
2. Assesses data quality health — reference the validated/approved rate vs flagged/rejected rate.
3. Highlights the single most significant concern: the department or vendor with the most issues,
   a high duplicate rate, or a low average confidence score — whichever is most notable.
4. Ends with one concrete, actionable recommendation for the finance team.

CONSTRAINTS:
- Plain prose only. No markdown, no bullet points, no headings.
- Do not repeat the raw numbers verbatim — synthesise them into insight.
- Maximum 5 sentences.
- Tone: professional, direct, data-driven.
"""


def _build_data(db: Session, start_date=None, end_date=None, department=None):
    q = db.query(Transaction)
    # Filter on transaction_date (when the spend occurred), not upload_date
    if start_date:
        q = q.filter(Transaction.transaction_date >= start_date)
    if end_date:
        q = q.filter(Transaction.transaction_date <= end_date)
    if department:
        q = q.filter(Transaction.department == department)
    txs = q.all()

    total     = len(txs)
    validated = sum(1 for t in txs if t.status == TransactionStatus.validated)
    flagged   = sum(1 for t in txs if t.status == TransactionStatus.flagged)
    rejected  = sum(1 for t in txs if t.status == TransactionStatus.rejected)
    approved  = sum(1 for t in txs if t.status == TransactionStatus.approved)
    duplicates = sum(1 for t in txs if t.is_duplicate)
    avg_score = round(sum(t.confidence_score or 0.0 for t in txs) / total, 2) if total else 0.0
    quality_rate = round((validated + approved) / total * 100, 1) if total else 0.0
    total_spend = sum(t.amount or 0 for t in txs)

    summary = {
        "Total Transactions": total,
        "Total Spend (₹)":    f"₹{total_spend:,.2f}",
        "Validated":          validated,
        "Approved":           approved,
        "Flagged":            flagged,
        "Rejected":           rejected,
        "Duplicates":         duplicates,
        "Avg Confidence":     f"{avg_score}%",
        "Data Quality Rate":  f"{quality_rate}%",
    }
    tx_dicts = [
        {
            "ID":           t.id,
            "Vendor":       t.vendor_name,
            "Amount (₹)":   t.amount,
            "Tax (₹)":      t.tax_amount,
            "Invoice No.":  t.invoice_number,
            "Date":         t.transaction_date,
            "Department":   t.department,
            "Cost Center":  t.cost_center,
            "Payment":      t.payment_method,
            "Status":       t.status.value,
            "Duplicate":    "Yes" if t.is_duplicate else "",
            "Score":        f"{(t.confidence_score or 0):.1f}%",
        }
        for t in txs
    ]
    return summary, tx_dicts


def generate_report_excel(db: Session, start_date=None, end_date=None, department=None) -> bytes:
    summary, tx_dicts = _build_data(db, start_date, end_date, department)
    return generate_excel(tx_dicts, summary)


def generate_report_pdf(db: Session, start_date=None, end_date=None, department=None) -> bytes:
    from weasyprint import HTML
    summary, tx_dicts = _build_data(db, start_date, end_date, department)

    agent = make_mistral_agent(tools=[], description="MIS financial report writer", instructions=REPORT_INSTRUCTIONS)
    stats_lines = "\n".join(f"- {k}: {v}" for k, v in summary.items())
    prompt = (
        "Write an executive summary for the following MIS report.\n\n"
        f"Report statistics:\n{stats_lines}\n\n"
        "Focus on what matters most to a finance manager reviewing this period."
    )
    try:
        response = agent.run(prompt)
        narrative = (response.content or "").strip()
    except Exception:
        logging.exception("LLM narrative generation failed")
        narrative = (
            f"This report covers {summary['Total Transactions']} transactions "
            f"with a total spend of {summary['Total Spend (₹)']}. "
            f"The data quality rate is {summary['Data Quality Rate']}. "
            "Please review flagged and rejected transactions for further action."
        )

    return HTML(string=generate_pdf_html(tx_dicts, summary, narrative)).write_pdf()
