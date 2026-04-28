'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getMasterData,
  createMasterData,
  deactivateMasterData,
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  Rule,
  MasterDataEntry,
  Budget,
} from '@/lib/api'
import { isAdmin, isManager } from '@/lib/auth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Settings2 } from 'lucide-react'

// ─── Shared skeleton ──────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-white/5 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-surface-container-high rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

// ─── RulesTab ─────────────────────────────────────────────────────────────────

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
  parameters: string
}

const emptyRuleForm: NewRuleForm = {
  rule_name: '',
  rule_type: 'amount_threshold',
  threshold: '',
  severity: 'warning',
  description: '',
  parameters: '{}',
}

function RulesTab() {
  const [admin, setAdmin] = useState(false)
  useEffect(() => { setAdmin(isAdmin()) }, [])
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<NewRuleForm>(emptyRuleForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [configTarget, setConfigTarget] = useState<Rule | null>(null)
  const [configForm, setConfigForm] = useState({ threshold: '', severity: 'warning', description: '', parameters: '{}' })
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  const openConfig = (rule: Rule) => {
    setConfigTarget(rule)
    setConfigForm({ threshold: rule.threshold != null ? String(rule.threshold) : '', severity: rule.severity, description: rule.description, parameters: rule.parameters ?? '{}' })
    setConfigError(null)
  }

  const handleSaveConfig = async () => {
    if (!configTarget) return
    setConfigLoading(true); setConfigError(null)
    try {
      const body: Record<string, unknown> = { severity: configForm.severity, description: configForm.description.trim(), parameters: configForm.parameters }
      if (configForm.threshold !== '') body.threshold = parseFloat(configForm.threshold)
      const updated = await updateRule(configTarget.id, body as Parameters<typeof updateRule>[1])
      setRules((prev) => prev.map((r) => (r.id === configTarget.id ? updated : r)))
      setConfigTarget(null)
    } catch (err: unknown) {
      setConfigError(err instanceof Error ? err.message : 'Failed to save')
    } finally { setConfigLoading(false) }
  }

  const getParsed = () => { try { return JSON.parse(configForm.parameters) } catch { return {} } }
  const setParsed = (obj: Record<string, unknown>) => setConfigForm((f) => ({ ...f, parameters: JSON.stringify(obj) }))

  const getFormParsed = () => { try { return JSON.parse(form.parameters) } catch { return {} } }
  const setFormParsed = (obj: Record<string, unknown>) => setForm((f) => ({ ...f, parameters: JSON.stringify(obj) }))

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
        parameters: form.parameters !== '{}' ? form.parameters : undefined,
      })
      setRules((prev) => [created, ...prev])
      setForm(emptyRuleForm)
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
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, ...updated } : r)))
    } catch {
      // leave state unchanged; the switch will revert visually on next render
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteRule(deleteTarget.id)
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const tableHeaders = ['Name', 'Type', 'Severity', 'Threshold', 'Description', 'Created', 'Active', '']

  const ALL_TX_FIELDS = ['vendor_name','amount','tax_amount','currency','transaction_date','approval_date','department','cost_center','payment_method','invoice_number','approval_ref']

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-on-surface-variant text-sm">
          Manage validation rules applied to transactions.
        </p>
        {admin && (
          <button
            onClick={() => { setForm(emptyRuleForm); setFormError(null); setAddOpen(true) }}
            className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium py-2.5 px-6 text-sm transition-all duration-300 hover:opacity-90"
          >
            Add Rule
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {tableHeaders.map((h) => (
                  <th key={h} className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={tableHeaders.length} />)}
            </tbody>
          </table>
        ) : rules.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-body text-on-surface-variant text-base">No rules defined</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {tableHeaders.map((h) => (
                  <th key={h} className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4 font-body text-sm text-on-surface font-medium">
                    {rule.rule_name}
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant">
                    {rule.rule_type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 font-body text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      rule.severity === 'error'
                        ? 'bg-error/15 text-error'
                        : rule.severity === 'warning'
                        ? 'bg-yellow-500/15 text-yellow-400'
                        : 'bg-primary/15 text-primary'
                    }`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant">
                    {rule.threshold !== null && rule.threshold !== undefined ? rule.threshold : '—'}
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant max-w-xs truncate">
                    {rule.description || '—'}
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant whitespace-nowrap">
                    {rule.created_at ? new Date(rule.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule)}
                      disabled={!admin}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {admin && (
                        <button
                          onClick={() => openConfig(rule)}
                          className="text-on-surface-variant hover:text-primary transition-colors"
                          aria-label="Configure rule"
                          title="Configure"
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                      )}
                      {admin && (
                        <button
                          onClick={() => setDeleteTarget(rule)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          aria-label="Delete rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Rule Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => { if (!open) { setAddOpen(false); setFormError(null) } }}
      >
        <DialogContent className="bg-surface-container border-white/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-on-surface">Add Rule</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Rule Name
              </Label>
              <Input
                value={form.rule_name}
                onChange={(e) => setForm((f) => ({ ...f, rule_name: e.target.value }))}
                placeholder="e.g. max_amount_check"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Rule Type
              </Label>
              <Select
                value={form.rule_type}
                onValueChange={(val) => setForm((f) => ({ ...f, rule_type: val, parameters: '{}', threshold: '' }))}
              >
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  {RULE_TYPES.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {rt.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Severity
              </Label>
              <Select
                value={form.severity}
                onValueChange={(val) => setForm((f) => ({ ...f, severity: val }))}
              >
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  {SEVERITY_VALUES.map((sv) => (
                    <SelectItem key={sv} value={sv}>
                      {sv.charAt(0).toUpperCase() + sv.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {['amount_threshold','high_value_cash_payment','department_budget','approval_required'].includes(form.rule_type) && (
              <div className="space-y-1.5">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  Threshold (₹)
                </Label>
                <Input
                  type="number"
                  value={form.threshold}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
                />
              </div>
            )}

            {form.rule_type === 'tax_rate_check' && (
              <div className="space-y-1.5">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  Expected Tax Rate (0–1, e.g. 0.18)
                </Label>
                <Input
                  type="number" step="any"
                  value={form.threshold}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                  placeholder="0.18"
                  className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
                />
              </div>
            )}

            {form.rule_type === 'missing_required_fields' && (
              <div className="space-y-2">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Required Fields</Label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 bg-surface-container-low rounded-lg p-3">
                  {ALL_TX_FIELDS.map((field) => {
                    const checked = (getFormParsed().fields ?? []).includes(field)
                    return (
                      <label key={field} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          const cur: string[] = getFormParsed().fields ?? []
                          setFormParsed({ fields: e.target.checked ? [...cur, field] : cur.filter((f) => f !== field) })
                        }} className="accent-primary" />
                        <span className="text-xs text-on-surface font-mono">{field}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {form.rule_type === 'payment_method_check' && (
              <div className="space-y-1.5">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  Allowed Methods <span className="normal-case opacity-50">(comma-separated)</span>
                </Label>
                <Input
                  value={(getFormParsed().allowed_methods ?? []).join(', ')}
                  onChange={(e) => setFormParsed({ allowed_methods: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                  placeholder="cash, card, upi, neft, rtgs, imps"
                  className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40 font-mono text-xs" />
              </div>
            )}

            {form.rule_type === 'high_value_cash_payment' && (
              <div className="space-y-1.5">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  Cash-equivalent Methods <span className="normal-case opacity-50">(comma-separated)</span>
                </Label>
                <Input
                  value={(getFormParsed().cash_methods ?? ['cash']).join(', ')}
                  onChange={(e) => setFormParsed({ cash_methods: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                  placeholder="cash"
                  className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40 font-mono text-xs" />
              </div>
            )}

            {form.rule_type === 'tax_rate_check' && (
              <div className="space-y-1.5">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  Tolerance (± fraction, e.g. 0.02 = ±2%)
                </Label>
                <Input type="number" step="0.01" min="0" max="0.5"
                  value={getFormParsed().tolerance ?? 0.02}
                  onChange={(e) => setFormParsed({ ...getFormParsed(), tolerance: parseFloat(e.target.value) || 0.02 })}
                  className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Description
              </Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this rule"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>

            {formError && (
              <p className="font-body text-error text-sm">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => { setForm(emptyRuleForm); setFormError(null); setAddOpen(false) }}
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

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent className="bg-surface-container border-white/5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface">Delete Rule</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              Are you sure you want to delete &quot;{deleteTarget?.rule_name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-on-surface-variant bg-transparent hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-error text-on-error hover:bg-error/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Configure Rule Dialog */}
      <Dialog open={!!configTarget} onOpenChange={(o) => { if (!o) setConfigTarget(null) }}>
        <DialogContent className="bg-surface-container border-white/5 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-on-surface text-lg font-semibold">
              Configure: <span className="font-mono text-primary text-base">{configTarget?.rule_name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Severity</Label>
              <Select value={configForm.severity} onValueChange={(v) => setConfigForm((f) => ({ ...f, severity: v }))}>
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  {['error', 'warning', 'info'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {['amount_threshold','high_value_cash_payment','department_budget','tax_rate_check','approval_required'].includes(configTarget?.rule_type ?? '') && (
              <div className="space-y-1.5">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  {configTarget?.rule_type === 'tax_rate_check' ? 'Expected Tax Rate (0–1, e.g. 0.18)' : 'Threshold (₹)'}
                </Label>
                <Input type="number" step="any" value={configForm.threshold}
                  onChange={(e) => setConfigForm((f) => ({ ...f, threshold: e.target.value }))}
                  className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Description</Label>
              <Input value={configForm.description}
                onChange={(e) => setConfigForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface" />
            </div>

            {configTarget?.rule_type === 'missing_required_fields' && (
              <div className="space-y-2">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Required Fields</Label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 bg-surface-container-low rounded-lg p-3">
                  {ALL_TX_FIELDS.map((field) => {
                    const parsed = getParsed()
                    const checked = (parsed.fields ?? []).includes(field)
                    return (
                      <label key={field} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          const cur: string[] = getParsed().fields ?? []
                          setParsed({ fields: e.target.checked ? [...cur, field] : cur.filter((f) => f !== field) })
                        }} className="accent-primary" />
                        <span className="text-xs text-on-surface font-mono">{field}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {configTarget?.rule_type === 'payment_method_check' && (
              <div className="space-y-1.5">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  Allowed Methods <span className="normal-case opacity-50">(comma-separated)</span>
                </Label>
                <Input
                  value={(getParsed().allowed_methods ?? []).join(', ')}
                  onChange={(e) => setParsed({ allowed_methods: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                  placeholder="cash, card, upi, neft, rtgs, imps"
                  className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40 font-mono text-xs" />
              </div>
            )}

            {configTarget?.rule_type === 'high_value_cash_payment' && (
              <div className="space-y-1.5">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  Cash-equivalent Methods <span className="normal-case opacity-50">(comma-separated)</span>
                </Label>
                <Input
                  value={(getParsed().cash_methods ?? ['cash']).join(', ')}
                  onChange={(e) => setParsed({ cash_methods: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                  placeholder="cash"
                  className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/40 font-mono text-xs" />
              </div>
            )}

            {configTarget?.rule_type === 'tax_rate_check' && (
              <div className="space-y-1.5">
                <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  Tolerance (± fraction, e.g. 0.02 = ±2%)
                </Label>
                <Input type="number" step="0.01" min="0" max="0.5"
                  value={getParsed().tolerance ?? 0.02}
                  onChange={(e) => setParsed({ ...getParsed(), tolerance: parseFloat(e.target.value) || 0.02 })}
                  className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface" />
              </div>
            )}

            {configError && <p className="font-body text-error text-sm">{configError}</p>}
          </div>

          <DialogFooter>
            <button onClick={() => setConfigTarget(null)}
              className="border border-white/10 rounded-full px-5 py-2 text-sm font-body text-on-surface-variant hover:bg-white/5 transition-all duration-300">
              Cancel
            </button>
            <button onClick={handleSaveConfig} disabled={configLoading}
              className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium px-5 py-2 text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90">
              {configLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ReferenceDataTab ─────────────────────────────────────────────────────────

const MASTER_DATA_TYPES = ['vendor', 'cost_center', 'department', 'expense_category'] as const
type MasterDataType = typeof MASTER_DATA_TYPES[number]

const TYPE_LABELS: Record<MasterDataType | 'all', string> = {
  all: 'All',
  vendor: 'Vendor',
  cost_center: 'Cost Center',
  department: 'Department',
  expense_category: 'Expense Category',
}

interface NewEntryForm {
  value: string
  data_type: string
  description: string
}

const emptyEntryForm: NewEntryForm = { value: '', data_type: 'vendor', description: '' }

function ReferenceDataTab() {
  const [admin, setAdmin] = useState(false)
  useEffect(() => { setAdmin(isAdmin()) }, [])
  const [entries, setEntries] = useState<MasterDataEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | MasterDataType>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<NewEntryForm>(emptyEntryForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MasterDataEntry | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  useEffect(() => {
    getMasterData()
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.data_type === filter)

  const handleCreate = async () => {
    if (!form.value.trim() || !form.data_type) return
    setFormLoading(true)
    setFormError(null)
    try {
      const created = await createMasterData({
        value: form.value.trim(),
        data_type: form.data_type,
        description: form.description.trim() || undefined,
      })
      setEntries((prev) => [created, ...prev])
      setForm(emptyEntryForm)
      setAddOpen(false)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create entry')
    } finally {
      setFormLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    try {
      await deactivateMasterData(removeTarget.id)
      setEntries((prev) => prev.filter((e) => e.id !== removeTarget.id))
      setRemoveTarget(null)
    } finally {
      setRemoveLoading(false)
    }
  }

  const entryTableHeaders = ['Value', 'Type', 'Description', 'Created', '']

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-on-surface-variant text-sm">
          Manage reference values used for validation (vendors, cost centers, departments).
        </p>
        {admin && (
          <button
            onClick={() => { setForm(emptyEntryForm); setFormError(null); setAddOpen(true) }}
            className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium py-2.5 px-6 text-sm transition-all duration-300 hover:opacity-90"
          >
            Add Entry
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', ...MASTER_DATA_TYPES] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-label font-medium transition-all duration-200 ${
              filter === t
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {entryTableHeaders.map((h) => (
                  <th key={h} className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={entryTableHeaders.length} />)}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-body text-on-surface-variant text-base">No entries found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {entryTableHeaders.map((h) => (
                  <th key={h} className="px-6 py-4 text-left font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4 font-body text-sm text-on-surface">{entry.value}</td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant capitalize">
                    {entry.data_type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant max-w-xs truncate">
                    {entry.description || '—'}
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant whitespace-nowrap">
                    {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {admin && (
                      <button
                        onClick={() => setRemoveTarget(entry)}
                        className="text-on-surface-variant hover:text-error transition-colors"
                        aria-label="Remove entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Entry Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => { if (!open) { setAddOpen(false); setFormError(null) } }}
      >
        <DialogContent className="bg-surface-container border-white/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-on-surface">Add Entry</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Type
              </Label>
              <Select
                value={form.data_type}
                onValueChange={(val) => setForm((f) => ({ ...f, data_type: val }))}
              >
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="cost_center">Cost Center</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="expense_category">Expense Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                Description (optional)
              </Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this entry"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>

            {formError && (
              <p className="font-body text-error text-sm">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => { setForm(emptyEntryForm); setFormError(null); setAddOpen(false) }}
              className="border border-white/10 rounded-full px-5 py-2 text-sm font-body text-on-surface-variant hover:bg-white/5 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={formLoading || !form.value.trim()}
              className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium px-5 py-2 text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              {formLoading ? 'Adding...' : 'Add Entry'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}>
        <AlertDialogContent className="bg-surface-container border-white/5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface">Remove Entry</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              Are you sure you want to remove &quot;{removeTarget?.value}&quot;? It will be deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-on-surface-variant bg-transparent hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeLoading}
              className="bg-error text-on-error hover:bg-error/90"
            >
              {removeLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── BudgetsTab ───────────────────────────────────────────────────────────────

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const

function currentFY(): string {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`
}

function nextFY(): string {
  const cur = parseInt(currentFY().split('-')[0], 10)
  return `${cur + 1}-${String((cur + 2) % 100).padStart(2, '0')}`
}

function BudgetsTab() {
  const [canEdit, setCanEdit] = useState(false)
  useEffect(() => {
    setCanEdit(isAdmin() || isManager())
  }, [])

  const [fy, setFy] = useState(currentFY())
  const [departments, setDepartments] = useState<string[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<{ department: string; quarter: string; amount: string }>({
    department: '',
    quarter: 'Q1',
    amount: '',
  })
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  const handleAddBudget = async () => {
    setAddLoading(true)
    setAddError(null)
    try {
      const amt = parseFloat(addForm.amount)
      if (!addForm.department || isNaN(amt) || amt <= 0) {
        setAddError('Department and a positive amount are required')
        setAddLoading(false)
        return
      }
      await createBudget({
        department: addForm.department,
        fiscal_year: fy,
        quarter: addForm.quarter,
        amount: amt,
      })
      await refresh()
      setAddOpen(false)
      setAddForm({ department: '', quarter: 'Q1', amount: '' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add budget'
      if (msg.includes('409') || msg.toLowerCase().includes('already exists')) {
        setAddError(`Budget already exists for ${addForm.department} ${addForm.quarter} — edit the cell directly.`)
      } else {
        setAddError(msg)
      }
    } finally {
      setAddLoading(false)
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [m, b] = await Promise.all([
        getMasterData('department'),
        getBudgets({ fiscal_year: fy }),
      ])
      setDepartments(m.filter((x) => x.is_active !== false).map((x) => x.value))
      setBudgets(b)
    } finally {
      setLoading(false)
    }
  }, [fy])

  useEffect(() => { refresh() }, [refresh])

  const lookup = (dept: string, q: string) =>
    budgets.find((b) => b.department === dept && b.quarter === q)

  const setAmount = async (dept: string, q: string, amount: number) => {
    const key = `${dept}:${q}`
    setSavingKey(key)
    try {
      const existing = lookup(dept, q)
      if (existing) {
        await updateBudget(existing.id, { amount })
      } else {
        await createBudget({ department: dept, fiscal_year: fy, quarter: q, amount })
      }
      await refresh()
    } finally {
      setSavingKey(null)
    }
  }

  const deleteCell = async (dept: string, q: string) => {
    const existing = lookup(dept, q)
    if (!existing) return
    const key = `${dept}:${q}`
    setSavingKey(key)
    try {
      await deleteBudget(existing.id)
      await refresh()
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-on-surface-variant text-sm">
          Set quarterly budgets per department. Empty cells mean no budget set; the budget rule skips departments without a budget for the period.
        </p>
        <div className="flex items-center gap-2">
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            className="bg-surface-container-lowest text-on-surface px-3 py-2 rounded border border-outline-variant text-sm"
          >
            <option value={currentFY()}>FY {currentFY()}</option>
            <option value={nextFY()}>FY {nextFY()}</option>
          </select>
          {canEdit && (
            <button
              onClick={() => { setAddForm({ department: '', quarter: 'Q1', amount: '' }); setAddError(null); setAddOpen(true) }}
              className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium py-2 px-5 text-sm transition-all duration-300 hover:opacity-90"
            >
              Add Budget
            </button>
          )}
        </div>
      </div>

      {!canEdit && (
        <p className="text-on-surface-variant text-sm mb-4">
          Read-only view — only admin and manager can edit budgets.
        </p>
      )}

      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-on-surface-variant text-xs uppercase tracking-wider">
              <th className="text-left px-6 py-3">Department</th>
              {QUARTERS.map((q) => (
                <th key={q} className="text-right px-4 py-3">{q}</th>
              ))}
              <th className="text-right px-6 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant text-sm">
                  No active departments. Add some under Reference Data.
                </td>
              </tr>
            ) : (
              departments.map((dept) => {
                const total = QUARTERS.reduce((sum, q) => sum + (lookup(dept, q)?.amount ?? 0), 0)
                return (
                  <tr key={dept} className="border-b border-white/5">
                    <td className="px-6 py-3 text-on-surface font-medium">{dept}</td>
                    {QUARTERS.map((q) => {
                      const cur = lookup(dept, q)
                      const key = `${dept}:${q}`
                      return (
                        <td key={q} className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              key={`${dept}-${q}-${cur?.amount ?? 'empty'}`}
                              type="number"
                              defaultValue={cur?.amount ?? ''}
                              placeholder="—"
                              disabled={!canEdit || savingKey === key}
                              onBlur={(e) => {
                                const text = e.target.value.trim()
                                if (text === '' && cur) {
                                  deleteCell(dept, q)
                                } else {
                                  const v = parseFloat(text)
                                  if (!isNaN(v) && v !== (cur?.amount ?? NaN)) setAmount(dept, q, v)
                                }
                              }}
                              className="bg-surface-container-lowest text-on-surface text-right w-32 px-2 py-1 rounded border border-outline-variant focus:border-primary outline-none disabled:opacity-60"
                            />
                            {cur && canEdit && (
                              <button
                                onClick={() => deleteCell(dept, q)}
                                disabled={savingKey === key}
                                className="text-on-surface-variant opacity-40 hover:opacity-100 hover:text-error transition-opacity p-1"
                                title="Delete this budget"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-6 py-3 text-right text-on-surface font-mono text-xs">
                      {total > 0 ? `₹${total.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-surface-container border-white/5">
          <DialogHeader>
            <DialogTitle className="text-on-surface text-lg font-semibold">
              Add Budget — FY {fy}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Department</Label>
              <Select value={addForm.department} onValueChange={(v) => setAddForm((f) => ({ ...f, department: v }))}>
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Quarter</Label>
              <Select value={addForm.quarter} onValueChange={(v) => setAddForm((f) => ({ ...f, quarter: v }))}>
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  {QUARTERS.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">Amount (₹)</Label>
              <Input
                type="number"
                value={addForm.amount}
                onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 5000000"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>
            {addError && <p className="text-error text-sm">{addError}</p>}
          </div>
          <DialogFooter>
            <button
              onClick={() => setAddOpen(false)}
              className="border border-white/10 rounded-full px-5 py-2 text-sm font-body text-on-surface-variant hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleAddBudget}
              disabled={addLoading || !addForm.department || !addForm.amount}
              className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium px-5 py-2 text-sm disabled:opacity-40"
            >
              {addLoading ? 'Saving...' : 'Save'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ConfigPage ───────────────────────────────────────────────────────────────

export default function ConfigPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-on-surface">Configuration</h1>
        <p className="mt-2 text-on-surface-variant text-base">
          Rules and reference data for transaction validation.
        </p>
      </div>

      <Tabs defaultValue="rules">
        <TabsList className="mb-8 bg-surface-container-low border border-white/5 h-11">
          <TabsTrigger
            value="rules"
            className="data-[state=active]:bg-primary data-[state=active]:text-on-primary text-on-surface-variant px-6"
          >
            Rules
          </TabsTrigger>
          <TabsTrigger
            value="reference"
            className="data-[state=active]:bg-primary data-[state=active]:text-on-primary text-on-surface-variant px-6"
          >
            Reference Data
          </TabsTrigger>
          <TabsTrigger
            value="budgets"
            className="data-[state=active]:bg-primary data-[state=active]:text-on-primary text-on-surface-variant px-6"
          >
            Budgets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>

        <TabsContent value="reference">
          <ReferenceDataTab />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
