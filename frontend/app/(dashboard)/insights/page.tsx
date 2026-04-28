'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ChatPanel from '@/components/ChatPanel'
import { sendChat } from '@/lib/api'

interface InsightCard { title: string; query: string; reply: string | null; loading: boolean }

const PRESET_QUERIES: Array<Omit<InsightCard, 'reply' | 'loading'>> = [
  {
    title: 'Month Summary',
    query: "Summarise this month's transactions using only short bullet points — no tables, no code blocks. Include: total count, total spend, status breakdown (validated/flagged/rejected), top 3 departments by spend, and overall data quality score.",
  },
  {
    title: 'Issues & Actions',
    query: "What needs immediate attention? Reply with short bullet points only — no tables, no code blocks. Cover: pending transaction count, duplicate invoices, low-confidence transactions (under 50), and the top failing validation rule.",
  },
]

export default function InsightsPage() {
  const [cards, setCards] = useState<InsightCard[]>(
    PRESET_QUERIES.map((q) => ({ ...q, reply: null, loading: true }))
  )

  const loadInsights = async (signal: { cancelled: boolean }) => {
    setCards(PRESET_QUERIES.map((q) => ({ ...q, reply: null, loading: true })))
    for (let i = 0; i < PRESET_QUERIES.length; i++) {
      if (signal.cancelled) return
      const q = PRESET_QUERIES[i]
      try {
        const { reply } = await sendChat(q.query)
        if (signal.cancelled) return
        setCards((prev) => prev.map((c, j) => j === i ? { ...c, reply, loading: false } : c))
      } catch {
        if (signal.cancelled) return
        setCards((prev) => prev.map((c, j) => j === i ? { ...c, reply: 'Unable to load insight.', loading: false } : c))
      }
      if (i < PRESET_QUERIES.length - 1) await new Promise((r) => setTimeout(r, 1200))
    }
  }

  const signalRef = useRef<{ cancelled: boolean }>({ cancelled: false })

  const handleRefresh = () => {
    signalRef.current.cancelled = true
    const newSignal = { cancelled: false }
    signalRef.current = newSignal
    loadInsights(newSignal)
  }

  useEffect(() => {
    const signal = { cancelled: false }
    signalRef.current = signal
    loadInsights(signal)
    return () => { signal.cancelled = true }
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10 h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">AI Insights</h1>
          <p className="text-sm text-on-surface-variant mt-1">Live intelligence on your financial data</p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left — Chat (fills space, message thread scrolls internally) */}
        <div className="flex-1 min-h-0 bg-surface-container-low border border-white/5 rounded-lg overflow-hidden flex flex-col">
          <ChatPanel />
        </div>

        {/* Right — Live Context (fixed width, header pinned, cards scroll) */}
        <div className="w-80 shrink-0 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
              Live Context
            </p>
            <button
              onClick={handleRefresh}
              className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded hover:bg-white/5"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable cards area */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-0.5">
            {cards.map((card) => (
              <div
                key={card.title}
                className="bg-surface-container-low border border-white/5 rounded-lg p-4 shrink-0"
              >
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
                  {card.title}
                </p>
                {card.loading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-surface-container-high rounded animate-pulse w-full" />
                    <div className="h-3 bg-surface-container-high rounded animate-pulse w-5/6" />
                    <div className="h-3 bg-surface-container-high rounded animate-pulse w-4/5" />
                    <div className="h-3 bg-surface-container-high rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-surface-container-high rounded animate-pulse w-2/3" />
                  </div>
                ) : (
                  <div className="text-xs leading-relaxed prose prose-xs max-w-none prose-p:text-on-surface-variant prose-p:my-1 prose-strong:text-on-surface prose-li:text-on-surface-variant prose-li:my-0 prose-ul:mt-1 prose-ul:pl-4 prose-headings:text-on-surface prose-headings:text-xs prose-a:text-primary [&_pre]:!bg-surface-container-high [&_pre]:!text-on-surface-variant [&_pre]:rounded [&_pre]:p-2 [&_pre]:text-[0.65rem] [&_pre]:border [&_pre]:border-outline-variant/20 [&_code]:!bg-transparent [&_code]:text-primary [&_code]:text-[0.65rem] [&_table]:w-full [&_table]:text-[0.65rem] [&_th]:pb-1 [&_th]:text-on-surface-variant [&_td]:py-0.5 [&_td]:text-on-surface-variant">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{card.reply ?? ''}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
