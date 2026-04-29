# Obsidian MIS — Financial Transaction Integrity Management System

## Overview

Obsidian MIS is an AI-assisted financial transaction integrity management system built for institutional finance departments. It solves a fundamental operational problem: verifying that every expense claim, vendor invoice, and procurement receipt is authentic, policy-compliant, and correctly categorised — at scale, without placing the full burden on human reviewers.

Most institutions today rely on manual spot-checks or basic spreadsheet rules that cannot keep up with transaction volume, are inconsistently applied, and leave no structured audit trail. Obsidian MIS replaces this with an automated pipeline: documents come in, get read by AI, get validated against a configurable rule set, and are either cleared automatically or routed to the right person for review. 

---

## How It Works

### 1. Ingestion

Finance staff upload physical documents — receipts, invoices, vendor bills — via a drag-and-drop interface, or submit structured data directly through a form. The system also exposes a bulk ingestion API for programmatic submission from ERP or accounting tools.

### 2. OCR and Parsing

Uploaded files (images or PDFs) are passed through LLM's OCR engine, which extracts the raw text content. A second AI agent then parses that text into 11 structured fields: vendor name, total amount, tax amount, payment method, transaction date, department, cost centre, project code, description, currency, and an extraction confidence score.

### 3. Automated Validation

The moment a transaction is created — whether from a document or manual entry — the rule engine runs automatically. Each transaction is scored from 0 to 100. The engine evaluates a set of configurable rules:

- **Error-severity rules** deduct 20 points each (e.g. missing required fields, unrecognised vendor)
- **Warning-severity rules** deduct 10 points each (e.g. tax rate outside tolerance, payment method not preferred)

The final score determines the transaction's status:

| Score | Status | What happens |
|---|---|---|
| 80 – 100 | Validated | Cleared automatically |
| 50 – 79 | Flagged | Sent to the exceptions queue |
| 0 – 49 | Rejected | Marked rejected, manager notified |

### 4. Exceptions Review

Flagged transactions appear in a dedicated review queue. Managers see the original document, parsed fields, and the specific rules that failed — all on one screen. They can approve the transaction (override the flag) or reject it with a written justification. Every decision is timestamped and attributed to the reviewer in the audit log.

### 5. Operational Intelligence

Beyond individual transactions, the system provides department heads and finance managers with a live view of:
- Spend trends over time and across departments
- Budget consumption versus actuals per fiscal period
- Transaction pipeline health (how many are clearing, how many are getting flagged, and why)
- A natural-language AI chat interface for ad-hoc queries against live data

---

## Features

### Document Ingestion and OCR
- Drag-and-drop upload of receipts, invoices, and bills in image or PDF format
- OCR pipeline extracts raw text from uploaded documents
- AI parsing agent structures extracted text into 11 typed fields
- Manual transaction entry form as an alternative to document upload
- Bulk ingestion endpoint for programmatic integration with external systems

### Automated Validation and Scoring
- Rule engine runs immediately on every transaction, no manual trigger required
- Configurable rules with error or warning severity and adjustable parameters
- Scoring model that produces a single 0–100 confidence score per transaction
- Built-in rule types: missing required fields, high-value cash payment, disallowed payment methods, tax rate tolerance, unrecognised vendor
- Rules managed entirely through the UI — no code changes or restarts required

### Exceptions and Review Queue
- Flagged transactions automatically routed to a manager review queue
- Side-by-side view of original document, parsed fields, and rule violations
- Approve or reject each exception with written justification
- Review actions recorded in the audit log with timestamp and actor

### Analytics and Reporting
- Spend trend charts across configurable date ranges
- Department-level expenditure breakdown
- Transaction pipeline funnel: volumes at each stage from pending to validated, flagged, and rejected
- Budget tracking: approved budget vs actual spend by department and fiscal year

### AI Chat Interface
- Natural-language queries over live transaction data, powered by Mistral LLM
- Ask questions like "what did logistics spend in March" or "show all rejected cash transactions above ₹50,000"
- Responses returned as formatted markdown with structured data

### Export
- Export transaction tables and reports as Excel (.xlsx) or PDF
- Exports reflect the active filters — export exactly what is on screen

### Master Data and Configuration
- Admin-managed reference lists: vendors, cost centres, departments, project codes
- All validation rules configurable through the interface
- Budget entries managed per department and fiscal year

### Access Control and Audit
- Role-based access control: admin, manager, and staff with distinct permissions
- JWT authentication with configurable session expiry
- Full audit log: every create, update, approve, and reject captured with user and timestamp

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 18, TypeScript, Tailwind CSS, Radix UI, Recharts, Framer Motion |
| Backend | FastAPI, SQLAlchemy 2.x, SQLite, Python 3.12 |
| AI / OCR | Mistral API, agno agent framework |
| Auth | JWT + bcrypt |
| Export | WeasyPrint (PDF), openpyxl (Excel) |

---

## Project Structure

```
Mis/
├── backend/
│   ├── main.py            # FastAPI app entry point
│   ├── core/              # Config, JWT/bcrypt security, dependencies
│   ├── db/                # SQLAlchemy models and database setup
│   ├── routers/           # API endpoints — auth, transactions, rules, budgets,
│   │                      #   analytics, chat, export, audit log, exceptions
│   ├── agents/            # AI agents — OCR parser, rule validator, chat, reports
│   ├── services/          # OCR service, agno runner, Excel/PDF exporter
│   └── tests/             # pytest test suite (14 test files)
│
├── frontend/
│   ├── proxy.ts           # Next.js middleware — auth routing guard
│   ├── app/               # App Router pages
│   │   ├── page.tsx       # Landing page
│   │   ├── login/         # Login
│   │   └── (dashboard)/   # Auth-gated routes
│   │       ├── dashboard/        # Overview
│   │       ├── transactions/     # Ledger + manual entry
│   │       ├── exceptions/       # Review queue
│   │       ├── insights/         # AI chat + live context
│   │       ├── analytics/        # Spend, departments, pipeline
│   │       ├── reports/          # Report generation
│   │       ├── config/           # Rules, master data, users
│   │       ├── budgets/          # Budget management
│   │       └── audit-log/        # Audit trail
│   ├── components/        # Reusable UI components (tables, charts, dropzone, chat)
│   └── lib/               # Axios API client, auth helpers, utilities
│
└── uploads/               # Uploaded receipt and invoice files
```

---

## Prerequisites

- **Python 3.12+**
- **Node.js 18+** and **npm**
- A **Mistral API key** from [console.mistral.ai](https://console.mistral.ai)

---

## Installation and Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd Mis
```

### 2. Create the Python virtual environment

```bash
python -m venv .venv
```

Activate it:

```bash
# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 3. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set your values:

```env
MISTRAL_API_KEY=your_key_here
JWT_SECRET=change_this_to_a_random_string
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
DATABASE_URL=sqlite:///./mis.db
UPLOAD_DIR=uploads
```

### 5. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Running the Application

Start the backend first, then the frontend.

### Backend

```bash
# Windows (from repo root Mis/)
.venv\Scripts\uvicorn.exe backend.main:app --host 0.0.0.0 --port 8000 --reload

# macOS / Linux
.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

- API base: `http://localhost:8000`
- Interactive API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm run dev
```

- App: `http://localhost:3000`

The frontend proxies all `/api/*` requests to the backend — both must be running.

---

## Default Credentials

| Email | Password | Role |
|---|---|---|
| admin@mis.com | admin123 | admin |
| manager@mis.com | manager123 | manager |

---

## Other Commands

### Backend tests

```bash
.venv\Scripts\pytest.exe backend/tests/ -v
```

### Frontend build and lint

```bash
cd frontend
npm run build    # Production build — also catches TypeScript errors
npm run lint     # ESLint
```
