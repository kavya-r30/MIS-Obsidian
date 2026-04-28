'use client'

import ExportPanel from '@/components/ExportPanel'

export default function ExportPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-8 py-16">
      <div className="mb-10">
        <h1 className="font-headline text-5xl text-on-surface leading-tight mb-2">
          Export
        </h1>
        <p className="font-body text-on-surface-variant text-base">
          Download transaction reports as Excel or PDF
        </p>
      </div>

      <ExportPanel />
    </div>
  )
}
