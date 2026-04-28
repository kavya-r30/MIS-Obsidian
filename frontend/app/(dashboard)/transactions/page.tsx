'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Download, ChevronDown, Plus } from 'lucide-react'
import { getTransactions, deleteTransaction, exportExcel, exportPdf, createTransaction, getExceptions, getMasterData } from '@/lib/api'
import type { Transaction, ManualTransactionBody, ExceptionItem } from '@/lib/api'
import { isAdmin, isManager } from '@/lib/auth'
import SplitReviewPanel from '@/components/SplitReviewPanel'
import ValidationBadge from '@/components/ValidationBadge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const CATEGORY_PALETTE = [
  'bg-primary/10 text-primary',
  'bg-tertiary/10 text-tertiary',
  'bg-secondary/10 text-secondary',
  'bg-error/10 text-error',
  'bg-primary-container/20 text-primary',
  'bg-secondary-container/20 text-secondary',
  'bg-tertiary-container/20 text-tertiary',
] as const

function categoryClass(category: string | null, allCategories: string[]): string {
  if (!category) return 'bg-surface-container-high text-on-surface-variant'
  const idx = allCategories.indexOf(category)
  if (idx < 0) return 'bg-surface-container-high text-on-surface-variant'
  return CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length]
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score)
  const color = pct >= 80 ? 'bg-primary' : pct >= 60 ? 'bg-yellow-400' : 'bg-error'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-on-surface-variant">{pct}%</span>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function TransactionsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Manual entry dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<ManualTransactionBody>({
    vendor_name: '', amount: 0, currency: 'INR', transaction_date: '',
    department: '', tax_amount: undefined, approval_date: undefined,
    cost_center: undefined, payment_method: undefined,
    invoice_number: undefined, approval_ref: undefined,
    expense_category: undefined,
  })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Export panel
  const [exportOpen, setExportOpen] = useState(false)
  const [exportDept, setExportDept] = useState('')
  const [exportStart, setExportStart] = useState('')
  const [exportEnd, setExportEnd] = useState('')
  const [xlLoading, setXlLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const [allCategories, setAllCategories] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined)

  const [adminUser, setAdminUser] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [activeTab, setActiveTab] = useState<'ledger' | 'review'>('ledger')
  const [reviewItems, setReviewItems] = useState<ExceptionItem[]>([])
  const [reviewLoading, setReviewLoading] = useState(false)
  useEffect(() => { setAdminUser(isAdmin()); setCanReview(isAdmin() || isManager()) }, [])

  useEffect(() => {
    getMasterData('expense_category').then((rows) => {
      setAllCategories(rows.filter((r) => r.is_active !== false).map((r) => r.value))
    })
  }, [])

  const fetchData = (s = 0) => {
    setLoading(true)
    setFetchError(null)
    getTransactions({
      status: statusFilter || undefined,
      department: deptFilter || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      expense_category: categoryFilter,
      skip: s,
      limit: 50,
    })
      .then((r) => {
        setItems((prev) => s === 0 ? r.items : [...prev, ...r.items])
        setTotal(r.total)
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load transactions')
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSkip(0); fetchData(0) }, [statusFilter, deptFilter, startDate, endDate, categoryFilter])

  useEffect(() => {
    if (activeTab === 'review') {
      setReviewLoading(true)
      getExceptions().then(setReviewItems).finally(() => setReviewLoading(false))
    }
  }, [activeTab])

  const filtered = search
    ? items.filter((t) => t.vendor_name?.toLowerCase().includes(search.toLowerCase()))
    : items

  const totalSpend = filtered.reduce((sum, t) => sum + (t.amount ?? 0), 0)

  const handleDelete = async () => {
    if (deleteId == null) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTransaction(deleteId)
      setItems((prev) => prev.filter((t) => t.id !== deleteId))
      setDeleteId(null)
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleAddTransaction = async () => {
    if (!addForm.vendor_name.trim() || !addForm.transaction_date || !addForm.department.trim() || !addForm.amount) return
    setAddLoading(true)
    setAddError(null)
    try {
      const created = await createTransaction({
        ...addForm,
        vendor_name: addForm.vendor_name.trim(),
        department: addForm.department.trim(),
        // strip empty optional strings to undefined
        cost_center: addForm.cost_center?.trim() || undefined,
        payment_method: addForm.payment_method?.trim() || undefined,
        invoice_number: addForm.invoice_number?.trim() || undefined,
        approval_ref: addForm.approval_ref?.trim() || undefined,
        approval_date: addForm.approval_date || undefined,
        expense_category: addForm.expense_category || undefined,
      })
      setItems((prev) => [created, ...prev])
      setTotal((t) => t + 1)
      setAddOpen(false)
      setAddForm({
        vendor_name: '', amount: 0, currency: 'INR', transaction_date: '',
        department: '', tax_amount: undefined, approval_date: undefined,
        cost_center: undefined, payment_method: undefined,
        invoice_number: undefined, approval_ref: undefined,
        expense_category: undefined,
      })
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to create transaction')
    } finally {
      setAddLoading(false)
    }
  }

  const exportParams = {
    start_date: exportStart || undefined,
    end_date: exportEnd || undefined,
    department: exportDept || undefined,
  }

  const handleExcel = async () => {
    setXlLoading(true); setExportError(null)
    try { downloadBlob(await exportExcel(exportParams), 'obsidian-transactions.xlsx') }
    catch { setExportError('Excel export failed') }
    finally { setXlLoading(false) }
  }

  const handlePdf = async () => {
    setPdfLoading(true); setExportError(null)
    try { downloadBlob(await exportPdf(exportParams), 'obsidian-transactions.pdf') }
    catch { setExportError('PDF export failed') }
    finally { setPdfLoading(false) }
  }

  const cols = adminUser ? 8 : 7

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${activeTab === 'ledger' ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
          >
            The Ledger
          </button>
          {canReview && (
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${activeTab === 'review' ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
            >
              Review Queue
              {reviewItems.length > 0 && activeTab !== 'review' && (
                <span className="ml-1.5 text-[0.625rem] bg-primary text-on-primary rounded-full px-1.5 py-0.5">{reviewItems.length}</span>
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAddError(null); setAddOpen(true) }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium px-4 py-2 text-sm hover:opacity-90 transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
          <button
            onClick={() => setExportOpen((v) => !v)}
            className="flex items-center gap-2 border border-outline-variant/40 rounded-full px-4 py-2 text-sm font-body text-on-surface-variant hover:bg-surface-container transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            Export
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${exportOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Review Queue tab */}
      {activeTab === 'review' && canReview && (
        <div className="h-[calc(100vh-12rem)]">
          {reviewLoading ? (
            <div className="flex gap-4 h-full">
              <div className="w-80 bg-surface-container-low border border-outline-variant/20 rounded-lg animate-pulse" />
              <div className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-lg animate-pulse" />
            </div>
          ) : (
            <SplitReviewPanel
              items={reviewItems}
              onRemove={(id) => setReviewItems((p) => p.filter((i) => i.id !== id))}
            />
          )}
        </div>
      )}

      {/* Ledger tab content */}
      {activeTab === 'ledger' && <>

      {/* Export panel */}
      {exportOpen && (
        <div className="bg-surface-container-low border border-white/5 rounded-lg p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-4">Export Options</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-[0.625rem] uppercase tracking-[0.08em] text-on-surface-variant">From</label>
              <input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)}
                className="bg-surface-container border border-white/5 rounded px-3 py-1.5 text-sm text-on-surface outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.625rem] uppercase tracking-[0.08em] text-on-surface-variant">To</label>
              <input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)}
                className="bg-surface-container border border-white/5 rounded px-3 py-1.5 text-sm text-on-surface outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.625rem] uppercase tracking-[0.08em] text-on-surface-variant">Department</label>
              <input value={exportDept} onChange={(e) => setExportDept(e.target.value)} placeholder="All departments"
                className="bg-surface-container border border-white/5 rounded px-3 py-1.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary/50 transition-colors w-44" />
            </div>
          </div>
          {exportError && <p className="text-xs text-error mb-3">{exportError}</p>}
          <div className="flex gap-2">
            <button onClick={handleExcel} disabled={xlLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity active:scale-95 duration-100 disabled:opacity-40">
              <Download className="w-3.5 h-3.5" />
              {xlLoading ? 'Generating...' : 'Excel'}
            </button>
            <button onClick={handlePdf} disabled={pdfLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-white/10 text-on-surface-variant text-sm font-medium hover:bg-white/5 transition-colors active:scale-95 duration-100 disabled:opacity-40">
              <Download className="w-3.5 h-3.5" />
              {pdfLoading ? 'Generating...' : 'PDF'}
            </button>
          </div>
        </div>
      )}

      {fetchError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{fetchError}</div>
      )}

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setCategoryFilter(undefined)}
          className={`px-3 py-1 rounded-full text-xs ${categoryFilter === undefined ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          All
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs ${categoryFilter === cat ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendor..."
          className="bg-surface-container-low border border-white/5 rounded px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary/50 transition-colors duration-150 w-52"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface-container-low border border-white/5 rounded px-3 py-2 text-sm text-on-surface outline-none focus:border-primary/50 transition-colors duration-150"
        >
          <option value="">All statuses</option>
          {['pending','validated','flagged','approved','rejected'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          placeholder="Department..."
          className="bg-surface-container-low border border-white/5 rounded px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary/50 transition-colors duration-150 w-40"
        />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          title="From date"
          className="bg-surface-container-low border border-white/5 rounded px-3 py-2 text-sm text-on-surface outline-none focus:border-primary/50 transition-colors duration-150" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          title="To date"
          className="bg-surface-container-low border border-white/5 rounded px-3 py-2 text-sm text-on-surface outline-none focus:border-primary/50 transition-colors duration-150" />
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-4 text-xs text-on-surface-variant">
        <span><span className="tabular-nums font-semibold text-on-surface">{filtered.length}</span> of {total} transactions</span>
        <span>Total filtered spend: <span className="tabular-nums font-semibold text-on-surface">₹{totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
      </div>

      {/* Table */}
      <div className="bg-surface-container-low border border-white/5 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {['Vendor', 'Amount', 'Date', 'Department', 'Category', 'Status', 'Confidence', ...(adminUser ? ['Actions'] : [])].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {Array.from({ length: cols }).map((__, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-surface-container-high rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={cols} className="px-5 py-10 text-center text-sm text-on-surface-variant">No transactions found</td></tr>
            ) : filtered.map((tx) => (
              <tr
                key={tx.id}
                onClick={() => router.push(`/transactions/${tx.id}`)}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors duration-150"
              >
                <td className="px-5 py-3 text-sm text-on-surface">
                  <div className="flex items-center gap-1.5">
                    <span>{tx.vendor_name ?? '—'}</span>
                    {tx.is_duplicate && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold rounded px-1 leading-tight shrink-0">DUP</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-sm tabular-nums text-on-surface">{tx.amount != null ? `₹${tx.amount.toLocaleString()}` : '—'}</td>
                <td className="px-5 py-3 text-sm text-on-surface-variant">{tx.transaction_date ?? '—'}</td>
                <td className="px-5 py-3 text-sm text-on-surface-variant">{tx.department ?? '—'}</td>
                <td className="px-4 py-3">
                  {tx.expense_category && (
                    <span className={`inline-block text-[0.65rem] font-medium px-2 py-0.5 rounded ${categoryClass(tx.expense_category, allCategories)}`}>
                      {tx.expense_category.replace(/_/g, ' ')}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3"><ValidationBadge status={tx.status} size="sm" /></td>
                <td className="px-5 py-3"><ConfidenceBar score={tx.confidence_score ?? 0} /></td>
                {adminUser && (
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setDeleteId(tx.id)}
                      className="text-on-surface-variant hover:text-error transition-colors duration-150 p-1 rounded hover:bg-error/10"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && items.length < total && (
          <div className="px-5 py-4 border-t border-white/5">
            <button
              onClick={() => { const next = skip + 50; setSkip(next); fetchData(next) }}
              className="text-sm text-primary hover:opacity-80 transition-opacity"
            >
              Load more ({total - items.length} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
        <AlertDialogContent className="bg-surface-container border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface font-semibold">Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant text-sm">
              This will permanently delete the transaction and all its validation logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-on-surface-variant hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-error text-on-error hover:opacity-90 transition-opacity">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </> /* end ledger tab */}

      {/* Manual entry dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setAddError(null) } }}>
        <DialogContent className="bg-surface-container border-outline-variant/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-on-surface">Add Transaction Entry</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Required fields */}
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Vendor Name <span className="text-error">*</span>
              </Label>
              <Input value={addForm.vendor_name}
                onChange={(e) => setAddForm((f) => ({ ...f, vendor_name: e.target.value }))}
                placeholder="e.g. Acme Corp"
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Amount (₹) <span className="text-error">*</span>
              </Label>
              <Input type="number" min="0" step="0.01"
                value={addForm.amount || ''}
                onChange={(e) => setAddForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="e.g. 15000"
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Transaction Date <span className="text-error">*</span>
              </Label>
              <Input type="date" value={addForm.transaction_date}
                onChange={(e) => setAddForm((f) => ({ ...f, transaction_date: e.target.value }))}
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Department <span className="text-error">*</span>
              </Label>
              <Input value={addForm.department}
                onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="e.g. Engineering"
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40" />
            </div>

            {/* Optional fields */}
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Tax Amount <span className="opacity-40 normal-case">(optional)</span>
              </Label>
              <Input type="number" min="0" step="0.01"
                value={addForm.tax_amount ?? ''}
                onChange={(e) => setAddForm((f) => ({ ...f, tax_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                placeholder="e.g. 2700"
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Currency <span className="opacity-40 normal-case">(optional)</span>
              </Label>
              <Input value={addForm.currency ?? ''}
                onChange={(e) => setAddForm((f) => ({ ...f, currency: e.target.value || 'INR' }))}
                placeholder="INR"
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Cost Center <span className="opacity-40 normal-case">(optional)</span>
              </Label>
              <Input value={addForm.cost_center ?? ''}
                onChange={(e) => setAddForm((f) => ({ ...f, cost_center: e.target.value || undefined }))}
                placeholder="e.g. CC001"
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Expense Category (optional)
              </Label>
              <Select
                value={addForm.expense_category ?? '__none__'}
                onValueChange={(val) => setAddForm((f) => ({ ...f, expense_category: val === '__none__' ? undefined : val }))}
              >
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  <SelectItem value="__none__">None</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Payment Method <span className="opacity-40 normal-case">(optional)</span>
              </Label>
              <Input value={addForm.payment_method ?? ''}
                onChange={(e) => setAddForm((f) => ({ ...f, payment_method: e.target.value || undefined }))}
                placeholder="e.g. bank_transfer, upi"
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Invoice Number <span className="opacity-40 normal-case">(optional)</span>
              </Label>
              <Input value={addForm.invoice_number ?? ''}
                onChange={(e) => setAddForm((f) => ({ ...f, invoice_number: e.target.value || undefined }))}
                placeholder="e.g. INV-2024-001"
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Approval Ref <span className="opacity-40 normal-case">(optional)</span>
              </Label>
              <Input value={addForm.approval_ref ?? ''}
                onChange={(e) => setAddForm((f) => ({ ...f, approval_ref: e.target.value || undefined }))}
                placeholder="e.g. APR-0042"
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Approval Date <span className="opacity-40 normal-case">(optional)</span>
              </Label>
              <Input type="date" value={addForm.approval_date ?? ''}
                onChange={(e) => setAddForm((f) => ({ ...f, approval_date: e.target.value || undefined }))}
                className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary rounded-none text-on-surface" />
            </div>
          </div>

          {addError && <p className="text-sm text-error mt-2">{addError}</p>}

          <DialogFooter className="mt-4">
            <button
              onClick={() => { setAddOpen(false); setAddError(null) }}
              className="border border-outline-variant/40 rounded-full px-5 py-2 text-sm font-body text-on-surface-variant hover:bg-surface-container transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTransaction}
              disabled={addLoading || !addForm.vendor_name.trim() || !addForm.transaction_date || !addForm.department.trim() || !addForm.amount}
              className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium px-5 py-2 text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              {addLoading ? 'Saving & Validating…' : 'Add & Validate'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
