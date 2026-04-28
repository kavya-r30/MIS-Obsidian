'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getTransaction, revalidateTransaction, TransactionDetail } from '@/lib/api'
import { isAdmin } from '@/lib/auth'
import ValidationBadge from '@/components/ValidationBadge'
import ValidationLogList from '@/components/ValidationLogList'

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return '—'
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : (currency ?? '')
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return value
  }
}

export default function TransactionDetailPage() {
  const params = useParams()
  const id = Number(params.id)

  const [tx, setTx] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revalidating, setRevalidating] = useState(false)
  const [revalidateError, setRevalidateError] = useState<string | null>(null)
  const [adminUser, setAdminUser] = useState(false)
  useEffect(() => { setAdminUser(isAdmin()) }, [])

  const fetchTransaction = useCallback(() => {
    setLoading(true)
    setError(null)
    getTransaction(id)
      .then((data) => setTx(data))
      .catch((err: Error) => setError(err?.message ?? 'Failed to load transaction'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchTransaction() }, [fetchTransaction])

  async function handleRevalidate() {
    setRevalidating(true)
    setRevalidateError(null)
    try {
      await revalidateTransaction(id)
      fetchTransaction()
    } catch (err: unknown) {
      setRevalidateError(err instanceof Error ? err.message : 'Revalidation failed')
    } finally {
      setRevalidating(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-8 py-16">
        <div className="animate-pulse space-y-8">
          <div className="h-6 w-24 bg-surface-container-high rounded" />
          <div className="h-12 w-64 bg-surface-container-high rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">{Array.from({ length: 14 }).map((_, i) => <div key={i} className="h-10 bg-surface-container-high rounded" />)}</div>
            <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-surface-container-high rounded" />)}</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tx) {
    return (
      <div className="max-w-[1600px] mx-auto px-8 py-16 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <p className="font-body text-on-surface-variant text-base">{error ?? 'Transaction not found'}</p>
        <Link href="/transactions" className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-primary/80 hover:text-primary transition-colors">
          ← Back to Ledger
        </Link>
      </div>
    )
  }

  const hasReviewInfo = tx.rejection_reason || tx.reviewed_by_name || tx.reviewed_at

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-16">
      <Link
        href="/transactions"
        className="inline-flex items-center gap-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant hover:text-on-surface transition-colors mb-10"
      >
        ← Back
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-6 mb-12">
        <div className="flex items-center gap-3">
          <ValidationBadge status={tx.status} size="lg" />
          {tx.is_duplicate && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 uppercase tracking-wide">
              DUPLICATE
            </span>
          )}
        </div>

        <div>
          <p className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant mb-1">Confidence Score</p>
          <p className="text-4xl font-semibold text-on-surface leading-none">
            {tx.confidence_score != null ? `${Number(tx.confidence_score).toFixed(1)}%` : '—'}
          </p>
        </div>

        {adminUser && (
          <div className="ml-auto flex flex-col items-end gap-1">
            <button
              onClick={handleRevalidate}
              disabled={revalidating}
              className="px-6 py-3 rounded-full font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-primary bg-gradient-to-r from-primary/80 to-primary hover:from-primary hover:to-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {revalidating ? 'Revalidating…' : 'Re-validate'}
            </button>
            {revalidateError && <p className="font-body text-xs text-error">{revalidateError}</p>}
          </div>
        )}
      </div>

      {/* Rejection reason banner — prominent, shown whenever reason exists */}
      {tx.rejection_reason && (
        <div className="mb-8 rounded-lg border border-error/20 bg-error/5 px-6 py-4">
          <p className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-error mb-1">Rejection Reason</p>
          <p className="font-body text-sm text-on-surface">{tx.rejection_reason}</p>
        </div>
      )}

      {/* Two-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Metadata */}
        <div className="bg-surface-container-low rounded-lg p-8">
          <p className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant mb-6">Transaction Details</p>
          <dl>
            {([
              ['Vendor',          tx.vendor_name],
              ['Amount',          formatAmount(tx.amount, tx.currency)],
              ['Tax Amount',      formatAmount(tx.tax_amount, tx.currency)],
              ['Currency',        tx.currency],
              ['Transaction Date',tx.transaction_date ? formatDate(tx.transaction_date) : null],
              ['Upload Date',     tx.upload_date ? formatDate(tx.upload_date) : null],
              ['Department',      tx.department],
              ['Cost Center',     tx.cost_center],
              ['Payment Method',  tx.payment_method],
              ['Invoice No.',     tx.invoice_number],
              ['Original File',   tx.original_filename],
              ['Approval Ref',    tx.approval_ref],
              ['Revalidations',   String(tx.revalidation_count ?? 0)],
            ] as [string, string | null][]).map(([label, val]) => (
              <div key={label} className="mb-4">
                <dt className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">{label}</dt>
                <dd className="font-body text-sm text-on-surface mt-1">{val ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Validation logs */}
        <div className="bg-surface-container-low rounded-lg p-8">
          <p className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant mb-6">Validation Logs</p>
          {tx.validation_logs.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No validation logs yet.</p>
          ) : (
            <ValidationLogList logs={tx.validation_logs} />
          )}
        </div>
      </div>

      {/* Review decision */}
      {hasReviewInfo && (
        <div className="mt-10 bg-surface-container-low rounded-lg p-8">
          <p className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant mb-6">Review Decision</p>
          <dl>
            {tx.reviewed_by_name && (
              <div className="mb-4">
                <dt className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">Reviewed By</dt>
                <dd className="font-body text-sm text-on-surface mt-1">{tx.reviewed_by_name}</dd>
              </div>
            )}
            {tx.reviewed_at && (
              <div className="mb-4">
                <dt className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">Reviewed At</dt>
                <dd className="font-body text-sm text-on-surface mt-1">{formatDate(tx.reviewed_at)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Raw text */}
      {tx.raw_text && (
        <div className="mt-10 bg-surface-container-low rounded-lg p-8">
          <p className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant mb-6">Raw Extracted Text</p>
          <pre className="font-mono text-xs text-on-surface-variant whitespace-pre-wrap break-words leading-relaxed">{tx.raw_text}</pre>
        </div>
      )}
    </div>
  )
}
