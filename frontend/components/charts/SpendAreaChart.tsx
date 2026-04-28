'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Point { date: string; amount: number }

function fmt(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n.toFixed(0)}`
}

export default function SpendAreaChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#bdc2ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#bdc2ff" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={{ fill: '#c7c4d7', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fill: '#c7c4d7', fontSize: 10 }} tickLine={false} axisLine={false} width={64} />
        <Tooltip
          contentStyle={{ background: '#201f20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', fontSize: 12 }}
          labelStyle={{ color: '#e5e2e3' }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [fmt(typeof v === 'number' ? v : 0), 'Spend']}
        />
        <Area type="monotone" dataKey="amount" stroke="#bdc2ff" strokeWidth={2} fill="url(#spendGrad)" dot={false} activeDot={{ r: 4, fill: '#bdc2ff' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
