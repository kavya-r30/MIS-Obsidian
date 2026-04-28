'use client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { DeptStat } from '@/lib/api'

interface Props { data: DeptStat[] }

export default function DeptBreakdownChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-[250px] flex items-center justify-center">
        <p className="font-body text-on-surface-variant">No department data yet</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="department" stroke="#464554" tick={{ fill: '#c7c4d7', fontSize: 10 }} />
        <YAxis stroke="#464554" tick={{ fill: '#c7c4d7', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#201f20', border: 'none', borderRadius: '0.5rem', color: '#e5e2e3', fontSize: 12 }}
          cursor={{ fill: 'rgba(189,194,255,0.05)' }}
        />
        <Bar dataKey="count" fill="#bdc2ff" radius={[4, 4, 0, 0]} maxBarSize={40} name="Transactions" />
        <Bar dataKey="avg_score" fill="#ddb7ff" radius={[4, 4, 0, 0]} maxBarSize={40} name="Avg Score" />
      </BarChart>
    </ResponsiveContainer>
  )
}
