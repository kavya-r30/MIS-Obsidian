'use client'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface Props {
  href: string
  icon: LucideIcon
  label: string
  description: string
  badge?: string | number
  delay?: number
}

export default function QuickActionCard({ href, icon: Icon, label, description, badge, delay = 0 }: Props) {
  return (
    <Link
      href={href}
      className="group relative bg-surface-container-low hover:bg-surface-container border border-white/5 rounded-lg p-5 flex flex-col gap-3 transition-all duration-200 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        {badge !== undefined && (
          <span className="text-[0.625rem] font-semibold bg-error/20 text-error rounded-full px-2 py-0.5 tabular-nums">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
      </div>
    </Link>
  )
}
