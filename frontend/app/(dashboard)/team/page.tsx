'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import {
  getUsers,
  createUser,
  updateUser,
  User,
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

interface NewUserForm {
  full_name: string
  email: string
  password: string
  role: string
  department: string
}

const emptyForm: NewUserForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'user',
  department: '',
}

function formatLastLogin(value: string | null): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
        admin
      </span>
    )
  }
  if (role === 'manager') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary">
        manager
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant">
      user
    </span>
  )
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<NewUserForm>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/')
      return
    }
    getUsers()
      .then(setUsers)
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load users')
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) return
    setFormLoading(true)
    setFormError(null)
    try {
      const created = await createUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department.trim() || undefined,
      })
      setUsers((prev) => [created, ...prev])
      setForm(emptyForm)
      setAddOpen(false)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create user'
      setFormError(message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    if (togglingId !== null) return
    setTogglingId(user.id)
    try {
      const updated = await updateUser(user.id, { is_active: !user.is_active })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)))
    } catch {
      // leave state unchanged; toggle will visually revert on next render
    } finally {
      setTogglingId(null)
    }
  }

  const tableHeaders = ['Full Name', 'Email', 'Role', 'Department', 'Last Login', 'Active']

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-on-surface">Team</h1>
        <button
          onClick={() => { setForm(emptyForm); setFormError(null); setAddOpen(true) }}
          className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium py-2.5 px-6 text-sm transition-all duration-300 hover:opacity-90"
        >
          Add User
        </button>
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
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-body text-red-600 text-base">{fetchError}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-body text-on-surface-variant text-base">
              No users found
            </p>
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
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4 font-body text-sm text-on-surface">
                    {user.full_name}
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant">
                    {user.department ?? '—'}
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-on-surface-variant">
                    {formatLastLogin(user.last_login)}
                  </td>
                  <td className="px-6 py-4">
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={() => handleToggleActive(user)}
                      disabled={togglingId !== null}
                      aria-label={`Toggle active status for ${user.full_name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false)
            setFormError(null)
          }
        }}
      >
        <DialogContent className="bg-surface-container border-white/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-on-surface">
              Add User
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Full Name
              </Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Jane Doe"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Password
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Role
              </Label>
              <Select
                value={form.role}
                onValueChange={(val) => setForm((f) => ({ ...f, role: val }))}
              >
                <SelectTrigger className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container border-white/10">
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="manager">manager</SelectItem>
                  <SelectItem value="user">user</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Department <span className="normal-case opacity-50">(optional)</span>
              </Label>
              <Input
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="e.g. Engineering"
                className="bg-surface-container-lowest border-0 border-b-2 border-transparent focus:border-primary rounded-none text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>

            {formError && (
              <p className="font-body text-error text-sm">
                {formError}
              </p>
            )}
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
              disabled={
                formLoading ||
                !form.full_name.trim() ||
                !form.email.trim() ||
                !form.password.trim()
              }
              className="bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary font-body font-medium px-5 py-2 text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              {formLoading ? 'Creating...' : 'Create User'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
