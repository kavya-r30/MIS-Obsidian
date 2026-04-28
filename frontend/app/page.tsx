'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/layout/ThemeToggle'
import {
  Camera,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  MessageSquare,
  FileDown,
} from 'lucide-react'

/* ─── Obsidian SVG logo ─── */
function ObsidianLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z"
        fill="currentColor"
      />
      <path
        clipRule="evenodd"
        d="M39.998 35.764C39.9944 35.7463 39.9875 35.7155 39.9748 35.6706C39.9436 35.5601 39.8949 35.4259 39.8346 35.2825C39.8168 35.2403 39.7989 35.1993 39.7813 35.1602C38.5103 34.2887 35.9788 33.0607 33.7095 32.5189C30.9875 31.8691 27.6413 31.4783 24 31.4783C20.3587 31.4783 17.0125 31.8691 14.2905 32.5189C12.0012 33.0654 9.44505 34.3104 8.18538 35.1832C8.17384 35.2075 8.16216 35.233 8.15052 35.2592C8.09919 35.3751 8.05721 35.4886 8.02977 35.589C8.00356 35.6848 8.00039 35.7333 8.00004 35.7388C8.00004 35.7641 8.0104 36.0767 8.68485 36.6314C9.34546 37.1746 10.4222 37.7531 11.9291 38.2772C14.9242 39.319 19.1919 40 24 40C28.8081 40 33.0758 39.319 36.0709 38.2772C37.5778 37.7531 38.6545 37.1746 39.3151 36.6314C39.9006 36.1499 39.9857 35.8511 39.998 35.764ZM4.95178 32.7688L21.4543 6.30267C22.6288 4.4191 25.3712 4.41909 26.5457 6.30267L43.0534 32.777C43.0709 32.8052 43.0878 32.8338 43.104 32.8629L41.3563 33.8352C43.104 32.8629 43.1038 32.8626 43.104 32.8629L43.1051 32.865L43.1065 32.8675L43.1101 32.8739L43.1199 32.8918C43.1276 32.906 43.1377 32.9246 43.1497 32.9473C43.1738 32.9925 43.2062 33.0545 43.244 33.1299C43.319 33.2792 43.4196 33.489 43.5217 33.7317C43.6901 34.1321 44 34.9311 44 35.7391C44 37.4427 43.003 38.7775 41.8558 39.7209C40.6947 40.6757 39.1354 41.4464 37.385 42.0552C33.8654 43.2794 29.133 44 24 44C18.867 44 14.1346 43.2794 10.615 42.0552C8.86463 41.4464 7.30529 40.6757 6.14419 39.7209C4.99695 38.7775 3.99999 37.4427 3.99999 35.7391C3.99999 34.8725 4.29264 34.0922 4.49321 33.6393C4.60375 33.3898 4.71348 33.1804 4.79687 33.0311C4.83898 32.9556 4.87547 32.8935 4.9035 32.8471C4.91754 32.8238 4.92954 32.8043 4.93916 32.7889L4.94662 32.777L4.95178 32.7688ZM35.9868 29.004L24 9.77997L12.0131 29.004C12.4661 28.8609 12.9179 28.7342 13.3617 28.6282C16.4281 27.8961 20.0901 27.4783 24 27.4783C27.9099 27.4783 31.5719 27.8961 34.6383 28.6282C35.082 28.7342 35.5339 28.8609 35.9868 29.004Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  )
}

/* ─── Feature card data ─── */
const FEATURES = [
  {
    icon: Camera,
    title: 'OCR Receipt Scanning',
    desc: 'Upload any receipt — our AI extracts vendor, amount, date, and line items automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Smart Validation',
    desc: 'Rule-based + AI validation catches anomalies, duplicates, and policy violations instantly.',
  },
  {
    icon: BarChart3,
    title: 'Rich Analytics',
    desc: 'Spend trends, department breakdowns, top vendors — every metric your finance team needs.',
  },
  {
    icon: CheckCircle2,
    title: 'Approval Workflows',
    desc: 'Role-based review queues with full audit trail. Approve or reject with one click.',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat Insights',
    desc: 'Ask questions about your data in plain English. Get instant answers from your transaction history.',
  },
  {
    icon: FileDown,
    title: 'Automated Reports',
    desc: 'Export Excel or PDF reports with custom date ranges and department filters.',
  },
]

/* ─── Stats data ─── */
const STATS = [
  { value: '10,000+', label: 'Transactions daily' },
  { value: '99.1%', label: 'Validation accuracy' },
  { value: '< 4s', label: 'Receipt scan time' },
  { value: '100%', label: 'Audit trail coverage' },
]

/* ─── Main page ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased overflow-x-hidden">

      {/* ══ HERO ══ */}
      <section className="relative min-h-screen flex flex-col bg-background">

        {/* Subtle radial glow behind hero content */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(189,194,255,0.07) 0%, transparent 70%)',
          }}
        />

        {/* ── Nav ── */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <ObsidianLogo className="w-6 h-6 text-primary" />
            <span className="font-semibold text-base tracking-tight text-on-surface">
              Obsidian MIS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-5 py-2 rounded-full border border-outline-variant/50 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:border-outline-variant hover:bg-surface-container transition-all duration-200 active:scale-95"
            >
              Sign In
            </Link>
          </div>
        </nav>

        {/* ── Hero content ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-10 pt-16 pb-24 gap-8">

          {/* Stat badges */}
          <div
            className="flex flex-wrap items-center justify-center gap-2"
            style={{ animationDelay: '0ms' }}
          >
            {['482K+ transactions processed', '99.1% accuracy', '4 second avg scan time'].map(
              (badge) => (
                <span
                  key={badge}
                  className="bg-surface-container border border-outline-variant/50 rounded-full px-4 py-1.5 text-xs font-medium text-on-surface-variant"
                >
                  {badge}
                </span>
              ),
            )}
          </div>

          {/* Headline */}
          <h1
            className="text-5xl lg:text-7xl font-semibold tracking-tight text-on-surface leading-[1.08] max-w-4xl"
            style={{ animationDelay: '80ms' }}
          >
            Financial Intelligence,{' '}
            <span className="text-primary">Automated.</span>
          </h1>

          {/* Sub-heading */}
          <p
            className="text-lg lg:text-xl text-on-surface-variant max-w-2xl leading-relaxed"
            style={{ animationDelay: '160ms' }}
          >
            Scan receipts. Validate transactions. Gain insights.{' '}
            <span className="text-on-surface/70">All in one place.</span>
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 mt-2"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              href="/login"
              className="px-7 py-3 rounded-full bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-all duration-200 active:scale-95 shadow-[0_0_30px_rgba(189,194,255,0.2)]"
            >
              Get Started →
            </Link>
            <a
              href="#features"
              className="px-7 py-3 rounded-full border border-outline-variant/50 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container hover:border-outline-variant transition-all duration-200 active:scale-95"
            >
              See how it works
            </a>
          </div>

          {/* Dashboard preview mockup */}
          <div
            className="w-full max-w-2xl mt-6 rounded-xl border border-outline-variant/50 bg-surface-container-low overflow-hidden shadow-2xl"
            style={{ animationDelay: '320ms' }}
          >
            {/* Mockup title bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-outline-variant/30 bg-surface-container">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-container-high" />
              <span className="w-2.5 h-2.5 rounded-full bg-surface-container-high" />
              <span className="w-2.5 h-2.5 rounded-full bg-surface-container-high" />
              <span className="ml-3 text-xs text-on-surface-variant/50 font-medium tracking-wide">
                Obsidian MIS — Dashboard
              </span>
            </div>
            {/* Fake KPI rows */}
            <div className="p-5 flex flex-col gap-3">
              {[
                { label: 'Total Spend (MTD)', val: '$1,247,392', change: '+4.2%', up: true },
                { label: 'Pending Approvals', val: '23', change: '6 flagged', up: false },
                { label: 'Receipts Processed Today', val: '1,840', change: '+12.5%', up: true },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg bg-surface-container px-4 py-3"
                >
                  <span className="text-xs text-on-surface-variant">{row.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-on-surface tabular-nums">
                      {row.val}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.up
                          ? 'bg-primary/10 text-primary'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {row.change}
                    </span>
                  </div>
                </div>
              ))}
              {/* Fake sparkline bar */}
              <div className="mt-1 flex gap-1 items-end h-10 px-1">
                {[40, 55, 35, 70, 60, 80, 65, 90, 75, 85, 70, 95].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-primary/20"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section
        id="features"
        className="py-24 px-6 sm:px-10 lg:px-16 bg-background border-t border-outline-variant/30"
      >
        <div className="max-w-6xl mx-auto">
          {/* Section heading */}
          <div className="text-center mb-14">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-3">
              Platform Capabilities
            </p>
            <h2 className="text-3xl lg:text-4xl font-semibold text-on-surface tracking-tight">
              Everything your finance team needs
            </h2>
            <p className="mt-3 text-on-surface-variant max-w-xl mx-auto">
              From raw receipt to boardroom insight — Obsidian handles the entire transaction
              intelligence lifecycle.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-6 hover:border-primary/30 hover:bg-surface-container hover:scale-[1.02] transition-all duration-300 cursor-default"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base text-on-surface mb-2">{feat.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{feat.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══ STATS ROW ══ */}
      <section className="py-20 px-6 sm:px-10 lg:px-16 border-t border-outline-variant/30 bg-surface-container-lowest">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-4xl font-semibold text-primary tabular-nums">
                  {stat.value}
                </span>
                <span className="text-sm text-on-surface-variant">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA SECTION ══ */}
      <section className="py-24 px-6 sm:px-10 lg:px-16 bg-background border-t border-outline-variant/30">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-10 sm:p-16 text-center relative overflow-hidden">
            {/* Background glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(189,194,255,0.05) 0%, transparent 70%)',
              }}
            />
            <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-primary mb-4">
              Get Started Today
            </p>
            <h2 className="relative text-3xl lg:text-4xl font-semibold text-on-surface tracking-tight mb-4">
              Ready to modernize your expense management?
            </h2>
            <p className="relative text-on-surface-variant mb-8 max-w-md mx-auto">
              Join finance teams that trust Obsidian MIS to process, validate, and analyze every
              transaction — automatically.
            </p>
            <Link
              href="/login"
              className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-all duration-200 active:scale-95 shadow-[0_0_40px_rgba(189,194,255,0.25)]"
            >
              Get Started Today →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-8 px-6 border-t border-outline-variant/30 bg-background">
        <p className="text-center text-xs text-on-surface-variant/50 tracking-wide">
          Obsidian MIS · Financial Transaction Intelligence
        </p>
      </footer>
    </div>
  )
}
