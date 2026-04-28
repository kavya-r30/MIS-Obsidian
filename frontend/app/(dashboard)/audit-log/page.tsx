'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import { getAuditLog, AuditLogEntry } from '@/lib/api'
import { Input } from '@/components/ui/input'

const PAGE_SIZE = 50

function formatTimestamp(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function truncateJson(details: Record<string, unknown> | null): string {
  if (!details) return '—'
  const str = JSON.stringify(details)
  return str.length > 80 ? str.slice(0, 77) + '…' : str
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-surface-container-high rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

const TABLE_HEADERS = ['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'Details']

function TableHead() {
  return (
    <thead>
      <tr className="border-b border-white/5">
        {TABLE_HEADERS.map((h) => (
          <th
            key={h}
            className="px-4 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export default function AuditLogPage() {
  const router = useRouter()
  const fetchSeqRef = useRef(0)

  const [items, setItems] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const [actionInput, setActionInput] = useState('')
  const [entityTypeInput, setEntityTypeInput] = useState('')
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined)
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>(undefined)

  const fetchPage = useCallback(
    async (s: number, action: string | undefined, entityType: string | undefined) => {
      return getAuditLog({
        skip: s,
        limit: PAGE_SIZE,
        ...(action ? { action } : {}),
        ...(entityType ? { entity_type: entityType } : {}),
      })
    },
    []
  )

  const loadInitial = useCallback(
    async (action: string | undefined, entityType: string | undefined) => {
      const seq = ++fetchSeqRef.current
      setLoading(true)
      setFetchError(null)
      setSkip(0)
      try {
        const result = await fetchPage(0, action, entityType)
        if (fetchSeqRef.current !== seq) return
        setItems(result.items)
        setTotal(result.total)
        setSkip(result.items.length)
      } catch (err: unknown) {
        if (fetchSeqRef.current !== seq) return
        setFetchError(err instanceof Error ? err.message : 'Failed to load audit log')
      } finally {
        if (fetchSeqRef.current === seq) setLoading(false)
      }
    },
    [fetchPage]
  )

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/')
      return
    }
    loadInitial(undefined, undefined)
  }, [router, loadInitial])

  const handleSearch = () => {
    const action = actionInput.trim() || undefined
    const entityType = entityTypeInput.trim() || undefined
    setActionFilter(action)
    setEntityTypeFilter(entityType)
    loadInitial(action, entityType)
  }

  const handleClear = () => {
    setActionInput('')
    setEntityTypeInput('')
    setActionFilter(undefined)
    setEntityTypeFilter(undefined)
    loadInitial(undefined, undefined)
  }

  const handleLoadMore = async () => {
    if (loadingMore || skip >= total) return
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const result = await fetchPage(skip, actionFilter, entityTypeFilter)
      setItems((prev) => [...prev, ...result.items])
      setSkip((s) => s + result.items.length)
    } catch (err: unknown) {
      setLoadMoreError(err instanceof Error ? err.message : 'Failed to load more entries')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Audit Log</h1>
          {!loading && !fetchError && (
            <p className="mt-1 text-sm text-on-surface-variant">
              {total.toLocaleString()} {total === 1 ? 'entry' : 'entries'} total
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
            Action
          </label>
          <Input
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. create, update"
            className="w-48 bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
            Entity Type
          </label>
          <Input
            value={entityTypeInput}
            onChange={(e) => setEntityTypeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. transaction, user"
            className="w-48 bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
          />
        </div>
        <div className="flex gap-2 pb-0.5">
          <button
            onClick={handleSearch}
            className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium py-2 px-5 text-sm transition-all duration-300 hover:opacity-90"
          >
            Search
          </button>
          {(actionFilter !== undefined || entityTypeFilter !== undefined) && (
            <button
              onClick={handleClear}
              className="border border-white/10 rounded-full px-5 py-2 text-sm font-body text-on-surface-variant hover:bg-white/5 transition-all duration-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        {loading ? (
          <table className="w-full">
            <TableHead />
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-body text-red-600 text-base">{fetchError}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-body text-on-surface-variant text-base">No audit log entries found</p>
          </div>
        ) : (
          <table className="w-full">
            <TableHead />
            <tbody>
              {items.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-body text-sm text-on-surface-variant whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-on-surface">
                    {entry.user_id ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-on-surface-variant">
                    {entry.entity_type ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-on-surface-variant">
                    {entry.entity_id ?? '—'}
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs text-on-surface-variant max-w-xs"
                    title={entry.details ? JSON.stringify(entry.details) : undefined}
                  >
                    {truncateJson(entry.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load more */}
      {!loading && !fetchError && skip < total && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="border border-white/10 rounded-full px-6 py-2.5 text-sm font-body text-on-surface-variant hover:bg-white/5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loadingMore
              ? 'Loading…'
              : `Load more (${items.length} of ${total.toLocaleString()})`}
          </button>
          {loadMoreError && (
            <p className="text-xs text-red-600">{loadMoreError}</p>
          )}
        </div>
      )}
    </div>
  )
}
