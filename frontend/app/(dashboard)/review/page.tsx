'use client'

import { useEffect, useState } from 'react'
import { getExceptions } from '@/lib/api'
import type { ExceptionItem } from '@/lib/api'
import SplitReviewPanel from '@/components/SplitReviewPanel'

export default function ReviewPage() {
  const [items, setItems] = useState<ExceptionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getExceptions().then(setItems).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-on-surface">Review Queue</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          {loading ? 'Loading...' : `${items.length} transaction${items.length !== 1 ? 's' : ''} awaiting review`}
        </p>
      </div>
      {loading ? (
        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          <div className="w-80 bg-surface-container-low border border-white/5 rounded-lg animate-pulse" />
          <div className="flex-1 bg-surface-container-low border border-white/5 rounded-lg animate-pulse" />
        </div>
      ) : (
        <SplitReviewPanel items={items} onRemove={(id) => setItems((p) => p.filter((i) => i.id !== id))} />
      )}
    </div>
  )
}
