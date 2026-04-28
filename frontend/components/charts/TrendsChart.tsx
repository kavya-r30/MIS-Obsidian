'use client'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { TrendPoint } from '@/lib/api'

// Group data by date, pivot statuses into columns
// { date: '2026-04-01', validated: 3, flagged: 1, pending: 2, ... }
type ChartRow = { date: string; [key: string]: string | number }

const STATUS_COLORS: Record<string, string> = {
  validated: '#bdc2ff',
  approved: '#bdc2ff',
  flagged: '#ddb7ff',
  rejected: '#ffb4ab',
  pending: '#908fa0',
}

interface Props { data: TrendPoint[] }

export default function TrendsChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="font-body text-on-surface-variant">No trend data yet</p>
      </div>
    )
  }

  // Pivot: group by date
  const rowMap: Record<string, ChartRow> = {}
  const statuses = new Set<string>()
  data.forEach(({ date, status, count }) => {
    if (!rowMap[date]) rowMap[date] = { date }
    rowMap[date][status] = count
    statuses.add(status)
  })
  const rows = Object.values(rowMap).sort((a, b) => String(a.date).localeCompare(String(b.date)))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {Array.from(statuses).map((s) => (
            <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={STATUS_COLORS[s] ?? '#bdc2ff'} stopOpacity={0.15} />
              <stop offset="95%" stopColor={STATUS_COLORS[s] ?? '#bdc2ff'} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <XAxis dataKey="date" stroke="#464554" tick={{ fill: '#c7c4d7', fontSize: 10 }} />
        <YAxis stroke="#464554" tick={{ fill: '#c7c4d7', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#201f20', border: 'none', borderRadius: '0.5rem', color: '#e5e2e3', fontSize: 12 }}
          cursor={{ stroke: '#464554' }}
        />
        {Array.from(statuses).map((s) => (
          <Area
            key={s}
            type="monotone"
            dataKey={s}
            stroke={STATUS_COLORS[s] ?? '#bdc2ff'}
            strokeWidth={1.5}
            fill={`url(#grad-${s})`}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
