'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { exportExcel, exportPdf } from '@/lib/api'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const inputClass =
  'w-full bg-surface-container-lowest border-0 border-b-2 border-transparent ' +
  'focus:border-primary focus:outline-none rounded-none px-0 py-2 ' +
  'text-on-surface text-sm font-body placeholder:text-on-surface-variant/50 ' +
  'transition-all duration-300'

export default function ExportPanel() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [department, setDepartment] = useState('')
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function buildParams() {
    const params: {
      start_date?: string
      end_date?: string
      department?: string
    } = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    if (department.trim()) params.department = department.trim()
    return params
  }

  const handleExcel = async () => {
    setLoadingExcel(true)
    setError(null)
    try {
      const blob = await exportExcel(buildParams())
      downloadBlob(blob, 'export.xlsx')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to export Excel'
      setError(message)
    } finally {
      setLoadingExcel(false)
    }
  }

  const handlePdf = async () => {
    setLoadingPdf(true)
    setError(null)
    try {
      const blob = await exportPdf(buildParams())
      downloadBlob(blob, 'export.pdf')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to export PDF'
      setError(message)
    } finally {
      setLoadingPdf(false)
    }
  }

  return (
    <div className="bg-surface-container-low rounded-lg p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
            Department
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department (optional)"
            className={inputClass}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleExcel}
          disabled={loadingExcel || loadingPdf}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-semibold py-2.5 px-6 text-sm transition-all duration-300 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {loadingExcel ? 'Downloading...' : 'Download Excel'}
        </button>

        <button
          onClick={handlePdf}
          disabled={loadingPdf || loadingExcel}
          className="flex items-center gap-2 border border-white/10 rounded-full text-on-surface font-body font-semibold py-2.5 px-6 text-sm transition-all duration-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {loadingPdf ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>

      {error && (
        <p className="font-body text-error text-sm">{error}</p>
      )}
    </div>
  )
}
