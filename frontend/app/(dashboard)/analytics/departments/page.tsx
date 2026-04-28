'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getAnalyticsSpend } from '@/lib/api'

const DeptBreakdownChart = dynamic(() => import('@/components/charts/DeptBreakdownChart'), { ssr: false })

function fmt(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

interface DeptRow {
  department: string
  count: number
  total_spend: number
}

type SortKey = keyof DeptRow

export default function DepartmentsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<DeptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('total_spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    getAnalyticsSpend().then((spend) => {
      const merged: DeptRow[] = spend.by_department.map((d) => ({
        department: d.department,
        count: d.count,
        total_spend: d.amount,
      }))
      setRows(merged)
    }).finally(() => setLoading(false))
  }, [])

  const sorted = [...rows].sort((a, b) => {
    if (sortKey === 'department') {
      return sortDir === 'desc'
        ? b.department.localeCompare(a.department)
        : a.department.localeCompare(b.department)
    }
    return sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
  })

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? <span className="ml-1 text-primary">{sortDir === 'desc' ? '↓' : '↑'}</span>
      : <span className="ml-1 text-on-surface-variant/40">↕</span>

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-on-surface">Department Breakdown</h1>
        <p className="text-sm text-on-surface-variant mt-1">Compare transaction volume and spend across departments</p>
      </div>

      <div className="bg-surface-container-low border border-white/5 rounded-lg p-5 mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-4">Transaction Volume by Department</p>
        {loading ? <div className="h-48 bg-surface-container-high rounded animate-pulse" />
          : <DeptBreakdownChart data={rows.map((r) => ({ department: r.department, count: r.count, avg_score: r.total_spend / 10000 }))} />}
      </div>

      <div className="bg-surface-container-low border border-white/5 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {([['department','Department'], ['count','Transactions'], ['total_spend','Total Spend']] as [SortKey, string][]).map(([k, label]) => (
                <th key={k} onClick={() => handleSort(k)}
                  className="px-5 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant cursor-pointer hover:text-on-surface transition-colors select-none">
                  {label}<SortIcon k={k} />
                </th>
              ))}
              <th className="px-5 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant">Spend Bar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-surface-container-high rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-on-surface-variant">No department data</td></tr>
            ) : sorted.map((r) => {
              const maxSpend = sorted[0]?.total_spend || 1
              const pct = (r.total_spend / maxSpend) * 100
              return (
                <tr
                  key={r.department}
                  onClick={() => router.push(`/transactions?department=${encodeURIComponent(r.department)}`)}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors duration-150 group"
                >
                  <td className="px-5 py-3 text-sm font-medium text-on-surface group-hover:text-primary transition-colors">{r.department}</td>
                  <td className="px-5 py-3 text-sm tabular-nums text-on-surface-variant">{r.count}</td>
                  <td className="px-5 py-3 text-sm tabular-nums text-on-surface">{fmt(r.total_spend)}</td>
                  <td className="px-5 py-3">
                    <div className="w-24 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-on-surface-variant mt-2">Click a department row to view its transactions.</p>
    </div>
  )
}
