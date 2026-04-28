'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { setAuth } from '@/lib/auth'
import ThemeToggle from '@/components/layout/ThemeToggle'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function ObsidianMark({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z" fill="currentColor" />
      <path clipRule="evenodd" d="M39.998 35.764C39.9944 35.7463 39.9875 35.7155 39.9748 35.6706C39.9436 35.5601 39.8949 35.4259 39.8346 35.2825C39.8168 35.2403 39.7989 35.1993 39.7813 35.1602C38.5103 34.2887 35.9788 33.0607 33.7095 32.5189C30.9875 31.8691 27.6413 31.4783 24 31.4783C20.3587 31.4783 17.0125 31.8691 14.2905 32.5189C12.0012 33.0654 9.44505 34.3104 8.18538 35.1832C8.15052 35.2592C8.09919 35.3751 8.05721 35.4886 8.02977 35.589C8.00039 35.7333 8.00004 35.7388C8.00004 35.7641 8.0104 36.0767 8.68485 36.6314C9.34546 37.1746 10.4222 37.7531 11.9291 38.2772C14.9242 39.319 19.1919 40 24 40C28.8081 40 33.0758 39.319 36.0709 38.2772C37.5778 37.7531 38.6545 37.1746 39.3151 36.6314C39.9006 36.1499 39.9857 35.8511 39.998 35.764ZM4.95178 32.7688L21.4543 6.30267C22.6288 4.4191 25.3712 4.41909 26.5457 6.30267L43.0534 32.777L12.0131 29.004C16.4281 27.8961 20.0901 27.4783 24 27.4783C27.9099 27.4783 31.5719 27.8961 35.9868 29.004Z" fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post(`${BASE_URL}/api/auth/login`, { email, password })
      setAuth(data.access_token, data.role, data.full_name)
      router.push('/dashboard')
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(String(err.response.data.detail))
      } else {
        setError('Invalid credentials. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">

      {/* Subtle radial glow — adapts to theme */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 70% 50%, hsl(var(--primary)/0.06) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-8 lg:px-12 py-6">
        <ThemeToggle />
        <ObsidianMark className="w-5 h-5 text-on-surface-variant/50" />
      </header>

      {/* Main layout */}
      <main className="relative z-10 flex w-full min-h-screen">
        <div className="flex flex-col lg:flex-row w-full">

          {/* Left — editorial tagline */}
          <div className="hidden lg:flex flex-col w-1/2 min-h-screen items-center justify-center p-20">
            <div className="max-w-lg w-full">
              <p className="font-label text-[0.6875rem] uppercase tracking-[0.2em] text-primary mb-8">
                System Validation
              </p>
              <h1 className="font-semibold text-6xl text-on-surface leading-[1.15]">
                Data as Art.<br />Security as Standard.
              </h1>
            </div>
          </div>

          {/* Right — form */}
          <div className="flex flex-col w-full lg:w-1/2 min-h-screen items-center justify-center px-8 sm:px-16 lg:px-24 py-24">
            <div className="w-full max-w-md">

              {/* Form header */}
              <div className="mb-14">
                <p className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant mb-4 flex items-center gap-2">
                  <span className="w-4 h-px bg-primary/50" />
                  Authorization Required
                </p>
                <h2 className="font-semibold text-5xl tracking-tight text-on-surface mb-2">
                  The Vault
                </h2>
                <p className="font-body text-base text-on-surface-variant font-light">
                  Secure your digital assets
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>

                <label className="flex flex-col gap-3 group">
                  <span className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant group-focus-within:text-primary transition-colors duration-200">
                    Curator ID
                  </span>
                  <input
                    type="email"
                    autoComplete="username"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-14 bg-surface-container-lowest text-on-surface font-body text-base border-0 border-b-2 border-outline-variant focus:border-primary focus:outline-none rounded-lg px-5 transition-colors duration-200 placeholder:text-on-surface-variant/40"
                  />
                  <span className="font-label text-[0.625rem] text-on-surface-variant/50 tracking-wide -mt-1">
                    Enter your registered email address
                  </span>
                </label>

                <label className="flex flex-col gap-3 group">
                  <span className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant group-focus-within:text-primary transition-colors duration-200">
                    Access Cipher
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-14 bg-surface-container-lowest text-on-surface font-body text-base border-0 border-b-2 border-outline-variant focus:border-primary focus:outline-none rounded-lg px-5 pr-12 transition-colors duration-200 placeholder:text-on-surface-variant/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="font-label text-[0.625rem] text-on-surface-variant/50 tracking-wide -mt-1">
                    Enter your system password
                  </span>
                </label>

                {error && (
                  <p className="font-body text-sm text-error">{error}</p>
                )}

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-16 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-body font-medium text-base flex items-center justify-between px-8 hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <span>{loading ? 'Initializing…' : 'Initialize Session'}</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>

              </form>
            </div>
          </div>

        </div>
      </main>

      <div className="absolute bottom-8 left-0 w-full px-8 sm:px-16 lg:px-24 flex justify-between items-center text-[0.6875rem] font-label uppercase tracking-[0.1em] text-on-surface-variant/30 pointer-events-none z-20">
        <span>Secure Architecture</span>
        <span>v 2.4.0</span>
      </div>
    </div>
  )
}
