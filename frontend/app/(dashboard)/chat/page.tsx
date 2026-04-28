'use client'

import ChatPanel from '@/components/ChatPanel'

export default function ChatPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="font-headline text-5xl text-on-surface leading-tight mb-2">
          Insights
        </h1>
        <p className="font-body text-on-surface-variant text-base">
          AI-powered analysis of your financial data
        </p>
      </div>

      <div className="flex-1 bg-surface-container-low rounded-lg overflow-hidden">
        <ChatPanel />
      </div>
    </div>
  )
}
