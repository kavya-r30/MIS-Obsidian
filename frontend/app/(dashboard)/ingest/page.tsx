'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getTransactions, uploadReceipt } from '@/lib/api'
import type { Transaction, UploadResult } from '@/lib/api'
import ValidationBadge from '@/components/ValidationBadge'
import UploadDropzone from '@/components/UploadDropzone'

export default function IngestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [recentLoading, setRecentLoading] = useState(true)

  const fetchRecent = () =>
    getTransactions({ limit: 10 }).then((r) => setRecent(r.items)).finally(() => setRecentLoading(false))

  useEffect(() => { fetchRecent() }, [])

  const handleUpload = async (file: File) => {
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await uploadReceipt(file)
      setResult(r)
      fetchRecent()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-on-surface">Ingest</h1>
        <p className="text-sm text-on-surface-variant mt-1">Upload receipts for OCR extraction and validation</p>
      </div>

      {/* Split panel */}
      <div className="flex gap-6 h-[calc(100vh-10rem)]">

        {/* Left — upload panel (sticky) */}
        <div className="w-[40%] shrink-0 flex flex-col gap-4 sticky top-[calc(3.5rem+1rem)] self-start">
          <UploadDropzone onUpload={handleUpload} loading={loading} />

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          {result && (
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-6 animate-in fade-in zoom-in-95 duration-200">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-4">Upload Result</p>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-on-surface-variant">Transaction ID</dt>
                  <dd className="text-sm font-mono text-on-surface mt-0.5">#{result.id}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-surface-variant mb-1">Status</dt>
                  <dd><ValidationBadge status={result.status} size="lg" /></dd>
                </div>
                <div>
                  <dt className="text-xs text-on-surface-variant">Confidence Score</dt>
                  <dd className="text-lg font-semibold text-primary tabular-nums mt-0.5">
                    {result.confidence_score.toFixed(1)}%
                  </dd>
                </div>
              </dl>
              <Link
                href={`/transactions/${result.id}`}
                className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary hover:opacity-80 transition-opacity"
              >
                View full detail →
              </Link>
            </div>
          )}

          {!result && !error && (
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-5 text-center">
              <p className="text-xs text-on-surface-variant">Upload a receipt to see the result here</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-outline-variant/30 shrink-0" />

        {/* Right — recent uploads (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-3 sticky top-0 bg-background py-2">
            Recent Uploads
          </p>
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg overflow-hidden">
            {recentLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 bg-surface-container-high rounded animate-pulse" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-12">No uploads yet</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    {['Vendor', 'Amount', 'Uploaded', 'Status', 'Confidence', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((tx) => (
                    <tr key={tx.id} className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container/50 transition-colors duration-150">
                      <td className="px-4 py-3 text-sm text-on-surface">{tx.vendor_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-on-surface">
                        {tx.amount != null ? `₹${tx.amount.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {tx.upload_date ? new Date(tx.upload_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3"><ValidationBadge status={tx.status} size="sm" /></td>
                      <td className="px-4 py-3 text-sm tabular-nums text-on-surface-variant">
                        {Math.round(tx.confidence_score ?? 0)}%
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/transactions/${tx.id}`} className="text-xs text-primary hover:opacity-80 transition-opacity">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
