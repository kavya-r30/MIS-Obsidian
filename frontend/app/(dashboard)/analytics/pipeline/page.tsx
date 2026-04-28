'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { getAnalyticsPipeline, getAnalyticsTrends, getRules } from '@/lib/api'
import type { PipelineStats, Rule, TrendPoint } from '@/lib/api'

const PipelineFunnelChart = dynamic(() => import('@/components/charts/PipelineFunnelChart'), { ssr: false })
const TrendsChart = dynamic(() => import('@/components/charts/TrendsChart'), { ssr: false })

function StatCard({ label, value, color = 'text-on-surface', delay = 0 }: { label: string; value: string; color?: string; delay?: number }) {
  return (
    <div className="bg-surface-container-low border border-white/5 rounded-lg p-5 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant mb-2">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineStats | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAnalyticsPipeline(), getAnalyticsTrends(), getRules()])
      .then(([p, t, r]) => { setPipeline(p); setTrends(t); setRules(r) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-on-surface">Validation Pipeline</h1>
        <p className="text-sm text-on-surface-variant mt-1">Transaction flow through validation stages</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Processed" value={loading ? '—' : String(pipeline?.total ?? 0)} delay={0} />
        <StatCard label="Approval Rate" value={loading ? '—' : `${pipeline?.approval_rate ?? 0}%`} color="text-primary" delay={75} />
        <StatCard label="Flag Rate" value={loading ? '—' : `${pipeline?.flag_rate ?? 0}%`} color="text-secondary" delay={150} />
        <StatCard label="Rejection Rate" value={loading || !pipeline ? '—' : `${pipeline.rejected.pct}%`} color="text-error" delay={225} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-surface-container-low border border-white/5 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-4">Status Distribution</p>
          {loading ? <div className="h-52 bg-surface-container-high rounded animate-pulse" />
            : pipeline ? <PipelineFunnelChart data={pipeline} /> : null}
          {!loading && pipeline && (
            <div className="grid grid-cols-5 gap-1 mt-3">
              {(['pending','validated','flagged','approved','rejected'] as const).map((k) => (
                <div key={k} className="text-center">
                  <p className="text-xs tabular-nums font-semibold text-on-surface">{pipeline[k].count}</p>
                  <p className="text-[0.5625rem] text-on-surface-variant capitalize">{k}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-surface-container-low border border-white/5 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-4">Status Over Time</p>
          {loading
            ? <div className="h-52 bg-surface-container-high rounded animate-pulse" />
            : <TrendsChart data={trends} />}
        </div>
      </div>

      <div className="bg-surface-container-low border border-white/5 rounded-lg overflow-hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant px-5 py-4 border-b border-white/5">Active Validation Rules</p>
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-surface-container-high rounded animate-pulse" />)}</div>
        ) : rules.filter((r) => r.is_active).length === 0 ? (
          <p className="text-sm text-on-surface-variant px-5 py-6">No active rules configured.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Name','Type','Threshold','Description'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.filter((r) => r.is_active).map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors duration-150">
                  <td className="px-5 py-3 text-sm font-medium text-on-surface">{r.rule_name}</td>
                  <td className="px-5 py-3 text-sm text-on-surface-variant">{r.rule_type}</td>
                  <td className="px-5 py-3 text-sm tabular-nums text-on-surface-variant">{r.threshold ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-on-surface-variant max-w-xs truncate">{r.description ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
