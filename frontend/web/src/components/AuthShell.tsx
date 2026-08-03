'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type AuthShellProps = {
  title: string
  subtitle: string
  footerLabel: string
  footerHref: string
  footerLinkText: string
  submitLabel: string
  children: ReactNode
}

const HIGHLIGHTS = [
  'Track stock before it turns into a counter problem.',
  'Record sales fast, even during rush hours.',
  'Keep customer due and repeat buyers in one system.',
]

export default function AuthShell({
  title,
  subtitle,
  footerLabel,
  footerHref,
  footerLinkText,
  submitLabel,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-transparent p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] border border-paper-3 bg-white/70 shadow-[0_20px_80px_rgba(32,45,68,0.12)] backdrop-blur lg:grid-cols-[minmax(0,1.05fr)_440px]">
        <section className="relative hidden overflow-hidden bg-night text-snow lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(106,155,255,0.28),_transparent_22rem),radial-gradient(circle_at_bottom_left,_rgba(140,214,181,0.14),_transparent_24rem)]" />
          <div className="relative flex w-full flex-col justify-between p-10 xl:p-12">
            <div>
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-snow">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 22v-7h6v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                SmartBiz
              </Link>
              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.26em] text-brand-soft">
                Built for busy shop counters
              </p>
              <h1
                className="mt-5 max-w-[11ch] text-5xl font-extrabold leading-[0.95] tracking-[-0.04em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Run the shop, not the paperwork.
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-snow-2">
                SmartBiz keeps inventory, sales, customer credit, and daily signals in one place, so you can glance once and move.
              </p>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-snow-2">Today&apos;s pace</p>
                    <p className="mt-2 text-3xl font-bold tracking-[-0.03em]">NPR 24,500</p>
                  </div>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-mint">
                    Sales are moving
                  </span>
                </div>
                <div className="mt-5 flex items-end gap-2">
                  {[38, 64, 44, 82, 58, 91, 73].map((value, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-full bg-snow"
                      style={{ height: `${Math.max(value, 18)}px`, opacity: 0.42 + value / 140 }}
                    />
                  ))}
                </div>
              </div>

              <ul className="space-y-3">
                {HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-snow-2">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-snow" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-white/92 p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3 lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-night text-snow shadow-[0_14px_30px_rgba(32,31,29,0.18)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 22v-7h6v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-ink">SmartBiz</span>
            </Link>

            <div className="mt-8 lg:mt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-3">Account access</p>
              <h2
                className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-ink"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-2">{subtitle}</p>
            </div>

            <div className="mt-8 rounded-[28px] border border-paper-3 bg-paper/70 p-5 shadow-[0_12px_40px_rgba(31,42,62,0.06)] sm:p-6">
              {children}
              <button
                type="submit"
                form="auth-form"
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-night px-4 py-3 text-sm font-semibold text-snow transition hover:bg-night-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitLabel}
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-ink-2">
              {footerLabel}{' '}
              <Link href={footerHref} className="font-semibold text-brand hover:text-night">
                {footerLinkText}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
