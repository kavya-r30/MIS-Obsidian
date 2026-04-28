'use client'
import { useRouter } from 'next/navigation'
import { Transaction } from '@/lib/api'
import ValidationBadge from '@/components/ValidationBadge'

interface Props {
  transactions: Transaction[]
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return '—'
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : (currency ?? '')
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function TransactionTable({ transactions }: Props) {
  const router = useRouter()

  if (!transactions.length) {
    return (
      <div className="py-20 text-center">
        <p className="text-2xl font-semibold text-on-surface-variant">No transactions found</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {['Vendor', 'Amount', 'Date', 'Department', 'Status', 'Score'].map((h) => (
              <th key={h} className="text-left pb-4 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant font-medium px-3 first:pl-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              onClick={() => router.push(`/transactions/${tx.id}`)}
              className="border-b border-white/5 hover:bg-surface-container cursor-pointer transition-colors"
            >
              <td className="py-4 px-3 first:pl-0 font-body text-sm text-on-surface">{tx.vendor_name ?? '—'}</td>
              <td className="py-4 px-3 font-body text-sm text-on-surface">{formatAmount(tx.amount, tx.currency)}</td>
              <td className="py-4 px-3 font-body text-sm text-on-surface-variant">{tx.transaction_date ?? '—'}</td>
              <td className="py-4 px-3 font-body text-sm text-on-surface-variant">{tx.department ?? '—'}</td>
              <td className="py-4 px-3"><ValidationBadge status={tx.status} /></td>
              <td className="py-4 px-3 font-body text-sm text-on-surface-variant">{tx.confidence_score?.toFixed(1) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
