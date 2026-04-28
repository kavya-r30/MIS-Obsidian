'use client'
import { cn } from '@/lib/utils'

interface Props {
  status: string
  size?: 'sm' | 'lg'
}

const colorMap: Record<string, string> = {
  validated: 'bg-primary/20 text-primary',
  approved: 'bg-primary/20 text-primary',
  flagged: 'bg-secondary/20 text-secondary',
  rejected: 'bg-error/20 text-error',
  pending: 'bg-muted text-muted-foreground',
}

export default function ValidationBadge({ status, size = 'sm' }: Props) {
  const colors = colorMap[status] ?? 'bg-outline-variant/30 text-on-surface-variant'
  return (
    <span
      className={cn(
        'rounded-full font-label uppercase tracking-[0.1em] inline-flex items-center',
        size === 'sm' ? 'px-3 py-1 text-[0.6875rem]' : 'px-5 py-2 text-sm',
        colors
      )}
    >
      {status}
    </span>
  )
}
