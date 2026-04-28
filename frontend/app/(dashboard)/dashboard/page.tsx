'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Upload, AlertTriangle, Download, MessageSquare } from 'lucide-react'
import {
  getAnalyticsSummary, getAnalyticsSpend, getAnalyticsTrends,
  getTransactions, getAnalyticsDepartment, getBudgetVariance,
} from '@/lib/api'
import type {
  AnalyticsSummary, SpendAnalytics, TrendPoint, Transaction, DeptStat, BudgetVariance,
} from '@/lib/api'
import { isAdmin, isManager } from '@/lib/auth'
import ValidationBadge from '@/components/ValidationBadge'
import QuickActionCard from '@/components/QuickActionCard'

function useRole() {
  const [admin, setAdmin] = useState(false)
  const [manager, setManager] = useState(false)
  useEffect(() => { setAdmin(isAdmin()); setManager(isManager()) }, [])
  return { admin, manager }
}

const TrendsChart = dynamic(() => import('@/components/charts/TrendsChart'), { ssr: false })

function KpiCard({ label, value, sub, delay = 0 }: { label: string; value: string; sub?: string; delay?: number }) {
  return (
    <div
      className="bg-surface-container-low border border-white/5 rounded-lg p-5 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant mb-2">{label}</p>
      <p className="text-2xl font-semibold text-on-surface tabular-nums">{value}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </div>
  )
}

function fmt(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function DeptSpendBars({ depts, loading }: { depts: DeptStat[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 bg-surface-container-high rounded animate-pulse" />
        ))}
      </div>
    )
  }
  if (depts.length === 0) {
    return <p className="text-sm text-on-surface-variant text-center py-6">No department data</p>
  }
  const maxCount = Math.max(...depts.map((d) => d.count), 1)
  return (
    <div className="space-y-3">
      {depts.map((dept) => {
        const pct = Math.round((dept.count / maxCount) * 100)
        return (
          <div key={dept.department}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-on-surface truncate max-w-[55%]">{dept.department}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[0.6875rem] text-on-surface-variant tabular-nums">{dept.count} txn</span>
                <span className="text-[0.6875rem] text-on-surface-variant tabular-nums">{dept.avg_score.toFixed(1)}% conf</span>
              </div>
            </div>
            <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BudgetVarianceCard() {
  const [data, setData] = useState<BudgetVariance[]>([])
  const [loading, setLoading] = useState(true)

  // Compute current Indian fiscal period client-side
  const now = new Date()
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fy = `${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, '0')}`
  const monthNum = now.getMonth() + 1
  const qNum = monthNum >= 4 ? Math.floor((monthNum - 4) / 3) + 1 : 4
  const quarter = `Q${qNum}`

  // Quarter date bounds (used for transaction drill-through)
  const _Q_BOUNDS: Record<string, [string, string]> = {
    Q1: [`${fyStartYear}-04-01`, `${fyStartYear}-06-30`],
    Q2: [`${fyStartYear}-07-01`, `${fyStartYear}-09-30`],
    Q3: [`${fyStartYear}-10-01`, `${fyStartYear}-12-31`],
    Q4: [`${fyStartYear + 1}-01-01`, `${fyStartYear + 1}-03-31`],
  }
  const [startDate, endDate] = _Q_BOUNDS[quarter]
  const periodLabel = `${quarter} FY ${fy}`

  useEffect(() => {
    getBudgetVariance({ fiscal_year: fy, quarter })
      .then(setData)
      .finally(() => setLoading(false))
  }, [fy, quarter])

  const Header = () => (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs uppercase tracking-wider text-on-surface-variant">Budget Variance</p>
      <p className="text-xs text-on-surface-variant">{periodLabel}</p>
    </div>
  )

  if (loading) {
    return (
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-lg p-4">
        <Header />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse bg-surface-container-high rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-lg p-4">
        <Header />
        <p className="text-sm text-on-surface-variant mb-3">
          No budgets set for {periodLabel}.
        </p>
        <Link href="/config?tab=budgets" className="text-sm text-primary hover:underline">
          Set up budgets →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-lg p-4">
      <Header />
      <div className="space-y-2">
        {data.map((d) => {
          const pct = Math.min(d.pct_used, 100)
          const color =
            d.status === 'over' ? 'bg-error' :
            d.status === 'warning' ? 'bg-tertiary' :
            'bg-primary'
          const drillHref = `/transactions?department=${encodeURIComponent(d.department)}&start_date=${startDate}&end_date=${endDate}`
          return (
            <Link
              key={d.department}
              href={drillHref}
              className="block hover:bg-surface-container rounded p-2 -mx-2 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-on-surface font-medium">{d.department}</span>
                <span className="text-on-surface-variant font-mono">
                  ₹{d.spent.toLocaleString('en-IN')} / ₹{d.budgeted.toLocaleString('en-IN')}
                  {d.status === 'over' && (
                    <span className="text-error ml-1">+{(d.pct_used - 100).toFixed(0)}%</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function OverviewPage() {
  const { admin, manager } = useRole()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [spend, setSpend] = useState<SpendAnalytics | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [recent, setRecent] = useState<{ total: number; items: Transaction[] }>({ total: 0, items: [] })
  const [depts, setDepts] = useState<DeptStat[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getAnalyticsSummary(),
      getAnalyticsSpend(),
      getAnalyticsTrends(),
      getTransactions({ limit: 8 }),
      getAnalyticsDepartment(),
    ]).then(([s, sp, t, r, d]) => {
      setSummary(s); setSpend(sp); setTrends(t); setRecent(r); setDepts(d)
    }).catch((err: unknown) => {
      setFetchError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-on-surface">Overview</h1>
        <p className="text-sm text-on-surface-variant mt-1">Financial transaction management dashboard</p>
      </div>

      {fetchError && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{fetchError}</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Total Transactions" value={loading ? '—' : String(summary?.total ?? 0)} delay={0} />
        <KpiCard label="Pending" value={loading ? '—' : String(summary?.pending ?? 0)} sub="Awaiting processing" delay={60} />
        <KpiCard label="Flagged" value={loading ? '—' : String(summary?.flagged ?? 0)} sub="Awaiting review" delay={120} />
        <KpiCard label="Approved" value={loading ? '—' : String(summary?.approved ?? 0)} delay={180} />
        <KpiCard label="Rejected" value={loading ? '—' : String(summary?.rejected ?? 0)} delay={240} />
        <KpiCard label="Avg Confidence" value={loading ? '—' : `${(summary?.avg_confidence_score ?? 0).toFixed(1)}%`} delay={300} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {admin && <QuickActionCard href="/ingest" icon={Upload} label="Scan Receipt" description="Upload and process a new receipt" delay={100} />}
        {(admin || manager) && <QuickActionCard href="/review" icon={AlertTriangle} label="Review Queue" description="Approve or reject flagged items" badge={summary?.flagged} delay={150} />}
        <QuickActionCard href="/transactions" icon={Download} label="Export Report" description="Download Excel or PDF report" delay={200} />
        <QuickActionCard href="/insights" icon={MessageSquare} label="Ask AI" description="Query your financial data" delay={250} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        <div className="lg:col-span-3 bg-surface-container-low border border-white/5 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-4">Transaction Trends</p>
          {!loading && <TrendsChart data={trends} />}
          {loading && <div className="h-48 bg-surface-container-high rounded animate-pulse" />}
        </div>
        <div className="lg:col-span-2 bg-surface-container-low border border-white/5 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-4">Department Breakdown</p>
          <DeptSpendBars depts={depts.slice(0, 6)} loading={loading} />
          {!loading && spend && (
            <p className="text-[0.6875rem] text-on-surface-variant mt-3">Total spend: {fmt(spend.total_spend)}</p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <BudgetVarianceCard />
      </div>

      <div className="bg-surface-container-low border border-white/5 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Recent Transactions</p>
          <Link href="/transactions" className="text-xs text-primary hover:opacity-80 transition-opacity">View all</Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-surface-container-high rounded animate-pulse" />
            ))}
          </div>
        ) : recent.items.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-10">No transactions yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Vendor', 'Amount', 'Department', 'Date', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.items.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors duration-150">
                  <td className="px-5 py-3 text-sm text-on-surface">{tx.vendor_name ?? '—'}</td>
                  <td className="px-5 py-3 text-sm tabular-nums text-on-surface">{tx.amount != null ? `₹${tx.amount.toLocaleString()}` : '—'}</td>
                  <td className="px-5 py-3 text-sm text-on-surface-variant">{tx.department ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-on-surface-variant">{tx.transaction_date ?? '—'}</td>
                  <td className="px-5 py-3"><ValidationBadge status={tx.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
