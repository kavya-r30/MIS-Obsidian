'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { isAdmin } from '@/lib/auth'
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  Rule,
} from '@/lib/api'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const RULE_TYPES = [
  'missing_required_fields',
  'vendor_not_in_master',
  'cost_center_not_in_master',
  'department_not_in_master',
  'high_value_cash_payment',
  'temporal_inconsistency',
  'duplicate_invoice',
  'tax_amount_missing',
  'amount_threshold',
  'department_budget',
  'tax_rate_check',
  'payment_method_check',
  'approval_required',
] as const

const SEVERITY_VALUES = ['error', 'warning', 'info'] as const

interface NewRuleForm {
  rule_name: string
  rule_type: string
  threshold: string
  severity: string
  description: string
}

const emptyForm: NewRuleForm = {
  rule_name: '',
  rule_type: 'amount_threshold',
  threshold: '',
  severity: 'warning',
  description: '',
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-surface-container-high rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<NewRuleForm>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [admin, setAdmin] = useState(false)
  useEffect(() => { setAdmin(isAdmin()) }, [])

  useEffect(() => {
    getRules()
      .then(setRules)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.rule_name.trim() || !form.rule_type) return
    setFormLoading(true)
    setFormError(null)
    try {
      const created = await createRule({
        rule_name: form.rule_name.trim(),
        rule_type: form.rule_type,
        threshold: form.threshold !== '' ? parseFloat(form.threshold) : undefined,
        severity: form.severity,
        description: form.description.trim(),
      })
      setRules((prev) => [created, ...prev])
      setForm(emptyForm)
      setAddOpen(false)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create rule')
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (rule: Rule) => {
    try {
      const updated = await updateRule(rule.id, { is_active: !rule.is_active })
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)))
    } catch {
      // leave state unchanged; switch reverts visually on next render
    }
  }

  const handleDelete = async () => {
    if (deleteTarget === null) return
    setDeleteLoading(true)
    try {
      await deleteRule(deleteTarget)
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget))
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-16">
      <div className="flex items-center justify-between mb-10">
        <h1 className="font-headline text-5xl text-on-surface leading-tight">Rules</h1>
        {admin && (
          <button
            onClick={() => { setForm(emptyForm); setFormError(null); setAddOpen(true) }}
            className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium py-2.5 px-6 text-sm transition-all duration-300 hover:opacity-90"
          >
            Add Rule
          </button>
        )}
      </div>

      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Rule Name', 'Type', 'Severity', 'Threshold', 'Description', 'Active', ...(admin ? [''] : [])].map((h) => (
                  <th key={h} className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        ) : rules.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-body text-on-surface-variant text-base">No rules configured</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Rule Name', 'Type', 'Severity', 'Threshold', 'Description', 'Active', ...(admin ? [''] : [])].map((h) => (
                  <th key={h} className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-body text-sm text-on-surface">{rule.rule_name}</td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant">{rule.rule_type}</td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant">{rule.severity}</td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant">{rule.threshold != null ? rule.threshold : '—'}</td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant max-w-xs truncate">{rule.description || '—'}</td>
                  <td className="px-6 py-4">
                    <Switch checked={rule.is_active} onCheckedChange={() => handleToggleActive(rule)} />
                  </td>
                  {admin && (
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setDeleteTarget(rule.id)}
                        className="text-error hover:text-error/70 transition-colors duration-300"
                        aria-label="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Rule Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) { setAddOpen(false); setFormError(null) } }}>
        <DialogContent className="bg-surface-container border-white/5">
          <DialogHeader>
            <DialogTitle className="font-headline text-on-surface">Add Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Rule Name</Label>
              <Input
                value={form.rule_name}
                onChange={(e) => setForm((f) => ({ ...f, rule_name: e.target.value }))}
                placeholder="e.g. Amount Threshold Check"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Rule Type</Label>
              <Select value={form.rule_type} onValueChange={(val) => setForm((f) => ({ ...f, rule_type: val }))}>
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  {RULE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Severity</Label>
              <Select value={form.severity} onValueChange={(val) => setForm((f) => ({ ...f, severity: val }))}>
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  {SEVERITY_VALUES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Threshold <span className="normal-case opacity-50">(optional)</span>
              </Label>
              <Input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                placeholder="e.g. 5000"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Description <span className="normal-case opacity-50">(optional)</span>
              </Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this rule"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>
            {formError && <p className="font-body text-error text-sm">{formError}</p>}
          </div>
          <DialogFooter>
            <button
              onClick={() => { setForm(emptyForm); setFormError(null); setAddOpen(false) }}
              className="border border-white/10 rounded-full px-5 py-2 text-sm font-body text-on-surface-variant hover:bg-white/5 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={formLoading || !form.rule_name.trim() || !form.rule_type}
              className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium px-5 py-2 text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              {formLoading ? 'Creating...' : 'Create Rule'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-surface-container border-white/5">
          <DialogHeader>
            <DialogTitle className="font-headline text-on-surface">Delete Rule</DialogTitle>
          </DialogHeader>
          <p className="font-body text-on-surface-variant text-sm">
            Are you sure you want to delete this rule? This action cannot be undone.
          </p>
          <DialogFooter>
            <button onClick={() => setDeleteTarget(null)} className="border border-white/10 rounded-full px-5 py-2 text-sm font-body text-on-surface-variant hover:bg-white/5 transition-all duration-300">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-error/20 text-error rounded-full px-5 py-2 text-sm font-body font-medium transition-all duration-300 hover:bg-error/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
