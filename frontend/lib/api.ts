import axios from 'axios'
import { getToken, clearAuth } from './auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export interface Transaction {
  id: number
  vendor_name: string | null
  amount: number | null
  tax_amount: number | null
  currency: string | null
  transaction_date: string | null
  upload_date: string | null
  department: string | null
  cost_center: string | null
  payment_method: string | null
  approval_ref: string | null
  invoice_number: string | null
  original_filename: string | null
  confidence_score: number | null
  status: string
  is_duplicate: boolean
  revalidation_count: number
  rejection_reason: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
}

export interface AuditLogEntry {
  id: number
  user_id: number | null
  action: string
  entity_type: string | null
  entity_id: number | null
  details: Record<string, unknown> | null
  timestamp: string
}

export interface Rule {
  id: number
  rule_name: string
  rule_type: string
  threshold: number | null
  severity: string
  description: string
  parameters: string | null
  is_active: boolean
  created_at: string | null
}

export interface MasterDataEntry {
  id: number
  data_type: string
  value: string
  description: string | null
  created_at: string | null
}

export interface User {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  department: string | null
  last_login: string | null
}

export interface AnalyticsSummary {
  total: number
  validated: number
  flagged: number
  rejected: number
  approved: number
  avg_confidence_score: number
  pending?: number
}

export interface TrendPoint {
  date: string
  status: string
  count: number
}

export interface DeptStat {
  department: string
  count: number
  avg_score: number
}

export interface ValidationLog {
  rule_name: string
  passed: boolean
  severity: string
  message: string
}

export interface TransactionDetail extends Transaction {
  raw_text: string | null
  validation_logs: ValidationLog[]
}

export interface UploadResult {
  id: number
  status: string
  confidence_score: number
}

export interface ExceptionItem {
  id: number
  vendor_name: string | null
  amount: number | null
  confidence_score: number | null
  department: string | null
  transaction_date: string | null
  payment_method: string | null
  cost_center: string | null
  approval_ref: string | null
  invoice_number: string | null
  is_duplicate: boolean
}

export interface RevalidateResult {
  id: number
  status: string
  confidence_score: number
}

export interface SpendAnalytics {
  total_spend: number
  by_department: { department: string; amount: number; count: number }[]
  by_vendor: { vendor_name: string; amount: number; count: number }[]
  by_period: { date: string; amount: number }[]
}

export interface PipelineStats {
  pending:   { count: number; pct: number }
  validated: { count: number; pct: number }
  flagged:   { count: number; pct: number }
  approved:  { count: number; pct: number }
  rejected:  { count: number; pct: number }
  total: number
  approval_rate: number
  flag_rate: number
}

export interface TopVendor {
  vendor_name: string
  total_amount: number
  transaction_count: number
  avg_confidence_score: number
}

export const getAnalyticsSummary = () =>
  api.get<AnalyticsSummary>('/api/analytics/summary').then((r) => r.data)

export const getAnalyticsTrends = () =>
  api.get<TrendPoint[]>('/api/analytics/trends').then((r) => r.data)

export const getAnalyticsDepartment = () =>
  api.get<DeptStat[]>('/api/analytics/department').then((r) => r.data)

export const getTransactions = (params?: {
  status?: string
  department?: string
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}) =>
  api
    .get<{ total: number; items: Transaction[] }>('/api/transactions/', { params })
    .then((r) => r.data)

export const getTransaction = (id: number) =>
  api.get<TransactionDetail>(`/api/transactions/${id}`).then((r) => r.data)

export const uploadReceipt = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post<UploadResult>('/api/transactions/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export interface ManualTransactionBody {
  vendor_name: string
  amount: number
  tax_amount?: number
  currency?: string
  transaction_date: string
  approval_date?: string
  department: string
  cost_center?: string
  payment_method?: string
  invoice_number?: string
  approval_ref?: string
}

export const createTransaction = (body: ManualTransactionBody) =>
  api.post<Transaction>('/api/transactions/', body).then((r) => r.data)

export const revalidateTransaction = (id: number) =>
  api
    .post<RevalidateResult>(`/api/transactions/${id}/validate`)
    .then((r) => r.data)

export const deleteTransaction = (id: number): Promise<void> =>
  api.delete(`/api/transactions/${id}`).then(() => undefined)

export const getExceptions = () =>
  api.get<ExceptionItem[]>('/api/exceptions/').then((r) => r.data)

export const approveException = (id: number): Promise<{ id: number; status: string }> =>
  api.post<{ id: number; status: string }>(`/api/exceptions/${id}/approve`).then((r) => r.data)

export const rejectException = (id: number, reason: string): Promise<{ id: number; status: string }> =>
  api
    .post<{ id: number; status: string }>(
      `/api/exceptions/${id}/reject`,
      { reason },
      { headers: { 'Content-Type': 'application/json' } }
    )
    .then((r) => r.data)

export const getRules = () =>
  api.get<Rule[]>('/api/rules/').then((r) => r.data)

export const createRule = (body: {
  rule_name: string
  rule_type: string
  threshold?: number
  severity: string
  description: string
  parameters?: string
}) => api.post<Rule>('/api/rules/', body).then((r) => r.data)

export const updateRule = (
  id: number,
  body: { threshold?: number; description?: string; is_active?: boolean; severity?: string; parameters?: string }
) => api.patch<Rule>(`/api/rules/${id}`, body).then((r) => r.data)

export const deleteRule = (id: number): Promise<void> =>
  api.delete(`/api/rules/${id}`).then(() => undefined)

export const getMasterData = (data_type?: string) =>
  api
    .get<MasterDataEntry[]>('/api/master-data/', {
      params: data_type ? { data_type } : undefined,
    })
    .then((r) => r.data)

export const createMasterData = (body: { data_type: string; value: string; description?: string }) =>
  api.post<MasterDataEntry>('/api/master-data/', body).then((r) => r.data)

export const deactivateMasterData = (id: number): Promise<MasterDataEntry> =>
  api.patch<MasterDataEntry>(`/api/master-data/${id}`, { is_active: false }).then((r) => r.data)

export const getUsers = () =>
  api.get<User[]>('/api/users/').then((r) => r.data)

export const createUser = (body: {
  email: string
  password: string
  full_name: string
  role: string
  department?: string
}) => api.post<User>('/api/users/', body).then((r) => r.data)

export const updateUser = (id: number, body: { is_active?: boolean; role?: string; department?: string }) =>
  api.patch<User>(`/api/users/${id}`, body).then((r) => r.data)

export const exportExcel = (params?: {
  start_date?: string
  end_date?: string
  department?: string
}) =>
  api
    .get<Blob>('/api/export/excel', { params, responseType: 'blob' })
    .then((r) => r.data)

export const exportPdf = (params?: {
  start_date?: string
  end_date?: string
  department?: string
}) =>
  api
    .get<Blob>('/api/export/pdf', { params, responseType: 'blob' })
    .then((r) => r.data)

export const sendChat = (message: string) =>
  api.post<{ reply: string }>('/api/chat/', { message }).then((r) => r.data)

export const getAnalyticsSpend = (params?: {
  start_date?: string
  end_date?: string
  department?: string
}): Promise<SpendAnalytics> =>
  api.get<SpendAnalytics>('/api/analytics/spend', { params }).then((r) => r.data)

export const getAnalyticsPipeline = (): Promise<PipelineStats> =>
  api.get<PipelineStats>('/api/analytics/pipeline').then((r) => r.data)

export const getTopVendors = (limit = 10): Promise<TopVendor[]> =>
  api.get<TopVendor[]>('/api/analytics/top-vendors', { params: { limit } }).then((r) => r.data)

export const getAuditLog = (params?: {
  action?: string
  entity_type?: string
  entity_id?: number
  skip?: number
  limit?: number
}): Promise<{ total: number; items: AuditLogEntry[] }> =>
  api.get<{ total: number; items: AuditLogEntry[] }>('/api/audit-log/', { params }).then((r) => r.data)
