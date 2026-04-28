'use client'
import { ValidationLog } from '@/lib/api'
import { cn } from '@/lib/utils'

const severityColors: Record<string, string> = {
  info: 'bg-muted text-muted-foreground',
  warning: 'bg-secondary/20 text-secondary',
  error: 'bg-error/20 text-error',
}

interface Props { logs: ValidationLog[] }

export default function ValidationLogList({ logs }: Props) {
  if (!logs.length) {
    return <p className="font-body text-on-surface-variant text-sm">No validation logs</p>
  }
  return (
    <div className="flex flex-col gap-4">
      {logs.map((log, i) => (
        <div key={i} className="flex flex-col gap-1.5 py-4 border-b border-white/5 last:border-0">
          <div className="flex items-center gap-3">
            <span className={cn('text-lg leading-none', log.passed ? 'text-primary' : 'text-error')}>
              {log.passed ? '✓' : '✗'}
            </span>
            <span className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface font-medium">{log.rule_name}</span>
            <span className={cn('rounded-full px-2.5 py-0.5 font-label text-[0.625rem] uppercase tracking-[0.1em]', severityColors[log.severity] ?? severityColors.info)}>
              {log.severity}
            </span>
          </div>
          {log.message && (
            <p className="font-body text-sm text-on-surface-variant ml-7">{log.message}</p>
          )}
        </div>
      ))}
    </div>
  )
}
