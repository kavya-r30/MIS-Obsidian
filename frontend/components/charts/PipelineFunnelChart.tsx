'use client'

import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { PipelineStats } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  Pending:   '#908fa0',
  Validated: '#bdc2ff',
  Flagged:   '#ddb7ff',
  Approved:  '#86efac',
  Rejected:  '#ffb4ab',
}

export default function PipelineFunnelChart({ data }: { data: PipelineStats }) {
  const chartData = (['pending','validated','flagged','approved','rejected'] as const).map((k) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    count: data[k].count,
    pct: data[k].pct,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: '#c7c4d7', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#c7c4d7', fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: '#201f20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', fontSize: 12 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any, _: any, entry: any) => [`${v ?? 0} (${entry?.payload?.pct ?? 0}%)`, 'Count']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? '#908fa0'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
