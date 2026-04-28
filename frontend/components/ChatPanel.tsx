'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { sendChat } from '@/lib/api'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'ai'
  text: string
}

const PROMPTS = [
  "How many transactions are pending?",
  "Which invoices are flagged as duplicates?",
  "Transactions with confidence score below 50",
  "Top rejection reasons this month",
  "Total tax amount by department",
  "Which transactions were revalidated most?",
  "Compare transaction date vs upload date gaps",
  "Top vendors by transaction amount",
]

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const newChat = () => setMessages([])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSubmit = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const { reply } = await sendChat(text)
      setMessages((prev) => [...prev, { role: 'ai', text: reply }])
    } catch (err: unknown) {
      const errorText =
        err instanceof Error ? err.message : 'Something went wrong.'
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: `Error: ${errorText}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <p className="text-sm font-medium text-on-surface">Chat</p>
        <button
          onClick={newChat}
          className="text-xs text-on-surface-variant hover:text-on-surface border border-white/10 rounded-full px-3 py-1 transition-colors duration-150 hover:bg-white/5"
        >
          New Chat
        </button>
      </div>

      {/* Message thread */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="font-body text-on-surface-variant text-base">
              Ask anything about your transactions...
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={
                    msg.role === 'user'
                      ? 'bg-surface-container-high rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%] font-body text-sm text-on-surface'
                      : 'bg-surface-container-low rounded-2xl rounded-tl-sm px-4 py-3 max-w-[70%] font-body text-sm text-on-surface prose prose-sm prose-headings:text-on-surface prose-p:text-on-surface prose-strong:text-on-surface prose-li:text-on-surface prose-code:text-primary prose-pre:bg-surface-container prose-a:text-primary'
                  }
                >
                  {msg.role === 'ai' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-low rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span
                    className="w-2 h-2 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Prompt chips */}
      <div className="px-4 pt-2 pb-1 flex flex-wrap gap-2 border-t border-white/5">
        {PROMPTS.map((p) => (
          <button key={p} onClick={() => setInput(p)}
            className="text-[0.6875rem] font-medium px-3 py-1 rounded-full border border-white/10 text-on-surface-variant hover:text-on-surface hover:border-primary/30 transition-colors duration-150">
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="bg-surface/80 backdrop-blur-xl border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask the ledger..."
            className="flex-1 rounded-full bg-surface-container-lowest px-4 py-2 outline-none text-on-surface text-sm font-body placeholder:text-on-surface-variant/50 transition-all duration-300 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary to-primary-container rounded-full text-on-primary transition-all duration-300 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
