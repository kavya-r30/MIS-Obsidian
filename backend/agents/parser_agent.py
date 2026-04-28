# backend/agents/parser_agent.py
import json
from sqlalchemy.orm import Session
from ..services.agno_runner import make_mistral_agent
from ..db.models import MasterData

_FALLBACK_CATEGORIES = [
    "travel", "meals", "office_supplies", "it_hardware", "it_software",
    "professional_fees", "utilities", "rent_lease", "repairs_maintenance",
    "training", "marketing", "capex", "taxes_duties", "other",
]

PARSE_INSTRUCTIONS = """
You are a financial document parser for an institutional Management Information System (MIS).
Extract structured metadata from receipt, invoice, or voucher text.
The institution is Indian — documents follow Indian tax and payment norms (GST, UPI, NEFT, etc.).

OUTPUT RULES:
1. Return ONLY a valid JSON object — no explanation, no markdown, no code fences.
2. Use exactly these 12 keys:
   vendor_name, amount, currency, transaction_date, approval_date,
   payment_method, department, cost_center, approval_ref, invoice_number, tax_amount,
   expense_category
3. amount: total amount paid (float, tax-inclusive). Never a string. Null if not found.
4. tax_amount: the GST / CGST+SGST / IGST / VAT line item amount (float).
   Extract only the tax component — do NOT set tax_amount equal to amount.
   Null if no tax line is separately stated.
5. invoice_number: the document's own reference ID printed on the receipt or invoice
   (e.g. "INV-2024-001", "Rcpt No: 42", "Bill No. 7731", "Tax Invoice #88").
   This is DIFFERENT from approval_ref which is an internal organisational reference.
   Null if no document reference is printed.
6. approval_ref: internal authorisation reference (e.g. PO number, sanction letter number,
   internal voucher code). Null if absent.
7. transaction_date: the date on the receipt or invoice (YYYY-MM-DD). Null if absent.
8. approval_date: the date of internal approval or sanction, if stated (YYYY-MM-DD). Null if absent.
9. currency: 3-letter ISO code. Default to "INR" for Indian Rupee documents even if no
   explicit code is printed. Null only if truly ambiguous.
10. payment_method: one of cash, card, bank_transfer, cheque, upi — or null.
    Map "NEFT"/"RTGS"/"IMPS" to bank_transfer. Map "net banking" to bank_transfer.
11. If known vendors/departments/cost_centers are provided, prefer exact matches over raw OCR text.
12. expense_category: pick exactly one from the allowed list provided in context, or null. Do not invent new categories.
13. department: pick exactly one from the allowed list provided in context, or null. Do not invent new departments. If the receipt mentions a department by acronym or partial name (e.g. "Eng dept" → "Engineering"), map it to the closest exact match from the list.
14. Never guess a field value. If genuinely absent, set null.

OUTPUT FORMAT (strict — all 12 keys required every time):
{"vendor_name": null, "amount": null, "currency": null, "transaction_date": null,
 "approval_date": null, "payment_method": null, "department": null, "cost_center": null,
 "approval_ref": null, "invoice_number": null, "tax_amount": null, "expense_category": null}
"""

_EMPTY = {k: None for k in [
    "vendor_name", "amount", "currency", "transaction_date", "approval_date",
    "payment_method", "department", "cost_center", "approval_ref",
    "invoice_number", "tax_amount", "expense_category",
]}


def parse_receipt(raw_text: str, db: Session) -> dict:
    vendors     = [m.value for m in db.query(MasterData).filter(MasterData.type == "vendor",      MasterData.is_active == True).all()]
    departments = [m.value for m in db.query(MasterData).filter(MasterData.type == "department",  MasterData.is_active == True).all()]
    cost_centers= [m.value for m in db.query(MasterData).filter(MasterData.type == "cost_center", MasterData.is_active == True).all()]
    categories  = [m.value for m in db.query(MasterData).filter(MasterData.type == "expense_category", MasterData.is_active == True).all()]

    active_categories = categories if categories else _FALLBACK_CATEGORIES
    cats_for_prompt = ", ".join(active_categories)
    depts_for_prompt = ", ".join(departments) if departments else "(none configured)"

    instructions = (
        PARSE_INSTRUCTIONS
        + f"\nAllowed expense_category values: {cats_for_prompt}. Pick exactly one or null."
        + f"\nAllowed department values: {depts_for_prompt}. Pick exactly one or null."
    )

    context = (
        f"Known vendors: {vendors}\n"
        f"Known departments: {departments}\n"
        f"Known cost centers: {cost_centers}\n\n"
        f"Receipt / invoice text:\n{raw_text}"
    )
    try:
        agent = make_mistral_agent(tools=[], description="Financial receipt parser", instructions=instructions)
        response = agent.run(context)
        text = (response.content or "").strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        if parsed.get("expense_category") and parsed["expense_category"] not in active_categories:
            parsed["expense_category"] = None
        if parsed.get("department") and departments and parsed["department"] not in departments:
            parsed["department"] = None
        return parsed
    except Exception:
        return _EMPTY.copy()
