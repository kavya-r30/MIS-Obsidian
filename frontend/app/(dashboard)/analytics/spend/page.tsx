'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { getAnalyticsSpend, getTopVendors } from '@/lib/api'
import type { SpendAnalytics, TopVendor } from '@/lib/api'

const SpendAreaChart = dynamic(() => import('@/components/charts/SpendAreaChart'), { ssr: false })

function fmt(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function KpiCard({ label, value, delay = 0 }: { label: string; value: string; delay?: number }) {
  return (
    <div className="bg-surface-container-low border border-white/5 rounded-lg p-5 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant mb-2">{label}</p>
      <p className="text-2xl font-semibold text-on-surface tabular-nums">{value}</p>
    </div>
  )
}

export default function SpendAnalyticsPage() {
  const [spend, setSpend] = useState<SpendAnalytics | null>(null)
  const [vendors, setVendors] = useState<TopVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getAnalyticsSpend({ start_date: startDate || undefined, end_date: endDate || undefined }),
      getTopVendors(10),
    ]).then(([s, v]) => { setSpend(s); setVendors(v) }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const maxDept = spend?.by_department?.[0]

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Spend Analysis</h1>
          <p className="text-sm text-on-surface-variant mt-1">Financial spend breakdown across departments and vendors</p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="space-y-1">
            <label className="text-[0.625rem] font-medium uppercase tracking-wide text-on-surface-variant">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-container-low border border-white/5 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary/50 transition-colors" />
          </div>
          <div className="space-y-1">
            <label className="text-[0.625rem] font-medium uppercase tracking-wide text-on-surface-variant">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-container-low border border-white/5 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary/50 transition-colors" />
          </div>
          <button onClick={fetchData}
            className="px-4 py-2 rounded-md bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors active:scale-95 duration-100">
            Apply
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Spend" value={loading ? '—' : fmt(spend?.total_spend ?? 0)} delay={0} />
        <KpiCard label="Periods Tracked" value={loading ? '—' : String(spend?.by_period?.length ?? 0)} delay={75} />
        <KpiCard label="Top Department" value={loading || !maxDept ? '—' : maxDept.department} delay={150} />
        <KpiCard label="Top Dept Spend" value={loading || !maxDept ? '—' : fmt(maxDept.amount)} delay={225} />
      </div>

      <div className="bg-surface-container-low border border-white/5 rounded-lg p-5 mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-4">Spend Over Time</p>
        {loading ? <div className="h-56 bg-surface-container-high rounded animate-pulse" />
          : spend ? <SpendAreaChart data={spend.by_period} /> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-container-low border border-white/5 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-4">Spend by Department</p>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-surface-container-high rounded animate-pulse" />)}</div>
          ) : (spend?.by_department ?? []).length === 0 ? (
            <p className="text-sm text-on-surface-variant">No data</p>
          ) : (
            <div className="space-y-3">
              {(spend?.by_department ?? []).slice(0, 8).map((d, i) => {
                const max = spend!.by_department[0]?.amount || 1
                const pct = (d.amount / max) * 100
                return (
                  <div key={d.department}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-on-surface">{d.department}</span>
                      <span className="text-xs tabular-nums font-medium text-on-surface">{fmt(d.amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%`, transitionDelay: `${i * 50}ms` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-surface-container-low border border-white/5 rounded-lg overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant p-5 pb-3">Top Vendors by Spend</p>
          {loading ? (
            <div className="p-5 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-surface-container-high rounded animate-pulse" />)}</div>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-on-surface-variant px-5 pb-5">No data</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Vendor', 'Spend', 'Txns', 'Confidence'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.vendor_name} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors duration-150">
                    <td className="px-4 py-3 text-sm text-on-surface max-w-[120px] truncate">{v.vendor_name}</td>
                    <td className="px-4 py-3 text-sm tabular-nums font-medium text-on-surface">{fmt(v.total_amount)}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-on-surface-variant">{v.transaction_count}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-on-surface-variant">{Math.round(v.avg_confidence_score)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
