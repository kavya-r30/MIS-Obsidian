'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/auth'
import TopNav from '@/components/layout/TopNav'
import PageTransition from '@/components/layout/PageTransition'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!getToken()) {
      router.push('/')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="px-16">
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  )
}
