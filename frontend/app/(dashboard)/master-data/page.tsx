'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { isAdmin } from '@/lib/auth'
import {
  getMasterData,
  createMasterData,
  deactivateMasterData,
  MasterDataEntry,
} from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

type TypeFilter = '' | 'vendor' | 'cost_center' | 'department'

const TYPE_LABELS: Record<TypeFilter, string> = {
  '': 'All',
  vendor: 'Vendor',
  cost_center: 'Cost Center',
  department: 'Department',
}

const FILTER_OPTIONS: TypeFilter[] = ['', 'vendor', 'cost_center', 'department']

interface NewEntryForm {
  value: string
  data_type: string
}

const emptyForm: NewEntryForm = { value: '', data_type: '' }

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5 animate-pulse">
      {[1, 2, 3].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-surface-container-high rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

export default function MasterDataPage() {
  const [entries, setEntries] = useState<MasterDataEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<NewEntryForm>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<number | null>(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)
  const [admin, setAdmin] = useState(false)
  useEffect(() => { setAdmin(isAdmin()) }, [])

  useEffect(() => {
    setLoading(true)
    getMasterData(typeFilter || undefined)
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [typeFilter])

  const handleCreate = async () => {
    if (!form.value.trim() || !form.data_type) return
    setFormLoading(true)
    try {
      const created = await createMasterData({
        value: form.value.trim(),
        data_type: form.data_type,
      })
      setEntries((prev) => [created, ...prev])
      setForm(emptyForm)
      setAddOpen(false)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeactivate = async () => {
    if (deactivateTarget === null) return
    setDeactivateLoading(true)
    try {
      await deactivateMasterData(deactivateTarget)
      setEntries((prev) => prev.filter((e) => e.id !== deactivateTarget))
      setDeactivateTarget(null)
    } finally {
      setDeactivateLoading(false)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-16">
      <div className="flex items-start justify-between mb-10 gap-4 flex-wrap">
        <h1 className="font-headline text-5xl text-on-surface leading-tight">
          Master Data
        </h1>
        {admin && (
          <button
            onClick={() => setAddOpen(true)}
            className="
              bg-gradient-to-r from-primary to-primary-container
              rounded-full text-on-primary font-body font-medium
              py-2.5 px-6 text-sm transition-all duration-300
              hover:opacity-90
            "
          >
            Add Entry
          </button>
        )}
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-3 flex-wrap mb-8">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setTypeFilter(opt)}
            className={`
              font-body text-sm transition-all duration-300
              ${typeFilter === opt
                ? 'bg-primary text-on-primary rounded-full px-4 py-1.5'
                : 'border border-white/10 rounded-full px-4 py-1.5 text-on-surface-variant hover:border-white/20 hover:text-on-surface'
              }
            `}
          >
            {TYPE_LABELS[opt]}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">Value</th>
                <th className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">Type</th>
                {admin && <th className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-body text-on-surface-variant text-base">
              No entries found
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">Value</th>
                <th className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">Type</th>
                {admin && <th className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4 font-body text-sm text-on-surface">
                    {entry.value}
                  </td>
                  <td className="px-6 py-4 font-body text-xs text-on-surface-variant uppercase tracking-[0.08em]">
                    {TYPE_LABELS[entry.data_type as TypeFilter] ?? entry.data_type}
                  </td>
                  {admin && (
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setDeactivateTarget(entry.id)}
                        className="text-error hover:text-error/70 transition-colors duration-300"
                        aria-label="Deactivate entry"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => !open && setAddOpen(false)}>
        <DialogContent className="bg-surface-container border-white/5">
          <DialogHeader>
            <DialogTitle className="font-headline text-on-surface">
              Add Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Value
              </Label>
              <Input
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="e.g. Acme Corp"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Type
              </Label>
              <Select
                value={form.data_type}
                onValueChange={(val) => setForm((f) => ({ ...f, data_type: val }))}
              >
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="cost_center">Cost Center</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => { setForm(emptyForm); setAddOpen(false) }}
              className="border border-white/10 rounded-full px-5 py-2 text-sm font-body text-on-surface-variant hover:bg-white/5 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={formLoading || !form.value.trim() || !form.data_type}
              className="
                bg-gradient-to-r from-primary to-primary-container
                rounded-full text-on-primary font-body font-medium
                px-5 py-2 text-sm transition-all duration-300
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:opacity-90
              "
            >
              {formLoading ? 'Creating...' : 'Create Entry'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <DialogContent className="bg-surface-container border-white/5">
          <DialogHeader>
            <DialogTitle className="font-headline text-on-surface">
              Deactivate Entry
            </DialogTitle>
          </DialogHeader>
          <p className="font-body text-on-surface-variant text-sm">
            Are you sure you want to deactivate this entry? It will be removed
            from active lookups.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeactivateTarget(null)}
              className="border border-white/10 rounded-full px-5 py-2 text-sm font-body text-on-surface-variant hover:bg-white/5 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDeactivate}
              disabled={deactivateLoading}
              className="
                bg-error/20 text-error rounded-full
                px-5 py-2 text-sm font-body font-medium
                transition-all duration-300 hover:bg-error/30
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              {deactivateLoading ? 'Deactivating...' : 'Deactivate'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
