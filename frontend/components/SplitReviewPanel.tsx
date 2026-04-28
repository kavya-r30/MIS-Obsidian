'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { approveException, rejectException, getTransaction } from '@/lib/api'
import type { ExceptionItem, TransactionDetail } from '@/lib/api'
import ValidationBadge from '@/components/ValidationBadge'
import ValidationLogList from '@/components/ValidationLogList'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  items: ExceptionItem[]
  onRemove: (id: number) => void
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function SplitReviewPanel({ items, onRemove }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<TransactionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [detailError, setDetailError] = useState<string | null>(null)

  const handleSelect = (id: number) => {
    setSelectedId(id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    setRejectMode(false)
    setRejectionReason('')
    const capturedId = id
    getTransaction(id)
      .then((data) => { if (capturedId === id) setDetail(data) })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load transaction'
        setDetailError(msg)
      })
      .finally(() => setDetailLoading(false))
  }

  const handleApproveClick = () => {
    if (acting) return
    setRejectMode(false)
    setRejectionReason('')
    setActionType('approve')
  }

  const handleRejectClick = () => {
    if (acting) return
    setRejectMode(true)
    setRejectionReason('')
  }

  const handleCancelReject = () => {
    setRejectMode(false)
    setRejectionReason('')
  }

  const handleConfirmReject = async () => {
    if (!selectedId || !rejectionReason.trim()) return
    setActing(true)
    setActionError(null)
    try {
      await rejectException(selectedId, rejectionReason.trim())
      onRemove(selectedId)
      setSelectedId(null)
      setDetail(null)
      setRejectMode(false)
      setRejectionReason('')
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setActing(false)
    }
  }

  const handleApproveConfirm = async () => {
    if (!selectedId) return
    setActing(true)
    setActionError(null)
    try {
      await approveException(selectedId)
      onRemove(selectedId)
      setSelectedId(null)
      setDetail(null)
      setActionType(null)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Approve failed')
      setActionType(null)
    } finally {
      setActing(false)
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-on-surface-variant text-center py-16">No flagged transactions requiring review.</p>
  }

  const d = detail

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Left list */}
      <div className="w-80 shrink-0 bg-surface-container-low border border-white/5 rounded-lg overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`w-full text-left px-4 py-4 border-b border-white/5 last:border-0 transition-colors duration-150 ${
              selectedId === item.id
                ? 'bg-primary/10 border-l-2 border-l-primary pl-[calc(1rem-2px)]'
                : 'hover:bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-on-surface truncate">{item.vendor_name ?? 'Unknown Vendor'}</p>
              {item.is_duplicate && (
                <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs font-semibold uppercase shrink-0">
                  Duplicate
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {item.amount != null ? `₹${item.amount.toLocaleString()}` : '—'}
              {' · '}
              {item.department ?? '—'}
            </p>
            <p className="text-[0.625rem] tabular-nums text-on-surface-variant mt-1">
              {Math.round(item.confidence_score ?? 0)}% confidence
              {item.transaction_date ? ` · ${formatDate(item.transaction_date)}` : ''}
            </p>
          </button>
        ))}
      </div>

      {/* Right detail */}
      <div className="flex-1 bg-surface-container-low border border-white/5 rounded-lg overflow-y-auto">
        {!selectedId ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-on-surface-variant">Select a transaction to review</p>
          </div>
        ) : detailLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-surface-container-high rounded animate-pulse" />
            ))}
          </div>
        ) : detailError ? (
          <div className="h-full flex items-center justify-center p-6">
            <p className="text-sm text-red-600 text-center">{detailError}</p>
          </div>
        ) : d ? (
          <div className="p-6 animate-in fade-in duration-200">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-lg font-semibold text-on-surface">{d.vendor_name ?? 'Unknown Vendor'}</p>
                  {d.is_duplicate && (
                    <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs font-semibold uppercase">
                      Duplicate
                    </span>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant mt-1">
                  {d.amount != null ? `₹${d.amount.toLocaleString()}` : '—'}
                  {' · '}
                  {d.department ?? '—'}
                  {d.transaction_date ? ` · ${formatDate(d.transaction_date)}` : ''}
                </p>
              </div>
              <ValidationBadge status={d.status} size="lg" />
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
              {([
                ['Currency', d.currency],
                ['Cost Center', d.cost_center],
                ['Payment Method', d.payment_method],
                ['Approval Ref', d.approval_ref],
              ] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant">{k}</dt>
                  <dd className="text-sm text-on-surface mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>

            {d.validation_logs.length > 0 && (
              <div className="mb-6">
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant mb-3">Validation Logs</p>
                <ValidationLogList logs={d.validation_logs} />
              </div>
            )}

            {/* Action area */}
            <div className="pt-4 border-t border-white/5">
              {rejectMode ? (
                <div className="space-y-3">
                  <label className="block text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    rows={3}
                    className="w-full rounded-md bg-surface-container border border-white/10 text-sm text-on-surface placeholder:text-on-surface-variant/50 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/60"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmReject}
                      disabled={acting || !rejectionReason.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-error text-on-error text-sm font-medium hover:opacity-90 transition-opacity active:scale-95 duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                      {acting ? 'Processing...' : 'Confirm Reject'}
                    </button>
                    <button
                      onClick={handleCancelReject}
                      disabled={acting}
                      className="px-5 py-2.5 rounded-md border border-white/10 text-on-surface-variant text-sm font-medium hover:bg-white/5 transition-colors duration-150 active:scale-95 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </div>
                  {actionError && (
                    <p className="text-xs text-red-600">{actionError}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={handleApproveClick}
                      disabled={acting}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity active:scale-95 duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={handleRejectClick}
                      disabled={acting}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-md border border-error/30 text-error text-sm font-medium hover:bg-error/10 transition-colors duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                  {actionError && (
                    <p className="text-xs text-red-600">{actionError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Approve confirm dialog */}
      <AlertDialog open={actionType === 'approve'} onOpenChange={(o) => { if (!o) setActionType(null) }}>
        <AlertDialogContent className="bg-surface-container border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface font-semibold">
              Approve transaction?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant text-sm">
              This transaction will be marked as approved and removed from the review queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-on-surface-variant hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              disabled={acting}
              className="bg-primary text-on-primary hover:opacity-90"
            >
              {acting ? 'Processing...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
